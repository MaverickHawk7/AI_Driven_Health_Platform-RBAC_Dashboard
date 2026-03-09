import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth, sessionMiddleware } from "./auth";
import { setupWebSocket } from "./ws";
import { serveStatic } from "./static";
import { createServer } from "http";
import { awaitRedisReady } from "./redis";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";
const app = express();
if (isProd) app.set("trust proxy", 1); // Trust Railway/reverse proxy for secure cookies
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(helmet({
  contentSecurityPolicy: isProd ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://eu-assets.i.posthog.com"],
      connectSrc: ["'self'", "https://eu.i.posthog.com", "https://eu-assets.i.posthog.com", "wss:", "ws:"],
      imgSrc: ["'self'", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
      workerSrc: ["'self'", "blob:"],
    },
  } : false, // no CSP in dev (HMR)
}));

app.use(compression());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:5000"];
app.use(cors({
  origin: isProd ? allowedOrigins : true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api", globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later." },
});
app.use("/api/login", authLimiter);

app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '1mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // skip PII in prod
      if (capturedJsonResponse && !isProd) {
        const preview = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${preview.length > 200 ? preview.slice(0, 200) + "..." : preview}`;
      }

      log(logLine);
    }
  });

  next();
});

// --- Process-level error handling & graceful shutdown ---
process.on("unhandledRejection", (reason) => {
  console.error("[process] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught exception:", err);
  process.exit(1);
});

function gracefulShutdown(signal: string) {
  log(`${signal} received — shutting down gracefully`, "process");
  httpServer.close(() => {
    log("HTTP server closed", "process");
    process.exit(0);
  });
  // Force exit after 10s if connections don't close
  setTimeout(() => {
    console.error("[process] Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

(async () => {
  await awaitRedisReady();
  setupAuth(app);
  setupWebSocket(httpServer, sessionMiddleware as any);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    if (res.headersSent) {
      return next(err);
    }

    if (status >= 500) {
      console.error("[error] Unhandled:", err);
      return res.status(status).json({ message: "Internal Server Error" });
    }

    return res.status(status).json({ message: err.message || "An error occurred" });
  });

  // Vite dev server after API routes so catch-all doesn't conflict
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  // reusePort unsupported on Windows
  const listenOpts: Record<string, unknown> = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") listenOpts.reusePort = true;
  httpServer.listen(listenOpts, () => {
    log(`serving on port ${port}`);
  });
})();
