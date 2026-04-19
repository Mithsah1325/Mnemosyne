import { getAuthToken } from "./authTokenStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

async function getCurrentUserToken() {
  return getAuthToken();
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { error: text };
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function shouldRetry(statusCode) {
  return statusCode === 429 || statusCode >= 500;
}

function toAuthError(statusCode) {
  const error = new Error(
    statusCode === 403
      ? "Access denied: your account is missing required role permissions."
      : "Authentication required: sign in or provide a valid API token."
  );
  error.name = "AuthError";
  return error;
}

export async function getHealth() {
  const response = await fetchWithTimeout(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Failed to fetch health status");
  }
  return parseJsonSafely(response);
}

export async function getGatewayLatency() {
  const startedAt = performance.now();
  const response = await fetchWithTimeout(`${API_BASE_URL}/health/live`);

  if (!response.ok) {
    throw new Error("Gateway health probe failed");
  }

  await parseJsonSafely(response);
  return Math.round(performance.now() - startedAt);
}

export async function sendMessageToAI(transcript, patientId) {
  const token = await getCurrentUserToken();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/call/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ transcript, patientId })
      });
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error("Network request failed or timed out");
    }

    if (response.ok) {
      return parseJsonSafely(response);
    }

    if (attempt < MAX_RETRIES && shouldRetry(response.status)) {
      // Exponential backoff without blocking the UI thread for long periods.
      const delay = 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw toAuthError(response.status);
    }

    const details = await parseJsonSafely(response);
    throw new Error(`Backend request failed: ${response.status} ${details.error || "Unknown error"}`);
  }

  throw new Error("Backend request failed after retries");
}

export async function getPatientSummary(patientId) {
  const token = await getCurrentUserToken();
  const response = await fetchWithTimeout(`${API_BASE_URL}/patient/${patientId}/summary`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const details = await parseJsonSafely(response);
    if (response.status === 401 || response.status === 403) {
      throw toAuthError(response.status);
    }

    throw new Error(`Could not load patient summary: ${response.status} ${details.error || "Unknown"}`);
  }

  return parseJsonSafely(response);
}

export async function escalateCall(patientId, reason) {
  const token = await getCurrentUserToken();
  const response = await fetchWithTimeout(`${API_BASE_URL}/call/escalate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ patientId, reason })
  });

  if (!response.ok) {
    const details = await parseJsonSafely(response);
    if (response.status === 401 || response.status === 403) {
      throw toAuthError(response.status);
    }
    throw new Error(`Escalation failed: ${response.status} ${details.error || "Unknown"}`);
  }

  return parseJsonSafely(response);
}

export async function getComplianceCertificate() {
  const token = await getCurrentUserToken();
  const response = await fetchWithTimeout(`${API_BASE_URL}/compliance/certificate`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const details = await parseJsonSafely(response);
    if (response.status === 401 || response.status === 403) {
      throw toAuthError(response.status);
    }

    throw new Error(
      `Could not load compliance certificate: ${response.status} ${details.error || "Unknown"}`
    );
  }

  return parseJsonSafely(response);
}
