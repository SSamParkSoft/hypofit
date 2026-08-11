import { apiRequest } from "./client";

export interface PushDeviceRecord {
  id: string;
  platform: "ios" | "android";
  provider: "apns" | "fcm";
  environment: "development" | "production";
  installation_id: string | null;
  device_label: string | null;
  app_version: string | null;
  build_number: string | null;
  os_version: string | null;
  locale: string | null;
  timezone: string | null;
  permission_status: "granted" | "denied" | "provisional" | "unknown";
  enabled: boolean;
  last_registered_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterPushDeviceInput {
  platform: "ios" | "android";
  provider: "apns" | "fcm";
  environment: "development" | "production";
  token: string;
  installation_id?: string | null;
  device_label?: string | null;
  app_version?: string | null;
  build_number?: string | null;
  os_version?: string | null;
  locale?: string | null;
  timezone?: string | null;
  permission_status: "granted" | "denied" | "provisional" | "unknown";
}

export interface NotificationPreferenceRecord {
  user_id: string;
  push_enabled: boolean;
  chat_push_enabled: boolean;
  application_push_enabled: boolean;
  session_push_enabled: boolean;
  support_push_enabled: boolean;
  marketing_push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdateNotificationPreferencesInput = Partial<
  Pick<
    NotificationPreferenceRecord,
    | "push_enabled"
    | "chat_push_enabled"
    | "application_push_enabled"
    | "session_push_enabled"
    | "support_push_enabled"
    | "marketing_push_enabled"
  >
>;

export const pushApi = {
  registerDevice(input: RegisterPushDeviceInput, accessToken?: string | null) {
    return apiRequest<PushDeviceRecord>("/api/v1/push-devices", {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  disableDevice(pushDeviceId: string, accessToken?: string | null) {
    return apiRequest<void>(`/api/v1/push-devices/${encodeURIComponent(pushDeviceId)}`, {
      method: "DELETE",
      accessToken,
    });
  },
  getPreferences(accessToken?: string | null) {
    return apiRequest<NotificationPreferenceRecord>("/api/v1/notification-preferences", {
      accessToken,
    });
  },
  updatePreferences(input: UpdateNotificationPreferencesInput, accessToken?: string | null) {
    return apiRequest<NotificationPreferenceRecord>("/api/v1/notification-preferences", {
      method: "PATCH",
      accessToken,
      body: JSON.stringify(input),
    });
  },
} as const;
