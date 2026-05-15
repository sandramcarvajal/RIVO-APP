import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { vehicles } from "../../../../db/schema";
import { IVehicleRepository, VehicleEntity } from "../domain/IVehicleRepository";

export class DrizzleVehicleRepository implements IVehicleRepository {
  async findByUserId(userId: string): Promise<VehicleEntity | null> {
    try {
      console.log(`[DrizzleVehicleRepository] Finding vehicle for userId: ${userId}`);
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.userId, parseInt(userId)));
      if (!vehicle) {
        console.log(`[DrizzleVehicleRepository] No vehicle found for userId: ${userId}`);
        return null;
      }

      return {
        id: vehicle.id.toString(),
        userId: vehicle.userId.toString(),
        plate: vehicle.plate,
        brand: vehicle.brand || "",
        color: vehicle.color || "",
        model: vehicle.model || undefined
      };
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in findByUserId:`, error);
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
        model: vehicle.model
      }).returning();

      return {
        id: created.id.toString(),
        userId: created.userId.toString(),
        plate: created.plate,
        brand: created.brand || "",
        color: created.color || "",
        model: created.model || undefined
      };
    } catch (error) {
      console.error(`[DrizzleVehicleRepository] DATABASE ERROR in create vehicle:`, error);
      throw error;
    }
  }
}
