import { setAuthToken } from "./authTokenStore";

const OIDC_ISSUER = import.meta.env.VITE_OIDC_ISSUER || "";
const OIDC_CLIENT_ID = import.meta.env.VITE_OIDC_CLIENT_ID || "";
const OIDC_AUDIENCE = import.meta.env.VITE_OIDC_AUDIENCE || "";
const OIDC_SCOPE = import.meta.env.VITE_OIDC_SCOPE || "openid profile email";
const REDIRECT_URI = import.meta.env.VITE_OIDC_REDIRECT_URI || window.location.origin;

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = String(value).toLowerCase();
  return (
    normalized.includes("your-") ||
    normalized.includes("example") ||
    normalized.includes("replace-me") ||
    normalized === "changeme"
  );
}

function toBase64Url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function fetchOpenIdConfig() {
  const response = await fetch(`${OIDC_ISSUER}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error("Failed to fetch OIDC configuration");
  }
  return response.json();
}

export function isOidcConfigured() {
  return (
    Boolean(OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_AUDIENCE) &&
    !isPlaceholder(OIDC_ISSUER) &&
    !isPlaceholder(OIDC_CLIENT_ID) &&
    !isPlaceholder(OIDC_AUDIENCE)
  );
}

export async function startOidcLogin() {
  if (!isOidcConfigured()) {
    throw new Error("OIDC configuration is incomplete");
  }

  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = toBase64Url(await sha256(codeVerifier));

  sessionStorage.setItem("oidc_state", state);
  sessionStorage.setItem("oidc_code_verifier", codeVerifier);

  const config = await fetchOpenIdConfig();
  const url = new URL(config.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OIDC_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", OIDC_SCOPE);
  url.searchParams.set("audience", OIDC_AUDIENCE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  window.location.assign(url.toString());
}

export async function completeOidcLoginIfNeeded() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return null;
  }

  const expectedState = sessionStorage.getItem("oidc_state");
  const codeVerifier = sessionStorage.getItem("oidc_code_verifier");

  if (!expectedState || state !== expectedState || !codeVerifier) {
    throw new Error("OIDC state verification failed");
  }

  const config = await fetchOpenIdConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: OIDC_CLIENT_ID,
    code_verifier: codeVerifier
  });

  const response = await fetch(config.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("OIDC token exchange failed");
  }

  const tokenData = await response.json();
  const accessToken = tokenData.access_token || "";

  setAuthToken(accessToken);
  sessionStorage.removeItem("oidc_state");
  sessionStorage.removeItem("oidc_code_verifier");

  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());

  return accessToken;
}

export function clearOidcSession() {
  setAuthToken("");
  sessionStorage.removeItem("oidc_state");
  sessionStorage.removeItem("oidc_code_verifier");
 }
