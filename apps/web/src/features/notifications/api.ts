import { apiClient } from "@/lib/api-client";
import type { Notification } from "./types";

export const notificationsApi = {
  list: () => apiClient.get<Notification[]>("/notifications").then((r) => r.data),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (id: string) =>
    apiClient.post<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post("/notifications/read-all").then((r) => r.data),
};
