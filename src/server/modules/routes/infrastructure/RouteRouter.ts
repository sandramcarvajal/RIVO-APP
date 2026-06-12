import { Router } from "express";
import bcrypt from "bcryptjs";
import { CreateRouteUseCase } from "../application/CreateRoute";
import { SearchRoutesUseCase } from "../application/SearchRoutes";
import { DrizzleRouteRepository } from "./DrizzleRouteRepository";
import { db } from "../../../../db";
import { routes, joinRequests, users, vehicles, vehicleDocuments, userDocuments, ratings, reports, adminLogs, notifications } from "../../../../db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { authMiddleware, roleGuard, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { RouteStatus, NotificationType } from "../../../../shared/enums";
import { DrizzleNotificationRepository } from "../../notifications/infrastructure/DrizzleNotificationRepository";
import { NotificationFactory } from "../../notifications/NotificationFactory";
import { CheckCirculationUseCase } from "../../circulation/application/CheckCirculationUseCase";
import { RouteLifecycleManager } from "./RouteLifecycleManager";

const routeRouter = Router();

// --- SPRINT 8.2B: Document Compliance Helpers ---
function getComplianceStatus(expirationDate: Date | null | undefined): 'AL_DIA' | 'VENCE_EN_30_DIAS' | 'VENCE_EN_15_DIAS' | 'VENCIDO' {
  if (!expirationDate) return 'AL_DIA';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'VENCIDO';
  } else if (diffDays <= 15) {
    return 'VENCE_EN_15_DIAS';
  } else if (diffDays <= 30) {
    return 'VENCE_EN_30_DIAS';
  } else {
    return 'AL_DIA';
  }
}

async function checkAndGenerateDocumentNotifications(
  database: any, 
  userId: number, 
  docId: number, 
  sourceType: string, 
  docType: string, 
  complianceStatus: 'AL_DIA' | 'VENCE_EN_30_DIAS' | 'VENCE_EN_15_DIAS' | 'VENCIDO',
  docName: string
) {
  if (complianceStatus === 'AL_DIA' || !userId) return;

  let alertType = '';
  let alertTitle = '';
  let alertDesc = '';

  if (complianceStatus === 'VENCE_EN_30_DIAS') {
    alertType = `DOC_ALERT_30_${sourceType}_${docId}`;
    alertTitle = `⚠️ Documento por vencer (30 días)`;
    alertDesc = `El documento "${docName}" vencerá en menos de 30 días. Por favor, prepárate para renovarlo.`;
  } else if (complianceStatus === 'VENCE_EN_15_DIAS') {
    alertType = `DOC_ALERT_15_${sourceType}_${docId}`;
    alertTitle = `🚨 Documento vencerá pronto (15 días)`;
    alertDesc = `El documento "${docName}" vencerá en menos de 15 días. Es urgente realizar la renovación.`;
  } else if (complianceStatus === 'VENCIDO') {
    alertType = `DOC_ALERT_VENCIDO_${sourceType}_${docId}`;
    alertTitle = `❌ Documento Vencido`;
    alertDesc = `El documento "${docName}" se encuentra actualmente vencido. Actualízalo para evitar restricciones manuales de administración.`;
  }

  try {
    const existing = await database
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.type, alertType)
      ));

    if (existing.length === 0) {
      await database.insert(notifications).values({
        userId,
        title: alertTitle,
        description: alertDesc,
        type: alertType,
        data: JSON.stringify({
          docId,
          sourceType,
          docType,
          docName,
          complianceStatus,
          notifiedAt: new Date()
        }),
        isRead: false,
        createdAt: new Date()
      });
      console.log(`[ComplianceNotification] Created notification for user ${userId}, document ${docId} (${complianceStatus})`);
    }
  } catch (err) {
    console.error("[ComplianceNotification] Error checking/generating compliance notification:", err);
  }
}
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

routeRouter.get("/admin/profile/executive", authMiddleware, roleGuard(['admin']), async (req: AuthRequest, res) => {
  try {
    const adminId = parseInt((req as any).user!.userId);
    console.log(`[RouteRouter] GET /admin/profile/executive - Compiling metrics for Admin ID: ${adminId}`);
    
    // Fetch this administrator's profile information
    const [adminUser] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
    if (!adminUser) {
      return res.status(404).json({ error: "Administrador no encontrado" });
    }

    // Fetch administrative logs for this administrator
    const personalLogs = await db.select().from(adminLogs).where(eq(adminLogs.adminId, adminId));

    // Calculate indicators dynamically based on real adminLogs
    const vehiclesApproved = personalLogs.filter(l => l.action === "vehicle_approved").length;
    const vehiclesRejected = personalLogs.filter(l => l.action === "vehicle_rejected").length;
    const reportsManaged = personalLogs.filter(l => l.action === "report_resolved" || l.action === "report_updated" || l.action === "report_dismissed").length;
    const usersSuspended = personalLogs.filter(l => l.action === "user_suspended").length;
    const usersReactivated = personalLogs.filter(l => l.action === "user_activated").length;

    // Last access/activity: get the most recent log timestamp or default to user creation
    let lastAccess = adminUser.createdAt;
    if (personalLogs.length > 0) {
      const timestamps = personalLogs.map(l => l.createdAt ? new Date(l.createdAt).getTime() : 0);
      const maxTime = Math.max(...timestamps);
      if (maxTime > 0) {
        lastAccess = new Date(maxTime);
      }
    }

    // Sort logs descending to show newest first as high fidelity timeline activity
    const sortedLogs = [...personalLogs].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const timeline = sortedLogs.slice(0, 15).map(l => ({
      id: l.id.toString(),
      action: l.action,
      details: l.details,
      createdAt: l.createdAt
    }));

    res.json({
      adminInfo: {
        id: adminUser.id,
        email: adminUser.email,
        createdAt: adminUser.createdAt,
        lastAccess,
        status: "Activo",
        role: adminUser.role,
        profileData: adminUser.profileData ? JSON.parse(adminUser.profileData) : null
      },
      indicators: {
        vehiclesApproved,
        vehiclesRejected,
        reportsManaged,
        usersSuspended,
        usersReactivated
      },
      timeline
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error compiling executive admin profile stats:", err);
    res.status(500).json({ error: "Error al compilar el perfil ejecutivo administrativo." });
  }
});

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

    // Sprint 8.2B: Document Risk Index Calculations
    const allUserDocs = await db.select().from(userDocuments);
    const allVehicleDocs = await db.select().from(vehicleDocuments);

    const docMetrics = {
      alDia: 0,
      vence_30: 0,
      vence_15: 0,
      vencido: 0,
    };

    allUserDocs.forEach(d => {
      const status = getComplianceStatus(d.expirationDate);
      if (status === 'AL_DIA') docMetrics.alDia++;
      else if (status === 'VENCE_EN_30_DIAS') docMetrics.vence_30++;
      else if (status === 'VENCE_EN_15_DIAS') docMetrics.vence_15++;
      else if (status === 'VENCIDO') docMetrics.vencido++;
    });

    allVehicleDocs.forEach(d => {
      const status = getComplianceStatus(d.expirationDate);
      if (status === 'AL_DIA') docMetrics.alDia++;
      else if (status === 'VENCE_EN_30_DIAS') docMetrics.vence_30++;
      else if (status === 'VENCE_EN_15_DIAS') docMetrics.vence_15++;
      else if (status === 'VENCIDO') docMetrics.vencido++;
    });

    const totalDocs = allUserDocs.length + allVehicleDocs.length;
    const documentRiskIndex = {
      totalDocs,
      percentAlDia: totalDocs > 0 ? Math.round((docMetrics.alDia / totalDocs) * 100) : 100,
      percentProxVencer: totalDocs > 0 ? Math.round(((docMetrics.vence_15 + docMetrics.vence_30) / totalDocs) * 100) : 0,
      percentVencido: totalDocs > 0 ? Math.round((docMetrics.vencido / totalDocs) * 100) : 0,
      counts: docMetrics
    };

    // Generate last 6 months dynamically to prevent hardcoded dates/issues
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const trendMonths: { name: string; year: number; monthIndex: number; label: string }[] = [];
    const todayDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      trendMonths.push({
        name: monthNames[mIdx],
        year: yr,
        monthIndex: mIdx,
        label: `${monthNames[mIdx]} ${yr}`
      });
    }

    // 1. User & Vehicle growth trends
    const growthTrend = trendMonths.map(tm => {
      const usersCreated = allUsers.filter(u => {
        const d = u.createdAt ? new Date(u.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const driversCreated = allUsers.filter(u => {
        const d = u.createdAt ? new Date(u.createdAt) : new Date();
        return (u.role?.toLowerCase() === 'driver' || u.role?.toLowerCase() === 'admin_driver') && d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const passengersCreated = allUsers.filter(u => {
        const d = u.createdAt ? new Date(u.createdAt) : new Date();
        return u.role?.toLowerCase() === 'passenger' && d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const vehiclesCreated = allVehicles.filter(v => {
        const d = v.createdAt ? new Date(v.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const cumulativeUsers = allUsers.filter(u => {
        const d = u.createdAt ? new Date(u.createdAt) : new Date();
        return d.getTime() <= new Date(tm.year, tm.monthIndex + 1, 0, 23, 59, 59).getTime();
      }).length;

      const cumulativeVehicles = allVehicles.filter(v => {
        const d = v.createdAt ? new Date(v.createdAt) : new Date();
        return d.getTime() <= new Date(tm.year, tm.monthIndex + 1, 0, 23, 59, 59).getTime();
      }).length;

      return {
        month: tm.label,
        users: usersCreated,
        drivers: driversCreated,
        passengers: passengersCreated,
        vehicles: vehiclesCreated,
        cumulativeUsers,
        cumulativeVehicles
      };
    });

    // 2. Routes & Passengers trends
    const routesTrend = trendMonths.map(tm => {
      const created = allRoutes.filter(r => {
        const d = r.createdAt ? new Date(r.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const completed = allRoutes.filter(r => {
        const d = r.createdAt ? new Date(r.createdAt) : new Date();
        return r.status?.toLowerCase() === 'completed' && d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const requests = allRequests.filter(req => {
        const d = req.createdAt ? new Date(req.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const requestsApproved = allRequests.filter(req => {
        const d = req.createdAt ? new Date(req.createdAt) : new Date();
        const stat = req.status?.toLowerCase();
        return (stat === 'accepted' || stat === 'approved') && d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      return {
        month: tm.label,
        created,
        completed,
        requests,
        requestsApproved,
        adoptionRate: created > 0 ? Math.round((completed / created) * 100) : 0
      };
    });

    // 3. Moderation & Governance metrics from database
    const allReports = await db.select().from(reports);
    const totalReports = allReports.length;
    const pendingReports = allReports.filter(r => r.status?.toLowerCase() === 'pending').length;
    const resolvedReports = allReports.filter(r => r.status?.toLowerCase() === 'resolved').length;
    
    const allLogs = await db.select().from(adminLogs);
    const totalAdminActions = allLogs.length;

    const moderationTrend = trendMonths.map(tm => {
      const reportsCount = allReports.filter(r => {
        const d = r.createdAt ? new Date(r.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      const actionsCount = allLogs.filter(l => {
        const d = l.createdAt ? new Date(l.createdAt) : new Date();
        return d.getMonth() === tm.monthIndex && d.getFullYear() === tm.year;
      }).length;

      return {
        month: tm.label,
        reports: reportsCount,
        actions: actionsCount
      };
    });

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
      recentActivity,
      documentRiskIndex,
      growthTrend,
      routesTrend,
      moderationTrend,
      moderationSummary: {
        totalReports,
        pendingReports,
        resolvedReports,
        totalAdminActions
      }
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
// SPRINT 8.6 - GESTIÓN DE USUARIOS Y ROLES (ADMIN MASTER & ADMIN)
// ==========================================

// Helper to determine if a caller is ADMIN_MASTER (role === 'admin_master' or email === 'admin@syc.com.co')
const isCallerAdminMaster = (req: any): boolean => {
  const callerEmail = req.user?.email?.toLowerCase().trim();
  const callerRole = req.user?.role?.toLowerCase();
  return callerEmail === "admin@syc.com.co" || callerRole === "admin_master";
};

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
      
      const mappedRole = u.email.toLowerCase().trim() === "admin@syc.com.co" ? "admin_master" : u.role;

      return {
        id: u.id.toString(),
        email: u.email,
        role: mappedRole,
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

// 2. Create User
routeRouter.post("/admin/users/create", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const isMaster = isCallerAdminMaster(req);
    const { email, password, displayName, phone, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Faltan campos obligatorios: email, password y rol son requeridos." });
    }

    const targetEmail = email.toLowerCase().trim();

    if (!targetEmail.endsWith("@syc.com.co")) {
      return res.status(400).json({ error: "Solo se permiten correos corporativos @syc.com.co" });
    }

    // Standard ADMIN cannot create administrators (admin or admin_master) or admin@syc.com.co
    if (!isMaster) {
      if (role === "admin" || role === "admin_master" || targetEmail === "admin@syc.com.co") {
        return res.status(403).json({ error: "No tienes permisos de ADMIN_MASTER para crear administradores." });
      }
    }

    // Check if email already taken
    const [existing] = await db.select().from(users).where(eq(users.email, targetEmail)).limit(1);
    if (existing) {
      return res.status(400).json({ error: "El correo electrónico ya se encuentra registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const profileObj = {
      name: displayName || targetEmail.split("@")[0],
      phone: phone || "",
      isDisabled: false
    };

    const [created] = await db.insert(users).values({
      email: targetEmail,
      password: hashedPassword,
      role: role,
      profileData: JSON.stringify(profileObj)
    }).returning();

    // Audit Logging
    const adminId = parseInt((req as any).user!.userId);
    await db.insert(adminLogs).values({
      adminId,
      action: "user_created",
      targetId: created.id.toString(),
      details: `Usuario ${targetEmail} creado con rol ${role} por el administrador ID ${adminId}.`
    });

    res.status(201).json({
      success: true,
      user: {
        id: created.id.toString(),
        email: created.email,
        role: created.role,
        displayName: profileObj.name,
        phone: profileObj.phone,
        isDisabled: false
      }
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error creating admin user:", err);
    res.status(500).json({ error: "Error interno al crear el usuario." });
  }
});

// 3. Edit User
routeRouter.patch("/admin/users/:id/edit", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const isMaster = isCallerAdminMaster(req);
    const userId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const targetUserRole = user.role;
    const targetUserEmail = user.email.toLowerCase().trim();

    // Standard ADMIN restrictions
    if (!isMaster) {
      // Cannot edit administrators
      if (targetUserRole === "admin" || targetUserRole === "admin_master" || targetUserEmail === "admin@syc.com.co") {
        return res.status(403).json({ error: "No tienes permisos de ADMIN_MASTER para editar administradores." });
      }
    }

    const { email, password, displayName, phone, role } = req.body;

    // Standard ADMIN cannot change role to an administrative role
    if (!isMaster && role && (role === "admin" || role === "admin_master")) {
      return res.status(403).json({ error: "No tienes permisos de ADMIN_MASTER para asignar roles administrativos." });
    }

    let profileObj: any = {};
    if (user.profileData) {
      try {
        profileObj = JSON.parse(user.profileData);
      } catch (_) {}
    }

    if (displayName !== undefined) {
      profileObj.name = displayName;
    }
    if (phone !== undefined) {
      profileObj.phone = phone;
    }

    const updateFields: any = {
      profileData: JSON.stringify(profileObj)
    };

    if (email !== undefined) {
      const newEmail = email.toLowerCase().trim();
      if (!newEmail.endsWith("@syc.com.co")) {
        return res.status(400).json({ error: "Solo se permiten correos corporativos @syc.com.co" });
      }
      if (newEmail !== targetUserEmail) {
        // Enforce admin@syc.com.co modification rule
        if (!isMaster && targetUserEmail === "admin@syc.com.co") {
          return res.status(403).json({ error: "No se puede modificar la cuenta admin@syc.com.co" });
        }
        const [existing] = await db.select().from(users).where(eq(users.email, newEmail)).limit(1);
        if (existing) {
          return res.status(400).json({ error: "El correo electrónico ya está registrado por otro usuario." });
        }
        updateFields.email = newEmail;
      }
    }

    if (password !== undefined && password.trim() !== "") {
      updateFields.password = await bcrypt.hash(password, 12);
    }

    if (role !== undefined) {
      updateFields.role = role;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, userId))
      .returning();

    // Audit Logging
    const adminId = parseInt((req as any).user!.userId);
    await db.insert(adminLogs).values({
      adminId,
      action: "user_edited",
      targetId: userId.toString(),
      details: `Usuario ${targetUserEmail} editado por el administrador ID ${adminId}. Cambios: ${Object.keys(updateFields).join(", ")}`
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
    console.error("[RouteRouter] Error editing user:", err);
    res.status(500).json({ error: "Error al actualizar información del usuario." });
  }
});

// 4. Toggle user active/blocked status safely within profileData JSON
routeRouter.patch("/admin/users/:id/toggle-status", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    const isMaster = isCallerAdminMaster(req);
    const userId = parseInt(req.params.id);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const targetUserRole = user.role;
    const targetUserEmail = user.email.toLowerCase().trim();

    // Standard ADMIN restrictions
    if (!isMaster) {
      // Cannot suspend administrators
      if (targetUserRole === "admin" || targetUserRole === "admin_master" || targetUserEmail === "admin@syc.com.co") {
        return res.status(403).json({ error: "No tienes permisos de ADMIN_MASTER para suspender o reactivar administradores." });
      }
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
      details: `Usuario ${user.email} fue ${profileObj.isDisabled ? "suspendido" : "reactivado"} por el administrador ID ${adminId}.`
    });
      
    res.json({
      success: true,
      user: {
        id: updatedUser.id.toString(),
        email: updatedUser.email,
        role: targetUserEmail === "admin@syc.com.co" ? "admin_master" : updatedUser.role,
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

      const complianceStatus = getComplianceStatus(d.expirationDate);
      let complianceDaysLeft: number | null = null;
      if (d.expirationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(d.expirationDate);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - today.getTime();
        complianceDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        plate: vehicle?.plate || "",
        complianceStatus,
        complianceDaysLeft
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

      const complianceStatus = getComplianceStatus(d.expirationDate);
      let complianceDaysLeft: number | null = null;
      if (d.expirationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(d.expirationDate);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - today.getTime();
        complianceDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        plate: "",
        complianceStatus,
        complianceDaysLeft
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

    // Log admin action
    const adminId = parseInt((req as any).user!.userId);
    await db.insert(adminLogs).values({
      adminId,
      action: status === "resolved" ? "report_resolved" : "report_updated",
      targetId: reportId.toString(),
      details: status === "resolved" 
        ? `Reporte de incidencia #${reportId} fue resuelto.` 
        : `Reporte de incidencia #${reportId} fue actualizado a estado: ${status}.`
    });
    
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
    
    // 4. Identify Expired Documents and Calculate Compliance
    const expiringSoonLicense: any[] = [];
    const expiringSoonSoat: any[] = [];
    const expiringSoonTech: any[] = [];
    const docMetrics = {
      alDia: 0,
      vence_30: 0,
      vence_15: 0,
      vencido: 0,
    };

    // Helper process to calculate and check/trigger notification events
    const processStatsDoc = async (d: any, type: 'vehicle' | 'user', ownerId: number, ownerEmail: string, ownerName: string, plate?: string) => {
      const status = getComplianceStatus(d.expirationDate);
      const name = d.documentName || (d.documentType === 'license' ? 'Licencia de Conducción' : d.documentType === 'soat' ? 'SOAT' : d.documentType === 'tech_preventive' ? 'Revisión Técnica' : d.documentType.toUpperCase());

      // Trigger notification event asynchronously or inline (safely)
      if (status !== 'AL_DIA' && ownerId) {
        await checkAndGenerateDocumentNotifications(db, ownerId, d.id, type, d.documentType, status, name);
      }

      const item = {
        id: d.id.toString(),
        sourceType: type,
        documentType: d.documentType,
        documentName: name,
        expirationDate: d.expirationDate,
        ownerEmail,
        ownerName,
        plate: plate || "",
        complianceStatus: status,
        status: d.status
      };

      if (status === 'AL_DIA') {
        docMetrics.alDia++;
      } else if (status === 'VENCE_EN_30_DIAS') {
        docMetrics.vence_30++;
        if (d.documentType === 'license') expiringSoonLicense.push(item);
        else if (d.documentType === 'soat') expiringSoonSoat.push(item);
        else if (d.documentType === 'tech_preventive') expiringSoonTech.push(item);
      } else if (status === 'VENCE_EN_15_DIAS') {
        docMetrics.vence_15++;
        if (d.documentType === 'license') expiringSoonLicense.push(item);
        else if (d.documentType === 'soat') expiringSoonSoat.push(item);
        else if (d.documentType === 'tech_preventive') expiringSoonTech.push(item);
      } else if (status === 'VENCIDO') {
        docMetrics.vencido++;
      }
    };

    // Calculate user documents
    for (const d of allUserDocs) {
      const owner = allUsers.find(u => u.id === d.userId);
      let ownerName = "";
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          ownerName = prof.name || "";
        } catch (_) {}
      }
      await processStatsDoc(d, 'user', d.userId, owner?.email || "", ownerName || "Conductor");
    }

    // Calculate vehicle documents
    for (const d of allVehicleDocs) {
      const vehicle = allVehicles.find(v => v.id === d.vehicleId);
      const owner = vehicle ? allUsers.find(u => u.id === vehicle.userId) : null;
      let ownerName = "";
      if (owner?.profileData) {
        try {
          const prof = JSON.parse(owner.profileData);
          ownerName = prof.name || "";
        } catch (_) {}
      }
      await processStatsDoc(d, 'vehicle', vehicle?.userId || 0, owner?.email || "", ownerName || "Conductor", vehicle?.plate);
    }

    const expiredVehicleDocs = allVehicleDocs.filter(d => getComplianceStatus(d.expirationDate) === 'VENCIDO').map(d => {
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
        documentType: d.documentType,
        documentName: d.documentName || (d.documentType === 'soat' ? 'SOAT' : d.documentType === 'tech_preventive' ? 'Revisión Técnica' : d.documentType.toUpperCase()),
        expirationDate: d.expirationDate,
        ownerEmail: owner?.email || "",
        ownerName: ownerName || "Conductor",
        plate: vehicle?.plate || ""
      };
    });
    
    const expiredUserDocs = allUserDocs.filter(d => getComplianceStatus(d.expirationDate) === 'VENCIDO').map(d => {
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
        documentType: d.documentType,
        documentName: d.documentName || "Licencia de Conducción",
        expirationDate: d.expirationDate,
        ownerEmail: owner?.email || "",
        ownerName: ownerName || "Conductor",
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
      },
      compliance: {
        alDiaCount: docMetrics.alDia,
        vence30Count: docMetrics.vence_30,
        vence15Count: docMetrics.vence_15,
        vencidoCount: docMetrics.vencido,
        expiringSoonLicense,
        expiringSoonSoat,
        expiringSoonTech
      }
    });
  } catch (err: any) {
    console.error("[RouteRouter] Error returning moderation stats:", err);
    res.status(500).json({ error: "Error al calcular alertas de riesgo" });
  }
});

// SPRINT 8.7: GET /admin/reports/executive
routeRouter.get("/admin/reports/executive", authMiddleware, roleGuard(['admin']), async (req, res) => {
  try {
    console.log("[RouteRouter] GET /admin/reports/executive - Fetching real executive report metrics...");

    // 1. Fetch all required tables
    const allUsers = await db.select().from(users);
    const allVehicles = await db.select().from(vehicles);
    const allRoutes = await db.select().from(routes);
    const allRatings = await db.select().from(ratings);
    const allUserDocs = await db.select().from(userDocuments);
    const allVehicleDocs = await db.select().from(vehicleDocuments);
    const allReports = await db.select().from(reports);

    // --- REPORTE 1: RESUMEN EJECUTIVO DE PLATAFORMA ---
    const totalUsers = allUsers.length;
    const drivers = allUsers.filter(u => u.role?.toLowerCase() === 'driver').length;
    const passengers = allUsers.filter(u => u.role?.toLowerCase() === 'passenger').length;
    const totalVehicles = allVehicles.length;
    const approvedVehicles = allVehicles.filter(v => v.verifiedStatus?.toLowerCase() === 'approved').length;
    const totalRoutes = allRoutes.length;
    const completedRoutes = allRoutes.filter(r => r.status?.toLowerCase() === 'completed').length;
    const cancelledRoutes = allRoutes.filter(r => r.status?.toLowerCase() === 'cancelled').length;

    let averageRating = 4.9;
    if (allRatings.length > 0) {
      const sum = allRatings.reduce((runningSum, r) => runningSum + (r.score || 0), 0);
      averageRating = parseFloat((sum / allRatings.length).toFixed(2));
    }

    const platformSummary = {
      totalUsers,
      drivers,
      passengers,
      totalVehicles,
      approvedVehicles,
      totalRoutes,
      completedRoutes,
      cancelledRoutes,
      averageRating
    };

    // --- REPORTE 2: CUMPLIMIENTO DOCUMENTAL ---
    const licenseMetrics = { valid: 0, expiring30: 0, expiring15: 0, expired: 0 };
    const soatMetrics = { valid: 0, expiring30: 0, expiring15: 0, expired: 0 };
    const techMetrics = { valid: 0, expiring30: 0, expiring15: 0, expired: 0 };

    allUserDocs.forEach(d => {
      if (d.documentType === 'license') {
        const compliance = getComplianceStatus(d.expirationDate);
        if (compliance === 'AL_DIA') licenseMetrics.valid++;
        else if (compliance === 'VENCE_EN_30_DIAS') licenseMetrics.expiring30++;
        else if (compliance === 'VENCE_EN_15_DIAS') licenseMetrics.expiring15++;
        else if (compliance === 'VENCIDO') licenseMetrics.expired++;
      }
    });

    allVehicleDocs.forEach(d => {
      if (d.documentType === 'soat') {
        const compliance = getComplianceStatus(d.expirationDate);
        if (compliance === 'AL_DIA') soatMetrics.valid++;
        else if (compliance === 'VENCE_EN_30_DIAS') soatMetrics.expiring30++;
        else if (compliance === 'VENCE_EN_15_DIAS') soatMetrics.expiring15++;
        else if (compliance === 'VENCIDO') soatMetrics.expired++;
      } else if (d.documentType === 'tech_preventive') {
        const compliance = getComplianceStatus(d.expirationDate);
        if (compliance === 'AL_DIA') techMetrics.valid++;
        else if (compliance === 'VENCE_EN_30_DIAS') techMetrics.expiring30++;
        else if (compliance === 'VENCE_EN_15_DIAS') techMetrics.expiring15++;
        else if (compliance === 'VENCIDO') techMetrics.expired++;
      }
    });

    const totalExpired = licenseMetrics.expired + soatMetrics.expired + techMetrics.expired;
    const totalExpiring = licenseMetrics.expiring15 + soatMetrics.expiring15 + licenseMetrics.expiring30 + soatMetrics.expiring30 + techMetrics.expiring15 + techMetrics.expiring30;
    
    let overallRiskIndicator = 'Bajo';
    if (totalExpired > 5 || (totalExpired > 0 && totalExpired / (allUserDocs.length + allVehicleDocs.length || 1) > 0.15)) {
      overallRiskIndicator = 'Alto';
    } else if (totalExpired > 0 || totalExpiring > 2) {
      overallRiskIndicator = 'Medio';
    }

    const documentCompliance = {
      license: licenseMetrics,
      soat: soatMetrics,
      tech: techMetrics,
      overallRiskIndicator
    };

    // --- REPORTE 3: MODERACIÓN Y SEGURIDAD ---
    const totalReports = allReports.length;
    const pendingReports = allReports.filter(r => r.status?.toLowerCase() === 'pending' || r.status?.toLowerCase() === 'reviewing').length;
    const resolvedReports = allReports.filter(r => r.status?.toLowerCase() === 'resolved').length;
    const dismissedReports = allReports.filter(r => r.status?.toLowerCase() === 'dismissed').length;

    // Average resolution time in hours
    let averageResolutionTimeHours = 1.0;
    const resolvedOrDismissed = allReports.filter(r => (r.status?.toLowerCase() === 'resolved' || r.status?.toLowerCase() === 'dismissed') && r.createdAt && r.updatedAt);
    if (resolvedOrDismissed.length > 0) {
      const totalHours = resolvedOrDismissed.reduce((sum, r) => {
        const created = new Date(r.createdAt!).getTime();
        const updated = new Date(r.updatedAt!).getTime();
        return sum + Math.max(0, (updated - created) / (1000 * 60 * 60));
      }, 0);
      averageResolutionTimeHours = parseFloat((totalHours / resolvedOrDismissed.length).toFixed(1));
    }

    // Recursively reported users (>= 2 reports)
    const reportCounts: Record<number, number> = {};
    allReports.forEach(r => {
      reportCounts[r.reportedUserId] = (reportCounts[r.reportedUserId] || 0) + 1;
    });

    const recurrentlyReportedUsers = Object.entries(reportCounts)
      .filter(([_, count]) => count >= 2)
      .map(([userIdStr, count]) => {
        const uId = parseInt(userIdStr);
        const u = allUsers.find(user => user.id === uId);
        let name = "Usuario";
        if (u?.profileData) {
          try {
            const p = JSON.parse(u.profileData);
            name = p.name || name;
          } catch (_) {}
        }
        return {
          id: userIdStr,
          email: u?.email || "N/A",
          name,
          role: u?.role || "passenger",
          count
        };
      });

    const moderationSummary = {
      totalReports,
      pending: pendingReports,
      resolved: resolvedReports,
      dismissed: dismissedReports,
      averageResolutionTimeHours,
      recurrentlyReportedUsers
    };

    // --- REPORTE 4: DESEMPEÑO DE CONDUCTORES ---
    const driverUsers = allUsers.filter(u => u.role?.toLowerCase() === 'driver');
    const totalDrivers = driverUsers.length;

    let inactiveDrivers = 0;
    let activeDrivers = 0;
    const expiredDriversMap = new Set<number>();

    // expired documents count of driver users
    allUserDocs.forEach(d => {
      if (getComplianceStatus(d.expirationDate) === 'VENCIDO') {
        expiredDriversMap.add(d.userId);
      }
    });
    allVehicleDocs.forEach(d => {
      if (getComplianceStatus(d.expirationDate) === 'VENCIDO') {
        const v = allVehicles.find(veh => veh.id === d.vehicleId);
        if (v) expiredDriversMap.add(v.userId);
      }
    });

    // approved vehicle count for each driver
    const driverApprovedVehicles: Record<number, boolean> = {};
    allVehicles.forEach(v => {
      if (v.verifiedStatus === 'approved') {
        driverApprovedVehicles[v.userId] = true;
      }
    });

    const approvedVehicleCount = Object.keys(driverApprovedVehicles).length;

    // Calificación promedio de conductores
    const driverRatings = driverUsers.filter(u => u.rating).map(u => parseFloat(u.rating!));
    let averageDriverRating = 4.9;
    if (driverRatings.length > 0) {
      averageDriverRating = parseFloat((driverRatings.reduce((a, b) => a + b, 0) / driverRatings.length).toFixed(2));
    }

    const driversList = driverUsers.map(u => {
      let name = "Conductor";
      let isDisabled = false;
      if (u.profileData) {
        try {
          const p = JSON.parse(u.profileData);
          name = p.name || name;
          isDisabled = !!p.isDisabled;
        } catch (_) {}
      }

      if (isDisabled) inactiveDrivers++;
      else activeDrivers++;

      // Check verification status
      const hasApprovedVehicle = !!driverApprovedVehicles[u.id];
      const hasExpiredDocs = expiredDriversMap.has(u.id);

      let checkStatus = "Pendiente";
      if (hasApprovedVehicle && !hasExpiredDocs) {
        checkStatus = "Aprobado";
      } else if (hasExpiredDocs) {
        checkStatus = "Documentación Vencida";
      } else {
        checkStatus = "Falta Vehículo";
      }

      return {
        id: u.id.toString(),
        email: u.email,
        name,
        rating: u.rating || "Nuevo",
        checkStatus
      };
    });

    const driversSummary = {
      totalDrivers,
      activeDrivers,
      inactiveDrivers,
      approvedVehicleCount,
      expiredDocumentsCount: expiredDriversMap.size,
      averageRating: averageDriverRating,
      driversList
    };

    // Return combined object
    res.json({
      platformSummary,
      documentCompliance,
      moderationSummary,
      driversSummary
    });

  } catch (err: any) {
    console.error("[RouteRouter] Error generating executive report metrics:", err);
    res.status(500).json({ error: "Error interno al compilar reportes ejecutivos" });
  }
});

export { routeRouter };
