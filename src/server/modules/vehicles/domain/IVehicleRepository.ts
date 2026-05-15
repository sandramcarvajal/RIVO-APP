export interface VehicleEntity {
  id: string;
  userId: string;
  plate: string;
  brand: string;
  color: string;
  model?: string;
}

export interface IVehicleRepository {
  findByUserId(userId: string): Promise<VehicleEntity | null>;
  create(vehicle: Omit<VehicleEntity, 'id'>): Promise<VehicleEntity>;
}
