export type PushPlatform = "ios" | "android";
export type PushProvider = "apns" | "fcm";
export type PushEnvironment = "development" | "production";
export type PushPermissionStatus = "granted" | "denied" | "provisional" | "unknown";

export interface PushDeviceRegisterInput {
  platform: PushPlatform;
  provider: PushProvider;
  environment?: PushEnvironment;
  token: string;
  installation_id?: string | null;
  device_label?: string | null;
  app_version?: string | null;
  build_number?: string | null;
  os_version?: string | null;
  locale?: string | null;
  timezone?: string | null;
  permission_status?: PushPermissionStatus;
}

export interface PushDevice {
  id: string;
  platform: PushPlatform | string;
  provider: PushProvider | string;
  environment: PushEnvironment | string;
  installation_id: string | null;
  device_label: string | null;
  app_version: string | null;
  build_number: string | null;
  os_version: string | null;
  locale: string | null;
  timezone: string | null;
  permission_status: PushPermissionStatus | string;
  enabled: boolean;
  last_registered_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
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

export type NotificationPreferenceUpdate = Partial<
  Pick<
    NotificationPreference,
    | "push_enabled"
    | "chat_push_enabled"
    | "application_push_enabled"
    | "session_push_enabled"
    | "support_push_enabled"
    | "marketing_push_enabled"
  >
>;

export interface PushDispatchResult {
  processed: number;
  sent: number;
  failed: number;
  invalid: number;
  skipped: number;
}
