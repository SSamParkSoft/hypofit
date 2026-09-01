import { CheckCircle2 } from "lucide-react";

import type { NotificationRecord } from "../../shared/api/notifications";
import { AppIcon } from "../../shared/ui/icon";

export interface NotificationGroup {
  label: string;
  notifications: NotificationRecord[];
}

export function NotificationIcon({
  notification,
  size = 18,
}: {
  notification: NotificationRecord;
  size?: number;
}) {
  if (notification.target_type === "chat_room" || notification.type.includes("chat")) {
    return <AppIcon name="chat" size={size} />;
  }

  if (notification.type.includes("selected") || notification.type.includes("completed")) {
    return <CheckCircle2 size={size} />;
  }

  if (notification.type.includes("application")) {
    return <AppIcon name="users" size={size} />;
  }

  return <AppIcon name="notification" size={size} />;
}

export function getNotificationHref(notification: NotificationRecord) {
  if (notification.target_type === "chat_room" && notification.target_id) {
    return `/chat?room=${encodeURIComponent(notification.target_id)}`;
  }

  if (notification.target_type === "interview_post" && notification.target_id) {
    return `/interviews/${encodeURIComponent(notification.target_id)}`;
  }

  if (notification.target_type === "application" || notification.target_type === "interview_session") {
    return "/my-interviews";
  }

  if (notification.target_type === "support_ticket") {
    return notification.target_id
      ? `/support/inquiries/${encodeURIComponent(notification.target_id)}`
      : "/support/inquiries";
  }

  return null;
}

export function getNotificationCategoryLabel(notification: NotificationRecord) {
  if (notification.target_type === "chat_room" || notification.type.includes("chat")) {
    return "채팅 알림";
  }

  if (notification.type.includes("selected")) {
    return "선정 알림";
  }

  if (notification.type.includes("completed")) {
    return "일정 완료 알림";
  }

  if (notification.type.includes("application")) {
    return "신청 알림";
  }

  if (notification.target_type === "support_ticket") {
    return "문의 답변 알림";
  }

  return "서비스 알림";
}

export function getNotificationDestinationLabel(notification: NotificationRecord) {
  if (notification.target_type === "chat_room" || notification.type.includes("chat")) {
    return "채팅으로 이동";
  }

  if (
    notification.target_type === "application" ||
    notification.target_type === "interview_session"
  ) {
    return "내 인터뷰에서 확인";
  }

  if (notification.target_type === "interview_post") {
    return "모집글에서 확인";
  }

  if (notification.target_type === "support_ticket") {
    return "문의함에서 확인";
  }

  return "알림만 확인";
}

export function groupNotificationsByDate(notifications: NotificationRecord[]): NotificationGroup[] {
  const groups = new Map<string, NotificationRecord[]>();

  for (const notification of notifications) {
    const key = getNotificationDateKey(notification.created_at);
    const current = groups.get(key);

    if (current) {
      current.push(notification);
      continue;
    }

    groups.set(key, [notification]);
  }

  return Array.from(groups.entries()).map(([key, groupedNotifications]) => ({
    label: formatNotificationGroupLabel(key),
    notifications: groupedNotifications,
  }));
}

export function getNotificationDateKey(value: string) {
  const createdAt = new Date(value);

  if (!Number.isFinite(createdAt.getTime())) {
    return "invalid";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(createdAt);
}

export function formatNotificationGroupLabel(key: string) {
  if (key === "invalid") {
    return "날짜 확인 필요";
  }

  const date = new Date(`${key}T00:00:00`);

  if (!Number.isFinite(date.getTime())) {
    return "날짜 확인 필요";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "오늘";
  }

  if (diffDays === 1) {
    return "어제";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(target);
}

export function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();

  if (!Number.isFinite(createdAt)) {
    return "";
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "방금";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(createdAt);
}
