import { eq, and, like, or, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { routes, users } from "../../../../db/schema";
import { IRouteRepository, RouteEntity, RouteStatus } from "../domain/IRouteRepository";
import { RouteLifecycleManager } from "./RouteLifecycleManager";

export class DrizzleRouteRepository implements IRouteRepository {
  async findById(id: string): Promise<RouteEntity | null> {
    try {
      await RouteLifecycleManager.performJitTransitions();
      console.log(`[DrizzleRouteRepository] Finding route by id: ${id}`);
      const [result] = await db
        .select({
          route: routes,
          driverProfile: users.profileData,
          driverEmail: users.email
        })
        .from(routes)
        .leftJoin(users, eq(routes.driverId, users.id))
        .where(eq(routes.id, parseInt(id)));

      if (!result) {
        console.log(`[DrizzleRouteRepository] Route not found id: ${id}`);
        return null;
      }
      return this.mapToEntity(result.route, result.driverProfile, result.driverEmail || undefined);
    } catch (error) {
      console.error(`[DrizzleRouteRepository] DATABASE ERROR in findById:`, error);
      throw error;
    }
  }

  async findAll(filters?: { status?: RouteStatus | string; driverId?: string; futureOnly?: boolean }): Promise<RouteEntity[]> {
    try {
      await RouteLifecycleManager.performJitTransitions();
      console.log(`[DrizzleRouteRepository] Finding routes with filters:`, filters);
      const conditions = [];
      
      if (filters?.status) {
        if (filters.status.includes(',')) {
          const statusList = filters.status.split(',').map(s => s.trim().toLowerCase());
          const placeholders = statusList.map(s => sql`${s}`);
          conditions.push(sql`LOWER(${routes.status}) IN (${sql.join(placeholders, sql`, `)})`);
        } else {
          conditions.push(sql`LOWER(${routes.status}) = ${filters.status.toLowerCase()}`);
        }
      }
      
      if (filters?.driverId) conditions.push(eq(routes.driverId, parseInt(filters.driverId)));

      if (filters?.futureOnly) {
        conditions.push(sql`${routes.departureTime} > ${new Date()}`);
      }

      const results = await db
        .select({
          route: routes,
          driverProfile: users.profileData,
          driverEmail: users.email
        })
        .from(routes)
        .leftJoin(users, eq(routes.driverId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      console.log(`[DrizzleRouteRepository] Found ${results.length} routes`);
      return results.map(r => this.mapToEntity(r.route, r.driverProfile, r.driverEmail || undefined));
    } catch (error) {
      console.error(`[DrizzleRouteRepository] DATABASE ERROR in findAll:`, error);
      throw error;
    }
  }

  async create(route: Omit<RouteEntity, "id" | "createdAt" | "status">): Promise<RouteEntity> {
    try {
      console.log(`[DrizzleRouteRepository] Creating route for driver: ${route.driverId}`);
      const [created] = await db.insert(routes).values({
        driverId: parseInt(route.driverId),
        vehicleId: route.vehicleId ? parseInt(route.vehicleId) : null,
        origin: route.origin,
        originCoords: route.originCoords,
        destination: route.destination,
        destinationCoords: route.destinationCoords,
        departureTime: route.departureTime,
        totalSeats: route.totalSeats,
        availableSeats: route.totalSeats,
        price: route.price,
        polyline: route.polyline,
        status: RouteStatus.SCHEDULED
      }).returning();

      // To get driver name for the created entity, we need to fetch user
      const [driver] = await db.select().from(users).where(eq(users.id, created.driverId));
      return this.mapToEntity(created, driver?.profileData);
    } catch (error) {
      console.error(`[DrizzleRouteRepository] DATABASE ERROR in create:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<RouteEntity>): Promise<RouteEntity> {
    try {
      console.log(`[DrizzleRouteRepository] Updating route ${id} with data:`, data);
      const updateData: any = {};
      if (data.origin !== undefined) updateData.origin = data.origin;
      if (data.destination !== undefined) updateData.destination = data.destination;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.availableSeats !== undefined) updateData.availableSeats = data.availableSeats;

      const [updated] = await db.update(routes)
        .set(updateData)
        .where(eq(routes.id, parseInt(id)))
        .returning();

      if (!updated) throw new Error("Route not found for update");

      const [driver] = await db.select().from(users).where(eq(users.id, updated.driverId));
      return this.mapToEntity(updated, driver?.profileData);
    } catch (error) {
      console.error(`[DrizzleRouteRepository] DATABASE ERROR in update:`, error);
      throw error;
    }
  }

  async search(origin: string, destination: string): Promise<RouteEntity[]> {
    try {
      console.log(`[DrizzleRouteRepository] Searching routes from ${origin} to ${destination}`);
      const results = await db
        .select({
          route: routes,
          driverProfile: users.profileData
        })
        .from(routes)
        .leftJoin(users, eq(routes.driverId, users.id))
        .where(
          and(
            eq(routes.status, RouteStatus.SCHEDULED),
            or(
              like(routes.origin, `%${origin}%`),
              like(routes.destination, `%${destination}%`)
            )
          )
        );
      return results.map(r => this.mapToEntity(r.route, r.driverProfile));
    } catch (error) {
      console.error(`[DrizzleRouteRepository] DATABASE ERROR in search:`, error);
      throw error;
    }
  }

  private mapToEntity(data: any, profileData?: string | null, driverEmail?: string): RouteEntity {
    let driverName = "Conductor";
    let driverAvatar = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    
    if (profileData) {
      try {
        const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
        driverName = profile.name || driverName;
        driverAvatar = profile.avatar || driverAvatar;
      } catch (e) {}
    }

    // Fallback to email if name is missing
    if (driverName === "Conductor" && driverEmail) {
      driverName = driverEmail.split('@')[0];
    }

    return {
      id: data.id.toString(),
      driverId: data.driverId.toString(),
      vehicleId: data.vehicleId?.toString() || undefined,
      driverName,
      driverAvatar,
      origin: data.origin,
      originCoords: data.originCoords || undefined,
      destination: data.destination,
      destinationCoords: data.destinationCoords || undefined,
      departureTime: data.departureTime,
      totalSeats: data.totalSeats,
      availableSeats: data.availableSeats,
      status: data.status as RouteStatus,
      price: data.price,
      polyline: data.polyline || undefined,
      createdAt: data.createdAt || new Date()
    };
  }
}
