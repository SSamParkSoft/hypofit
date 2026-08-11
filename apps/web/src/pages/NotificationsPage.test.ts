import { describe, expect, it } from "vitest";

import type { NotificationRecord } from "../shared/api/notifications";
import { getNotificationHref } from "../features/notifications/notificationPresentation";

function buildNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    body: "알림 내용",
    created_at: "2026-07-14T01:00:00.000Z",
    id: "notification-1",
    metadata: {},
    read_at: null,
    target_id: null,
    target_type: null,
    title: "알림 제목",
    type: "support_replied",
    user_id: "user-1",
    ...overrides,
  };
}

describe("getNotificationHref", () => {
  it("opens the exact owned support ticket when the notification has a target id", () => {
    expect(
      getNotificationHref(
        buildNotification({ target_id: "ticket/1", target_type: "support_ticket" }),
      ),
    ).toBe("/support/inquiries/ticket%2F1");
  });

  it("falls back to the inquiry inbox when a support notification has no target id", () => {
    expect(getNotificationHref(buildNotification({ target_type: "support_ticket" }))).toBe(
      "/support/inquiries",
    );
  });
});
