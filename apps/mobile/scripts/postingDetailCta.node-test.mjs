import assert from "node:assert/strict";

import { getPostingDetailStatus, resolvePostingDetailCta } from "../src/features/postings/resolvePostingDetailCta.ts";
import { getParticipationGuideSteps } from "../src/features/postings/postingParticipationGuide.ts";

const surveyReturnStep = "Hypofit으로 돌아와 '제출했어요'를 눌러요.";
assert.deepEqual(getParticipationGuideSteps({ recruitment_type: "survey", entry_mode: "direct" }), [
  "외부 설문을 열어 작성하고 제출해요.", surveyReturnStep,
]);
const approvalSteps = getParticipationGuideSteps({ recruitment_type: "survey", entry_mode: "application_required" });
assert.equal(approvalSteps.length, 4);
assert.equal(approvalSteps[0], "공고에 신청해요.");
assert.equal(approvalSteps[2], "승인되면 외부 설문을 작성하고 제출해요.");
assert.equal(approvalSteps[3], surveyReturnStep);
assert.ok(!approvalSteps.some((step) => /채팅|일정/.test(step)));
const betaSteps = getParticipationGuideSteps({ recruitment_type: "beta_test" });
assert.equal(betaSteps[2], "선정되면 채팅에서 테스트 안내를 받아요.");
assert.equal(betaSteps[3], "모집자가 안내한 방식으로 테스트에 참여해요.");
assert.ok(!betaSteps.some((step) => /일정|출석|설문/.test(step)));
assert.equal(getParticipationGuideSteps({ recruitment_type: "interview", schedule_mode: "fixed" })[2],
  "선정되면 채팅에서 참여 일정을 확인해요.");
assert.equal(getParticipationGuideSteps({ recruitment_type: "interview", schedule_mode: "negotiated" })[2],
  "선정되면 채팅에서 일정을 조율해요.");
assert.deepEqual(getParticipationGuideSteps({}), getParticipationGuideSteps({ recruitment_type: "interview" }));
console.log("Posting participation guide fixtures passed: interview scheduling, beta, direct/approved survey, return-to-app action.");
const researchSteps = getParticipationGuideSteps({ recruitment_type: "research_experiment" });
assert.equal(researchSteps.length, 4);
assert.match(researchSteps[2], /채팅.*일정.*준비/);
assert.ok(!researchSteps.some((step) => /출석|녹화|인증|설문|인터뷰/.test(step)));

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
const now = Date.parse("2026-10-11T05:00:00Z");
const expiredSurvey = {
  ...directSurvey,
  participation_deadline_at: "2026-10-11T05:00:00Z",
};
assert.equal(getPostingDetailStatus(expiredSurvey, now), "closed");
assert.equal(getPostingDetailStatus({ ...expiredSurvey, participation_deadline_at: "2026-10-11T04:59:59Z" }, now), "closed");
assert.equal(getPostingDetailStatus({ ...expiredSurvey, participation_deadline_at: "2026-10-11T05:00:01Z" }, now), "open");
assert.equal(getPostingDetailStatus(directSurvey, now), "open");
assert.equal(getPostingDetailStatus({ ...expiredSurvey, status: "completed" }, now), "completed");
assert.equal(getPostingDetailStatus({ ...expiredSurvey, status: "closed" }, now), "closed");
for (const entryMode of ["direct", "application_required"]) {
  assert.deepEqual(resolve({
    now,
    post: { ...expiredSurvey, entry_mode: entryMode },
    application: entryMode === "application_required" ? application("selected") : null,
    surveyParticipation: { status: "opened" },
  }), { action: "open-survey", disabled: true, label: "모집 종료" });
}
assert.deepEqual(resolve({ now, post: expiredSurvey, accessToken: null }),
  { action: "open-survey", disabled: true, label: "모집 종료" });
assert.deepEqual(resolve({ now, post: { ...expiredSurvey, entry_mode: "application_required" } }),
  { action: "apply", disabled: true, label: "모집 종료" });
assert.deepEqual(resolve({ now, post: expiredSurvey, isOwner: true }),
  { action: "manage", label: "공고 관리" });
assert.equal(resolve({ now, post: expiredSurvey, surveyParticipation: { status: "submitted" } }), null);
assert.deepEqual(resolve({ now, post: expiredSurvey, surveyParticipation: { status: "confirmed" } }),
  { action: "open-survey", disabled: true, label: "참여 완료" });
assert.deepEqual(resolve({ now, post: expiredSurvey, surveyParticipation: { status: "withdrawn" } }),
  { action: "open-survey", disabled: true, label: "참여 취소" });
assert.deepEqual(resolve({ now, post: { ...expiredSurvey, participation_deadline_at: "2026-10-11T05:00:01Z" } }),
  { action: "open-survey", label: "설문 참여하기" });
for (const recruitmentType of ["interview", "beta_test", "research_experiment"]) {
  assert.equal(getPostingDetailStatus({ ...expiredSurvey, recruitment_type: recruitmentType }, now), "open");
  assert.deepEqual(resolve({
    now, post: { ...expiredSurvey, recruitment_type: recruitmentType },
    application: application("selected"), chatRoom: { id: "room-1" },
  }), { action: "chat", label: "채팅 보기" });
}
console.log("Expired survey fixtures passed: deadline boundary, detail state, both entry modes, terminal participation and non-survey chat access.");
for (const entryMode of ["direct", "application_required"]) {
  assert.deepEqual(resolve({
    post: { ...directSurvey, entry_mode: entryMode },
    application: entryMode === "application_required" ? application("selected") : null,
    surveyParticipation: { status: "withdrawn" },
  }), { action: "open-survey", disabled: true, label: "참여 취소" });
}
const beta = { ...post, recruitment_type: "beta_test" };
const research = { ...post, recruitment_type: "research_experiment" };
assert.deepEqual(resolve({ post: research }), { action: "apply", label: "신청하기" });
assert.deepEqual(resolve({ post: research, application: application("applied") }),
  { action: "apply", disabled: true, label: "검토 중" });
assert.deepEqual(resolve({ post: research, application: application("selected"), chatRoom: { id: "room-1" } }),
  { action: "chat", label: "채팅 보기" });
assert.deepEqual(resolve({ post: research, isOwner: true }), { action: "manage", label: "공고 관리" });
assert.deepEqual(resolve({ post: { ...research, status: "closed" } }),
  { action: "apply", disabled: true, label: "모집 종료" });
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
