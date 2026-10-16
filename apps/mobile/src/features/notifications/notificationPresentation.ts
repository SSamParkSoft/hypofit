interface NotificationTargetData {
  type: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata?: Record<string, unknown>;
}

export function notificationMetadataText(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getNotificationContent(notification: NotificationTargetData & { title: string; body: string }) {
  const sender = notificationMetadataText(notification.metadata, "sender_name");
  const context = notificationMetadataText(notification.metadata, "interview_title");
  const title = notification.type === "chat_message" && sender
    ? `${sender}님이 메시지를 보냈어요`
    : notification.title;
  const body = notification.body?.trim();
  return { title, context, body: body && body !== title && body !== context ? body : null };
}

export function getNotificationDestination(notification: NotificationTargetData, returnTo: string) {
  const postId = notificationMetadataText(notification.metadata, "interview_post_id");
  const roomId = notification.target_type === "chat_room"
    ? notification.target_id
    : notificationMetadataText(notification.metadata, "chat_room_id");

  if (roomId) {
    return {
      label: "채팅",
      href: { pathname: "/(tabs)/chat/[roomId]" as const, params: { roomId, returnTo } },
    };
  }
  if (notification.target_type === "application"
    && (notification.type === "application_created" || notification.type === "application_withdrawn")
    && postId && notification.target_id) {
    return {
      label: "지원 정보",
      href: {
        pathname: "/(tabs)/interviews/my-posts/[postId]/applicants/[applicationId]" as const,
        params: { postId, applicationId: notification.target_id, returnTo },
      },
    };
  }
  const detailPostId = notification.target_type === "interview_post" ? notification.target_id : postId;
  if (detailPostId && ["interview_post", "application", "interview_session"].includes(notification.target_type ?? "")) {
    return {
      label: "공고",
      href: { pathname: "/interviews/[postId]" as const, params: { postId: detailPostId, returnTo } },
    };
  }
  if (notification.target_type === "application" || notification.target_type === "interview_session") {
    return {
      label: "내 활동",
      href: {
        pathname: "/(tabs)/interviews/my-interviews" as const,
        params: {
          returnTo,
          tab: notification.type === "application_created" || notification.type === "application_withdrawn"
            ? "posts" : "applications",
        },
      },
    };
  }
  if (notification.target_type === "support_ticket") {
    return {
      label: "문의",
      href: {
        pathname: "/support" as const,
        params: notification.target_id ? { returnTo, ticketId: notification.target_id } : { returnTo },
      },
    };
  }
  return null;
}
