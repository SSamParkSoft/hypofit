import { resolvePostAuthPath } from "./authEntryState";

export type AuthFeedback = { message: string; tone: "error" | "success" } | null;

export function getPostAuthPath() {
  if (typeof window === "undefined") {
    return "/app";
  }

  return resolvePostAuthPath({
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  });
}

export function getAuthFeedbackMessage(error: unknown, fallback: string) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim().toLowerCase()
      : "";

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "인터넷 연결을 확인하고 다시 시도해 주세요.";
  }

  if (message.includes("rate") && message.includes("limit")) {
    return "잠시 후 다시 시도해 주세요.";
  }

  return fallback;
}
