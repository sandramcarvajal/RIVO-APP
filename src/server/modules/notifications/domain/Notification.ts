import { NotificationType } from "../../../../shared/enums";

export { NotificationType };

export interface NotificationEntity {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface GetNotificationsOptions {
  userId: string;
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
}

export interface INotificationRepository {
  findByUserId(options: GetNotificationsOptions): Promise<{ data: NotificationEntity[], total: number }>;
  create(notification: Omit<NotificationEntity, "id" | "isRead" | "createdAt">): Promise<NotificationEntity>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
  cleanupOldNotifications(days: number): Promise<number>;
}
