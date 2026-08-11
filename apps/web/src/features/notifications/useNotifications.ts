import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  notificationsApi,
  type ListNotificationsParams,
  type NotificationRecord,
} from "../../shared/api/notifications";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  lists(stableUserId: string | null) {
    return ["notifications", getProtectedQueryUserId(stableUserId)] as const;
  },
  list(stableUserId: string | null, params?: ListNotificationsParams) {
    return [
      "notifications",
      getProtectedQueryUserId(stableUserId),
      params?.unreadOnly ? "unread" : "all",
      params?.limit ?? 50,
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

interface UseNotificationsOptions {
  enabled?: boolean;
}

export function useNotifications(
  accessToken?: string | null,
  params?: ListNotificationsParams,
  options: UseNotificationsOptions = {},
) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken) && (options.enabled ?? true),
    queryFn: ({ signal }) => notificationsApi.list(effectiveAccessToken, params, { signal }),
    queryKey: notificationQueryKeys.list(stableUserId, params),
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.markRead(notificationId, effectiveAccessToken),
    onSuccess: (notification) => {
      queryClient.setQueriesData<NotificationRecord[]>(
        { queryKey: notificationQueryKeys.lists(stableUserId) },
        (current) => current?.map((item) => (item.id === notification.id ? notification : item)),
      );
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists(stableUserId) });
    },
  });
}

export function useMarkAllNotificationsRead(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(effectiveAccessToken),
    onSuccess: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueriesData<NotificationRecord[]>(
        { queryKey: notificationQueryKeys.lists(stableUserId) },
        (current) => current?.map((item) => (item.read_at ? item : { ...item, read_at: readAt })),
      );
      void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.lists(stableUserId) });
    },
  });
}
