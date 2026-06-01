import { Router } from "express";
import { db } from "../../../../db";
import { ratings, routes, joinRequests, users } from "../../../../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";

const reviewRouter = Router();

// Create a review
reviewRouter.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId, toUserId, score, comment } = req.body;
    const fromUserId = parseInt(req.user!.userId);

    if (String(fromUserId) === String(toUserId)) {
      return res.status(400).json({ error: "No puedes calificarte a ti mismo" });
    }

    // Validate that the route exists and is completed
    const [route] = await db.select().from(routes).where(eq(routes.id, parseInt(routeId)));
    if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
    
    // In a real flow, it should be completed, but for now we follow the user request: "solo después de completed"
    if (route.status !== 'completed') {
      return res.status(400).json({ error: "Solo puedes calificar después de que el viaje haya finalizado" });
    }

    // Validate that the toUserId is part of the route (either driver or accepted passenger)
    const isDriver = String(route.driverId) === String(toUserId);
    let isPassenger = false;

    if (!isDriver) {
      const [request] = await db.select().from(joinRequests).where(
        and(
          eq(joinRequests.routeId, parseInt(routeId)),
          eq(joinRequests.passengerId, parseInt(toUserId)),
          eq(joinRequests.status, 'accepted')
        )
      );
      isPassenger = !!request;
    }

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ error: "No puedes calificar a un usuario que no participó en este viaje" });
    }

    // Check if review already exists to avoid duplicates
    const [existing] = await db.select().from(ratings).where(
      and(
        eq(ratings.routeId, parseInt(routeId)),
        eq(ratings.fromUserId, fromUserId),
        eq(ratings.toUserId, parseInt(toUserId))
      )
    );

    if (existing) {
      return res.status(400).json({ error: "Ya has calificado a este usuario para este viaje" });
    }

    // Insert review
    const [created] = await db.insert(ratings).values({
      routeId: parseInt(routeId),
      fromUserId,
      toUserId: parseInt(toUserId),
      score: parseInt(score),
      comment
    }).returning();

    // Update target user average rating and reviewCount
    const [stats] = await db.select({
      avgScore: sql<number>`avg(${ratings.score})`,
      count: sql<number>`count(*)`
    }).from(ratings).where(eq(ratings.toUserId, parseInt(toUserId)));

    if (stats) {
      const totalCount = Number(stats.count);
      const roundedRating = totalCount > 0 ? parseFloat(Number(stats.avgScore).toFixed(1)) : null;
      await db.update(users)
        .set({ 
          rating: roundedRating !== null ? roundedRating.toString() : null,
          reviewCount: totalCount
        })
        .where(eq(users.id, parseInt(toUserId)));
        
      console.log(`[ReviewRouter] Updated user ${toUserId} rating to ${roundedRating}, count to ${totalCount}`);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error(`[ReviewRouter] ERROR creating review:`, error);
    res.status(500).json({ error: "Error al crear la calificación" });
  }
});

// Get reviews for a user
reviewRouter.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const result = await db.select().from(ratings).where(eq(ratings.toUserId, userId));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error fetching reviews" });
  }
});

export { reviewRouter };
