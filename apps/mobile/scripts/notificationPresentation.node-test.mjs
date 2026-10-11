import assert from "node:assert/strict";
import { test } from "node:test";
import { getNotificationContent, getNotificationDestination } from "../src/features/notifications/notificationPresentation.ts";

const notification = (overrides = {}) => ({
  type: "application_created", target_type: "application", target_id: "application-1",
  title: "새 신청이 도착했어요", body: "지원 내용을 확인할 수 있어요.",
  metadata: { interview_post_id: "post-1", interview_title: "일정 관리 경험 인터뷰" },
  ...overrides,
});

test("content includes posting context without inventing missing data", () => {
  assert.deepEqual(getNotificationContent(notification()), {
    title: "새 신청이 도착했어요", context: "일정 관리 경험 인터뷰", body: "지원 내용을 확인할 수 있어요.",
  });
  assert.equal(getNotificationContent(notification({ metadata: {} })).context, null);
  assert.equal(getNotificationContent(notification({ metadata: { interview_title: 123 } })).context, null);
});

test("chat shows the known sender and preserves the preview", () => {
  const content = getNotificationContent(notification({ type: "chat_message", body: "토요일 가능해요", metadata: { sender_name: "박준서" } }));
  assert.equal(content.title, "박준서님이 메시지를 보냈어요");
  assert.equal(content.body, "토요일 가능해요");
  assert.equal(getNotificationContent(notification({ type: "chat_message", title: "새 메시지가 도착했어요", metadata: {} })).title, "새 메시지가 도착했어요");
});

test("identical body/context or title is not repeated", () => {
  assert.equal(getNotificationContent(notification({ body: "일정 관리 경험 인터뷰" })).body, null);
  assert.equal(getNotificationContent(notification({ body: "새 신청이 도착했어요" })).body, null);
});

test("owner application events open the exact applicant with a return path", () => {
  for (const type of ["application_created", "application_withdrawn"]) {
    const destination = getNotificationDestination(notification({ type }), "/notifications");
    assert.equal(destination.href.pathname, "/(tabs)/interviews/my-posts/[postId]/applicants/[applicationId]");
    assert.deepEqual(destination.href.params, { postId: "post-1", applicationId: "application-1", returnTo: "/notifications" });
  }
});

test("participant results of every posting type open the related posting", () => {
  for (const type of ["application_selected", "application_rejected", "application_canceled"]) {
    assert.equal(getNotificationDestination(notification({ type }), "/notifications").href.pathname, "/interviews/[postId]");
  }
});

test("session metadata and explicit chat targets open the exact room", () => {
  for (const record of [
    notification({ target_type: "interview_session", metadata: { chat_room_id: "room-1" } }),
    notification({ target_type: "chat_room", target_id: "room-1" }),
  ]) {
    assert.equal(getNotificationDestination(record, "/notifications").href.params.roomId, "room-1");
  }
});

test("legacy application records keep an activity fallback", () => {
  assert.equal(getNotificationDestination(notification({ metadata: {} }), "/notifications").href.params.tab, "posts");
  assert.equal(getNotificationDestination(notification({ type: "application_selected", metadata: {} }), "/notifications").href.params.tab, "applications");
});

test("support and posting targets preserve their exact ids", () => {
  assert.equal(getNotificationDestination(notification({ target_type: "support_ticket", target_id: "ticket-1" }), "/notifications").href.params.ticketId, "ticket-1");
  assert.equal(getNotificationDestination(notification({ target_type: "interview_post", target_id: "post-2" }), "/notifications").href.params.postId, "post-2");
  assert.equal(getNotificationDestination(notification({ target_type: null, metadata: {} }), "/notifications"), null);
});
