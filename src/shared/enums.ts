export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum RouteStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum JoinRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  NEW_REQUEST = 'new_request',
  REQUEST_ACCEPTED = 'request_accepted',
  REQUEST_REJECTED = 'request_rejected',
  ROUTE_CANCELLED = 'route_cancelled',
  TRIP_STARTING = 'trip_starting',
  TRIP_STARTED = 'trip_started',
  TRIP_COMPLETED = 'trip_completed',
  SYSTEM = 'system',
}
