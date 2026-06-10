import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { ratings, routes, joinRequests, users } from "../../../../db/schema";
import { IReviewRepository, ReviewEntity } from "../domain/IReviewRepository";

export class DrizzleReviewRepository implements IReviewRepository {
  async findExistingReview(routeId: number, fromUserId: number, toUserId: number): Promise<ReviewEntity | null> {
    try {
      const [existing] = await db.select().from(ratings).where(
        and(
          eq(ratings.routeId, routeId),
          eq(ratings.fromUserId, fromUserId),
          eq(ratings.toUserId, toUserId)
        )
      );
      return existing || null;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in findExistingReview:`, error);
      throw error;
    }
  }

  async createReview(review: Omit<ReviewEntity, "id" | "createdAt">): Promise<ReviewEntity> {
    try {
      const [created] = await db.insert(ratings).values({
        routeId: review.routeId,
        fromUserId: review.fromUserId,
        toUserId: review.toUserId,
        score: review.score,
        comment: review.comment
      }).returning();
      return created;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in createReview:`, error);
      throw error;
    }
  }

  async getReviewsByToUserId(toUserId: number): Promise<ReviewEntity[]> {
    try {
      const result = await db.select().from(ratings).where(eq(ratings.toUserId, toUserId));
      return result;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in getReviewsByToUserId:`, error);
      throw error;
    }
  }

  async getRouteById(routeId: number): Promise<{ id: number; status: string; driverId: number } | null> {
    try {
      const [route] = await db.select().from(routes).where(eq(routes.id, routeId));
      return route || null;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in getRouteById:`, error);
      throw error;
    }
  }

  async getPassengerJoinRequest(routeId: number, passengerId: number, status: string): Promise<any | null> {
    try {
      const [request] = await db.select().from(joinRequests).where(
        and(
          eq(joinRequests.routeId, routeId),
          eq(joinRequests.passengerId, passengerId),
          eq(joinRequests.status, status)
        )
      );
      return request || null;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in getPassengerJoinRequest:`, error);
      throw error;
    }
  }

  async getUserReviewStats(userId: number): Promise<{ avgScore: number | string | null; count: number } | null> {
    try {
      const [stats] = await db.select({
        avgScore: sql<number | string>`avg(${ratings.score})`,
        count: sql<number>`count(*)`
      }).from(ratings).where(eq(ratings.toUserId, userId));
      return stats ? { avgScore: stats.avgScore, count: Number(stats.count) } : null;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in getUserReviewStats:`, error);
      throw error;
    }
  }

  async updateUserRatingStats(userId: number, rating: string | null, reviewCount: number): Promise<void> {
    try {
      await db.update(users)
        .set({ 
          rating,
          reviewCount
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in updateUserRatingStats:`, error);
      throw error;
    }
  }

  async getMyReviewsForRoute(routeId: number, fromUserId: number): Promise<ReviewEntity[]> {
    try {
      const result = await db.select().from(ratings).where(
        and(
          eq(ratings.routeId, routeId),
          eq(ratings.fromUserId, fromUserId)
        )
      );
      return result;
    } catch (error) {
      console.error(`[DrizzleReviewRepository] DATABASE ERROR in getMyReviewsForRoute:`, error);
      throw error;
    }
  }
}
export const reviewRepository = new DrizzleReviewRepository();
