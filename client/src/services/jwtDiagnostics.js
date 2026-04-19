function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function inspectJwtToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Token is empty" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Token is not a JWT (expected 3 segments)" };
  }

  try {
    const payloadRaw = decodeBase64Url(parts[1]);
    const payload = JSON.parse(payloadRaw);

    const nowSec = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);
    const iat = Number(payload.iat || 0);
    const expired = Boolean(exp && exp <= nowSec);

    const rolesFromRoles = Array.isArray(payload.roles) ? payload.roles : [];
    const rolesFromScope = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    const roles = [...new Set([...rolesFromRoles, ...rolesFromScope])];

    const hasExpectedRole = roles.some((role) =>
      ["operator", "supervisor", "admin"].includes(String(role).toLowerCase())
    );

    return {
      valid: !expired,
      reason: expired ? "Token is expired" : "Token shape is valid",
      payload,
      checks: {
        issuer: payload.iss || "(missing)",
        audience: payload.aud || "(missing)",
        issuedAt: iat ? new Date(iat * 1000).toISOString() : "(missing)",
        expiresAt: exp ? new Date(exp * 1000).toISOString() : "(missing)",
        expired,
        roles,
        hasExpectedRole
      }
    };
  } catch (_error) {
    return { valid: false, reason: "Failed to decode JWT payload" };
  }
}
