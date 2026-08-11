import { apiRequest } from "./client";

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
  unreadOnly?: boolean;
  limit?: number;
}

const notificationsPath = "/api/v1/notifications";

export function listNotifications(
  accessToken?: string | null,
  params?: ListNotificationsParams,
): Promise<NotificationRecord[]> {
  const search = new URLSearchParams();

  if (params?.unreadOnly) {
    search.set("unread_only", "true");
  }

  if (params?.limit) {
    search.set("limit", String(params.limit));
  }

  const suffix = search.size ? `?${search.toString()}` : "";
  return apiRequest<NotificationRecord[]>(`${notificationsPath}${suffix}`, { accessToken });
}

export function markNotificationRead(notificationId: string, accessToken?: string | null): Promise<NotificationRecord> {
  return apiRequest<NotificationRecord>(`${notificationsPath}/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    accessToken,
  });
}

export function markAllNotificationsRead(accessToken?: string | null): Promise<void> {
  return apiRequest<void>(`${notificationsPath}/read-all`, {
    method: "POST",
    accessToken,
  });
}

export const notificationsApi = {
  list: listNotifications,
  markRead: markNotificationRead,
  markAllRead: markAllNotificationsRead,
} as const;
