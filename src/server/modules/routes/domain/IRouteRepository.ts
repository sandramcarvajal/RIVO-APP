import { RouteStatus } from "../../../../shared/enums";

export { RouteStatus };

export interface RouteEntity {
  id: string;
  driverId: string;
  vehicleId?: string;
  driverName?: string;
  driverAvatar?: string;
  origin: string;
  originCoords?: string;
  destination: string;
  destinationCoords?: string;
  departureTime: Date;
  totalSeats: number;
  availableSeats: number;
  status: RouteStatus;
  price: number;
  polyline?: string;
  createdAt: Date;
}

export interface IRouteRepository {
  findById(id: string): Promise<RouteEntity | null>;
  findAll(filters?: { status?: RouteStatus | string; driverId?: string; futureOnly?: boolean }): Promise<RouteEntity[]>;
  create(route: Omit<RouteEntity, "id" | "createdAt" | "status">): Promise<RouteEntity>;
  update(id: string, data: Partial<RouteEntity>): Promise<RouteEntity>;
  search(origin: string, destination: string): Promise<RouteEntity[]>;
}
