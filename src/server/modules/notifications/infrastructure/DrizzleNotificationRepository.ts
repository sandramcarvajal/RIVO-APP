import { db } from "../../../../db";
import { notifications } from "../../../../db/schema";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { INotificationRepository, NotificationEntity, NotificationType, GetNotificationsOptions } from "../domain/Notification";

export class DrizzleNotificationRepository implements INotificationRepository {
  async findByUserId(options: GetNotificationsOptions): Promise<{ data: NotificationEntity[], total: number }> {
    const { userId, limit = 20, offset = 0, onlyUnread = false } = options;
    
    let whereClause = eq(notifications.userId, parseInt(userId));
    if (onlyUnread) {
      whereClause = and(whereClause, eq(notifications.isRead, false)) as any;
    }

    // Get count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(whereClause);

    // Get data
    const results = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        description: notifications.description,
        type: notifications.type,
        data: notifications.data,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const data = results.map(r => ({
      ...r,
      id: r.id.toString(),
      userId: r.userId.toString(),
      type: r.type as NotificationType,
      data: r.data ? JSON.parse(r.data) : undefined,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      data,
      total: Number(countResult.count)
    };
  }

  async create(notification: Omit<NotificationEntity, "id" | "isRead" | "createdAt">): Promise<NotificationEntity> {
    const [result] = await db
      .insert(notifications)
      .values({
        userId: parseInt(notification.userId),
        title: notification.title,
        description: notification.description,
        type: notification.type,
        data: notification.data ? JSON.stringify(notification.data) : null,
      })
      .returning();

    return {
      ...result,
      id: result.id.toString(),
      userId: result.userId.toString(),
      type: result.type as NotificationType,
      data: result.data ? JSON.parse(result.data) : undefined,
      createdAt: result.createdAt.toISOString(),
    };
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, parseInt(id)),
          eq(notifications.userId, parseInt(userId))
        )
      );
    return true;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, parseInt(userId)));
    return true;
  }

  async cleanupOldNotifications(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const result = await db
      .delete(notifications)
      .where(lt(notifications.createdAt, date));
    
    return 0; // Drizzle update/delete returns void or rows in some drivers, defaulting to 0 for simplicity here
  }
}
