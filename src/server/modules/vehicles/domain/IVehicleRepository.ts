export interface VehicleEntity {
  id: string;
  userId: string;
  plate: string;
  brand: string;
  color: string;
  model?: string;
  type?: string; // 'car' | 'motorcycle'
  isActive?: boolean;
  availabilityStatus?: string; // 'available', 'unavailable', 'maintenance'
  verifiedStatus?: string; // 'pending', 'approved', 'rejected'
  rejectReason?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVehicleRepository {
  findByUserId(userId: string): Promise<VehicleEntity | null>;
  findAllByUserId(userId: string): Promise<VehicleEntity[]>;
  create(vehicle: Omit<VehicleEntity, 'id'>): Promise<VehicleEntity>;
  update(id: string, data: Partial<VehicleEntity>): Promise<VehicleEntity>;
}

