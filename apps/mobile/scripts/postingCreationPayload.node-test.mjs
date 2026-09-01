import assert from "node:assert/strict";

import {
  durationToMinutes,
  serializePostingCreationDraft,
} from "../src/features/interview-posts/postingCreationPayload.ts";

const baseDraft = {
  schemaVersion: 1,
  clientSubmissionId: "11111111-1111-1111-1111-111111111111",
  type: "interview",
  entryMode: "application_required",
  title: "  일정 관리 경험 인터뷰  ",
  description: "  일정 조율 경험을 확인합니다.  ",
  targetParticipant: "  최근 일정 관리 경험자  ",
  interviewMode: "offline",
  durationValue: "1",
  durationUnit: "hours",
  scheduleMode: "recurring",
  fixedSlots: [],
  recurringWindows: ["평일 저녁"],
  scheduleNote: "",
  location: "  한양대학교 ERICA  ",
  locationAddress: "  경기도 안산시  ",
  locationPlaceName: "  제5공학관  ",
  locationLatitude: 37.3,
  locationLongitude: 126.8,
  locationPrecision: "nearby",
  locationSource: "kakao_place",
  externalProvider: "google_forms",
  externalUrl: "",
  externalDataNotice: "외부 설문 서비스에서 응답을 처리해요.",
  betaPlatforms: [],
  betaStartsAt: "",
  betaEndsAt: "",
  environment: "",
  workflowNote: "",
  recruitmentLimitMode: "limited",
  recruitmentCount: "4",
  deadlineEnabled: false,
  deadline: "",
  compensations: [{ type: "cash", amount: 30000, currency: "KRW" }],
};

function run() {
  assert.equal(durationToMinutes("2", "weeks"), 20160);
  assert.equal(durationToMinutes("0", "minutes"), 0);

  const interview = serializePostingCreationDraft(baseDraft);
  assert.deepEqual(interview, {
    client_submission_id: "11111111-1111-1111-1111-111111111111",
    recruitment_type: "interview",
    entry_mode: "application_required",
    title: "일정 관리 경험 인터뷰",
    service_summary: "일정 조율 경험을 확인합니다.",
    target_description: "최근 일정 관리 경험자",
    compensations: [{ type: "cash", amount: 30000, currency: "KRW" }],
    reward_amount: 30000,
    duration_minutes: 60,
    recruit_count: 4,
    interview_mode: "offline",
    location: "한양대학교 ERICA",
    location_text: "한양대학교 ERICA",
    location_address: "경기도 안산시",
    location_place_name: "제5공학관",
    location_latitude: 37.3,
    location_longitude: 126.8,
    location_precision: "nearby",
    location_source: "kakao_place",
    schedule_options: ["평일 저녁"],
    external_provider: null,
    external_url: null,
    participation_deadline_at: null,
    external_data_notice: null,
    beta_test_platforms: null,
    beta_test_starts_at: null,
    beta_test_ends_at: null,
    status: "open",
  });

  const survey = serializePostingCreationDraft({
    ...baseDraft,
    type: "survey",
    entryMode: "direct",
    interviewMode: "online",
    durationValue: "10",
    durationUnit: "minutes",
    recruitmentLimitMode: "unlimited",
    externalUrl: " https://docs.google.com/forms/d/e/example/viewform ",
    deadlineEnabled: true,
    deadline: "2026-09-05",
  });
  assert.equal(survey.recruit_count, 0);
  assert.equal(survey.location, null);
  assert.equal(survey.duration_minutes, 10);
  assert.equal(survey.external_url, "https://docs.google.com/forms/d/e/example/viewform");
  assert.equal(survey.participation_deadline_at, "2026-09-05T23:59:59.999Z");
  assert.equal(survey.entry_mode, "direct");

  const betaTest = serializePostingCreationDraft({
    ...baseDraft,
    type: "beta_test",
    durationValue: "7",
    durationUnit: "days",
    betaPlatforms: ["ios", "android"],
    betaStartsAt: "2026-09-10",
    betaEndsAt: "2026-09-17",
  });
  assert.equal(betaTest.interview_mode, "online");
  assert.equal(betaTest.location, null);
  assert.equal(betaTest.duration_minutes, 10080);
  assert.deepEqual(betaTest.beta_test_platforms, ["ios", "android"]);
  assert.equal(betaTest.beta_test_starts_at, "2026-09-10T00:00:00.000Z");
  assert.equal(betaTest.beta_test_ends_at, "2026-09-17T23:59:59.999Z");
  assert.equal(betaTest.external_url, null);
}

run();
