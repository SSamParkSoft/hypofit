import { router, type Href } from "expo-router";
import { addAppBreadcrumb } from "@/shared/diagnostics/sentry";

export type PushNotificationTargetKind =
  | "chat_room"
  | "interview_post"
  | "application"
  | "interview_session"
  | "support_ticket"
  | "notifications";

export interface PushNavigationTarget {
  kind: PushNotificationTargetKind;
  id: string | null;
  type: string | null;
  notificationId: string | null;
}

export function parsePushNotificationTarget(data: Record<string, unknown>): PushNavigationTarget {
  const targetType = readString(data.target_type);
  const targetId = readString(data.target_id);
  const type = readString(data.type);
  const notificationId = readString(data.notification_id);

  if (targetType === "chat_room" && targetId) {
    addRouteParsedBreadcrumb("chat_room", type, notificationId);
    return { kind: "chat_room", id: targetId, type, notificationId };
  }

  if (targetType === "interview_post" && targetId) {
    addRouteParsedBreadcrumb("interview_post", type, notificationId);
    return { kind: "interview_post", id: targetId, type, notificationId };
  }

  if (targetType === "application") {
    addRouteParsedBreadcrumb("application", type, notificationId);
    return { kind: "application", id: targetId, type, notificationId };
  }

  if (targetType === "interview_session") {
    addRouteParsedBreadcrumb("interview_session", type, notificationId);
    return { kind: "interview_session", id: targetId, type, notificationId };
  }

  if (targetType === "support_ticket") {
    addRouteParsedBreadcrumb("support_ticket", type, notificationId);
    return { kind: "support_ticket", id: targetId, type, notificationId };
  }

  addAppBreadcrumb("push_notification_route_fallback", {
    notification_id: notificationId,
    target_type: targetType,
    type,
  });
  return { kind: "notifications", id: null, type, notificationId };
}

export function getPushNavigationFingerprint(
  data: Record<string, unknown>,
  requestIdentifier?: string | null,
) {
  const notificationId = readString(data.notification_id);
  const targetType = readString(data.target_type);
  const targetId = readString(data.target_id);
  const type = readString(data.type);

  const fingerprint = [notificationId, type, targetType, targetId, requestIdentifier].filter(Boolean).join(":");
  return fingerprint || "unknown";
}

export function navigateToPushNotificationTarget(target: PushNavigationTarget) {
  switch (target.kind) {
    case "chat_room":
      if (target.id) {
        addRouteNavigatedBreadcrumb(target);
        router.push({
          pathname: "/(tabs)/chat/[roomId]",
          params: { roomId: target.id, returnTo: "/(tabs)/chat" },
        });
        return;
      }
      break;
    case "interview_post":
      if (target.id) {
        addRouteNavigatedBreadcrumb(target);
        router.push({
          pathname: "/interviews/[postId]",
          params: { postId: target.id, returnTo: "/notifications" },
        });
        return;
      }
      break;
    case "application":
    case "interview_session":
      addRouteNavigatedBreadcrumb(target);
      router.push({
        pathname: "/(tabs)/interviews/my-interviews",
        params: { returnTo: "/notifications" },
      });
      return;
    case "support_ticket":
      addRouteNavigatedBreadcrumb(target);
      router.push({
        pathname: "/support",
        params: buildSupportParams(target.id),
      });
      return;
    case "notifications":
      break;
  }

  addRouteNavigatedBreadcrumb(target);
  router.push({ pathname: "/notifications", params: { returnTo: "/(tabs)/home" } });
}

function buildSupportParams(ticketId: string | null): Record<string, string> {
  return ticketId ? { returnTo: "/notifications", ticketId } : { returnTo: "/notifications" };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addRouteParsedBreadcrumb(
  kind: PushNotificationTargetKind,
  type: string | null,
  notificationId: string | null,
) {
  addAppBreadcrumb("push_notification_route_parsed", {
    kind,
    notification_id: notificationId,
    type,
  });
}

function addRouteNavigatedBreadcrumb(target: PushNavigationTarget) {
  addAppBreadcrumb("push_notification_route_navigated", {
    kind: target.kind,
    notification_id: target.notificationId,
    target_id: target.id,
    type: target.type,
  });
}
