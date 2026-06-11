import { Router } from "express";
import { CreateRouteUseCase } from "../application/CreateRoute";
import { SearchRoutesUseCase } from "../application/SearchRoutes";
import { DrizzleRouteRepository } from "./DrizzleRouteRepository";
import { db } from "../../../../db";
import { routes, joinRequests, users, vehicles, vehicleDocuments, userDocuments, ratings, reports, adminLogs } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { authMiddleware, roleGuard, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { RouteStatus, NotificationType } from "../../../../shared/enums";
import { DrizzleNotificationRepository } from "../../notifications/infrastructure/DrizzleNotificationRepository";
import { NotificationFactory } from "../../notifications/NotificationFactory";
import { CheckCirculationUseCase } from "../../circulation/application/CheckCirculationUseCase";
import { RouteLifecycleManager } from "./RouteLifecycleManager";

const routeRouter = Router();
const notificationRepository = new DrizzleNotificationRepository();

const routeRepository = new DrizzleRouteRepository();
const createRouteUseCase = new CreateRouteUseCase(routeRepository);
const searchRoutesUseCase = new SearchRoutesUseCase(routeRepository);

// Helper to transform domain entity to frontend model
const mapToFrontend = (route: any, currentUserId?: number, userRequests: any[] = []) => {
  const depDate = new Date(route.departureTime);
  
  // Format to standard 24h time in America/Bogota
  const time = depDate.toLocaleTimeString('en-US', {
    timeZone: 'America/Bogota',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });

  // Format to YYYY-MM-DD in America/Bogota
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(depDate);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const date = `${year}-${month}-${day}`;

  let canJoin = false;
  let isParticipant = false;
  let isVisible = true;
  let isExpired = false;

  if (currentUserId) {
    const isDriver = String(route.driverId) === String(currentUserId);
    const hasPendingOrAccepted = userRequests.some(r => String(r.routeId) === String(route.id) && ['pending', 'accepted'].includes(r.status.toLowerCase()));
    
    canJoin = !isDriver &&
              route.status === RouteStatus.SCHEDULED &&
              route.availableSeats > 0 &&
              !hasPendingOrAccepted;

    const isAcceptedPassenger = userRequests.some(r => String(r.routeId) === String(route.id) && r.status.toLowerCase() === 'accepted');
    isParticipant = isDriver || isAcceptedPassenger;

    isVisible = (route.status === RouteStatus.SCHEDULED) || isParticipant;
    isExpired = route.status === RouteStatus.COMPLETED || route.status === RouteStatus.CANCELLED;
  }

  return {
    ...route,
    time,
    date,
    status: route.status,
    canJoin,
    isParticipant,
    isVisible,
    isExpired
  };
};

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
    const driverIdInt = parseInt(req.user!.userId);
    
    // Read selected vehicleId from payload
    const selectedVehicleIdRaw = req.body.vehicleId;
    if (!selectedVehicleIdRaw) {
      console.log(`[RouteRouter] Route creation blocked: vehicleId was not provided in request`);
      return res.status(400).json({
        success: false,
        type: "validation",
        field: "vehicleId",
        error: "Debes seleccionar un vehículo para publicar la ruta.",
        message: "Debes seleccionar un vehículo para publicar la ruta."
      });
    }

    const selectedVehicleId = parseInt(selectedVehicleIdRaw);
    if (isNaN(selectedVehicleId)) {
      return res.status(400).json({
        success: false,
        type: "validation",
        field: "vehicleId",
        error: "ID de vehículo inválido.",
        message: "ID de vehículo inválido."
      });
    }

    // Fetch the specific vehicle belonging to the driver
    const [selectedVehicle] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.userId, driverIdInt), eq(vehicles.id, selectedVehicleId)))
      .limit(1);

    if (!selectedVehicle) {
      console.log(`[RouteRouter] Route creation blocked: driver ${driverIdInt} specified vehicle ${selectedVehicleId} which does not exist or belong to them`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: "vehicleId",
        error: "El vehículo seleccionado no es válido o no pertenece a tu cuenta.",
        message: "El vehículo seleccionado no es válido o no pertenece a tu cuenta."
      });
    }

    // Query SOAT document for this specific vehicle
    const [soatDoc] = await db
      .select()
      .from(vehicleDocuments)
      .where(and(
        eq(vehicleDocuments.vehicleId, selectedVehicle.id),
        eq(vehicleDocuments.documentType, 'soat')
      ))
      .limit(1);

    if (!soatDoc || soatDoc.status?.toLowerCase() !== 'approved') {
      console.log(`[RouteRouter] Route creation blocked: Selected vehicle ${selectedVehicle.id} for driver ${driverIdInt} has no approved SOAT`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: "soat",
        error: "No puedes publicar rutas con este vehículo. Su SOAT no está aprobado.",
        message: "No puedes publicar rutas con este vehículo. Su SOAT no está aprobado."
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiration = soatDoc.expirationDate ? new Date(soatDoc.expirationDate) : null;
    if (expiration && expiration < today) {
      console.log(`[RouteRouter] Route creation blocked: Selected vehicle ${selectedVehicle.id} for driver ${driverIdInt} has expired SOAT`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: "soat",
        error: "El SOAT del vehículo seleccionado está vencido. Actualízalo para publicar rutas.",
        message: "El SOAT del vehículo seleccionado está vencido. Actualízalo para publicar rutas."
      });
    }

    // Query License document for the driver
    const [licenseDoc] = await db
      .select()
      .from(userDocuments)
      .where(and(
        eq(userDocuments.userId, driverIdInt),
        eq(userDocuments.documentType, 'license')
      ))
      .limit(1);

    if (!licenseDoc || licenseDoc.status?.toLowerCase() !== 'approved') {
      console.log(`[RouteRouter] Route creation blocked: driver ${driverIdInt} has no approved driver's license`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: "license",
        error: "No puedes publicar rutas. Debes cargar tu licencia de conducción.",
        message: "No puedes publicar rutas. Debes cargar tu licencia de conducción."
      });
    }

    const licenseExpiration = licenseDoc.expirationDate ? new Date(licenseDoc.expirationDate) : null;
    if (licenseExpiration && licenseExpiration < today) {
      console.log(`[RouteRouter] Route creation blocked: driver ${driverIdInt} has expired driver's license`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: "license",
        error: "Tu licencia de conducción está vencida. Actualízala para continuar publicando.",
        message: "Tu licencia de conducción está vencida. Actualízala para continuar publicando."
      });
    }

    const vehicleId = selectedVehicle.id.toString();
    console.log(`[RouteRouter] Detected selected vehicle with approved SOAT and valid license: ${vehicleId}`);

    // Validate seat capacity capacity rules based on active vehicle type
    const totalSeats = parseInt(req.body.totalSeats);
    const vType = (selectedVehicle.type || 'car').toLowerCase();

    if (isNaN(totalSeats)) {
      return res.status(400).json({
        success: false,
        type: "validation",
        field: "totalSeats",
        error: "La cantidad de cupos debe ser un número válido.",
        message: "La cantidad de cupos debe ser un número válido."
      });
    }

    if (vType === 'motorcycle') {
      if (totalSeats !== 1) {
        console.log(`[RouteRouter] Route creation blocked: Motocicleta requires totalSeats === 1, got ${totalSeats}`);
        return res.status(400).json({
          success: false,
          type: "validation",
          field: "totalSeats",
          error: "Para motocicletas, la capacidad de la ruta debe ser exactamente de 1 pasajero.",
          message: "Para motocicletas, la capacidad de la ruta debe ser exactamente de 1 pasajero."
        });
      }
    } else {
      // Automóvil/Camioneta
      if (totalSeats < 1 || totalSeats > 4) {
        console.log(`[RouteRouter] Route creation blocked: Automóvil/Camioneta requires totalSeats between 1 and 4, got ${totalSeats}`);
        return res.status(400).json({
          success: false,
          type: "validation",
          field: "totalSeats",
          error: "La capacidad de la ruta debe estar entre 1 y 4 pasajeros para automóviles o camionetas.",
          message: "La capacidad de la ruta debe estar entre 1 y 4 pasajeros para automóviles o camionetas."
        });
      }
    }

    // Verification of Pico y Placa Metropolitan Restriction
    try {
      const departureTimeRaw = req.body.departureTime;
      if (!departureTimeRaw) {
        return res.status(400).json({
          success: false,
          type: "validation",
          field: "departureTime",
          error: "La fecha de salida es obligatoria.",
          message: "La fecha de salida es obligatoria."
        });
      }

      console.log(`[RouteRouter] Evaluating Pico y Placa for vehicle plate: ${selectedVehicle.plate} at ${departureTimeRaw}`);
      const checkCirculation = new CheckCirculationUseCase();
      const circulationResult = await checkCirculation.execute({
        plate: selectedVehicle.plate,
        date: departureTimeRaw
      });

      if (!circulationResult.canCirculate) {
        console.warn(`[RouteRouter] Route creation blocked by Pico y Placa restriction: ${circulationResult.reason}`);
        return res.status(400).json({
          success: false,
          type: "validation",
          field: "departureTime",
          error: circulationResult.reason,
          message: circulationResult.reason
        });
      }
      console.log(`[RouteRouter] Pico y Placa evaluation clean. Vehicle can circulate.`);
    } catch (circError: any) {
      console.error("[RouteRouter] Error verifying Pico y Placa:", circError);
      return res.status(400).json({
        success: false,
        type: "validation",
        field: "departureTime",
        error: circError?.message || "Error al verificar la restricción de Pico y Placa.",
        message: circError?.message || "Error al verificar la restricción de Pico y Placa."
      });
    }

    const input = {
      ...req.body,
      driverId: req.user!.userId,
      vehicleId
    };
    const result = await createRouteUseCase.execute(input);

    if (!result.success) {
      const validationError = result as { success: false; type: "validation"; field: string; message: string };
      console.log(`[RouteRouter] Route creation validation failed: ${validationError.message} (field: ${validationError.field})`);
      return res.status(400).json({ 
        success: false,
        type: "validation",
        field: validationError.field,
        error: validationError.message,
        message: validationError.message
      });
    }

    const route = result.route;

    // Notify all passengers that a new route has been created
    try {
      const passengers = await db.select().from(users).where(eq(users.role, 'passenger'));
      console.log(`[RouteRouter] Creating "New Route" notification for ${passengers.length} passengers.`);
      for (const p of passengers) {
        const notification = {
          userId: p.id.toString(),
          title: "🚗 ¡Nueva ruta disponible!",
          description: `Se ha creado una nueva ruta hacia ${route.destination}. ¡Reserva tu cupo ya!`,
          type: NotificationType.SYSTEM,
          data: { routeId: route.id.toString() }
        };
        await notificationRepository.create(notification);
      }
    } catch (notifErr) {
      console.error("[RouteRouter] Error creating new route notifications for passengers:", notifErr);
    }

    res.status(201).json(mapToFrontend(route, parseInt(req.user!.userId), []));
  } catch (error) {
    console.error(`[RouteRouter] CRITICAL SYSTEM ERROR creating route:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal system error creating route" });
  }
});

  // Update route status (Lifecycle)
  const handleUpdateStatus = async (req: AuthRequest, res: any) => {
    try {
      const { status: rawStatus } = req.body;
      const status = String(rawStatus).toLowerCase();
      const routeId = parseInt(req.params.id);
      const userId = parseInt(req.user!.userId);

      console.log(`[RouteRouter] Updating route ${routeId} to status: ${status} (normalized from ${rawStatus})`);

      const [route] = await db.select().from(routes).where(eq(routes.id, routeId));
      if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
      
      if (String(route.driverId) !== String(userId) && req.user!.role !== 'admin') {
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

      // Fetch accepted passengers BEFORE we make updates, to successfully notify them
      const acceptedPassengers = await db.select().from(joinRequests).where(and(
        eq(joinRequests.routeId, routeId),
        eq(joinRequests.status, 'accepted')
      ));

      let updated: any;
      if (status === 'cancelled') {
        console.log(`[RouteRouter] Executing Route Cancel TRANSACTION for Route ID: ${routeId}`);
        await db.transaction(async (tx) => {
          // 1. Update route status and restore availableSeats capacity
          const [routed] = await tx.update(routes)
            .set({ 
              status: 'cancelled', 
              availableSeats: route.totalSeats 
            })
            .where(eq(routes.id, routeId))
            .returning();
          
          updated = routed;

          // 2. Update join_requests to 'cancelled_by_driver' for 'pending' or 'accepted'
          await tx.update(joinRequests)
            .set({ status: 'cancelled_by_driver' })
            .where(and(
              eq(joinRequests.routeId, routeId),
              or(
                eq(joinRequests.status, 'pending'),
                eq(joinRequests.status, 'accepted')
              )
            ));
        });
        console.log(`[RouteRouter] Route Cancel TRANSACTION completed successfully!`);
      } else {
        updated = await routeRepository.update(req.params.id, { status: status as RouteStatus });
      }

      // NOTIFY PASSENGERS
      try {
        console.log(`[RouteRouter] Notifying ${acceptedPassengers.length} passengers for status ${status}`);

        for (const p of acceptedPassengers) {
          let notification;
          if (status === RouteStatus.IN_PROGRESS) {
             notification = NotificationFactory.createTripStarted(p.passengerId.toString(), routeId.toString(), route.destination);
          } else if (status === RouteStatus.COMPLETED) {
             notification = NotificationFactory.createTripCompleted(p.passengerId.toString(), routeId.toString(), route.destination);
          } else if (status === RouteStatus.CANCELLED || status === 'cancelled') {
             notification = NotificationFactory.createRouteCancelled(p.passengerId.toString(), routeId.toString(), route.destination);
          }
          
          if (notification) {
            await notificationRepository.create(notification);
          }
        }
      } catch (notifErr) {
        console.error("[RouteRouter] Error creating lifecycle notifications:", notifErr);
      }

      res.json(mapToFrontend(updated, userId, []));
    } catch (error: any) {
      console.error("[RouteRouter] Error in PATCH /:id/status or state:", error);
      res.status(500).json({ error: error?.message || "Error updating route status" });
    }
  };

  routeRouter.patch("/:id/status", authMiddleware, roleGuard(['driver', 'admin']), handleUpdateStatus);
  routeRouter.patch("/:id/state", authMiddleware, roleGuard(['driver', 'admin']), handleUpdateStatus);
  routeRouter.post("/:id/status", authMiddleware, roleGuard(['driver', 'admin']), handleUpdateStatus);
  routeRouter.post("/:id/state", authMiddleware, roleGuard(['driver', 'admin']), handleUpdateStatus);

routeRouter.get("/admin/analytics/stats", authMiddleware, roleGuard(['admin']), async (req: AuthRequest, res) => {
  try {
    console.log("[RouteRouter] GET /admin/analytics/stats - Fetching real stats...");
    
    // Fetch users
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const drivers = allUsers.filter(u => u.role?.toLowerCase() === 'driver').length;
    const passengers = allUsers.filter(u => u.role?.toLowerCase() === 'passenger').length;

    // Fetch vehicles
    const allVehicles = await db.select().from(vehicles);
    const totalVehicles = allVehicles.length;
    const pendingVehicles = allVehicles.filter(v => v.verifiedStatus?.toLowerCase() === 'pending').length;

    // Fetch routes
    const allRoutes = await db.select().from(routes);
    const activeRoutes = allRoutes.filter(r => r.status?.toLowerCase() === 'scheduled' || r.status?.toLowerCase() === 'in_progress').length;
    const completedRoutes = allRoutes.filter(r => r.status?.toLowerCase() === 'completed').length;

    // Fetch ratings/reviews and calculate average rating
    const allRatings = await db.select().from(ratings);
    let averageRating = 4.91; // Default fallback
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((runningSum, r) => runningSum + (r.score || 0), 0);
      averageRating = sum / allRatings.length;
    }

    // Fetch requests
    const allRequests = await db.select().from(joinRequests);

    // Build real recent activity list from players as requested in Sprint 3
    // 1. Usuario registrado
    const userEvents = allUsers.map(u => {
      let displayName = u.email;
      if (u.profileData) {
        try {
          const prof = JSON.parse(u.profileData);
          if (prof.name) displayName = prof.name;
        } catch (_) {}
      }
      return {
        id: `user-reg-${u.id}`,
        type: 'user_registered',
        title: 'Usuario registrado',
        name: displayName,
        timestamp: u.createdAt || new Date()
      };
    });

    // 2. Vehículo registrado
    const vehicleEvents = allVehicles.map(v => {
      const owner = allUsers.find(u => u.id === v.userId);
      let ownerName = owner?.email || 'Propietario';
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          if (prof.name) ownerName = prof.name;
        } catch (_) {}
      }
      return {
        id: `veh-reg-${v.id}`,
        type: 'vehicle_registered',
        title: 'Vehículo registrado',
        name: `${v.brand || 'Vehículo'} (${v.plate}) - De: ${ownerName}`,
        timestamp: v.createdAt || new Date()
      };
    });

    // 3. Ruta creada & 8. Ruta cancelada
    const routeEvents: any[] = [];
    allRoutes.forEach(r => {
      // Create event
      routeEvents.push({
        id: `route-created-${r.id}`,
        type: 'route_created',
        title: 'Ruta creada',
        name: `${r.origin} ➔ ${r.destination}`,
        timestamp: r.createdAt || new Date()
      });

      // Cancelled event
      if (r.status?.toLowerCase() === 'cancelled') {
        routeEvents.push({
          id: `route-cancelled-${r.id}`,
          type: 'route_cancelled',
          title: 'Ruta cancelada',
          name: `${r.origin} ➔ ${r.destination} (Cancelado)`,
          timestamp: r.createdAt || new Date()
        });
      }
    });

    // 4. Solicitud de viaje creada, 6. Solicitud aprobada, 7. Solicitud rechazada
    const requestEvents: any[] = [];
    allRequests.forEach(req => {
      const passenger = allUsers.find(u => u.id === req.passengerId);
      let passengerName = passenger?.email || 'Pasajero';
      if (passenger?.profileData) {
        try {
          const prof = JSON.parse(passenger.profileData);
          if (prof.name) passengerName = prof.name;
        } catch (_) {}
      }
      const routeObj = allRoutes.find(r => r.id === req.routeId);
      const routeStr = routeObj ? `${routeObj.origin} ➔ ${routeObj.destination}` : 'Ruta';

      // 4. Solicitud de viaje creada
      requestEvents.push({
        id: `req-created-${req.id}`,
        type: 'request_created',
        title: 'Solicitud de viaje creada',
        name: `${passengerName} solicita unirse a ${routeStr}`,
        timestamp: req.createdAt || new Date()
      });

      // 6. Solicitud aprobada
      if (req.status?.toLowerCase() === 'accepted' || req.status?.toLowerCase() === 'approved') {
        requestEvents.push({
          id: `req-approved-${req.id}`,
          type: 'request_approved',
          title: 'Solicitud aprobada',
          name: `Viaje aprobado para ${passengerName} en ${routeStr}`,
          timestamp: req.createdAt || new Date()
        });
      }

      // 7. Solicitud rechazada
      if (req.status?.toLowerCase() === 'rejected' || req.status?.toLowerCase() === 'cancelled') {
        requestEvents.push({
          id: `req-rejected-${req.id}`,
          type: 'request_rejected',
          title: 'Solicitud rechazada',
          name: `Unión de ${passengerName} rechazada/cancelada para ${routeStr}`,
          timestamp: req.createdAt || new Date()
        });
      }
    });

    // 5. Calificación recibida
    const ratingEvents = allRatings.map(rat => {
      const fromUser = allUsers.find(u => u.id === rat.fromUserId);
      const toUser = allUsers.find(u => u.id === rat.toUserId);
      let fromName = fromUser?.email || 'Pasajero';
      if (fromUser?.profileData) {
        try {
          const prof = JSON.parse(fromUser.profileData);
          if (prof.name) fromName = prof.name;
        } catch (_) {}
      }
      let toName = toUser?.email || 'Chofer';
      if (toUser?.profileData) {
        try {
          const prof = JSON.parse(toUser.profileData);
          if (prof.name) toName = prof.name;
        } catch (_) {}
      }
      return {
        id: `rat-received-${rat.id}`,
        type: 'rating_received',
        title: 'Calificación recibida',
        name: `${fromName} calificó a ${toName} con ${rat.score}★ "${rat.comment || 'Sin comentarios'}"`,
        timestamp: rat.createdAt || new Date()
      };
    });

    const recentActivity = [
      ...userEvents,
      ...vehicleEvents,
      ...routeEvents,
      ...requestEvents,
      ...ratingEvents
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    console.log("[RouteRouter] Admin analytics stats and Sprint 3 recent activity computed successfully!");
    res.json({
      totalUsers,
      drivers,
      passengers,
      totalVehicles,
      pendingVehicles,
      activeRoutes,
      completedRoutes,
      averageRating,
      recentActivity
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error compiling admin analytics stats:", err);
    res.status(500).json({ error: "Error al calcular las métricas administrativas." });
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
routeRouter.get("/active", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.user!.userId);
    console.log(`[RouteRouter] Fetching active routes for user: ${userId}`);

    // First do runtime state recovery transition (scheduled -> in_progress and completed)
    await RouteLifecycleManager.performJitTransitions();

    const results = await db
      .select({
        route: routes,
        driverProfile: users.profileData,
        driverEmail: users.email
      })
      .from(routes)
      .leftJoin(users, eq(routes.driverId, users.id))
      .where(
        and(
          eq(routes.isActive, true),
          or(
            // 1. Marketplace public paths: strictly currently scheduled
            eq(routes.status, RouteStatus.SCHEDULED),
            // 2. Paths where current user is driver
            eq(routes.driverId, userId),
            // 3. Paths where current user is passenger (has joinRequest)
            sql`EXISTS (
              SELECT 1 FROM ${joinRequests}
              WHERE ${joinRequests.routeId} = ${routes.id}
              AND ${joinRequests.passengerId} = ${userId}
            )`
          )
        )
      );

    console.log(`[RouteRouter] Found ${results.length} active/participating routes for user ${userId}`);

    const mappedEntities = results.map(row => {
      let driverName = "Conductor";
      let driverAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
      
      const { route, driverProfile, driverEmail } = row;
      
      if (driverProfile) {
        try {
          const profile = typeof driverProfile === 'string' ? JSON.parse(driverProfile) : driverProfile;
          driverName = profile.name || driverName;
          driverAvatar = profile.avatar || driverAvatar;
        } catch (e) {}
      }

      if (driverName === "Conductor" && driverEmail) {
        driverName = driverEmail.split('@')[0];
      }

      return {
        id: route.id.toString(),
        driverId: route.driverId.toString(),
        vehicleId: route.vehicleId?.toString() || undefined,
        driverName,
        driverAvatar,
        origin: route.origin,
        originCoords: route.originCoords ?? undefined,
        destination: route.destination,
        destinationCoords: route.destinationCoords ?? undefined,
        departureTime: route.departureTime,
        totalSeats: route.totalSeats,
        availableSeats: route.availableSeats,
        status: route.status as RouteStatus,
        price: route.price,
        polyline: route.polyline ?? undefined,
        createdAt: route.createdAt ?? new Date()
      };
    });

    const userRequests = await db.select().from(joinRequests).where(eq(joinRequests.passengerId, userId));
    res.json(mappedEntities.map(route => mapToFrontend(route, userId, userRequests)));
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
    const userIdInt = parseInt(userId);
    res.json(results.map(route => mapToFrontend(route, userIdInt, [])));
  } catch (error) {
    console.error(`[RouteRouter] ERROR fetching personal routes:`, error);
    res.status(500).json({ error: "Error fetching personal routes" });
  }
});

// Public/Authenticated: Search routes
routeRouter.get("/search", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.user!.userId);
    const { origin, destination } = req.query;
    const results = await searchRoutesUseCase.execute({ 
      origin: origin as string, 
      destination: destination as string 
    });
    const userRequests = await db.select().from(joinRequests).where(eq(joinRequests.passengerId, userId));
    res.json(results.map(route => mapToFrontend(route, userId, userRequests)));
  } catch (error) {
    res.status(500).json({ error: "Error searching routes" });
  }
});

// Admin/Driver/User: Endpoint to manually force immediate running of the 11:59PM unfinalized routes sweeper/auto-finalizer
routeRouter.post("/auto-finalize", authMiddleware, async (req, res) => {
  try {
    const { autoFinalizeUnfinishedRoutes } = await import("./RouteAutoFinalizer");
    await autoFinalizeUnfinishedRoutes();
    res.json({ success: true, message: "Auto-finalización de rutas no cerradas ejecutada correctamente." });
  } catch (error: any) {
    console.error("[RouteRouter] Manual auto-finalization execution failed:", error);
    res.status(500).json({ error: error.message || "Error al ejecutar auto-finalización manualmente" });
  }
});

routeRouter.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.user!.userId);
    const route = await routeRepository.findById(req.params.id);
    if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
    const userRequests = await db.select().from(joinRequests).where(eq(joinRequests.passengerId, userId));
    res.json(mapToFrontend(route, userId, userRequests));
  } catch (error) {
    res.status(500).json({ error: "Error fetching route" });
  }
});

// ==========================================
// SPRINT 4 - ADMIN OPERATIONS REAL BACKEND
// ==========================================

// 1. Get all users
routeRouter.get("/admin/users/all", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers.map(u => {
      let displayName = "";
      let phone = "";
      let isDisabled = false;
      if (u.profileData) {
        try {
          const prof = JSON.parse(u.profileData);
          displayName = prof.name || prof.username || "";
          phone = prof.phone || "";
          isDisabled = !!prof.isDisabled;
        } catch (_) {}
      }
      return {
        id: u.id.toString(),
        email: u.email,
        role: u.role,
        rating: u.rating,
        reviewCount: u.reviewCount,
        createdAt: u.createdAt,
        displayName,
        phone,
        isDisabled
      };
    }));
  } catch (err: any) {
    console.error("[RouteRouter] Error getting admin users:", err);
    res.status(500).json({ error: "Error al recuperar los usuarios" });
  }
});

// 2. Toggle user active/blocked status safely within profileData JSON (without DB structural changes)
routeRouter.patch("/admin/users/:id/toggle-status", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    let profileObj: any = {};
    if (user.profileData) {
      try {
        profileObj = JSON.parse(user.profileData);
      } catch (_) {
        profileObj = { name: user.email.split("@")[0] };
      }
    }
    
    // Toggle state
    profileObj.isDisabled = !profileObj.isDisabled;
    
    const [updatedUser] = await db
      .update(users)
      .set({
        profileData: JSON.stringify(profileObj)
      })
      .where(eq(users.id, userId))
      .returning();

    // Log admin action
    const adminId = parseInt((req as any).user!.userId);
    await db.insert(adminLogs).values({
      adminId,
      action: profileObj.isDisabled ? "user_suspended" : "user_activated",
      targetId: userId.toString(),
      details: `Usuario ${user.email} fue ${profileObj.isDisabled ? "suspendido" : "reactivado"} por el Administrador.`
    });
      
    res.json({
      success: true,
      user: {
        id: updatedUser.id.toString(),
        email: updatedUser.email,
        role: updatedUser.role,
        displayName: profileObj.name || "",
        phone: profileObj.phone || "",
        isDisabled: !!profileObj.isDisabled
      }
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error toggling user status:", err);
    res.status(500).json({ error: "Error al actualizar estado del usuario" });
  }
});

// 3. Get all vehicles with nested documents and owners info
routeRouter.get("/admin/vehicles/all", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allVehicles = await db.select().from(vehicles);
    const allDocs = await db.select().from(vehicleDocuments);
    
    const results = allVehicles.map(v => {
      const owner = allUsers.find(u => u.id === v.userId);
      let ownerName = "";
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          ownerName = prof.name || prof.username || "";
        } catch (_) {}
      }
      
      const vDocs = allDocs.filter(d => d.vehicleId === v.id).map(d => ({
        id: d.id.toString(),
        vehicleId: d.vehicleId.toString(),
        documentType: d.documentType,
        fileUrl: d.fileUrl,
        status: d.status,
        expirationDate: d.expirationDate,
        expirationStatus: d.expirationStatus,
        rejectReason: d.rejectReason,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        documentName: d.documentName,
        uploadedAt: d.uploadedAt
      }));
      
      return {
        id: v.id.toString(),
        userId: v.userId.toString(),
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        color: v.color,
        type: v.type,
        isActive: v.isActive,
        availabilityStatus: v.availabilityStatus,
        verifiedStatus: v.verifiedStatus,
        rejectReason: v.rejectReason,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        ownerEmail: owner?.email || "",
        ownerName: ownerName || owner?.email || "Conductor de Rivo",
        documents: vDocs
      };
    });
    
    res.json(results);
  } catch (err: any) {
    console.error("[RouteRouter] Error getting admin vehicles:", err);
    res.status(500).json({ error: "Error al recuperar los vehículos" });
  }
});

// 4. Verify/Approve/Reject vehicle
routeRouter.post("/admin/vehicles/:id/verify", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.id);
    const { status, rejectReason } = req.body;
    
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return res.status(400).json({ error: "Estado no válido." });
    }
    
    const [updated] = await db
      .update(vehicles)
      .set({
        verifiedStatus: status,
        rejectReason: status === "rejected" ? (rejectReason || "No cumple con las normativas públicas de Rivo.") : null,
        verifiedAt: new Date(),
        verifiedBy: parseInt((req as any).user!.userId),
        updatedAt: new Date()
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: "Vehículo no encontrado." });
    }

    // Log admin action
    const adminId = parseInt((req as any).user!.userId);
    await db.insert(adminLogs).values({
      adminId,
      action: status === "approved" ? "vehicle_approved" : "vehicle_rejected",
      targetId: vehicleId.toString(),
      details: status === "approved" 
        ? `Vehículo con placa ${updated.plate} fue aprobado.` 
        : `Vehículo con placa ${updated.plate} fue rechazado. Motivo: ${rejectReason || "No cumple con las normativas públicas de Rivo."}`
    });
    
    res.json({
      success: true,
      vehicle: {
        ...updated,
        id: updated.id.toString(),
        userId: updated.userId.toString()
      }
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error verifying vehicle:", err);
    res.status(500).json({ error: "Error al verificar el vehículo" });
  }
});

// 5. Get all audit documents
routeRouter.get("/admin/documents/all", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    const allVehicles = await db.select().from(vehicles);
    const allVehicleDocs = await db.select().from(vehicleDocuments);
    const allUserDocs = await db.select().from(userDocuments);
    
    const mappedVehDocs = allVehicleDocs.map(d => {
      const vehicle = allVehicles.find(v => v.id === d.vehicleId);
      const owner = vehicle ? allUsers.find(u => u.id === vehicle.userId) : null;
      let ownerName = "";
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          ownerName = prof.name || "";
        } catch (_) {}
      }
      return {
        id: d.id.toString(),
        sourceType: "vehicle",
        targetId: d.vehicleId.toString(),
        documentType: d.documentType,
        fileUrl: d.fileUrl,
        status: d.status,
        expirationDate: d.expirationDate,
        expirationStatus: d.expirationStatus,
        rejectReason: d.rejectReason,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        documentName: d.documentName || `${d.documentType === 'soat' ? 'SOAT' : d.documentType === 'property_card' ? 'Tarjeta de Propiedad' : 'Revisión Técnica'} - ${vehicle?.plate || 'Vehículo'}`,
        uploadedAt: d.uploadedAt,
        ownerName: ownerName || owner?.email || "Conductor",
        ownerEmail: owner?.email || "",
        plate: vehicle?.plate || ""
      };
    });
    
    const mappedUserDocs = allUserDocs.map(d => {
      const owner = allUsers.find(u => u.id === d.userId);
      let ownerName = "";
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          ownerName = prof.name || "";
        } catch (_) {}
      }
      return {
        id: d.id.toString(),
        sourceType: "user",
        targetId: d.userId.toString(),
        documentType: d.documentType,
        fileUrl: d.fileUrl,
        status: d.status,
        expirationDate: d.expirationDate,
        expirationStatus: d.expirationStatus,
        rejectReason: d.rejectReason,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        documentName: d.documentName || `Licencia de Conducción`,
        uploadedAt: d.uploadedAt,
        ownerName: ownerName || owner?.email || "Usuario",
        ownerEmail: owner?.email || "",
        plate: ""
      };
    });
    
    res.json([...mappedVehDocs, ...mappedUserDocs]);
  } catch (err: any) {
    console.error("[RouteRouter] Error getting admin documents:", err);
    res.status(500).json({ error: "Error al recuperar los documentos de auditoría" });
  }
});

// 6. Verify specific document
routeRouter.post("/admin/documents/:sourceType/:id/verify", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const { sourceType, id } = req.params;
    const { status, rejectReason } = req.body;
    const docId = parseInt(id);
    const adminId = parseInt((req as any).user!.userId);
    
    if (status !== "approved" && status !== "rejected" && status !== "pending") {
      return res.status(400).json({ error: "Estado no válido." });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (sourceType === "vehicle") {
      const [existing] = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.id, docId)).limit(1);
      if (!existing) return res.status(404).json({ error: "Documento de vehículo no encontrado" });
      
      const isExpired = existing.expirationDate ? existing.expirationDate < today : false;
      const expStatus = isExpired ? "expired" : "valid";
      
      const [updated] = await db
        .update(vehicleDocuments)
        .set({
          status,
          expirationStatus: expStatus,
          rejectReason: status === "rejected" ? (rejectReason || "No cumple los requisitos visuales de Rivo.") : null,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(vehicleDocuments.id, docId))
        .returning();

      // Log admin action
      await db.insert(adminLogs).values({
        adminId,
        action: status === "approved" ? "document_approved" : "document_rejected",
        targetId: docId.toString(),
        details: `Documento de vehículo (${updated.documentType}) fue ${status === "approved" ? "aprobado" : "rechazado"}.`
      });
        
      try {
        const vehicleId = updated.vehicleId;
        const allDocs = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, vehicleId));
        
        const hasApprovedSoat = allDocs.some(d => d.documentType === "soat" && d.status === "approved");
        const hasApprovedPropCard = allDocs.some(d => d.documentType === "property_card" && d.status === "approved");
        const hasApprovedTechPrev = allDocs.some(d => d.documentType === "tech_preventive" && d.status === "approved");
        
        if (hasApprovedSoat && hasApprovedPropCard && hasApprovedTechPrev) {
          await db
            .update(vehicles)
            .set({ 
              verifiedStatus: "approved",
              verifiedAt: new Date(),
              verifiedBy: adminId,
              rejectReason: null
            })
            .where(eq(vehicles.id, vehicleId));
          console.log(`[RouteRouter] Auto-approved vehicle ID ${vehicleId} because all 3 documents are approved.`);
        } else {
          const hasRejected = allDocs.some(d => d.status === "rejected");
          await db
            .update(vehicles)
            .set({ verifiedStatus: hasRejected ? "rejected" : "pending" })
            .where(eq(vehicles.id, vehicleId));
        }
      } catch (err) {
        console.error("[RouteRouter] Error auto-verifying overall vehicle status:", err);
      }
      
      return res.json({ success: true, document: updated });
    } else if (sourceType === "user") {
      const [existing] = await db.select().from(userDocuments).where(eq(userDocuments.id, docId)).limit(1);
      if (!existing) return res.status(404).json({ error: "Documento de usuario no encontrado" });
      
      const isExpired = existing.expirationDate ? existing.expirationDate < today : false;
      const expStatus = isExpired ? "expired" : "valid";
      
      const [updated] = await db
        .update(userDocuments)
        .set({
          status,
          expirationStatus: expStatus,
          rejectReason: status === "rejected" ? (rejectReason || "No cumple los requisitos de la licencia.") : null,
          verifiedAt: new Date(),
          verifiedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(userDocuments.id, docId))
        .returning();

      // Log admin action
      await db.insert(adminLogs).values({
        adminId,
        action: status === "approved" ? "document_approved" : "document_rejected",
        targetId: docId.toString(),
        details: `Licencia de conducción del usuario fue ${status === "approved" ? "aprobada" : "rechazada"}.`
      });
        
      return res.json({ success: true, document: updated });
    } else {
      return res.status(400).json({ error: "Tipo de origen de documento no válido" });
    }
  } catch (err: any) {
    console.error("[RouteRouter] Error verifying document:", err);
    res.status(500).json({ error: "Error al verificar el documento" });
  }
});

// ==========================================
// SPRINT 5 - MODERACIÓN Y GOBIERNO DE RIVO
// ==========================================

// 7. Create custom report against passenger or driver
routeRouter.post("/admin/reports/create", authMiddleware, async (req, res) => {
  try {
    const reporterId = parseInt((req as any).user!.userId);
    const { reportedUserId, reason, description } = req.body;
    
    if (!reportedUserId || !reason || !description) {
      return res.status(400).json({ error: "Campos obligatorios faltantes" });
    }
    
    const [newReport] = await db.insert(reports).values({
      reporterId,
      reportedUserId: parseInt(reportedUserId),
      reason,
      description,
      status: "pending",
      createdAt: new Date()
    }).returning();
    
    res.json({ success: true, report: newReport });
  } catch (err: any) {
    console.error("[RouteRouter] Error creating report:", err);
    res.status(500).json({ error: "Error al crear el reporte de moderación" });
  }
});

// 8. Get all reports for Admin View
routeRouter.get("/admin/reports/all", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const allReports = await db.select().from(reports);
    const allUsers = await db.select().from(users);
    
    const results = allReports.map(r => {
      const reporter = allUsers.find(u => u.id === r.reporterId);
      const reported = allUsers.find(u => u.id === r.reportedUserId);
      
      let reporterName = reporter?.email || "";
      if (reporter?.profileData) {
        try {
          const prof = JSON.parse(reporter.profileData);
          reporterName = prof.name || reporter.email;
        } catch (_) {}
      }
      
      let reportedName = reported?.email || "";
      let reportedPhone = "";
      if (reported?.profileData) {
        try {
          const prof = JSON.parse(reported.profileData);
          reportedName = prof.name || reported.email;
          reportedPhone = prof.phone || "";
        } catch (_) {}
      }
      
      return {
        id: r.id.toString(),
        reporterId: r.reporterId.toString(),
        reporterName,
        reporterEmail: reporter?.email || "",
        reportedUserId: r.reportedUserId.toString(),
        reportedName,
        reportedEmail: reported?.email || "",
        reportedPhone,
        reportedRole: reported?.role || "passenger",
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt
      };
    });
    
    // Sort by newest first
    results.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    res.json(results);
  } catch (err: any) {
    console.error("[RouteRouter] Error returning reports:", err);
    res.status(500).json({ error: "Error al recuperar los reportes de incidentes" });
  }
});

// 9. Update report status by admin
routeRouter.patch("/admin/reports/:id/status", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!["pending", "reviewing", "resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ error: "Estado de reporte no válido" });
    }
    
    const [updated] = await db
      .update(reports)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(reports.id, reportId))
      .returning();
      
    if (!updated) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }
    
    res.json({ success: true, report: updated });
  } catch (err: any) {
    console.error("[RouteRouter] Error updating report:", err);
    res.status(500).json({ error: "Error al actualizar estado del reporte" });
  }
});

// 10. Get all Administrative logs for audit log view
routeRouter.get("/admin/logs/all", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const logs = await db.select().from(adminLogs);
    const allUsers = await db.select().from(users);
    
    const results = logs.map(l => {
      const admin = allUsers.find(u => u.id === l.adminId);
      let adminName = admin?.email || "";
      if (admin?.profileData) {
        try {
          const prof = JSON.parse(admin.profileData);
          adminName = prof.name || admin.email;
        } catch (_) {}
      }
      
      return {
        id: l.id.toString(),
        adminId: l.adminId.toString(),
        adminName,
        adminEmail: admin?.email || "",
        action: l.action,
        targetId: l.targetId,
        details: l.details,
        createdAt: l.createdAt
      };
    });
    
    results.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    res.json(results);
  } catch (err: any) {
    console.error("[RouteRouter] Error loading admin logs:", err);
    res.status(500).json({ error: "Error al recuperar bítacora de auditoría" });
  }
});

// 11. Get Risk Alerts and Incident Panel statistics
routeRouter.get("/admin/moderation/stats", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Fetch tables
    const allUsers = await db.select().from(users);
    const allVehicles = await db.select().from(vehicles);
    const allVehicleDocs = await db.select().from(vehicleDocuments);
    const allUserDocs = await db.select().from(userDocuments);
    const allReports = await db.select().from(reports);
    const allRoutes = await db.select().from(routes);
    
    // 2. Identify Suspended Users
    const suspendedUsers = allUsers.filter(u => {
      if (u.profileData) {
        try {
          const prof = JSON.parse(u.profileData);
          return !!prof.isDisabled;
        } catch (_) {}
      }
      return false;
    }).map(u => {
      let displayName = "";
      if (u.profileData) {
        try {
          const prof = JSON.parse(u.profileData);
          displayName = prof.name || "";
        } catch (_) {}
      }
      return {
        id: u.id.toString(),
        email: u.email,
        role: u.role,
        displayName: displayName || u.email.split("@")[0]
      };
    });
    
    // 3. Identify Rejected Vehicles
    const rejectedVehicles = allVehicles.filter(v => v.verifiedStatus === "rejected").map(v => {
      const owner = allUsers.find(u => u.id === v.userId);
      return {
        id: v.id.toString(),
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        ownerEmail: owner?.email || "",
        rejectReason: v.rejectReason,
        verifiedAt: v.verifiedAt
      };
    });
    
    // 4. Identify Expired Documents
    const expiredVehicleDocs = allVehicleDocs.filter(d => d.expirationDate && d.expirationDate < today).map(d => {
      const vehicle = allVehicles.find(v => v.id === d.vehicleId);
      const owner = vehicle ? allUsers.find(u => u.id === vehicle.userId) : null;
      return {
        id: d.id.toString(),
        sourceType: "vehicle",
        documentType: d.documentType,
        documentName: d.documentName || d.documentType.toUpperCase(),
        expirationDate: d.expirationDate,
        ownerEmail: owner?.email || "",
        plate: vehicle?.plate || ""
      };
    });
    
    const expiredUserDocs = allUserDocs.filter(d => d.expirationDate && d.expirationDate < today).map(d => {
      const owner = allUsers.find(u => u.id === d.userId);
      return {
        id: d.id.toString(),
        sourceType: "user",
        documentType: d.documentType,
        documentName: d.documentName || "Licencia",
        expirationDate: d.expirationDate,
        ownerEmail: owner?.email || "",
        plate: ""
      };
    });
    
    const expiredDocuments = [...expiredVehicleDocs, ...expiredUserDocs];
    
    // 5. Open Reports count
    const openReportsCount = allReports.filter(r => r.status === "pending" || r.status === "reviewing").length;
    
    // === RISK ALERTS (FASE 4) ===
    
    // A. Under-rated drivers (rating < 4.0)
    const lowRatedDrivers = allUsers.filter(u => u.role === "driver" && u.rating && parseFloat(u.rating) < 4.0).map(u => {
      let displayName = "";
      if (u.profileData) {
        try {
          const prof = JSON.parse(u.profileData);
          displayName = prof.name || "";
        } catch (_) {}
      }
      return {
        id: u.id.toString(),
        email: u.email,
        rating: u.rating,
        reviewCount: u.reviewCount,
        displayName: displayName || u.email.split("@")[0]
      };
    });
    
    // B. Users with multiple reports (>= 2 reports against them)
    const reportCountMap: Record<number, number> = {};
    allReports.forEach(r => {
      reportCountMap[r.reportedUserId] = (reportCountMap[r.reportedUserId] || 0) + 1;
    });
    
    const usersWithMultipleReports = Object.entries(reportCountMap)
      .filter(([userId, count]) => count >= 2)
      .map(([userIdStr, count]) => {
        const targetUserId = parseInt(userIdStr);
        const reportedUser = allUsers.find(u => u.id === targetUserId);
        let displayName = "";
        if (reportedUser?.profileData) {
          try {
            const prof = JSON.parse(reportedUser.profileData);
            displayName = prof.name || "";
          } catch (_) {}
        }
        return {
          id: userIdStr,
          email: reportedUser?.email || "",
          role: reportedUser?.role || "passenger",
          displayName: displayName || reportedUser?.email.split("@")[0] || "Usuario",
          reportCount: count
        };
      });
      
    // C. Recurring cancellations (drivers with >= 2 cancelled routes, or passenger cancellation metrics if available)
    const driverCancellationMap: Record<number, number> = {};
    allRoutes.filter(r => r.status === "cancelled").forEach(r => {
      driverCancellationMap[r.driverId] = (driverCancellationMap[r.driverId] || 0) + 1;
    });
    
    const recurringCancellations = Object.entries(driverCancellationMap)
      .filter(([driverId, count]) => count >= 2)
      .map(([driverIdStr, count]) => {
        const targetDriverId = parseInt(driverIdStr);
        const driver = allUsers.find(u => u.id === targetDriverId);
        let displayName = "";
        if (driver?.profileData) {
          try {
            const prof = JSON.parse(driver.profileData);
            displayName = prof.name || "";
          } catch (_) {}
        }
        return {
          id: driverIdStr,
          email: driver?.email || "",
          displayName: displayName || driver?.email.split("@")[0] || "Conductor",
          cancellationCount: count
        };
      });
      
    res.json({
      incidents: {
        suspendedUsers,
        rejectedVehicles,
        expiredDocuments,
        openReportsCount
      },
      riskAlerts: {
        lowRatedDrivers,
        usersWithMultipleReports,
        recurringCancellations
      }
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error returning moderation stats:", err);
    res.status(500).json({ error: "Error al calcular alertas de riesgo" });
  }
});

export { routeRouter };
