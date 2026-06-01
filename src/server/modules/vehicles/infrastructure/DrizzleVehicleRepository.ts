import { eq, desc } from "drizzle-orm";
import { db } from "../../../../db";
import { vehicles } from "../../../../db/schema";
import { IVehicleRepository, VehicleEntity } from "../domain/IVehicleRepository";

export class DrizzleVehicleRepository implements IVehicleRepository {
  private mapToEntity(vehicle: any): VehicleEntity {
    return {
      id: vehicle.id.toString(),
      userId: vehicle.userId.toString(),
      plate: vehicle.plate,
      brand: vehicle.brand || "",
      color: vehicle.color || "",
      model: vehicle.model || undefined,
      type: vehicle.type || undefined,
      isActive: vehicle.isActive ?? undefined,
      availabilityStatus: vehicle.availabilityStatus || undefined,
      verifiedStatus: vehicle.verifiedStatus || undefined,
      rejectReason: vehicle.rejectReason || undefined,
      verifiedAt: vehicle.verifiedAt || undefined,
      verifiedBy: vehicle.verifiedBy?.toString() || undefined,
      createdAt: vehicle.createdAt || undefined,
      updatedAt: vehicle.updatedAt || undefined,
    };
  }

  async findByUserId(userId: string): Promise<VehicleEntity | null> {
    try {
      console.log(`[DrizzleVehicleRepository] Finding vehicle for userId: ${userId}`);
      // Find the first/default active vehicle for retroscompatibility, prioritizing the active/principal one
      const [vehicle] = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.userId, parseInt(userId)))
        .orderBy(desc(vehicles.isActive))
        .limit(1);

      if (!vehicle) {
        console.log(`[DrizzleVehicleRepository] No vehicle found for userId: ${userId}`);
        return null;
      }

      return this.mapToEntity(vehicle);
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in findByUserId:`, error);
      throw error;
    }
  }

  async findAllByUserId(userId: string): Promise<VehicleEntity[]> {
    try {
      console.log(`[DrizzleVehicleRepository] Finding all vehicles for userId: ${userId}`);
      const list = await db
        .select()
        .from(vehicles)
        .where(eq(vehicles.userId, parseInt(userId)));

      return list.map(v => this.mapToEntity(v));
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in findAllByUserId:`, error);
      throw error;
    }
  }

  async create(vehicle: Omit<VehicleEntity, "id">): Promise<VehicleEntity> {
    try {
      console.log(`[DrizzleVehicleRepository] Creating vehicle for userId: ${vehicle.userId}, plate: ${vehicle.plate}`);
      const [created] = await db.insert(vehicles).values({
        userId: parseInt(vehicle.userId),
        plate: vehicle.plate,
        brand: vehicle.brand,
        color: vehicle.color,
        model: vehicle.model,
        type: vehicle.type || 'car',
        isActive: vehicle.isActive !== undefined ? vehicle.isActive : true,
        availabilityStatus: vehicle.availabilityStatus || 'available',
        verifiedStatus: vehicle.verifiedStatus || 'pending',
        rejectReason: vehicle.rejectReason,
        verifiedAt: vehicle.verifiedAt,
        verifiedBy: vehicle.verifiedBy ? parseInt(vehicle.verifiedBy) : null,
      }).returning();

      return this.mapToEntity(created);
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in create vehicle:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<VehicleEntity>): Promise<VehicleEntity> {
    try {
      console.log(`[DrizzleVehicleRepository] Updating vehicle ${id}`);
      const updateValues: any = {};
      
      if (data.plate !== undefined) updateValues.plate = data.plate;
      if (data.brand !== undefined) updateValues.brand = data.brand;
      if (data.color !== undefined) updateValues.color = data.color;
      if (data.model !== undefined) updateValues.model = data.model;
      if (data.type !== undefined) updateValues.type = data.type;
      if (data.isActive !== undefined) updateValues.isActive = data.isActive;
      if (data.availabilityStatus !== undefined) updateValues.availabilityStatus = data.availabilityStatus;
      if (data.verifiedStatus !== undefined) updateValues.verifiedStatus = data.verifiedStatus;
      if (data.rejectReason !== undefined) updateValues.rejectReason = data.rejectReason;
      if (data.verifiedAt !== undefined) updateValues.verifiedAt = data.verifiedAt;
      if (data.verifiedBy !== undefined) updateValues.verifiedBy = data.verifiedBy ? parseInt(data.verifiedBy) : null;
      
      updateValues.updatedAt = new Date();

      const [updated] = await db.update(vehicles)
        .set(updateValues)
        .where(eq(vehicles.id, parseInt(id)))
        .returning();

      if (!updated) {
        throw new Error(`Vehicle with ID ${id} not found for update`);
      }

      return this.mapToEntity(updated);
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in update vehicle:`, error);
      throw error;
    }
  }
}
