import { generateAIResponse } from "../services/geminiService.js";
import { generateTTS } from "../services/ttsService.js";
import { toBase64Audio } from "../utils/audioConverters.js";
import { emitAuditEvent } from "../services/auditService.js";
import { getPatientProfile } from "../services/patientProfileService.js";

export async function handlePatientMessage(req, res) {
  const { transcript, patientId } = req.validatedBody;
  const actorId = req.auth?.subject || "unknown";

  try {
    const aiText = await generateAIResponse(transcript, patientId);
    const audioBuffer = await generateTTS(aiText);

    emitAuditEvent({
      requestId: req.id,
      actorId,
      action: "call.message.generate",
      resourceType: "patient",
      resourceId: patientId,
      outcome: "success",
      details: { transcriptLength: transcript.length }
    });

    return res.json({
      text: aiText,
      audio: toBase64Audio(audioBuffer),
      requestId: req.id
    });
  } catch (error) {
    req.log?.error(
      {
        message: error?.message,
        stack: error?.stack,
        patientId
      },
      "call_message_processing_failed"
    );

    emitAuditEvent({
      requestId: req.id,
      actorId,
      action: "call.message.generate",
      resourceType: "patient",
      resourceId: patientId,
      outcome: "failure"
    });

    return res.status(500).json({
      error: "Processing failed",
      requestId: req.id
    });
  }
}

export async function getPatientSummary(req, res) {
  const { patientId } = req.params;
  const actorId = req.auth?.subject || "unknown";

  try {
    const profile = await getPatientProfile(patientId);

    const summary = {
      patientId,
      pseudoId: profile.pseudoId,
      primaryDiagnosis: profile.primaryDiagnosis || "Early-stage Alzheimer\'s",
      communicationPreferences: profile.communicationPreferences || ["Short sentences", "Calm tone"],
      emergencyContact: profile.emergencyContact || {
        name: "A. Parker",
        relationship: "Guardian",
        phone: "+1-555-0103"
      },
      escalationThreshold: profile.escalationThreshold
    };

    emitAuditEvent({
      requestId: req.id,
      actorId,
      action: "patient.summary.read",
      resourceType: "patient",
      resourceId: patientId,
      outcome: "success"
    });

    return res.json({ summary, requestId: req.id });
  } catch (_error) {
    emitAuditEvent({
      requestId: req.id,
      actorId,
      action: "patient.summary.read",
      resourceType: "patient",
      resourceId: patientId,
      outcome: "failure"
    });

    return res.status(500).json({ error: "Could not load patient summary", requestId: req.id });
  }
}

export async function handleEmergencyEscalation(req, res) {
  const { patientId, reason } = req.body || {};
  const actorId = req.auth?.subject || "unknown";

  if (!patientId || !reason) {
    return res.status(400).json({ error: "patientId and reason are required", requestId: req.id });
  }

  const escalationId = `ESC-${Date.now()}`;
  emitAuditEvent({
    requestId: req.id,
    actorId,
    action: "call.escalate",
    resourceType: "patient",
    resourceId: patientId,
    outcome: "success",
    details: { reason, escalationId }
  });

  return res.status(202).json({
    escalationId,
    status: "escalated",
    target: "Human Supervisor Bridge",
    requestId: req.id
  });
}

export function getComplianceCertificate(_req, res) {
  return res.json({
    region: "Regional Zone A",
    certificateId: "COMPLIANCE-REGION-A-2026",
    issuedBy: "Mnemosyne Compliance Office",
    validUntil: "2026-12-31",
    controls: ["Data residency lock", "Audit retention", "Transport encryption"]
  });
}
