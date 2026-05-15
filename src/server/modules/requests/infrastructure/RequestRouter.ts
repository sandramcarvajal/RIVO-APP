import { Router } from "express";
import { db } from "../../../../db";
import { joinRequests, routes, users } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { DrizzleNotificationRepository } from "../../notifications/infrastructure/DrizzleNotificationRepository";
import { NotificationFactory } from "../../notifications/NotificationFactory";
import { JoinRequestStatus } from "../../../../shared/enums";

const requestRouter = Router();
const notificationRepository = new DrizzleNotificationRepository();

// Create aliases for users table
const passengers = alias(users, "passengers");
const drivers = alias(users, "drivers");

// Create join request
requestRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const routeId = parseInt(req.body.routeId);
    if (isNaN(routeId)) return res.status(400).json({ error: "Invalid routeId" });
    const passengerId = parseInt(req.user!.userId);

    // Get route data to check driver and details
    const [route] = await db.select().from(routes).where(eq(routes.id, routeId));
    if (!route) return res.status(404).json({ error: "Ruta no encontrada" });

    // Check if already exists
    const [existing] = await db.select().from(joinRequests).where(
      and(
        eq(joinRequests.routeId, routeId),
        eq(joinRequests.passengerId, passengerId)
      )
    );

    if (existing) {
      return res.status(400).json({ error: "Ya has enviado una solicitud para esta ruta" });
    }

    const [created] = await db.insert(joinRequests).values({
      routeId,
      passengerId,
      status: JoinRequestStatus.PENDING
    }).returning();

    // Notify driver
    try {
      const notification = NotificationFactory.createNewRequest(
        route.driverId.toString(),
        routeId.toString(),
        route.destination
      );
      await notificationRepository.create(notification);
    } catch (notifError) {
      console.error("[RequestRouter] Error creating notification for driver:", notifError);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("[RequestRouter] Error creating request:", error);
    res.status(500).json({ error: "Error creating join request" });
  }
});

// Get requests for current user
requestRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.user!.userId);
    console.log(`[RequestRouter] Fetching requests for userId: ${userId}`);

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
requestRouter.patch("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { status: rawStatus } = req.body;
    const status = String(rawStatus).toLowerCase();
    const requestId = parseInt(req.params.id);
    const userId = parseInt(req.user!.userId);

    console.log(`[RequestRouter] Updating request ${requestId} to status: ${status} (normalized from ${rawStatus})`);

    // Verify user is driver of the route
    const [requestData] = await db
      .select({
        request: joinRequests,
        route: routes
      })
      .from(joinRequests)
      .innerJoin(routes, eq(joinRequests.routeId, routes.id))
      .where(eq(joinRequests.id, requestId));

    if (!requestData || requestData.route.driverId !== userId) {
      return res.status(403).json({ error: "No tienes permiso para actualizar esta solicitud" });
    }

    const [updated] = await db.update(joinRequests)
      .set({ status })
      .where(eq(joinRequests.id, requestId))
      .returning();

    // Notify passenger
    try {
      // Robust comparison
      const isAccepted = status === JoinRequestStatus.ACCEPTED;
      
      const notification = isAccepted
        ? NotificationFactory.createRequestApproved(requestData.request.passengerId.toString(), requestData.route.id.toString(), requestData.route.destination)
        : NotificationFactory.createRequestRejected(requestData.request.passengerId.toString(), requestData.route.id.toString(), requestData.route.destination);
      
      await notificationRepository.create(notification);
    } catch (notifError) {
      console.error("[RequestRouter] Error creating notification for passenger:", notifError);
    }

    // If approved, update available seats atomically if there are seats left
    if (status === JoinRequestStatus.ACCEPTED) {
       const [route] = await db.select().from(routes).where(eq(routes.id, requestData.route.id));
       if (route.availableSeats <= 0) {
         // Revert status to pending or error out
         await db.update(joinRequests)
           .set({ status: JoinRequestStatus.PENDING })
           .where(eq(joinRequests.id, requestId));
         return res.status(400).json({ error: "No hay asientos disponibles para esta ruta." });
       }

       await db.update(routes)
         .set({ availableSeats: sql`${routes.availableSeats} - 1` })
         .where(and(eq(routes.id, requestData.route.id), sql`${routes.availableSeats} > 0`));
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Error updating request status" });
  }
});

// Cancel request (Passenger)
requestRouter.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const userId = parseInt(req.user!.userId);

    const [request] = await db.select().from(joinRequests).where(eq(joinRequests.id, requestId));
    
    if (!request || request.passengerId !== userId) {
      return res.status(403).json({ error: "No puedes cancelar esta solicitud" });
    }

    // If it was accepted, we need to release the seat
    if (request.status === JoinRequestStatus.ACCEPTED) {
      await db.update(routes)
        .set({ availableSeats: sql`${routes.availableSeats} + 1` })
        .where(eq(routes.id, request.routeId));
    }

    await db.delete(joinRequests).where(eq(joinRequests.id, requestId));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error cancelling request" });
  }
});

export { requestRouter };
