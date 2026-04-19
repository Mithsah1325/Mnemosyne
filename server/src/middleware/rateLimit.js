import { env } from "../config/env.js";

const buckets = new Map();

export function apiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || "unknown";

  const bucket = buckets.get(key) || { count: 0, resetAt: now + env.rateLimitWindowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + env.rateLimitWindowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  res.setHeader("X-RateLimit-Limit", String(env.rateLimitMax));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(env.rateLimitMax - bucket.count, 0)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > env.rateLimitMax) {
    return res.status(429).json({
      error: "Too Many Requests",
      requestId: req.id
    });
  }

  return next();
}
