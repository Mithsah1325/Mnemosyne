import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();
const server = app.listen(env.port, () => {
  logger.info({ port: env.port }, "server_started");
});

server.requestTimeout = env.requestTimeoutMs;

function shutdown(signal) {
  logger.info({ signal }, "server_shutdown_start");
  server.close(() => {
    logger.info("server_shutdown_complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
