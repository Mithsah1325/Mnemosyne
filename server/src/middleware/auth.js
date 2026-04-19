import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

const jwks = env.oidcJwksUri ? createRemoteJWKSet(new URL(env.oidcJwksUri)) : null;

function extractRoles(payload) {
  const rolesFromArray = Array.isArray(payload.roles) ? payload.roles : [];
  const rolesFromScope = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
  return [...new Set([...rolesFromArray, ...rolesFromScope])];
}

async function verifyJwtToken(token) {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: env.oidcIssuer,
    audience: env.oidcAudience,
    algorithms: ["RS256", "ES256"]
  });

  return {
    subject: payload.sub || "unknown",
    roles: extractRoles(payload),
    payload
  };
}

async function authenticate(req, res, next) {
  if (env.authMode === "none") {
    req.auth = { subject: "anonymous", roles: env.allowedRoles };
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Unauthorized", requestId: req.id });
  }

  if (env.authMode === "token") {
    if (!env.apiAccessToken || !safeEqual(token, env.apiAccessToken)) {
      return res.status(403).json({ error: "Forbidden", requestId: req.id });
    }

    req.auth = { subject: "service-token", roles: ["operator"] };
    return next();
  }

  try {
    req.auth = await verifyJwtToken(token);
    return next();
  } catch (_error) {
    return res.status(403).json({ error: "Forbidden", requestId: req.id });
  }
}

export const requireServiceAuth = authenticate;

export function requireRoles(roles = env.allowedRoles) {
  return function roleGuard(req, res, next) {
    const actorRoles = req.auth?.roles || [];
    const hasRole = roles.some((role) => actorRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: "Insufficient role", requestId: req.id });
    }

    return next();
  };
}
