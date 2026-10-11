import assert from "node:assert/strict";
import test from "node:test";

import { resolvePostingDetailCta } from "../src/features/postings/resolvePostingDetailCta.ts";

const post = { id: "post-1", status: "closed", recruitment_type: "interview" };
const application = { id: "application-1", interview_post_id: post.id, status: "selected" };
const chatRoom = {
  id: "room-1",
  interview_post_id: post.id,
  application_id: application.id,
  status: "selected",
};
const closedCta = { action: "apply", disabled: true, label: "모집 종료" };
const resolve = (overrides = {}) => resolvePostingDetailCta({
  accessToken: "token",
  application,
  chatRoom,
  isApplicationFormOpen: false,
  isOwner: false,
  post,
  ...overrides,
});

for (const type of ["interview", "beta_test", "research_experiment", undefined]) {
  for (const roomStatus of ["open", "selected"]) {
    test(`closed ${type ?? "legacy interview"}: selected participant retains ${roomStatus} room`, () => {
      assert.deepEqual(resolve({
        post: { ...post, recruitment_type: type },
        chatRoom: { ...chatRoom, status: roomStatus },
      }), { action: "chat", label: "채팅 보기" });
    });
  }
}

test("closed posting keeps new applications and non-selected participants blocked", () => {
  assert.deepEqual(resolve({ application: null }), closedCta);
  for (const status of ["applied", "completed", "rejected", "canceled", "no_show"]) {
    assert.deepEqual(resolve({ application: { ...application, status } }), closedCta);
  }
});

test("closed posting without an existing room stays unavailable", () => {
  assert.deepEqual(resolve({ chatRoom: null }), closedCta);
});

test("closed and blocked rooms do not receive the closed-post exception", () => {
  for (const status of ["closed", "blocked"]) {
    assert.deepEqual(resolve({ chatRoom: { ...chatRoom, status } }), closedCta);
  }
});

test("only the matching application and posting may open an existing room", () => {
  assert.deepEqual(resolve({ chatRoom: { ...chatRoom, application_id: "other-application" } }), closedCta);
  assert.deepEqual(resolve({ chatRoom: { ...chatRoom, interview_post_id: "other-post" } }), closedCta);
  assert.deepEqual(resolve({ application: { ...application, interview_post_id: "other-post" } }), closedCta);
});

test("closed surveys still block direct and approved external participation", () => {
  for (const entryMode of ["direct", "application_required"]) {
    assert.deepEqual(resolve({ post: { ...post, recruitment_type: "survey", entry_mode: entryMode } }), closedCta);
  }
});

test("excluded recruitment types do not gain chat access", () => {
  for (const type of ["focus_group", "usability_test", "other"]) {
    assert.deepEqual(resolve({ post: { ...post, recruitment_type: type } }), closedCta);
  }
});

test("other non-open posting statuses keep their original unavailable CTA", () => {
  for (const [status, label] of Object.entries({
    archived: "보관됨", completed: "완료", draft: "임시 저장", hidden: "비공개", removed: "삭제됨",
  })) {
    assert.deepEqual(resolve({ post: { ...post, status } }), { action: "apply", disabled: true, label });
  }
});

test("owner retains posting management on closed postings", () => {
  assert.deepEqual(resolve({ isOwner: true }), { action: "manage", label: "공고 관리" });
});
