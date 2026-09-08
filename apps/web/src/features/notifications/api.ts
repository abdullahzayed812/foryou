import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from "@foryou/shared";
import { apiClient } from "@/lib/api-client";
import type { Notification } from "./types";

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>("/notifications").then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post("/notifications/read-all").then((r) => r.data),

  getPreferences: () =>
    apiClient.get<NotificationPreferences>("/notifications/preferences").then((r) => r.data),
  updatePreferences: (input: UpdateNotificationPreferencesInput) =>
    apiClient
      .patch<NotificationPreferences>("/notifications/preferences", input)
      .then((r) => r.data),
};
