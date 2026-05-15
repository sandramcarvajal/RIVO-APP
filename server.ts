import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

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

  // Routes Module
  const { routeRouter } = await import("./src/server/modules/routes/infrastructure/RouteRouter");
  app.use("/api/routes", routeRouter);

  // Requests Module
  const { requestRouter } = await import("./src/server/modules/requests/infrastructure/RequestRouter");
  app.use("/api/requests", requestRouter);

  // Notifications Module
  const { notificationRouter } = await import("./src/server/modules/notifications/infrastructure/NotificationRouter");
  app.use("/api/notifications", notificationRouter);

  // Reviews Module
  const { reviewRouter } = await import("./src/server/modules/reviews/infrastructure/ReviewRouter");
  app.use("/api/reviews", reviewRouter);

  // Pico y Placa Evaluation Endpoint
  app.post("/api/pico-placa/evaluate", async (req, res) => {
    try {
      const { plate, date, city } = req.body;
      const { CheckCirculationUseCase } = await import("./src/server/application/use-cases/CheckCirculation");
      const useCase = new CheckCirculationUseCase();
      const result = await useCase.execute({ plate, date, city });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
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
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Server] UNHANDLED ERROR:`, err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
