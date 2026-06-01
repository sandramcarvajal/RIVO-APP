import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../auth/infrastructure/AuthMiddleware";
import { DrizzleNotificationRepository } from "./DrizzleNotificationRepository";

const notificationRouter = Router();
const notificationRepository = new DrizzleNotificationRepository();

// Get user notifications
notificationRouter.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const onlyUnread = req.query.unread === "true";

    const result = await notificationRepository.findByUserId({
      userId,
      limit,
      offset,
      onlyUnread
    });
    
    // Add pagination metadata
    res.json({
      items: result.data,
      total: result.total,
      limit,
      offset
    });
  } catch (error) {
    console.error(`[NotificationRouter] Error fetching notifications:`, error);
    res.status(500).json({ error: "Error fetching notifications" });
  }
});

// Mark notification as read
notificationRouter.patch("/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await notificationRepository.markAsRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error(`[NotificationRouter] Error marking notification as read:`, error);
    res.status(500).json({ error: "Error marking notification as read" });
  }
});

notificationRouter.post("/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await notificationRepository.markAsRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error(`[NotificationRouter] Error marking notification as read (POST):`, error);
    res.status(500).json({ error: "Error marking notification as read" });
  }
});

// Mark all as read
notificationRouter.patch("/read-all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await notificationRepository.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error(`[NotificationRouter] Error marking all notifications as read:`, error);
    res.status(500).json({ error: "Error marking all notifications as read" });
  }
});

notificationRouter.post("/read-all", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await notificationRepository.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error(`[NotificationRouter] Error marking all notifications as read (POST):`, error);
    res.status(500).json({ error: "Error marking all notifications as read" });
  }
});

export { notificationRouter };
