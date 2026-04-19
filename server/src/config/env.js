import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const authMode = process.env.AUTH_MODE || (isProduction ? "jwt" : "token");

export const env = {
  nodeEnv,
  isProduction,
  authMode,
  port: toNumber(process.env.PORT, 4000),
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  firebaseCredentials: process.env.FIREBASE_CREDENTIALS || "",
  ttsVoice: process.env.TTS_VOICE || "en-US",
  apiAccessToken: process.env.API_ACCESS_TOKEN || "",
  oidcIssuer: process.env.OIDC_ISSUER || "",
  oidcAudience: process.env.OIDC_AUDIENCE || "",
  oidcJwksUri: process.env.OIDC_JWKS_URI || "",
  allowedRoles: (process.env.ALLOWED_ROLES || "operator,supervisor,admin")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean),
  corsAllowlist: (process.env.CORS_ALLOWLIST || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  maxTranscriptChars: toNumber(process.env.MAX_TRANSCRIPT_CHARS, 4000),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 60),
  upstreamTimeoutMs: toNumber(process.env.UPSTREAM_TIMEOUT_MS, 12000),
  requestTimeoutMs: toNumber(process.env.REQUEST_TIMEOUT_MS, 20000),
  logLevel: process.env.LOG_LEVEL || "info",
  metricsAuthToken: process.env.METRICS_AUTH_TOKEN || "",
  useMockPatientData: process.env.USE_MOCK_PATIENT_DATA
    ? process.env.USE_MOCK_PATIENT_DATA === "true"
    : !isProduction,
  patientProfileServiceUrl: process.env.PATIENT_PROFILE_SERVICE_URL || "",
  patientProfileServiceToken: process.env.PATIENT_PROFILE_SERVICE_TOKEN || "",
  patientProfileTimeoutMs: toNumber(process.env.PATIENT_PROFILE_TIMEOUT_MS, 5000),
  patientProfileRetries: toNumber(process.env.PATIENT_PROFILE_RETRIES, 2)
};

if (env.authMode === "token" && !env.apiAccessToken) {
  throw new Error("AUTH_MODE=token requires API_ACCESS_TOKEN");
}

if (env.authMode === "jwt") {
  if (!env.oidcIssuer || !env.oidcAudience || !env.oidcJwksUri) {
    throw new Error("AUTH_MODE=jwt requires OIDC_ISSUER, OIDC_AUDIENCE, and OIDC_JWKS_URI");
  }
}

if (env.isProduction && !env.geminiApiKey) {
  throw new Error("GEMINI_API_KEY is required in production");
}

if (env.isProduction && env.useMockPatientData) {
  throw new Error("USE_MOCK_PATIENT_DATA must be false in production");
}
