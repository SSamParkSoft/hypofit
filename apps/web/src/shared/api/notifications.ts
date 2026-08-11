import { apiRequest, type ApiRequestInit } from "./client";

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ListNotificationsParams {
  limit?: number;
  unreadOnly?: boolean;
}

const notificationsPath = "/api/v1/notifications";

export function listNotifications(
  accessToken?: string | null,
  params?: ListNotificationsParams,
  init?: ApiRequestInit,
): Promise<NotificationRecord[]> {
  const search = new URLSearchParams();

  if (params?.unreadOnly) {
    search.set("unread_only", "true");
  }

  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const suffix = search.size ? `?${search.toString()}` : "";
  return apiRequest<NotificationRecord[]>(`${notificationsPath}${suffix}`, {
    ...init,
    accessToken,
  });
}

export function markNotificationRead(
  notificationId: string,
  accessToken?: string | null,
): Promise<NotificationRecord> {
  return apiRequest<NotificationRecord>(
    `${notificationsPath}/${encodeURIComponent(notificationId)}/read`,
    {
      accessToken,
      method: "POST",
    },
  );
}

export function markAllNotificationsRead(accessToken?: string | null): Promise<void> {
  return apiRequest<void>(`${notificationsPath}/read-all`, {
    accessToken,
    method: "POST",
  });
}

export const notificationsApi = {
  list: listNotifications,
  markAllRead: markAllNotificationsRead,
  markRead: markNotificationRead,
} as const;
