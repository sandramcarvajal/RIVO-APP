import { Router } from "express";
import { db } from "../../../../db";
import { joinRequests, routes, users } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { DrizzleNotificationRepository } from "../../notifications/infrastructure/DrizzleNotificationRepository";
import { NotificationFactory } from "../../notifications/NotificationFactory";
import { JoinRequestStatus } from "../../../../shared/enums";
import { RouteLifecycleManager } from "../../routes/infrastructure/RouteLifecycleManager";
import { logDiagnostic } from "../../../logger";

const requestRouter = Router();
const notificationRepository = new DrizzleNotificationRepository();

// Create aliases for users table
const passengers = alias(users, "passengers");
const drivers = alias(users, "drivers");

// Create join request
requestRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  console.log("[REQUEST ROUTER HIT]", req.method, req.originalUrl);
  try {
    const routeId = parseInt(req.body.routeId);
    if (isNaN(routeId)) return res.status(400).json({ error: "Invalid routeId" });
    const passengerId = parseInt(req.user!.userId);

    // Call JIT transition check dynamically before doing any check
    await RouteLifecycleManager.performJitTransitions();
    const now = new Date();

    const created = await db.transaction(async (tx) => {
      // Get route data with FOR UPDATE lock to check driver and details transactionally
      const [route] = await tx.select().from(routes).where(eq(routes.id, routeId)).for("update");
      if (!route) {
        throw new Error("Ruta no encontrada");
      }

      // Block a driver from joining their own route
      if (String(route.driverId) === String(passengerId)) {
        throw new Error("No puedes unirte a tu propio trayecto.");
      }

      // Block requests on expired/scheduled routes
      if (new Date(route.departureTime) <= now) {
        throw new Error("No puede solicitar unirse a una ruta que ya ha partido.");
      }

      // Block requests on in_progress, completed or cancelled routes
      const lowerStatus = route.status?.toLowerCase();
      if (lowerStatus === 'in_progress' || lowerStatus === 'completed' || lowerStatus === 'cancelled') {
        throw new Error("Este trayecto ya inició, finalizó o fue cancelado.");
      }

      // Block creation of join requests if there are no seats available (Escenario D)
      if (route.availableSeats <= 0) {
        throw new Error("No hay asientos disponibles en este viaje");
      }

      // Check if already exists
      const [existing] = await tx.select().from(joinRequests).where(
        and(
          eq(joinRequests.routeId, routeId),
          eq(joinRequests.passengerId, passengerId)
        )
      );

      if (existing) {
        throw new Error("Ya has enviado una solicitud para esta ruta");
      }

      const [newRequest] = await tx.insert(joinRequests).values({
        routeId,
        passengerId,
        status: JoinRequestStatus.PENDING
      }).returning();

      return { newRequest, route };
    });

    // Notify driver
    try {
      const notification = NotificationFactory.createNewRequest(
        created.route.driverId.toString(),
        routeId.toString(),
        created.route.destination
      );
      await notificationRepository.create(notification);
    } catch (notifError) {
      console.error("[RequestRouter] Error creating notification for driver:", notifError);
    }

    res.status(201).json(created.newRequest);
  } catch (error: any) {
    console.error("[RequestRouter] Error creating request:", error);
    res.status(400).json({ error: error.message || "Error al solicitar unirse al viaje" });
  }
});

// Get requests for current user
requestRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  console.log("[REQUEST ROUTER HIT]", req.method, req.originalUrl);
  try {
    const userId = parseInt(req.user!.userId);
    console.log(`[RequestRouter] Fetching requests for userId: ${userId}`);

    // Lazy load & transition route states
    await RouteLifecycleManager.performJitTransitions();

    // Get requests where user is passenger OR requests for routes where user is driver
    const results = await db
      .select({
        id: joinRequests.id,
        routeId: joinRequests.routeId,
        passengerId: joinRequests.passengerId,
        status: joinRequests.status,
        createdAt: joinRequests.createdAt,
        passengerProfileData: passengers.profileData,
        driverProfileData: drivers.profileData,
        routeInfo: {
          origin: routes.origin,
          destination: routes.destination,
          driverId: routes.driverId,
          departureTime: routes.departureTime,
          status: routes.status,
          price: routes.price
        }
      })
      .from(joinRequests)
      .innerJoin(routes, eq(joinRequests.routeId, routes.id))
      .innerJoin(passengers, eq(joinRequests.passengerId, passengers.id))
      .innerJoin(drivers, eq(routes.driverId, drivers.id))
      .where(
        or(
          eq(joinRequests.passengerId, userId),
          eq(routes.driverId, userId)
        )
      );

    console.log(`[RequestRouter] Found ${results.length} requests for user ${userId}`);
    if (results.length > 0) {
      console.log(`[RequestRouter] Data sample: Request ID ${results[0].id}, Status ${results[0].status}, Route Status ${results[0].routeInfo?.status}`);
    }
    res.json(results.map(r => {
      let passengerName = "Pasajero";
      let passengerAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      if (r.passengerProfileData) {
        try {
          const profile = JSON.parse(r.passengerProfileData);
          passengerName = profile.name || passengerName;
          passengerAvatar = profile.avatar || passengerAvatar;
        } catch (e) {}
      }

      let routeDriverName = "Conductor";
      let routeDriverAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      if (r.driverProfileData) {
        try {
          const profile = JSON.parse(r.driverProfileData);
          routeDriverName = profile.name || routeDriverName;
          routeDriverAvatar = profile.avatar || routeDriverAvatar;
        } catch (e) {}
      }

      return {
        ...r,
        id: r.id.toString(),
        routeId: r.routeId.toString(),
        passengerId: r.passengerId.toString(),
        passengerName,
        passengerAvatar,
        routeInfo: r.routeInfo ? {
          ...r.routeInfo,
          driverId: r.routeInfo.driverId.toString(),
          driverName: routeDriverName,
          driverAvatar: routeDriverAvatar,
          time: r.routeInfo.departureTime ? new Date(r.routeInfo.departureTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ""
        } : undefined
      };
    }));
  } catch (error) {
    console.error(`[RequestRouter] ERROR fetching requests:`, error);
    res.status(500).json({ error: "Error fetching requests" });
  }
});

// Update status
const handleUpdateRequestStatus = async (req: AuthRequest, res: any) => {
  logDiagnostic("[REAL REQUEST ARRIVED]", {
    method: req.method,
    url: req.originalUrl,
    user: req.user,
    body: req.body
  });
  console.log("[REAL REQUEST ARRIVED]", {
    method: req.method,
    url: req.originalUrl,
    user: req.user,
    body: req.body
  });
  console.log("[REQUEST ROUTER HIT]", req.method, req.originalUrl);
  try {
    const { status: rawStatus } = req.body;
    const status = String(rawStatus).toLowerCase();
    const requestId = parseInt(req.params.id);
    const userId = parseInt(req.user!.userId);

    console.log({
      method: req.method,
      url: req.url,
      body: req.body,
      user: userId
    });

    if (isNaN(requestId)) {
      console.warn(`[RequestRouter] Invalid requestId format (NaN)`);
      return res.status(400).json({ error: "ID de solicitud inválido." });
    }

    console.log(`[RequestRouter] Updating status to ${status} in database with atomic ACID transaction`);
    let result;
    try {
      result = await db.transaction(async (tx) => {
        // Fetch current request inside the transaction using for("update") to guarantee exclusivity
        const [requestData] = await tx
          .select()
          .from(joinRequests)
          .where(eq(joinRequests.id, requestId))
          .for("update");

        if (!requestData) {
          throw new Error("NOT_FOUND");
        }

        // Fetch current route inside the transaction using for("update") to guarantee exclusivity
        const [routeData] = await tx
          .select()
          .from(routes)
          .where(eq(routes.id, requestData.routeId))
          .for("update");

        if (!routeData) {
          throw new Error("NOT_FOUND");
        }

        console.log("[REQUEST UPDATE]");
        console.log("requestId:", requestId);
        console.log("routeDriverId:", routeData.driverId);
        console.log("jwtUserId:", userId);
        console.log("jwtEmail:", req.user?.email);

        // EVIDENCE LOGS FOR INVESTIGATION
        console.log("================= [DIAGNOSTIC EVIDENCE] ==================");
        console.log(`- requestId: ${requestId}`);
        console.log(`- routeId: ${requestData.routeId}`);
        console.log(`- routeData.driverId: ${routeData.driverId} (${typeof routeData.driverId})`);
        console.log(`- userId extraído del JWT: ${userId} (${typeof userId})`);
        console.log(`- email del usuario autenticado: ${req.user?.email}`);
        console.log(`- estado actual de la solicitud: ${requestData.status}`);
        console.log(`- Comparación (String(routeData.driverId) !== String(userId)): ${String(routeData.driverId) !== String(userId)}`);
        console.log("==========================================================");

        // Authorize current driver
        if (String(routeData.driverId) !== String(userId)) {
          throw new Error("UNAUTHORIZED");
        }

        // If transitioning from non-accepted to accepted, check and decrement atomically
        const currentDbStatus = String(requestData.status).toLowerCase();
        if (status === JoinRequestStatus.ACCEPTED && currentDbStatus !== JoinRequestStatus.ACCEPTED) {
          console.log(`[RequestRouter tx] Attempting atomic seat decrement for route: ${routeData.id}`);
          const seatUpdate = await tx.update(routes)
            .set({ availableSeats: sql`${routes.availableSeats} - 1` })
            .where(and(eq(routes.id, routeData.id), sql`${routes.availableSeats} > 0`))
            .returning();

          if (seatUpdate.length === 0) {
            throw new Error("NO_SEATS");
          }
          console.log(`[RequestRouter tx] Seat decremented safely.`);
        } else if (status !== JoinRequestStatus.ACCEPTED && currentDbStatus === JoinRequestStatus.ACCEPTED) {
          // If we are changing from accepted to something else (e.g. rejected or pending/cancelled), increment back
          console.log(`[RequestRouter tx] Reverting seat allocation, incrementing available seats for route: ${routeData.id}`);
          await tx.update(routes)
            .set({ availableSeats: sql`${routes.availableSeats} + 1` })
            .where(eq(routes.id, routeData.id));
        }

        // Perform the update of the join request status inside the transaction
        const updateResults = await tx.update(joinRequests)
          .set({ status })
          .where(eq(joinRequests.id, requestId))
          .returning();

        if (updateResults.length === 0) {
          throw new Error("NOT_FOUND");
        }

        return {
          updated: updateResults[0],
          passengerId: requestData.passengerId,
          routeId: routeData.id,
          destination: routeData.destination
        };
      });
    } catch (txError: any) {
      if (txError.message === "UNAUTHORIZED") {
        console.log("[403 SOURCE]", "handleUpdateRequestStatus", "txError.message is UNAUTHORIZED. User authenticated is not the driver of the route.");
        return res.status(403).json({ error: "No tienes permiso para actualizar esta solicitud. Solo el conductor de la ruta puede hacerlo." });
      }
      if (txError.message === "NO_SEATS") {
        return res.status(400).json({ error: "No hay asientos disponibles en este viaje." });
      }
      if (txError.message === "NOT_FOUND") {
        return res.status(404).json({ error: "Solicitud de unión no encontrada." });
      }
      throw txError;
    }

    console.log(`[RequestRouter] Successfully updated joinRequest in DB:`, result.updated);

    // Notify passenger
    try {
      const isAccepted = status === JoinRequestStatus.ACCEPTED;
      const notification = isAccepted
        ? NotificationFactory.createRequestApproved(result.passengerId.toString(), result.routeId.toString(), result.destination)
        : NotificationFactory.createRequestRejected(result.passengerId.toString(), result.routeId.toString(), result.destination);
      
      await notificationRepository.create(notification);
      console.log(`[RequestRouter] Created notification for passenger ${result.passengerId}`);
    } catch (notifError) {
      console.error("[RequestRouter] Error creating notification for passenger:", notifError);
    }

    return res.json({
      ...result.updated,
      id: result.updated.id.toString(),
      routeId: result.updated.routeId.toString(),
      passengerId: result.updated.passengerId.toString()
    });
  } catch (error: any) {
    console.error("[RequestRouter] CRITICAL ERROR updating request status:", error);
    return res.status(500).json({ error: error?.message || "Error interno del sistema al actualizar la solicitud." });
  }
};

requestRouter.patch("/:id", authMiddleware, handleUpdateRequestStatus);
requestRouter.post("/:id", authMiddleware, handleUpdateRequestStatus);
requestRouter.post("/:id/state", authMiddleware, handleUpdateRequestStatus);

// Cancel request (Passenger)
const handleCancelRequest = async (req: AuthRequest, res: any) => {
  console.log("[REQUEST ROUTER HIT]", req.method, req.originalUrl);
  try {
    const requestId = parseInt(req.params.id);
    const userId = parseInt(req.user!.userId);

    await db.transaction(async (tx) => {
      const [request] = await tx.select().from(joinRequests).where(eq(joinRequests.id, requestId)).for("update");
      
      if (!request || request.passengerId !== userId) {
        throw new Error("UNAUTHORIZED");
      }

      // If it was accepted, we need to release the seat inside the same transaction
      if (request.status === JoinRequestStatus.ACCEPTED) {
        await tx.update(routes)
          .set({ availableSeats: sql`${routes.availableSeats} + 1` })
          .where(eq(routes.id, request.routeId));
      }

      await tx.delete(joinRequests).where(eq(joinRequests.id, requestId));
    });
    
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      console.log("[403 SOURCE]", "handleCancelRequest", "error.message is UNAUTHORIZED. User authenticated is not the passenger who created the request.");
      return res.status(403).json({ error: "No puedes cancelar esta solicitud" });
    }
    res.status(500).json({ error: "Error cancelling request" });
  }
};

requestRouter.delete("/:id", authMiddleware, handleCancelRequest);
requestRouter.post("/:id/cancel", authMiddleware, handleCancelRequest);
requestRouter.post("/:id/delete", authMiddleware, handleCancelRequest);

export { requestRouter };
