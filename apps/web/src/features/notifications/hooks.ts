import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationPreferences } from "@foryou/shared";
import { notificationsApi } from "./api";

export const notificationsQueryKey = ["notifications"] as const;
export const unreadCountQueryKey = ["notifications", "unread-count"] as const;
export const notificationPreferencesQueryKey = ["notifications", "preferences"] as const;

export function useNotifications() {
  return useQuery({ queryKey: notificationsQueryKey, queryFn: notificationsApi.list });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: notificationsApi.getPreferences,
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.updatePreferences,
    // Optimistic: flip the toggle immediately, roll back if the request fails.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: notificationPreferencesQueryKey });
      const previous = queryClient.getQueryData<NotificationPreferences>(
        notificationPreferencesQueryKey,
      );
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(notificationPreferencesQueryKey, {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationPreferencesQueryKey, context.previous);
      }
    },
    onSuccess: (data) => queryClient.setQueryData(notificationPreferencesQueryKey, data),
  });
}
