export type HealthStatus = "ok" | "degraded";

export interface ApiHealth {
  status: "ok";
  service: "hypofit-api";
  scope: "api-v1";
}

export interface PushReadinessChecks {
  enabled: boolean;
  worker_enabled: boolean;
  worker: {
    active_sleep_seconds: number;
    batch_size: number;
    error_sleep_seconds: number;
    idle_sleep_seconds: number;
  };
  batch_size: number;
  max_attempts: number;
  apns: {
    enabled: boolean;
    environment: string;
    configured: boolean;
    private_key_file_present: boolean;
  };
  fcm: {
    enabled: boolean;
    configured: boolean;
    service_account_file_present: boolean;
  };
}

export interface ApiReadinessChecks {
  database: "unknown" | "ok" | "unavailable" | string;
  kakao_rest_api_key: boolean;
  supabase_url: boolean;
  jwks_configured: boolean;
  push: PushReadinessChecks;
}

export interface ApiReadiness {
  status: HealthStatus;
  service: "hypofit-api";
  checks: ApiReadinessChecks;
}
