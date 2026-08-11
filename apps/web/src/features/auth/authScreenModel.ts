import type { UserRole } from "../../shared/api/types";
import { getRoleLabel } from "../../shared/auth/roles";
import { resolvePostAuthPath } from "./authEntryState";

export type AuthFeedback = { message: string; tone: "error" | "success" } | null;

export const roleOptions: Array<{ description: string; label: string; value: UserRole }> = [
  {
    value: "founder",
    label: getRoleLabel("founder"),
    description: "고객 인터뷰를 모집하고 신청자를 검토해요.",
  },
  {
    value: "respondent",
    label: getRoleLabel("respondent"),
    description: "내 경험에 맞는 인터뷰를 찾고 신청해요.",
  },
  {
    value: "both",
    label: getRoleLabel("both"),
    description: "모집과 신청 흐름을 모두 사용할 수 있어요.",
  },
];

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
