import type { ApiError } from "./client";

export interface ApiErrorPresentation {
  code: string | null;
  message: string;
  requestId: string | null;
}

export function getApiErrorPresentation(
  error: unknown,
  fallbackMessage: string,
): ApiErrorPresentation {
  if (isStructuredApiError(error)) {
    return {
      code: error.code,
      message: error.message.trim() || fallbackMessage,
      requestId: error.requestId,
    };
  }

  return {
    code: null,
    message:
      error instanceof Error && error.message.trim()
        ? error.message
        : fallbackMessage,
    requestId: null,
  };
}

function isStructuredApiError(error: unknown): error is ApiError {
  return (
    error instanceof Error &&
    error.name === "ApiError" &&
    "code" in error &&
    typeof error.code === "string" &&
    "requestId" in error &&
    (typeof error.requestId === "string" || error.requestId === null)
  );
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  const presentation = getApiErrorPresentation(error, fallbackMessage);

  return presentation.requestId
    ? `${presentation.message} 요청 ID: ${presentation.requestId}`
    : presentation.message;
}
