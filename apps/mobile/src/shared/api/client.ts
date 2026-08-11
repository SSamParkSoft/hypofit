import { captureAppError } from "@/shared/diagnostics/sentry";
import { mobileEnv } from "./env";

export interface ApiFieldError {
  code: string;
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly debugMessage: string | null;
  readonly fieldErrors: ApiFieldError[] | null;
  readonly method: string;
  readonly path: string;
  readonly requestId: string | null;
  readonly status: number;
  readonly userMessage: string;

  constructor(input: {
    code: string;
    debugMessage?: string | null;
    fieldErrors?: ApiFieldError[] | null;
    method: string;
    path: string;
    requestId?: string | null;
    status: number;
    userMessage: string;
  }) {
    super(input.userMessage);
    this.code = input.code;
    this.debugMessage = input.debugMessage ?? null;
    this.fieldErrors = input.fieldErrors ?? null;
    this.method = input.method;
    this.name = "ApiError";
    this.path = input.path;
    this.requestId = input.requestId ?? null;
    this.status = input.status;
    this.userMessage = input.userMessage;
  }
}

export class NetworkError extends Error {
  readonly code: string;
  readonly method: string;
  readonly path: string;
  readonly requestId: string;

  constructor(input: { code?: string; message: string; method: string; path: string; requestId: string }) {
    super(input.message);
    this.code = input.code ?? "network_error";
    this.method = input.method;
    this.name = "NetworkError";
    this.path = input.path;
    this.requestId = input.requestId;
  }
}

export interface ApiRequestInit extends RequestInit {
  accessToken?: string | null;
}

interface StandardErrorBody {
  error?: {
    code?: unknown;
    debug_message?: unknown;
    field_errors?: unknown;
    message?: unknown;
    request_id?: unknown;
  };
}

const apiTimeoutMs = 20_000;

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildLegacyApiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    const { detail, message } = body as {
      detail?: unknown;
      message?: unknown;
    };

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function createRequestId() {
  return `mob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseFieldErrors(value: unknown): ApiFieldError[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const fields = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const fieldError = item as { code?: unknown; field?: unknown; message?: unknown };
      if (typeof fieldError.field !== "string" || typeof fieldError.message !== "string") {
        return null;
      }

      return {
        code: typeof fieldError.code === "string" ? fieldError.code : "validation_error",
        field: fieldError.field,
        message: fieldError.message,
      };
    })
    .filter((item): item is ApiFieldError => Boolean(item));

  return fields.length ? fields : null;
}

function buildApiError(input: {
  body: unknown;
  fallback: string;
  method: string;
  path: string;
  response: Response;
}): ApiError {
  const responseRequestId = input.response.headers.get("X-Request-ID");
  const standard = input.body as StandardErrorBody;
  const error = standard && typeof standard === "object" ? standard.error : null;

  if (error && typeof error === "object") {
    const code = typeof error.code === "string" ? error.code : `http_${input.response.status}`;
    const message = typeof error.message === "string" ? error.message : input.fallback;
    const requestId =
      typeof error.request_id === "string" ? error.request_id : responseRequestId;
    const debugMessage = typeof error.debug_message === "string" ? error.debug_message : null;
    const fieldErrors = parseFieldErrors(error.field_errors);

    return new ApiError({
      code,
      debugMessage,
      fieldErrors,
      method: input.method,
      path: input.path,
      requestId,
      status: input.response.status,
      userMessage: message,
    });
  }

  const legacyMessage = buildLegacyApiErrorMessage(input.body, input.fallback);

  return new ApiError({
    code: `http_${input.response.status}`,
    debugMessage: legacyMessage,
    method: input.method,
    path: input.path,
    requestId: responseRequestId,
    status: input.response.status,
    userMessage: legacyMessage,
  });
}

function reportApiError(error: ApiError | NetworkError) {
  captureAppError(error, {
    code: error.code,
    method: error.method,
    path: error.path,
    phase: "api_request",
    request_id: error.requestId,
    status: error instanceof ApiError ? error.status : null,
  });
}

export async function apiRequest<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { accessToken, headers, ...requestInit } = init ?? {};
  const method = requestInit.method ?? "GET";
  const requestId = createRequestId();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiTimeoutMs);

  let response: Response;

  try {
    response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      signal: controller.signal,
      ...requestInit,
    });
  } catch (error) {
    const networkError = new NetworkError({
      code: error instanceof Error && error.name === "AbortError" ? "api_timeout" : "network_error",
      message:
        error instanceof Error && error.name === "AbortError"
          ? "요청 시간이 초과됐어요."
          : "네트워크 연결을 확인해 주세요.",
      method,
      path,
      requestId,
    });
    reportApiError(networkError);
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    const apiError = buildApiError({
      body,
      fallback: `API request failed: ${path}`,
      method,
      path,
      response,
    });
    reportApiError(apiError);
    throw apiError;
  }

  return body as T;
}

export function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { accessToken: token });
}
