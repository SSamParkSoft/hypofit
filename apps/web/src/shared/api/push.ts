import type {
  NotificationPreference,
  NotificationPreferenceUpdate,
} from "@hypofit/contracts";

import { apiRequest, type ApiRequestInit } from "./client";

const notificationPreferencesPath = "/api/v1/notification-preferences";

export function getNotificationPreferences(
  accessToken?: string | null,
  init?: ApiRequestInit,
): Promise<NotificationPreference> {
  return apiRequest<NotificationPreference>(notificationPreferencesPath, {
    ...init,
    accessToken,
  });
}

export function updateNotificationPreferences(
  input: NotificationPreferenceUpdate,
  accessToken?: string | null,
): Promise<NotificationPreference> {
  return apiRequest<NotificationPreference>(notificationPreferencesPath, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export const pushApi = {
  getPreferences: getNotificationPreferences,
  updatePreferences: updateNotificationPreferences,
} as const;
