import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canGroupChatMessages,
  countNewCounterpartMessages,
  getUnconfirmedOutgoingMessages,
  getConfirmedChatSchedule,
} from "../src/screens/chat/chatThreadPresentation.ts";
import { normalizeChatWorkflow } from "../src/features/chat/chatWorkflowResponse.ts";

const message = (overrides = {}) => ({
  id: "message-1", room_id: "room-1", sender_id: "participant-1",
  message_type: "user", body: "Hello", created_at: "2026-10-02T09:00:00Z",
  ...overrides,
});

test("consecutive messages from one sender group within five minutes", () => {
  assert.equal(canGroupChatMessages(message(), message({ created_at: "2026-10-02T09:04:59Z" })), true);
  assert.equal(canGroupChatMessages(message(), message()), true);
  assert.equal(canGroupChatMessages(message(), message({ created_at: "2026-10-02T09:05:00Z" })), false);
});

test("a different sender, system message, or missing neighbor breaks a group", () => {
  assert.equal(canGroupChatMessages(message(), message({ sender_id: "participant-2" })), false);
  assert.equal(canGroupChatMessages(message(), message({ message_type: "system" })), false);
  assert.equal(canGroupChatMessages(message({ sender_id: null }), message({ sender_id: null })), false);
  assert.equal(canGroupChatMessages(null, message()), false);
  assert.equal(canGroupChatMessages(message(), undefined), false);
});

test("a local date boundary, reversed time, or invalid date breaks a group", () => {
  const beforeMidnight = new Date(2026, 9, 2, 23, 59).toISOString();
  const afterMidnight = new Date(2026, 9, 3, 0, 1).toISOString();
  assert.equal(canGroupChatMessages(message({ created_at: beforeMidnight }), message({ created_at: afterMidnight })), false);
  assert.equal(canGroupChatMessages(message(), message({ created_at: "2026-10-02T08:59:00Z" })), false);
  assert.equal(canGroupChatMessages(message(), message({ created_at: "invalid" })), false);
});

test("server confirmation hides the matching local bubble regardless of sending state", () => {
  const outgoing = [
    { clientId: "confirmed", roomId: "room-1", body: "A", status: "sending" },
    { clientId: "failed", roomId: "room-1", body: "B", status: "failed" },
    { clientId: "other-room", roomId: "room-2", body: "C", status: "sending" },
  ];
  const confirmed = [message({ client_message_id: "confirmed" })];
  assert.deepEqual(getUnconfirmedOutgoingMessages(outgoing, confirmed, "room-1"), [outgoing[1]]);
  assert.deepEqual(getUnconfirmedOutgoingMessages(outgoing, [message()], "room-1"), outgoing.slice(0, 2));
  assert.deepEqual(getUnconfirmedOutgoingMessages(outgoing, confirmed, undefined), []);
});

test("new-message count excludes previous messages, my messages, and system messages", () => {
  const messages = [
    message({ id: "old" }),
    message({ id: "previous" }),
    message({ id: "new-1" }),
    message({ id: "mine", sender_id: "me" }),
    message({ id: "system", message_type: "system" }),
    message({ id: "anonymous", sender_id: null }),
    message({ id: "new-2" }),
  ];
  assert.equal(countNewCounterpartMessages(messages, "previous", "me"), 2);
  assert.equal(countNewCounterpartMessages(messages, "new-2", "me"), 0);
  assert.equal(countNewCounterpartMessages(messages, "missing", "me"), 0);
  assert.equal(countNewCounterpartMessages(messages, "previous", undefined), 0);
});

test("deployed camelCase workflow actions are exposed through the app contract", () => {
  const action = { action: "create_schedule", label: "일정 확정", tone: "primary" };
  const secondary = { action: "write_review", label: "후기 작성", tone: "default" };
  const danger = { action: "open_support_report", label: "문제 신고", tone: "danger" };
  const session = { id: "session-1" };
  const review = { id: "review-1" };
  const normalized = normalizeChatWorkflow({
    step: "schedule_needed", title: "일정을 확정해 주세요", description: "안내",
    primaryAction: action, secondaryAction: secondary, dangerAction: danger,
    session, myReview: review, counterpartReviewSubmitted: true,
  });
  assert.deepEqual(normalized.primary_action, action);
  assert.deepEqual(normalized.secondary_action, secondary);
  assert.deepEqual(normalized.danger_action, danger);
  assert.deepEqual(normalized.my_review, review);
  assert.equal(normalized.session, session);
  assert.equal(normalized.counterpart_review_submitted, true);
});

test("canonical snake_case workflow preserves explicit null actions and false flags", () => {
  const normalized = normalizeChatWorkflow({
    step: "closed", title: "종료된 참여예요", primary_action: null,
    primaryAction: { action: "create_schedule", label: "일정 확정", tone: "primary" },
    counterpart_review_submitted: false, counterpartReviewSubmitted: true,
  });
  assert.equal(normalized.primary_action, null);
  assert.equal(normalized.counterpart_review_submitted, false);
});

const scheduledRoom = {
  application_id: "application-1", interview_post: { recruitment_type: "interview" },
};
const scheduledWorkflow = {
  session: {
    application_id: "application-1", status: "scheduled", scheduled_at: "2026-10-09T10:00:00Z",
    meeting_type: "online", meeting_url: "https://example.com/hypofit-qa", place: null,
  },
};

test("a scheduled interview displays the saved time, mode and meeting link", () => {
  assert.deepEqual(getConfirmedChatSchedule(scheduledRoom, scheduledWorkflow), {
    scheduledAt: "2026-10-09T10:00:00Z", modeLabel: "화상",
    meetingUrl: "https://example.com/hypofit-qa", place: null,
  });
});

test("an offline interview shows its place without exposing an old online link", () => {
  assert.deepEqual(getConfirmedChatSchedule(scheduledRoom, {
    session: { ...scheduledWorkflow.session, meeting_type: "offline", place: " 안산 중앙역 근처 카페 " },
  }), {
    scheduledAt: "2026-10-09T10:00:00Z", modeLabel: "대면", meetingUrl: null, place: "안산 중앙역 근처 카페",
  });
});

test("beta, research and survey postings do not acquire an interview schedule summary", () => {
  for (const type of ["beta_test", "research_experiment", "survey"]) {
    assert.equal(getConfirmedChatSchedule({ ...scheduledRoom, interview_post: { recruitment_type: type } }, scheduledWorkflow), null);
  }
  assert.notEqual(getConfirmedChatSchedule({ ...scheduledRoom, interview_post: {} }, scheduledWorkflow), null);
});

test("missing data and a different application's session do not render a summary", () => {
  assert.equal(getConfirmedChatSchedule(null, scheduledWorkflow), null);
  assert.equal(getConfirmedChatSchedule({ ...scheduledRoom, interview_post: null }, scheduledWorkflow), null);
  assert.equal(getConfirmedChatSchedule(scheduledRoom, {}), null);
  assert.equal(getConfirmedChatSchedule(scheduledRoom, {
    session: { ...scheduledWorkflow.session, application_id: "other-application" },
  }), null);
});

test("completed, cancelled and no-show sessions are not described as a confirmed upcoming schedule", () => {
  for (const status of ["completed", "canceled", "no_show"]) {
    assert.equal(getConfirmedChatSchedule(scheduledRoom, {
      session: { ...scheduledWorkflow.session, status },
    }), null);
  }
});

test("only HTTP links are actionable; missing or unsafe links do not create a fake action", () => {
  for (const meeting_url of [null, "", "not a URL", "javascript:alert(1)", "file:///tmp/test", "myapp://open"]) {
    assert.equal(getConfirmedChatSchedule(scheduledRoom, {
      session: { ...scheduledWorkflow.session, meeting_url },
    }).meetingUrl, null);
  }
  assert.equal(getConfirmedChatSchedule(scheduledRoom, {
    session: { ...scheduledWorkflow.session, meeting_url: " https://example.com/join?meeting=123 " },
  }).meetingUrl, "https://example.com/join?meeting=123");
});
