import { Router } from "express";
import { CreateRouteUseCase } from "../application/CreateRoute";
import { SearchRoutesUseCase } from "../application/SearchRoutes";
import { DrizzleRouteRepository } from "./DrizzleRouteRepository";
import { db } from "../../../../db";
import { routes, joinRequests, users } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { authMiddleware, roleGuard, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { RouteStatus, NotificationType } from "../../../../shared/enums";
import { DrizzleNotificationRepository } from "../../notifications/infrastructure/DrizzleNotificationRepository";
import { NotificationFactory } from "../../notifications/NotificationFactory";

const routeRouter = Router();
const notificationRepository = new DrizzleNotificationRepository();

const routeRepository = new DrizzleRouteRepository();
const createRouteUseCase = new CreateRouteUseCase(routeRepository);
const searchRoutesUseCase = new SearchRoutesUseCase(routeRepository);

// Helper to transform domain entity to frontend model
const mapToFrontend = (route: any) => ({
  ...route,
  time: new Date(route.departureTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
  date: new Date(route.departureTime).toISOString().split('T')[0],
  status: route.status
});

// Protected: Only drivers can create routes
routeRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    console.log(`[RouteRouter] POST / creating route. User role: ${userRole}`);

    if (userRole !== 'driver' && userRole !== 'admin') {
      console.warn(`[RouteRouter] Forbidden: User ${req.user?.userId} with role ${userRole} tried to create a route.`);
      return res.status(403).json({ 
        error: "Solo los conductores pueden crear rutas.",
        role: userRole 
      });
    }

    console.log(`[RouteRouter] Creating route for driver: ${req.user!.userId}`);
    const input = {
      ...req.body,
      driverId: req.user!.userId
    };
    const route = await createRouteUseCase.execute(input);
    res.status(201).json(mapToFrontend(route));
  } catch (error) {
    console.error(`[RouteRouter] ERROR creating route:`, error);
    res.status(400).json({ error: error instanceof Error ? error.message : "Error creating route" });
  }
});

  // Update route status (Lifecycle)
  routeRouter.patch("/:id/status", authMiddleware, roleGuard(['driver', 'admin']), async (req: AuthRequest, res) => {
    try {
      const { status: rawStatus } = req.body;
      const status = String(rawStatus).toLowerCase();
      const routeId = parseInt(req.params.id);
      const userId = parseInt(req.user!.userId);

      console.log(`[RouteRouter] Updating route ${routeId} to status: ${status} (normalized from ${rawStatus})`);

      const [route] = await db.select().from(routes).where(eq(routes.id, routeId));
      if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
      
      if (route.driverId !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "No tienes permiso para actualizar esta ruta" });
      }

      // State Machine Validation
      const currentStatus = route.status?.toLowerCase();
      if (currentStatus === 'completed' || currentStatus === 'cancelled') {
        return res.status(400).json({ error: "No se puede modificar una ruta que ya ha finalizado o ha sido cancelada." });
      }

      if (status === 'scheduled' && currentStatus !== 'scheduled') {
        return res.status(400).json({ error: "No se puede volver a programar una ruta que ya ha iniciado." });
      }

      const updated = await routeRepository.update(req.params.id, { status: status as RouteStatus });

      // NOTIFY PASSENGERS
      try {
        // Find all accepted passengers for this route
        const acceptedPassengers = await db.select().from(joinRequests).where(and(
          eq(joinRequests.routeId, routeId),
          sql`LOWER(${joinRequests.status}) = 'accepted'`
        ));

        console.log(`[RouteRouter] Notifying ${acceptedPassengers.length} passengers for status ${status}`);

      for (const p of acceptedPassengers) {
        let notification;
        if (status === RouteStatus.IN_PROGRESS) {
           notification = NotificationFactory.createTripStarted(p.passengerId.toString(), routeId.toString(), route.destination);
        } else if (status === RouteStatus.COMPLETED) {
           notification = NotificationFactory.createTripCompleted(p.passengerId.toString(), routeId.toString(), route.destination);
        } else if (status === RouteStatus.CANCELLED) {
           notification = NotificationFactory.createRouteCancelled(p.passengerId.toString(), routeId.toString(), route.destination);
        }
        
        if (notification) {
          await notificationRepository.create(notification);
        }
      }
    } catch (notifErr) {
      console.error("[RouteRouter] Error creating lifecycle notifications:", notifErr);
    }

    res.json(mapToFrontend(updated));
  } catch (error) {
    res.status(500).json({ error: "Error updating route status" });
  }
});

// Get accepted passengers for a route
routeRouter.get("/:id/passengers", authMiddleware, async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const result = await db.select({
      id: users.id,
      name: users.email, // Fallback
      profileData: users.profileData
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.passengerId, users.id))
    .where(and(
      eq(joinRequests.routeId, routeId),
      eq(joinRequests.status, 'accepted')
    ));

    res.json(result.map(p => {
       let name = p.name;
       let avatar = "";
       if (p.profileData) {
         try {
           const profile = JSON.parse(p.profileData);
           name = profile.name || name;
           avatar = profile.avatar || avatar;
         } catch (e) {}
       }
       return { id: p.id.toString(), name, avatar };
    }));
  } catch (error) {
    res.status(500).json({ error: "Error fetching passengers" });
  }
});

// Public/Authenticated: Get all active routes
routeRouter.get("/active", authMiddleware, async (req, res) => {
  try {
    console.log(`[RouteRouter] Fetching active routes`);
    // Search for scheduled, active or in_progress routes using repository
    const results = await routeRepository.findAll({ 
      status: `${RouteStatus.SCHEDULED},${RouteStatus.ACTIVE},${RouteStatus.IN_PROGRESS}` 
    });
    console.log(`[RouteRouter] Found ${results.length} active routes`);
    res.json(results.map(mapToFrontend));
  } catch (error) {
    console.error(`[RouteRouter] ERROR fetching active routes:`, error);
    res.status(500).json({ error: "Error fetching active routes" });
  }
});

// Get routes for current user (Driver)
routeRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    console.log(`[RouteRouter] Fetching routes for user: ${userId}`);
    const results = await routeRepository.findAll({ driverId: userId });
    console.log(`[RouteRouter] Found ${results.length} personal routes for user ${userId}`);
    res.json(results.map(mapToFrontend));
  } catch (error) {
    console.error(`[RouteRouter] ERROR fetching personal routes:`, error);
    res.status(500).json({ error: "Error fetching personal routes" });
  }
});

// Public/Authenticated: Search routes
routeRouter.get("/search", authMiddleware, async (req, res) => {
  try {
    const { origin, destination } = req.query;
    const results = await searchRoutesUseCase.execute({ 
      origin: origin as string, 
      destination: destination as string 
    });
    res.json(results.map(mapToFrontend));
  } catch (error) {
    res.status(500).json({ error: "Error searching routes" });
  }
});

routeRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const route = await routeRepository.findById(req.params.id);
    if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
    res.json(mapToFrontend(route));
  } catch (error) {
    res.status(500).json({ error: "Error fetching route" });
  }
});

export { routeRouter };
