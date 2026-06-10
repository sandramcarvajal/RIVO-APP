import { Router } from "express";
import { CreateRouteUseCase } from "../application/CreateRoute";
import { SearchRoutesUseCase } from "../application/SearchRoutes";
import { DrizzleRouteRepository } from "./DrizzleRouteRepository";
import { db } from "../../../../db";
import { routes, joinRequests, users, vehicles, vehicleDocuments, userDocuments } from "../../../../db/schema";
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

export { routeRouter };
