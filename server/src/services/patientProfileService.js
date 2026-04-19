import fetch from "node-fetch";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

function pseudonymousId(patientId) {
  return createHash("sha256").update(patientId).digest("hex").slice(0, 16);
}

function getMockProfile(patientId) {
  return {
    pseudoId: pseudonymousId(patientId),
    primaryDiagnosis: "Early-stage Alzheimer's",
    communicationPreferences: ["One question at a time", "Warm and slow pacing"],
    emergencyContact: {
      name: "A. Parker",
      relationship: "Guardian",
      phone: "+1-555-0103"
    },
    memoryBaseline: "Mild short-term memory impairment",
    toneGuidance: "Calm, clear, and reassuring",
    escalationThreshold: "If confusion persists for 2 interactions"
  };
}

export async function getPatientProfile(patientId) {
  if (env.useMockPatientData) {
    return getMockProfile(patientId);
  }

  if (!env.patientProfileServiceUrl || !env.patientProfileServiceToken) {
    throw new AppError(503, "Patient profile service not configured", "PATIENT_PROFILE_UNAVAILABLE");
  }

  if (env.isProduction && !env.patientProfileServiceUrl.startsWith("https://")) {
    throw new AppError(503, "Patient profile service must use HTTPS in production", "PATIENT_PROFILE_TLS_REQUIRED");
  }

  const targetUrl = `${env.patientProfileServiceUrl}/profiles/${patientId}`;
  let data = null;

  for (let attempt = 0; attempt <= env.patientProfileRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.patientProfileTimeoutMs);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${env.patientProfileServiceToken}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        if (attempt === env.patientProfileRetries) {
          throw new AppError(502, "Patient profile service failed", "PATIENT_PROFILE_UPSTREAM_ERROR");
        }
        continue;
      }

      data = await response.json();
      break;
    } catch (error) {
      if (attempt === env.patientProfileRetries) {
        if (error.name === "AbortError") {
          throw new AppError(504, "Patient profile request timed out", "PATIENT_PROFILE_TIMEOUT");
        }
        throw new AppError(502, "Patient profile service failed", "PATIENT_PROFILE_UPSTREAM_ERROR");
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!data) {
    throw new AppError(502, "Patient profile service failed", "PATIENT_PROFILE_UPSTREAM_ERROR");
  }

  return {
    pseudoId: data.pseudoId || pseudonymousId(patientId),
    primaryDiagnosis: data.primaryDiagnosis || "Unknown",
    communicationPreferences: data.communicationPreferences || ["Calm and concise communication"],
    emergencyContact: data.emergencyContact || {
      name: "Unknown",
      relationship: "Unknown",
      phone: "Unavailable"
    },
    memoryBaseline: data.memoryBaseline || "Unknown",
    toneGuidance: data.toneGuidance || "Calm and clear",
    escalationThreshold: data.escalationThreshold || "Escalate if uncertain"
  };
}
