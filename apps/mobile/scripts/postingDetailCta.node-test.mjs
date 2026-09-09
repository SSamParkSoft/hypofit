import assert from "node:assert/strict";

import { resolvePostingDetailCta } from "../src/features/interview-posts/resolvePostingDetailCta.ts";

const post = {
  id: "post-1",
  status: "open",
  recruitment_type: "interview",
  entry_mode: "application_required",
};

const application = (status) => ({
  id: "application-1",
  interview_post_id: post.id,
  status,
});

const resolve = (overrides = {}) =>
  resolvePostingDetailCta({
    accessToken: "token",
    application: null,
    chatRoom: null,
    isApplicationFormOpen: false,
    isOwner: false,
    post,
    surveyParticipation: null,
    ...overrides,
  });

assert.deepEqual(resolve({ accessToken: null }), {
  action: "login-apply",
  label: "로그인 후 신청",
});
assert.deepEqual(resolve(), { action: "apply", label: "신청하기" });
assert.deepEqual(resolve({ application: application("applied") }), {
  action: "apply",
  disabled: true,
  label: "검토 중",
});
assert.deepEqual(
  resolve({
    application: application("selected"),
    chatRoom: { id: "room-1", application_id: "application-1" },
  }),
  { action: "chat", label: "채팅 보기" },
);
assert.deepEqual(resolve({ isOwner: true }), {
  action: "manage",
  label: "공고 관리",
});
assert.deepEqual(resolve({ post: { ...post, status: "closed" } }), {
  action: "apply",
  disabled: true,
  label: "모집 종료",
});
assert.deepEqual(resolve({ application: application("completed") }), {
  action: "apply",
  disabled: true,
  label: "참여 완료",
});

const directSurvey = {
  ...post,
  recruitment_type: "survey",
  entry_mode: "direct",
};
for (const entryMode of ["direct", "application_required"]) {
  assert.deepEqual(resolve({
    post: { ...directSurvey, entry_mode: entryMode },
    application: entryMode === "application_required" ? application("selected") : null,
    surveyParticipation: { status: "withdrawn" },
  }), { action: "open-survey", disabled: true, label: "참여 취소" });
}
const beta = { ...post, recruitment_type: "beta_test" };
assert.deepEqual(resolve({ post: beta }), { action: "apply", label: "신청하기" });
assert.deepEqual(resolve({ post: beta, application: application("applied") }),
  { action: "apply", disabled: true, label: "검토 중" });
assert.deepEqual(resolve({ post: beta, application: application("selected"), chatRoom: { id: "room-1" } }),
  { action: "chat", label: "채팅 보기" });
assert.deepEqual(resolve({ post: beta, application: application("completed") }),
  { action: "apply", disabled: true, label: "참여 완료" });
assert.deepEqual(resolve({ post: { ...beta, status: "closed" } }),
  { action: "apply", disabled: true, label: "모집 종료" });
assert.deepEqual(resolve({ post: directSurvey }), {
  action: "open-survey",
  label: "설문 참여하기",
});
assert.deepEqual(
  resolve({
    post: { ...directSurvey, external_action_available: false },
  }),
  { action: "open-survey", disabled: true, label: "설문 링크 준비 중이에요" },
);
assert.deepEqual(
  resolve({
    post: { ...directSurvey, entry_mode: "application_required" },
    application: application("selected"),
  }),
  { action: "open-survey", label: "설문 참여하기" },
);
