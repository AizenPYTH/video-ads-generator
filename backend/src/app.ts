import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import apiRoutes from "./routes";
import { assetHandler } from "./routes/video";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { isOriginAllowed } from "./middleware/cors";
import { logger } from "./utils/logger";
import { env } from "./utils/env";
import { hasAnthropicKey } from "./utils/env";
import { videoQueue } from "./jobs/videoRenderJob";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      // Assets are consumed cross-origin by the Vite dev server and by the
      // headless Chrome that renders the video.
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed = isOriginAllowed(env.frontendUrl, origin);
        if (!allowed) {
          // Log what was configured, not just what was blocked: the fix is
          // always in FRONTEND_URL and this is usually read in a deploy log
          // with nothing else to go on.
          logger.warn(
            { origin, frontendUrl: env.frontendUrl },
            "blocked by CORS - add this origin to FRONTEND_URL",
          );
        }
        callback(null, allowed);
      },
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      // `allowedHeaders` is deliberately unset: the default reflects
      // Access-Control-Request-Headers, so any custom header the client
      // sends is accepted. Naming them here would narrow that.
      exposedHeaders: ["Content-Disposition"],
      // Renders are polled every 1.5s; without this the browser re-runs the
      // preflight on every poll.
      maxAge: 86_400,
      optionsSuccessStatus: 204,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  // Screenshots arrive as base64 in the JSON body.
  app.use(express.json({ limit: "60mb" }));
  app.use(express.urlencoded({ limit: "60mb", extended: true }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      queue: videoQueue.kind,
      claude: hasAnthropicKey() ? "configured" : "missing-key",
      nativeAspects: env.renderNativeAspects,
    });
  });

  app.use("/media", assetHandler());
  app.use("/api", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
