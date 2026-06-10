import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { reviewRepository } from "./DrizzleReviewRepository";

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
    const route = await reviewRepository.getRouteById(parseInt(routeId));
    if (!route) return res.status(404).json({ error: "Ruta no encontrada" });
    
    // In a real flow, it should be completed, but for now we follow the user request: "solo después de completed"
    if (route.status !== 'completed') {
      return res.status(400).json({ error: "Solo puedes calificar después de que el viaje haya finalizado" });
    }

    // Validate that the toUserId is part of the route (either driver or accepted passenger)
    const isDriver = String(route.driverId) === String(toUserId);
    let isPassenger = false;

    if (!isDriver) {
      const request = await reviewRepository.getPassengerJoinRequest(parseInt(routeId), parseInt(toUserId), 'accepted');
      isPassenger = !!request;
    }

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ error: "No puedes calificar a un usuario que no participó en este viaje" });
    }

    // Check if review already exists to avoid duplicates
    const existing = await reviewRepository.findExistingReview(parseInt(routeId), fromUserId, parseInt(toUserId));

    if (existing) {
      return res.status(400).json({ error: "Ya has calificado a este usuario para este viaje" });
    }

    // Insert review
    const created = await reviewRepository.createReview({
      routeId: parseInt(routeId),
      fromUserId,
      toUserId: parseInt(toUserId),
      score: parseInt(score),
      comment
    });

    // Update target user average rating and reviewCount
    const stats = await reviewRepository.getUserReviewStats(parseInt(toUserId));

    if (stats) {
      const totalCount = stats.count;
      const roundedRating = totalCount > 0 ? parseFloat(Number(stats.avgScore).toFixed(1)) : null;
      await reviewRepository.updateUserRatingStats(
        parseInt(toUserId),
        roundedRating !== null ? roundedRating.toString() : null,
        totalCount
      );
        
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
    const result = await reviewRepository.getReviewsByToUserId(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Error fetching reviews" });
  }
});

// Get reviews made by the authenticated user for a specific route
reviewRouter.get("/route/:routeId/my-reviews", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const routeId = parseInt(req.params.routeId);
    const fromUserId = parseInt(req.user!.userId);

    if (isNaN(routeId)) {
      return res.status(400).json({ error: "ID de ruta inválido" });
    }

    const reviews = await reviewRepository.getMyReviewsForRoute(routeId, fromUserId);
    const ratedUserIds = reviews.map(r => r.toUserId);

    res.json({ ratedUserIds });
  } catch (error) {
    console.error(`[ReviewRouter] ERROR in GET /route/:routeId/my-reviews:`, error);
    res.status(500).json({ error: "Error al consultar las calificaciones" });
  }
});

export { reviewRouter };

