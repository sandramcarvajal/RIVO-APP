import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

// Print SMTP startup status logs
console.log("=== SMTP STARTUP CHECK ===");
console.log(`SMTP_HOST loaded: ${!!process.env.SMTP_HOST}`);
console.log(`SMTP_USER loaded: ${!!process.env.SMTP_USER}`);
console.log(`SMTP_PASS loaded: ${!!process.env.SMTP_PASS}`);
console.log(`SMTP_FROM loaded: ${!!process.env.SMTP_FROM}`);
const smtpIsConfiguredOnBoot = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
console.log(`SMTP status: ${smtpIsConfiguredOnBoot ? "SMTP ENABLED" : "SMTP DISABLED"}`);
console.log("==========================");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bind safe handlers to stdout/stderr stream errors to ignore 'EPIPE' crash triggers
process.stdout.on("error", (err: any) => {
  if (err.code === "EPIPE") {
    // Gracefully digest the disconnected stdout pipe without crashing
  }
});
process.stderr.on("error", (err: any) => {
  if (err.code === "EPIPE") {
    // Gracefully digest the disconnected stderr pipe without crashing
  }
});

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Static uploads serving for uploaded driver documents
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Method Override middleware for environments/restricted reverse-proxies that discard native PATCH/DELETE verbs
  app.use((req, res, next) => {
    const override = req.headers["x-http-method-override"] || req.query._method;
    if (req.method === "POST" && override) {
      req.method = String(override).toUpperCase();
      console.log(`[MethodOverride] Remapped request method POST to ${req.method} for path ${req.url}`);
    }
    next();
  });

  // API Routes
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[Server] ${req.method} ${req.url} - Status: ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth Module
  const { authRouter } = await import("./src/server/modules/auth/infrastructure/AuthRouter");
  app.use("/api/auth", authRouter);

  // Profile Module
  const { profileRouter } = await import("./src/server/modules/auth/infrastructure/ProfileRouter");
  app.use("/api/profile", profileRouter);

  // Vehicles Module
  const { vehicleRouter } = await import("./src/server/modules/vehicles/infrastructure/VehicleRouter");
  app.use("/api/vehicles", vehicleRouter);

  // Routes Module
  const { routeRouter } = await import("./src/server/modules/routes/infrastructure/RouteRouter");
  app.use("/api/routes", routeRouter);
  app.use("/api/trips", routeRouter);

  // Requests Module
  const { requestRouter } = await import("./src/server/modules/requests/infrastructure/RequestRouter");
  app.use("/api/requests", requestRouter);

  // Notifications Module
  const { notificationRouter } = await import("./src/server/modules/notifications/infrastructure/NotificationRouter");
  app.use("/api/notifications", notificationRouter);

  // Reviews Module
  const { reviewRouter } = await import("./src/server/modules/reviews/infrastructure/ReviewRouter");
  app.use("/api/reviews", reviewRouter);

  // Pico y Placa Metropolitan Domain Module
  const { circulationRouter } = await import("./src/server/modules/circulation/infrastructure/CirculationRouter");
  app.use("/api/circulation", circulationRouter);
  app.use("/api/pico-placa", circulationRouter);

  // Backward compatibility endpoint for evaluate
  app.post("/api/pico-placa/evaluate", async (req, res) => {
    try {
      const { plate, date } = req.body;
      const { CheckCirculationUseCase } = await import("./src/server/modules/circulation/application/CheckCirculationUseCase");
      const useCase = new CheckCirculationUseCase();
      const result = await useCase.execute({ plate, date });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Internal server error" });
    }
  });

  // Google Maps Config
  app.get("/api/maps/config", (req, res) => {
    res.json({
      apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || "",
      libraries: ["places", "geometry"]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start the automatic route finalizer daemon
    import("./src/server/modules/routes/infrastructure/RouteAutoFinalizer")
      .then(({ initRouteAutoFinalizer }) => {
        initRouteAutoFinalizer();
      })
      .catch((err) => {
        console.error("[Server] Failed to initialize RouteAutoFinalizer:", err);
      });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Server] UNHANDLED ERROR:`, err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });
}

process.on("uncaughtException", (error) => {
  console.error("[Process] CRITICAL: Uncaught Exception caught to prevent crash:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process] CRITICAL: Unhandled Rejection caught to prevent crash:", reason);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
