import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationRecord } from "../../shared/api/notifications";
import {
  formatRelativeTime,
  getNotificationHref,
  groupNotificationsByDate,
} from "./notificationPresentation";

function createNotification(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: overrides.id ?? "notification-1",
    user_id: overrides.user_id ?? "user-1",
    type: overrides.type ?? "application_created",
    title: overrides.title ?? "알림 제목",
    body: overrides.body ?? "알림 본문",
    target_type: overrides.target_type === undefined ? "application" : overrides.target_type,
    target_id: overrides.target_id === undefined ? "target-1" : overrides.target_id,
    metadata: overrides.metadata ?? {},
    read_at: overrides.read_at ?? null,
    created_at: overrides.created_at ?? "2026-07-17T09:00:00+09:00",
  };
}

describe("notificationPresentation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T12:00:00+09:00"));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("maps notification destinations to the current routes", () => {
    expect(
      getNotificationHref(
        createNotification({
          target_type: "chat_room",
          target_id: "room/with spaces?",
          type: "chat_message_created",
        }),
      ),
    ).toBe("/chat?room=room%2Fwith%20spaces%3F");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "interview_post",
          target_id: "post/1",
        }),
      ),
    ).toBe("/interviews/post%2F1");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "application",
          target_id: "application-1",
        }),
      ),
    ).toBe("/my-interviews");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "interview_session",
          target_id: "session-1",
        }),
      ),
    ).toBe("/my-interviews");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "support_ticket",
          target_id: "ticket/1",
        }),
      ),
    ).toBe("/support/inquiries/ticket%2F1");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "support_ticket",
          target_id: null,
        }),
      ),
    ).toBe("/support/inquiries");

    expect(
      getNotificationHref(
        createNotification({
          target_type: "unknown_target",
          target_id: "unknown-1",
        }),
      ),
    ).toBeNull();
  });

  it("groups notifications by date and keeps the current Korean group labels", () => {
    const groups = groupNotificationsByDate([
      createNotification({
        id: "today-1",
        created_at: "2026-07-17T10:00:00+09:00",
      }),
      createNotification({
        id: "today-2",
        created_at: "2026-07-17T08:00:00+09:00",
      }),
      createNotification({
        id: "yesterday-1",
        created_at: "2026-07-16T21:00:00+09:00",
      }),
      createNotification({
        id: "older-1",
        created_at: "2026-07-12T12:00:00+09:00",
      }),
      createNotification({
        id: "invalid-1",
        created_at: "not-a-date",
      }),
    ]);

    expect(groups.map((group) => ({ label: group.label, ids: group.notifications.map((item) => item.id) }))).toEqual([
      { label: "오늘", ids: ["today-1", "today-2"] },
      { label: "어제", ids: ["yesterday-1"] },
      { label: "7월 12일 (일)", ids: ["older-1"] },
      { label: "날짜 확인 필요", ids: ["invalid-1"] },
    ]);
  });

  it("formats invalid and basic relative-time cases with the current labels", () => {
    expect(formatRelativeTime("invalid-date")).toBe("");
    expect(formatRelativeTime("2026-07-17T12:00:30+09:00")).toBe("방금");
    expect(formatRelativeTime("2026-07-17T11:45:00+09:00")).toBe("15분 전");
    expect(formatRelativeTime("2026-07-17T10:00:00+09:00")).toBe("2시간 전");
    expect(formatRelativeTime("2026-07-14T12:00:00+09:00")).toBe("3일 전");
    expect(formatRelativeTime("2026-07-10T12:00:00+09:00")).toBe("7월 10일");
  });
});
