import type {
  AdminAccountDeletionRequest,
  AdminModerationActionCreateInput,
  AdminNotificationTargetType,
  AdminTestNotificationType,
  SupportTicketKind,
  SupportTicketStatus,
} from "../../shared/api/types";
import { getApiErrorMessage } from "../../shared/api/errorPresentation";

type AdminBadgeIntent = "brand" | "warning" | "success" | "neutral" | "danger" | "info";

export type AdminSection = "tickets" | "reports" | "deletion" | "health" | "push" | "notices" | "operations";

export const adminSections: ReadonlyArray<{ id: AdminSection; label: string }> = [
  { id: "operations", label: "서비스 운영" },
  { id: "notices", label: "공지사항" },
  { id: "tickets", label: "문의" },
  { id: "reports", label: "신고" },
  { id: "deletion", label: "계정 삭제" },
  { id: "health", label: "상태 점검" },
  { id: "push", label: "알림/푸시" },
];

export const kindLabels: Record<SupportTicketKind, string> = {
  inquiry: "문의",
  report: "신고",
  privacy: "개인정보",
  account_deletion: "계정 삭제",
};

export const statusLabels: Record<SupportTicketStatus, string> = {
  open: "열림",
  in_review: "검토 중",
  resolved: "해결",
  closed: "닫힘",
};

export const statusIntents: Record<SupportTicketStatus, AdminBadgeIntent> = {
  open: "brand",
  in_review: "warning",
  resolved: "success",
  closed: "neutral",
};

export const supportTicketStatusFilters = [
  "open",
  "in_review",
  "resolved",
  "closed",
  "all",
] as const;

export const deletedTicketFilters = ["active", "deleted", "all"] as const;

export const accountDeletionStatusFilters = [
  "all",
  "requested",
  "verified",
  "in_review",
  "completed",
  "rejected",
  "canceled",
] as const;

export const moderationActions = [
  "close_report",
  "warn",
  "hide",
  "remove",
  "block",
  "unblock",
  "restore",
] as const satisfies ReadonlyArray<AdminModerationActionCreateInput["action"]>;

export const testNotificationTypes = [
  "chat_message",
  "application_created",
  "application_selected",
  "application_rejected",
  "session_rescheduled",
  "session_canceled",
  "no_show_marked",
  "support_replied",
] as const satisfies ReadonlyArray<AdminTestNotificationType>;

export const testNotificationTargetTypes = [
  "application",
  "chat_room",
  "interview_post",
  "interview_session",
  "support_ticket",
] as const satisfies ReadonlyArray<AdminNotificationTargetType>;

export function shortText(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getErrorMessage(error: unknown, fallback: string) {
  return getApiErrorMessage(error, fallback);
}

export function getReadinessIntent(value: string): AdminBadgeIntent {
  const normalized = value.toLowerCase().trim();
  if (["ok", "ready", "configured", "enabled", "설정됨"].includes(normalized)) return "success";
  if (["disabled", "not_configured", "unconfigured", "false", "unavailable", "degraded", "미설정"].includes(normalized)) return "warning";
  return "neutral";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function readinessValues(data: Record<string, unknown> | null) {
  const checks = objectValue(data?.checks);
  const push = objectValue(checks.push);
  const email = objectValue(checks.outbound_email);
  const provider = (value: unknown) => {
    const item = objectValue(value);
    if (item.enabled === false) return "disabled";
    return item.configured === true ? "설정됨" : item.configured === false ? "미설정" : "unknown";
  };
  return {
    api: data ? (typeof data.status === "string" ? data.status : "unknown") : "unknown",
    database: typeof checks.database === "string" ? checks.database : "unknown",
    apns: push.enabled === false ? "disabled" : provider(push.apns),
    fcm: push.enabled === false ? "disabled" : provider(push.fcm),
    email: email.configured === true ? "설정됨" : email.configured === false ? "미설정" : "unknown",
  };
}

export const moderationLabels: Record<AdminModerationActionCreateInput["action"], string> = {
  close_report: "신고 종료", warn: "주의 기록 (사용자 알림 없음)", hide: "숨기기", remove: "제거",
  block: "계정 비활성화", unblock: "계정 활성화", restore: "복구",
};

export function availableModerationActions(targetType: string) {
  const effects = targetType === "user" ? ["block", "remove", "unblock", "restore"]
    : ["interview_post", "application", "session", "chat_message"].includes(targetType) ? ["hide", "remove", "restore"] : [];
  return moderationActions.filter((action) => action === "warn" || action === "close_report" || effects.includes(action));
}

export function getSupportTicketSearchValues(ticket: {
  body: string;
  category: string;
  contact_email: string;
  id: string;
  subject: string | null;
  target_id: string | null;
  user_id: string;
}) {
  return [
    ticket.subject,
    ticket.body,
    ticket.contact_email,
    ticket.id,
    ticket.target_id,
    ticket.user_id,
    ticket.category,
  ].filter((value): value is string => typeof value === "string");
}

export function matchesSupportTicketSearch(
  ticket: Parameters<typeof getSupportTicketSearchValues>[0],
  rawSearch: string,
) {
  const normalizedSearch = rawSearch.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return getSupportTicketSearchValues(ticket).some((value) =>
    value.toLowerCase().includes(normalizedSearch),
  );
}

export function getSectionTitle(section: Extract<AdminSection, "tickets" | "reports">) {
  return section === "reports" ? "신고 큐" : "문의 큐";
}

export function getAccountDeletionStatusFilterLabel(
  status: "all" | AdminAccountDeletionRequest["status"],
) {
  return status === "all" ? "전체" : status;
}
