export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export interface ApiFieldError {
  code: string;
  field: string;
  message: string;
}

export type ApiErrorKind = "abort" | "http" | "invalid_response" | "network";

export class ApiError extends Error {
  readonly code: string;
  readonly debugMessage: string | null;
  readonly details: unknown;
  readonly fieldErrors: ApiFieldError[] | null;
  readonly isAbortError: boolean;
  readonly isNetworkError: boolean;
  readonly isRetryable: boolean;
  readonly kind: ApiErrorKind;
  readonly method: string;
  readonly path: string;
  readonly requestId: string | null;
  readonly status: number | null;

  constructor(input: {
    code: string;
    debugMessage?: string | null;
    details?: unknown;
    fieldErrors?: ApiFieldError[] | null;
    kind: ApiErrorKind;
    message: string;
    method: string;
    path: string;
    requestId?: string | null;
    status?: number | null;
  }) {
    super(input.message);
    this.code = input.code;
    this.debugMessage = input.debugMessage ?? null;
    this.details = input.details ?? null;
    this.fieldErrors = input.fieldErrors ?? null;
    this.isAbortError = input.kind === "abort";
    this.isNetworkError = input.kind === "network";
    this.isRetryable = isRetryableErrorKind(input.kind, input.status ?? null);
    this.kind = input.kind;
    this.method = input.method;
    this.name = "ApiError";
    this.path = input.path;
    this.requestId = input.requestId ?? null;
    this.status = input.status ?? null;
  }
}

export interface ApiRequestInit extends RequestInit {
  accessToken?: string | null;
}

interface ApiErrorEnvelope {
  detail?: unknown;
  error?: {
    code?: unknown;
    debug_message?: unknown;
    details?: unknown;
    field_errors?: unknown;
    message?: unknown;
    request_id?: unknown;
    status?: unknown;
  };
  message?: unknown;
}

interface ParsedResponseBody {
  body: unknown;
  parseError: Error | null;
  rawText: string | null;
}

function buildDefaultHttpErrorMessage(status: number) {
  if (status === 400 || status === 422) {
    return "입력값을 확인해 주세요.";
  }

  if (status === 401) {
    return "로그인이 필요해요.";
  }

  if (status === 403) {
    return "권한이 없어요.";
  }

  if (status === 404) {
    return "요청한 정보를 찾지 못했어요.";
  }

  if (status === 409) {
    return "이미 처리된 요청이에요.";
  }

  if (status >= 500) {
    return "잠시 후 다시 시도해 주세요.";
  }

  return "요청을 처리하지 못했어요.";
}

function buildLegacyApiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    const { detail, message } = body as { detail?: unknown; message?: unknown };

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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID()}`;
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getExistingRequestId(headers?: HeadersInit) {
  if (!headers) {
    return null;
  }

  return new Headers(headers).get("X-Request-ID");
}

function isAbortFailure(error: unknown) {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (!!error &&
      typeof error === "object" &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError")
  );
}

function isJsonLikeBody(rawText: string) {
  const trimmedText = rawText.trim();
  return (
    trimmedText.startsWith("{") ||
    trimmedText.startsWith("[") ||
    trimmedText === "null" ||
    trimmedText === "true" ||
    trimmedText === "false"
  );
}

function isJsonContentType(contentType: string | null) {
  if (!contentType) {
    return false;
  }

  return contentType.includes("/json") || contentType.includes("+json");
}

function isRetryableErrorKind(kind: ApiErrorKind, status: number | null) {
  if (kind === "network") {
    return true;
  }

  return status !== null && status >= 500 && status < 600;
}

function parseFieldErrors(value: unknown): ApiFieldError[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const fieldErrors = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const nextItem = item as { code?: unknown; field?: unknown; message?: unknown };
      if (typeof nextItem.field !== "string" || typeof nextItem.message !== "string") {
        return null;
      }

      return {
        code: typeof nextItem.code === "string" ? nextItem.code : "validation_error",
        field: nextItem.field,
        message: nextItem.message,
      };
    })
    .filter((item): item is ApiFieldError => Boolean(item));

  return fieldErrors.length > 0 ? fieldErrors : null;
}

async function readResponseBody(response: Response): Promise<ParsedResponseBody> {
  if (response.status === 204 || response.status === 205) {
    return { body: undefined, parseError: null, rawText: null };
  }

  const rawText = await response.text();
  if (!rawText.trim()) {
    return { body: undefined, parseError: null, rawText };
  }

  if (!isJsonContentType(response.headers.get("Content-Type")) && !isJsonLikeBody(rawText)) {
    return { body: rawText, parseError: null, rawText };
  }

  try {
    return { body: JSON.parse(rawText) as unknown, parseError: null, rawText };
  } catch (error) {
    return {
      body: undefined,
      parseError: error instanceof Error ? error : new Error("Failed to parse response body"),
      rawText,
    };
  }
}

function buildRequestHeaders(input: {
  accessToken?: string | null;
  body: BodyInit | null | undefined;
  headers?: HeadersInit;
  requestId: string;
}) {
  const nextHeaders = new Headers(input.headers);

  if (!nextHeaders.has("Accept")) {
    nextHeaders.set("Accept", "application/json");
  }

  if (!nextHeaders.has("X-Request-ID")) {
    nextHeaders.set("X-Request-ID", input.requestId);
  }

  if (input.accessToken && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${input.accessToken}`);
  }

  const isFormDataBody =
    typeof FormData !== "undefined" && input.body instanceof FormData;
  if (input.body != null && !isFormDataBody && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  return nextHeaders;
}

function buildResponseBodyError(input: {
  method: string;
  path: string;
  requestId: string | null;
  response: Response;
  responseBody: ParsedResponseBody;
}): ApiError {
  return new ApiError({
    code: "invalid_response_body",
    debugMessage: input.responseBody.parseError?.message ?? null,
    details:
      input.responseBody.rawText && input.responseBody.rawText.length > 0
        ? input.responseBody.rawText
        : null,
    kind: "invalid_response",
    message: "서버 응답을 처리하지 못했어요.",
    method: input.method,
    path: input.path,
    requestId: input.requestId,
    status: input.response.status,
  });
}

function buildTransportError(input: {
  error: unknown;
  method: string;
  path: string;
  requestId: string;
}): ApiError {
  if (isAbortFailure(input.error)) {
    return new ApiError({
      code: "request_aborted",
      debugMessage: input.error instanceof Error ? input.error.message : null,
      details: input.error,
      kind: "abort",
      message: "요청이 중단되었어요.",
      method: input.method,
      path: input.path,
      requestId: input.requestId,
    });
  }

  return new ApiError({
    code: "network_error",
    debugMessage: input.error instanceof Error ? input.error.message : null,
    details: input.error,
    kind: "network",
    message: "네트워크 연결을 확인해 주세요.",
    method: input.method,
    path: input.path,
    requestId: input.requestId,
  });
}

function buildApiError(input: {
  body: unknown;
  method: string;
  path: string;
  requestId: string | null;
  response: Response;
}): ApiError {
  const fallbackMessage = buildDefaultHttpErrorMessage(input.response.status);
  const envelope = input.body as ApiErrorEnvelope;
  const errorPayload = envelope && typeof envelope === "object" ? envelope.error : null;

  if (errorPayload && typeof errorPayload === "object") {
    return new ApiError({
      code:
        typeof errorPayload.code === "string"
          ? errorPayload.code
          : `http_${input.response.status}`,
      debugMessage:
        typeof errorPayload.debug_message === "string" ? errorPayload.debug_message : null,
      details:
        "details" in errorPayload && errorPayload.details !== undefined
          ? errorPayload.details
          : input.body,
      fieldErrors: parseFieldErrors(errorPayload.field_errors),
      kind: "http",
      message:
        typeof errorPayload.message === "string"
          ? errorPayload.message
          : buildLegacyApiErrorMessage(input.body, fallbackMessage),
      method: input.method,
      path: input.path,
      requestId:
        typeof errorPayload.request_id === "string"
          ? errorPayload.request_id
          : input.requestId,
      status: input.response.status,
    });
  }

  return new ApiError({
    code: `http_${input.response.status}`,
    debugMessage: typeof input.body === "string" ? input.body : null,
    details: input.body,
    kind: "http",
    message: buildLegacyApiErrorMessage(input.body, fallbackMessage),
    method: input.method,
    path: input.path,
    requestId: input.requestId,
    status: input.response.status,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isRetryableApiError(error: unknown) {
  return error instanceof ApiError && error.isRetryable;
}

export async function apiRequest<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { accessToken, headers, ...requestInit } = init ?? {};
  const method = (requestInit.method ?? "GET").toUpperCase();
  const requestId = getExistingRequestId(headers) ?? createRequestId();
  const requestHeaders = buildRequestHeaders({
    accessToken,
    body: requestInit.body,
    headers,
    requestId,
  });

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestInit,
      headers: requestHeaders,
      method,
    });
  } catch (error) {
    throw buildTransportError({ error, method, path, requestId });
  }

  const responseRequestId = response.headers.get("X-Request-ID") ?? requestId;
  const responseBody = await readResponseBody(response);

  if (responseBody.parseError) {
    if (!response.ok && responseBody.rawText) {
      throw buildApiError({
        body: responseBody.rawText,
        method,
        path,
        requestId: responseRequestId,
        response,
      });
    }

    throw buildResponseBodyError({
      method,
      path,
      requestId: responseRequestId,
      response,
      responseBody,
    });
  }

  if (!response.ok) {
    throw buildApiError({
      body: responseBody.body,
      method,
      path,
      requestId: responseRequestId,
      response,
    });
  }

  return responseBody.body as T;
}
