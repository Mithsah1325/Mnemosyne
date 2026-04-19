import fetch from "node-fetch";
import { env } from "../config/env.js";
import { getPatientProfile } from "./patientProfileService.js";
import { redactSensitiveText } from "../utils/redaction.js";

function isPlaceholderSecret(value) {
  const normalized = String(value || "").toLowerCase();
  return (
    !normalized ||
    normalized.includes("your_") ||
    normalized.includes("replace") ||
    normalized.includes("example") ||
    normalized === "changeme"
  );
}

function buildDevelopmentFallbackResponse(profile) {
  const contactName = profile?.emergencyContact?.name || "the guardian";
  return [
    "Thank you for sharing that. I am here with you, and we can go one step at a time.",
    "Let us use short, calm questions and confirm orientation before the next task.",
    `If confusion increases or safety risk appears, escalate immediately and notify ${contactName}.`
  ].join(" ");
}

function buildPrompt(transcript, profile) {
  const normalizedTranscript = transcript.replace(/\s+/g, " ").slice(0, env.maxTranscriptChars);
  const redactedTranscript = redactSensitiveText(normalizedTranscript);

  return [
    "You are a compassionate cognitive support assistant.",
    "Never provide medical diagnosis. If risky symptoms are present, advise immediate escalation.",
    `Patient Pseudonymous ID: ${profile.pseudoId}`,
    `Baseline: ${profile.memoryBaseline}`,
    `Tone: ${profile.toneGuidance}`,
    `Escalation rule: ${profile.escalationThreshold}`,
    `Transcript: ${redactedTranscript}`,
    "Respond in 2-4 concise sentences with practical guidance."
  ].join("\n");
}

export async function generateAIResponse(transcript, patientId) {
  const profile = await getPatientProfile(patientId);

  if (isPlaceholderSecret(env.geminiApiKey)) {
    if (env.isProduction) {
      throw new Error("Missing or invalid GEMINI_API_KEY");
    }

    return buildDevelopmentFallbackResponse(profile);
  }

  const prompt = buildPrompt(transcript, profile);
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), env.upstreamTimeoutMs);

  let response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 350
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gemini request timed out");
    }

    throw new Error("Gemini request failed before response");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errText = await response.text();

    if (!env.isProduction) {
      return buildDevelopmentFallbackResponse(profile);
    }

    throw new Error(`Gemini request failed with status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const aiTextRaw =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I am here with you. Let us take this one step at a time.";

  const aiText = aiTextRaw.trim().slice(0, 1500);

  return aiText;
}
