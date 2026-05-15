import { UserRole, NotificationType, RouteStatus, JoinRequestStatus } from './shared/enums';

export { UserRole, NotificationType, RouteStatus, JoinRequestStatus };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  rating?: number;
  isAvailable?: boolean;
  vehicle?: {
    plate: string;
    brand: string;
    color: string;
  };
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
