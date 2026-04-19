import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ["req.headers.authorization", "authorization"],
    censor: "[REDACTED]"
  },
  base: {
    service: "mnemosyne-server",
    environment: env.nodeEnv
  }
});
