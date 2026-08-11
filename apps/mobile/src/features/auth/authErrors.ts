import { ApiError, NetworkError } from "@/shared/api/client";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";

export type AuthFailureCode =
  | "auth_network_unreachable"
  | "auth_dns_or_tls_failed"
  | "auth_timeout"
  | "auth_user_already_exists"
  | "auth_account_inactive"
  | "auth_signup_disabled"
  | "auth_rate_limited"
  | "auth_validation_failed"
  | "auth_supabase_service_unavailable"
  | "auth_token_expired"
  | "auth_invalid_token"
  | "auth_supabase_unexpected"
  | "auth_profile_sync_failed"
  | "auth_session_restore_failed"
  | "auth_unknown";

export type AuthPhase =
  | "network_preflight"
  | "signin"
  | "onboarding"
  | "onboarding_profile_sync"
  | "session_restore"
  | "profile_bootstrap";

export interface NormalizedAuthError {
  code: AuthFailureCode;
  phase: AuthPhase;
  providerCode: string | null;
  providerName: string | null;
  providerStatus: number | null;
  retryable: boolean;
  supportMessage: string;
  userMessage: string;
}

type AuthErrorLike = {
  code?: unknown;
  error_code?: unknown;
  message?: unknown;
  msg?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

type AuthDiagnosticValue = string | number | boolean | null;

const retryableCodes = new Set<AuthFailureCode>([
  "auth_network_unreachable",
  "auth_dns_or_tls_failed",
  "auth_timeout",
  "auth_supabase_service_unavailable",
]);

export class UserFacingAuthError extends Error {
  readonly normalized: NormalizedAuthError;

  constructor(normalized: NormalizedAuthError) {
    super(normalized.userMessage);
    this.name = "UserFacingAuthError";
    this.normalized = normalized;
  }
}

export function logAuthDiagnostic(message: string, data?: Record<string, AuthDiagnosticValue>) {
  if (!__DEV__) {
    return;
  }

  // Never pass emails, passwords, tokens, or request bodies.
  console.warn("[Hypofit auth]", {
    data: data ?? null,
    message,
  });
}

export function buildAuthFailure(input: {
  code: AuthFailureCode;
  phase: AuthPhase;
  providerCode?: string | null;
  providerName?: string | null;
  providerStatus?: number | null;
  supportMessage?: string | null;
  userMessage?: string | null;
}): NormalizedAuthError {
  return {
    code: input.code,
    phase: input.phase,
    providerCode: input.providerCode ?? null,
    providerName: input.providerName ?? null,
    providerStatus: input.providerStatus ?? null,
    retryable: retryableCodes.has(input.code),
    supportMessage: input.supportMessage ?? input.code,
    userMessage: input.userMessage ?? userMessageByCode(input.code),
  };
}

export function toUserFacingAuthError(error: NormalizedAuthError) {
  return new UserFacingAuthError(error);
}

export function isRetryableAuthFailure(error: NormalizedAuthError) {
  return error.retryable;
}

export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof UserFacingAuthError) {
    return error.normalized.userMessage;
  }

  const normalized = normalizeAuthError(error, "signin");
  if (normalized.code === "auth_unknown" && fallback) {
    return fallback;
  }

  return normalized.userMessage;
}

export function getAuthDiagnosticCode(error: unknown) {
  if (error instanceof UserFacingAuthError) {
    return error.normalized.code;
  }

  return normalizeAuthError(error, "signin").code;
}

export function normalizeAuthError(error: unknown, phase: AuthPhase): NormalizedAuthError {
  if (error instanceof UserFacingAuthError) {
    return error.normalized;
  }

  if (error instanceof NetworkError) {
    return buildAuthFailure({
      code: error.code === "api_timeout" ? "auth_timeout" : "auth_dns_or_tls_failed",
      phase,
      providerCode: error.code,
      providerName: error.name,
      supportMessage: `${error.code}:${error.path}`,
    });
  }

  if (error instanceof ApiError) {
    if (error.code === "auth_token_expired") {
      return buildAuthFailure({
        code: "auth_token_expired",
        phase,
        providerCode: error.code,
        providerName: error.name,
        providerStatus: error.status,
        supportMessage: `${error.code}:${error.requestId ?? "no_request_id"}`,
      });
    }

    if (error.code === "auth_invalid_token" || error.status === 401) {
      return buildAuthFailure({
        code: "auth_invalid_token",
        phase,
        providerCode: error.code,
        providerName: error.name,
        providerStatus: error.status,
        supportMessage: `${error.code}:${error.requestId ?? "no_request_id"}`,
      });
    }

    if (
      error.code === "account_inactive" ||
      error.code === "account_deleted" ||
      error.code === "account_deactivated" ||
      error.userMessage === "Account is inactive" ||
      error.debugMessage === "Account is inactive"
    ) {
      return buildAuthFailure({
        code: "auth_account_inactive",
        phase,
        providerCode: error.code,
        providerName: error.name,
        providerStatus: error.status,
        supportMessage: `${error.code}:${error.requestId ?? "no_request_id"}`,
      });
    }

    return buildAuthFailure({
      code: phase === "onboarding_profile_sync" ? "auth_profile_sync_failed" : "auth_supabase_unexpected",
      phase,
      providerCode: error.code,
      providerName: error.name,
      providerStatus: error.status,
      supportMessage: `${error.code}:${error.requestId ?? "no_request_id"}`,
      userMessage:
        phase === "onboarding_profile_sync"
          ? userMessageByCode("auth_profile_sync_failed")
          : error.userMessage,
    });
  }

  const { code, message, name, status } = readAuthError(error);
  const normalizedMessage = message.toLowerCase();
  const normalizedCode = code.toLowerCase();
  const normalizedName = name.toLowerCase();

  const failureCode = classifyAuthError({
    code: normalizedCode,
    message: normalizedMessage,
    name: normalizedName,
    status,
  });

  return buildAuthFailure({
    code: failureCode,
    phase,
    providerCode: code || null,
    providerName: name || null,
    providerStatus: status,
    supportMessage: buildSupportMessage({ code, message, name, status }),
  });
}

export function reportAuthError(phase: AuthPhase, error: unknown) {
  const normalized = normalizeAuthError(error, phase);
  captureAuthFailure(normalized);
}

export function captureAuthFailure(error: NormalizedAuthError) {
  const safePayload = {
    code: error.code,
    phase: error.phase,
    provider_code: error.providerCode,
    provider_name: error.providerName,
    provider_status: error.providerStatus,
    retryable: error.retryable,
    source: "supabase_auth",
  };

  addAppBreadcrumb("auth_failure", {
    code: error.code,
    phase: error.phase,
    provider_status: error.providerStatus,
    retryable: error.retryable,
  });
  logAuthDiagnostic("auth_failure", {
    code: error.code,
    phase: error.phase,
    provider_status: error.providerStatus,
    retryable: error.retryable,
  });
  captureAppError(new Error(error.supportMessage), safePayload);
}

function readAuthError(error: unknown): {
  code: string;
  message: string;
  name: string;
  status: number | null;
} {
  if (!error || typeof error !== "object") {
    return { code: "", message: "", name: "", status: null };
  }

  const value = error as AuthErrorLike;
  const code = readString(value.code) || readString(value.error_code);
  const message = readString(value.message) || readString(value.msg);
  const name = readString(value.name);
  const status = readNumber(value.status) ?? readNumber(value.statusCode);

  return { code, message, name, status };
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function classifyAuthError(input: {
  code: string;
  message: string;
  name: string;
  status: number | null;
}): AuthFailureCode {
  const { code, message, name, status } = input;

  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already registered") ||
    code === "user_already_exists" ||
    code === "email_exists"
  ) {
    return "auth_user_already_exists";
  }

  if ((message.includes("invalid") && message.includes("email")) || code.includes("email_address_invalid")) {
    return "auth_validation_failed";
  }

  if (message.includes("signup") && message.includes("disabled")) {
    return "auth_signup_disabled";
  }

  if (status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "auth_rate_limited";
  }

  if (name === "authretryablefetcherror" || name === "aborterror") {
    return name === "aborterror" ? "auth_timeout" : "auth_supabase_service_unavailable";
  }

  if (
    status === 0 ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("load failed") ||
    message.includes("dns") ||
    message.includes("tls") ||
    message.includes("could not resolve") ||
    message.includes("failed to connect")
  ) {
    return "auth_dns_or_tls_failed";
  }

  if (message.includes("timeout") || message.includes("timed out")) {
    return "auth_timeout";
  }

  if (status === 503 || status === 502 || code.includes("over_request_rate_limit")) {
    return "auth_supabase_service_unavailable";
  }

  if (typeof status === "number" && status >= 500) {
    return "auth_supabase_service_unavailable";
  }

  if (status === 400 || code === "validation_failed") {
    return "auth_validation_failed";
  }

  if (message.includes("database error") || message.includes("saving new user")) {
    return "auth_supabase_unexpected";
  }

  return "auth_unknown";
}

function buildSupportMessage(input: {
  code: string;
  message: string;
  name: string;
  status: number | null;
}) {
  const pieces = [
    input.name || "unknown_name",
    input.code || "unknown_code",
    input.status === null ? "no_status" : String(input.status),
    input.message ? "has_message" : "no_message",
  ];

  return pieces.join(":").slice(0, 180);
}

function userMessageByCode(code: AuthFailureCode) {
  switch (code) {
    case "auth_network_unreachable":
      return "인터넷 연결을 확인해 주세요.";
    case "auth_dns_or_tls_failed":
      return "인증 서버에 연결하지 못했어요. 네트워크를 바꿔 다시 시도해 주세요.";
    case "auth_timeout":
      return "요청 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.";
    case "auth_user_already_exists":
      return "이미 가입된 이메일이에요. 최근 계정을 삭제했다면 잠시 후 다시 시도해 주세요.";
    case "auth_account_inactive":
      return "삭제되었거나 비활성화된 계정이에요. 다시 이용하려면 회원가입을 진행해 주세요.";
    case "auth_signup_disabled":
      return "지금은 새 가입을 받을 수 없어요. 잠시 후 다시 시도해 주세요.";
    case "auth_rate_limited":
      return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    case "auth_validation_failed":
      return "입력한 정보를 다시 확인해 주세요.";
    case "auth_supabase_service_unavailable":
      return "인증 서버 연결이 불안정해요. 잠시 후 다시 시도해 주세요.";
    case "auth_token_expired":
      return "로그인이 만료됐어요. 다시 로그인해 주세요.";
    case "auth_invalid_token":
      return "로그인 정보를 다시 확인해 주세요.";
    case "auth_supabase_unexpected":
      return "인증 처리 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
    case "auth_profile_sync_failed":
      return "계정은 만들어졌지만 프로필 설정을 마무리하지 못했어요. 잠시 후 로그인해 주세요.";
    case "auth_session_restore_failed":
      return "로그인 상태를 불러오지 못했어요. 다시 로그인해 주세요.";
    case "auth_unknown":
      return "일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
}
