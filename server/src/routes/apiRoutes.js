import { Router } from "express";
import {
  getComplianceCertificate,
  getPatientSummary,
  handleEmergencyEscalation,
  handlePatientMessage
} from "../controllers/callController.js";
import { requireRoles, requireServiceAuth } from "../middleware/auth.js";
import { validateCallPayload } from "../middleware/validateCallPayload.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/health/live", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/health/ready", (_req, res) => {
  const dependencies = {
    geminiConfigured: Boolean(env.geminiApiKey),
    authConfigured: env.authMode !== "jwt" || Boolean(env.oidcIssuer && env.oidcAudience && env.oidcJwksUri),
    patientProfileConfigured: env.useMockPatientData || Boolean(env.patientProfileServiceUrl)
  };

  const ready = Object.values(dependencies).every(Boolean);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "degraded", dependencies });
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok", mode: env.authMode });
});

router.post(
  "/call/message",
  requireServiceAuth,
  requireRoles(),
  validateCallPayload,
  handlePatientMessage
);

router.get("/patient/:patientId/summary", requireServiceAuth, requireRoles(), getPatientSummary);

router.post("/call/escalate", requireServiceAuth, requireRoles(), handleEmergencyEscalation);

router.get("/compliance/certificate", requireServiceAuth, requireRoles(), getComplianceCertificate);

export default router;
