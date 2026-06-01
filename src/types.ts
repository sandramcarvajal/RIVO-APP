import { 
  UserRole, 
  NotificationType, 
  RouteStatus, 
  JoinRequestStatus,
  VehicleVerificationStatus,
  DocumentType,
  VehicleAvailabilityStatus,
  DocumentExpirationStatus
} from './shared/enums';

export { 
  UserRole, 
  NotificationType, 
  RouteStatus, 
  JoinRequestStatus,
  VehicleVerificationStatus,
  DocumentType,
  VehicleAvailabilityStatus,
  DocumentExpirationStatus
};

export interface Vehicle {
  id: string;
  userId: string;
  plate: string;
  brand: string;
  color: string;
  model?: string;
  type?: 'car' | 'motorcycle' | string;
  isActive?: boolean;
  availabilityStatus?: VehicleAvailabilityStatus;
  verifiedStatus?: VehicleVerificationStatus;
  rejectReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  documentType: DocumentType;
  fileUrl: string;
  status: VehicleVerificationStatus;
  expirationDate?: string;
  expirationStatus?: DocumentExpirationStatus;
  rejectReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  ocrConfidence?: string;
  ocrPlate?: string;
  ocrExtractedData?: any;
  documentName?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  fileUrl: string;
  status: VehicleVerificationStatus;
  expirationDate?: string;
  expirationStatus?: DocumentExpirationStatus;
  rejectReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  ocrConfidence?: string;
  ocrExtractedData?: any;
  documentName?: string;
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  rating?: string | number | null;
  reviewCount?: number;
  isAvailable?: boolean;
  vehicle?: Vehicle | null; // Keeps retrocompatibility
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface Route {
  id: string;
  driverId: string;
  vehicleId?: string;
  driverName: string;
  driverAvatar?: string;
  origin: string;
  destination: string;
  time: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
  date: string;
  status: RouteStatus;
  departureTime: string;
  type?: string;
  canJoin?: boolean;
  isParticipant?: boolean;
  isVisible?: boolean;
  isExpired?: boolean;
}

export interface JoinRequest {
  id: string;
  routeId: string;
  passengerId: string;
  passengerName: string;
  passengerAvatar?: string;
  status: JoinRequestStatus;
  createdAt: string;
  routeInfo?: {
    origin: string;
    destination: string;
    time: string;
    price: number;
    driverName?: string;
    driverAvatar?: string;
  };
}
