import { env } from "../config/env.js";

export function setSecurityHeaders(_req, res, next) {
  const connectSrc = ["'self'", ...env.corsAllowlist].join(" ");

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(self)");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; connect-src ${connectSrc}; img-src 'self' data:; media-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`
  );
  next();
}
