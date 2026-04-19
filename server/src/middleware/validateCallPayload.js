import { env } from "../config/env.js";
import { z } from "zod";

const callPayloadSchema = z.object({
  transcript: z
    .string()
    .trim()
    .min(1, "transcript is required")
    .max(env.maxTranscriptChars, `transcript exceeds ${env.maxTranscriptChars} characters`),
  patientId: z.string().regex(/^[a-zA-Z0-9_-]{3,64}$/, "patientId format is invalid")
});

export function validateCallPayload(req, res, next) {
  const parsed = callPayloadSchema.safeParse(req.body || {});

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid request body";
    return res.status(400).json({ error: message, requestId: req.id });
  }

  req.validatedBody = parsed.data;

  return next();
}
