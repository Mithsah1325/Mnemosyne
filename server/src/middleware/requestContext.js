import { randomUUID } from "node:crypto";
import { logger } from "../utils/logger.js";

export function attachRequestContext(req, res, next) {
  req.id = req.headers["x-request-id"] || randomUUID();
  const startedAt = Date.now();

  res.setHeader("X-Request-Id", req.id);
  req.log = logger.child({ requestId: req.id });

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    req.log.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      ip: req.ip
    }, "request_completed");
  });

  next();
}
