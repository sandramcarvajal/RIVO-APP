import { SecureHttpClient } from "../../auth/services/SecureHttpClient";
import { Notification } from "../../../../types";

export class NotificationService {
  static async getNotifications(limit = 20, offset = 0, unread = false): Promise<{ items: Notification[], total: number }> {
    const url = `/api/notifications?limit=${limit}&offset=${offset}&unread=${unread}`;
    console.log(`[NOTIFICATION_FETCH] Querying notifications: ${url}`);
    const response = await SecureHttpClient.request(url);
    if (!response.ok) return { items: [], total: 0 };
    return response.json();
  }

  static async markAsRead(id: string): Promise<boolean> {
    const response = await SecureHttpClient.request(`/api/notifications/${id}/read`, {
      method: "POST"
    });
    return response.ok;
  }

  static async markAllAsRead(): Promise<boolean> {
    const response = await SecureHttpClient.request("/api/notifications/read-all", {
      method: "POST"
    });
    return response.ok;
  }
}
