export enum UserRole {
  PASSENGER = 'passenger',
  DRIVER = 'driver',
  ADMIN = 'admin',
  ADMIN_MASTER = 'admin_master',
}

export enum RouteStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum JoinRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  CANCELLED_BY_DRIVER = 'cancelled_by_driver',
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

export enum VehicleVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DocumentType {
  SOAT = 'soat',
  PROPERTY_CARD = 'property_card',
  TECH_PREVENTIVE = 'tech_preventive',
  LICENSE = 'license',
}

export enum VehicleAvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
}

export enum DocumentExpirationStatus {
  VALID = 'valid',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}

export function isAdminUser(role: string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  return normalized === 'admin' || normalized === 'admin_master';
}


