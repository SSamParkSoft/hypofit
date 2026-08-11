import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  notificationsApi,
  type ListNotificationsParams,
  type NotificationRecord,
} from "@/shared/api/notifications";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const notificationQueryKeys = {
  all: ["notifications"] as const,
  list(userId: string | null, params?: ListNotificationsParams) {
    return buildAuthQueryKey(
      "notifications",
      userId,
      params?.unreadOnly ? "unread" : "all",
      params?.limit ?? 50,
    );
  },
} as const;

export function useNotifications(accessToken?: string | null, params?: ListNotificationsParams) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: notificationQueryKeys.list(stableUserId, params),
    queryFn: () => notificationsApi.list(accessToken, params),
    retry: false,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId, accessToken),
    onSuccess: (notification) => {
      queryClient.setQueriesData<NotificationRecord[]>({ queryKey: notificationQueryKeys.all }, (current) =>
        current?.map((item) => (item.id === notification.id ? notification : item)),
      );
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead(accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(accessToken),
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueriesData<NotificationRecord[]>({ queryKey: notificationQueryKeys.all }, (current) =>
        current?.map((item) => (item.read_at ? item : { ...item, read_at: readAt })),
      );
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}
