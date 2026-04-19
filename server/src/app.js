import cors from "cors";
import express from "express";
import apiRoutes from "./routes/apiRoutes.js";
import { env } from "./config/env.js";
import { attachRequestContext } from "./middleware/requestContext.js";
import { setSecurityHeaders } from "./middleware/securityHeaders.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { renderPrometheusMetrics, trackMetrics } from "./middleware/metrics.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(attachRequestContext);
  app.use(setSecurityHeaders);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsAllowlist.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS blocked for this origin"));
      }
    })
  );

  app.use(express.json({ limit: "256kb" }));
  app.use(apiRateLimit);
  app.use(trackMetrics);

  app.get("/metrics", (req, res) => {
    if (env.metricsAuthToken) {
      const authHeader = req.headers.authorization || "";
      const expected = `Bearer ${env.metricsAuthToken}`;
      if (authHeader !== expected) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    return res.send(renderPrometheusMetrics());
  });

  app.use("/api/v1", apiRoutes);
  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
