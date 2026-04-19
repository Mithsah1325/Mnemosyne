import { logger } from "../utils/logger.js";

export function emitAuditEvent({ requestId, actorId, action, resourceType, resourceId, outcome, details = {} }) {
  logger.info({
    eventType: "audit",
    requestId,
    actorId,
    action,
    resourceType,
    resourceId,
    outcome,
    details,
    timestamp: new Date().toISOString()
  });
}
