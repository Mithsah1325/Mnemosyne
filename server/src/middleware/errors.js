import { AppError } from "../utils/appError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not Found", requestId: req.id });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : "INTERNAL_SERVER_ERROR";

  req.log.error({ message: err.message, stack: err.stack, code }, "request_failed");

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json({
    error: statusCode >= 500 ? "Internal Server Error" : err.message,
    code,
    requestId: req.id
  });
}
