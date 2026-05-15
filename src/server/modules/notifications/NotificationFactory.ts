import { NotificationType } from "./domain/Notification";

export class NotificationFactory {
  static createRequestApproved(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "✅ ¡Solicitud Aprobada!",
      description: `Tu solicitud para la ruta a ${routeDestination} ha sido aceptada.`,
      type: NotificationType.REQUEST_ACCEPTED,
      data: { routeId }
    };
  }

  static createRequestRejected(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "❌ Solicitud Rechazada",
      description: `Tu solicitud para la ruta a ${routeDestination} no ha sido aceptada en esta ocasión.`,
      type: NotificationType.REQUEST_REJECTED,
      data: { routeId }
    };
  }

  static createNewRequest(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "🚗 Nueva Solicitud",
      description: `Un pasajero quiere unirse a tu ruta con destino a ${routeDestination}.`,
      type: NotificationType.NEW_REQUEST,
      data: { routeId }
    };
  }

  static createRouteCancelled(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "⚠️ Ruta Cancelada",
      description: `La ruta hacia ${routeDestination} ha sido cancelada por el conductor.`,
      type: NotificationType.ROUTE_CANCELLED,
      data: { routeId }
    };
  }

  static createTripStarted(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "🚗 ¡Viaje Iniciado!",
      description: `El viaje hacia ${routeDestination} ha comenzado. ¡Buen viaje!`,
      type: NotificationType.TRIP_STARTED,
      data: { routeId }
    };
  }

  static createTripCompleted(userId: string, routeId: string, routeDestination: string) {
    return {
      userId,
      title: "🏁 Viaje Finalizado",
      description: `Has llegado a ${routeDestination}. No olvides calificar tu experiencia.`,
      type: NotificationType.TRIP_COMPLETED,
      data: { routeId }
    };
  }

  static createSystemMessage(userId: string, title: string, description: string) {
    return {
      userId,
      title,
      description,
      type: NotificationType.SYSTEM
    };
  }
}
