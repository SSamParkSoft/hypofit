import assert from "node:assert/strict";
import { getPostingDurationError, isGoogleFormsParticipationUrl } from "../src/features/interview-posts/postingCreationMethod.ts";

import {
  durationToMinutes,
  serializePostingCreationDraft,
  postingToEditDraft,
  serializePostingEditDraft,
} from "../src/features/interview-posts/postingCreationPayload.ts";
import { normalizePostingCreationDraft } from "../src/features/interview-posts/postingCreationDraftMigration.ts";
import {
  getCreatablePostingTypes,
  getPostingCreationCapabilityError,
} from "../src/features/interview-posts/postingCreationCapability.ts";

const baseDraft = {
  schemaVersion: 1,
  clientSubmissionId: "11111111-1111-1111-1111-111111111111",
  type: "interview",
  entryMode: "application_required",
  title: "  일정 관리 경험 인터뷰  ",
  description: "  일정 조율 경험을 확인합니다.  ",
  targetParticipant: "  최근 일정 관리 경험자\n• 평일 저녁 참여 가능  ",
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
  const editPost = {
    ...serializePostingCreationDraft(baseDraft),
    id: "post-id", founder_id: "owner-id", status: "closed",
    participant_requirements: ["별도로 보존할 구조화된 조건"],
    participation_deadline_at: "2025-09-10T14:59:59+09:00",
    schedule_options: ["이전 자유 입력 일정"],
    schedule_mode: null, schedule_note: null,
  };
  const editBaseline = postingToEditDraft(editPost, baseDraft);
  const koreaDates = postingToEditDraft({ ...editPost,
    beta_test_starts_at: "2026-09-09T15:00:00Z",
    beta_test_ends_at: "2026-09-17T14:59:59.999Z",
    participation_deadline_at: "2026-09-05T14:59:59.999Z",
  }, baseDraft);
  assert.equal(koreaDates.betaStartsAt, "2026-09-10");
  assert.equal(koreaDates.betaEndsAt, "2026-09-17");
  assert.equal(koreaDates.deadline, "2026-09-05");
  assert.deepEqual(serializePostingEditDraft(koreaDates, koreaDates), {});
  assert.equal(editBaseline.scheduleMode, "negotiated");
  assert.equal(editBaseline.scheduleNote, "이전 자유 입력 일정");
  assert.deepEqual(serializePostingEditDraft(editBaseline, editBaseline), {});
  assert.deepEqual(serializePostingEditDraft({ ...editBaseline, title: "수정된 공고 제목" }, editBaseline), {
    title: "수정된 공고 제목",
  });
  assert.deepEqual(serializePostingEditDraft({ ...editBaseline, durationValue: "2" }, editBaseline), {
    duration_minutes: 120, duration_value: 2, duration_unit: "hours",
  });
  const rewards = [{ type: "cash", amount: 40000, currency: "KRW" }, { type: "gift_card", label: "커피 기프티콘" }];
  assert.deepEqual(serializePostingEditDraft({ ...editBaseline, compensations: rewards }, editBaseline), {
    compensations: rewards, reward_amount: 40000,
  });
  assert.deepEqual(serializePostingEditDraft({ ...editBaseline, compensations: [{ type: "none" }] }, editBaseline), {
    compensations: [{ type: "none" }], reward_amount: 0,
  });
  const surveyEdit = postingToEditDraft({ ...editPost, recruitment_type: "survey", external_url: null, external_action_available: true, external_provider: "google_forms" }, baseDraft);
  assert.equal(surveyEdit.externalUrl, "");
  assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, title: "설문 제목 수정" }, surveyEdit), { title: "설문 제목 수정" });
  assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, externalUrl: "https://forms.gle/replacement" }, surveyEdit), { external_url: "https://forms.gle/replacement" });
  const betaEdit = postingToEditDraft({ ...editPost, recruitment_type: "beta_test", duration_value: 7, duration_unit: "days", beta_test_platforms: ["ios", "android"], beta_test_starts_at: "2026-09-10T14:00:00+09:00", beta_test_ends_at: "2026-09-17T14:00:00+09:00", beta_test_environment: "iOS 17 이상", beta_test_workflow_note: "테스트 후 설문" }, baseDraft);
  assert.equal(betaEdit.durationValue, "7");
  assert.deepEqual(betaEdit.betaPlatforms, ["ios", "android"]);
  assert.deepEqual(serializePostingEditDraft({ ...betaEdit, environment: "iOS 18 이상" }, betaEdit), { beta_test_environment: "iOS 18 이상" });
  assert.deepEqual(serializePostingEditDraft({ ...editBaseline, type: "survey", entryMode: "direct" }, editBaseline).status, undefined);
  console.log("Posting edit fixtures passed: prefill, changed-only PATCH, private URL, dates, compensation, beta fields.");
  const capabilities = {
    enabled_recruitment_types: ["interview", "survey", "beta_test"],
    direct_participation_recruitment_types: ["survey"],
  };
  assert.deepEqual(getCreatablePostingTypes(undefined), []);
  assert.ok(getPostingCreationCapabilityError(baseDraft, undefined));
  assert.equal(getPostingCreationCapabilityError(baseDraft, capabilities), null);
  assert.equal(getPostingCreationCapabilityError({ type: "survey", entryMode: "direct" }, capabilities), null);
  assert.ok(getPostingCreationCapabilityError({ type: "beta_test", entryMode: "direct" }, capabilities));
  assert.ok(getPostingCreationCapabilityError({ type: "survey", entryMode: "direct" }, {
    ...capabilities, direct_participation_recruitment_types: [],
  }));
  for (const type of ["usability_test", "research_experiment", "focus_group", "other"]) {
    const source = { ...baseDraft, type, environment: "보존할 준비 사항", workflowNote: "보존할 진행 안내" };
    const recovered = normalizePostingCreationDraft(source, { ...baseDraft, schemaVersion: 2 }, () => "new-id");
    assert.equal(recovered.type, type);
    assert.equal(recovered.title, source.title);
    assert.equal(recovered.environment, source.environment);
    assert.equal(recovered.workflowNote, source.workflowNote);
    assert.equal(recovered.clientSubmissionId, source.clientSubmissionId);
    assert.ok(getPostingCreationCapabilityError(recovered, capabilities));
    assert.deepEqual(getCreatablePostingTypes({
      ...capabilities, enabled_recruitment_types: [...capabilities.enabled_recruitment_types, type],
    }), capabilities.enabled_recruitment_types);
    assert.equal(getPostingCreationCapabilityError({ ...recovered, type: "interview" }, capabilities), null);
  }
  for (const type of ["survey", "beta_test"]) {
    assert.ok(getPostingCreationCapabilityError({ ...baseDraft, type }, {
      enabled_recruitment_types: ["interview"], direct_participation_recruitment_types: [],
    }));
  }
  assert.equal(durationToMinutes("2", "weeks"), 20160);
  assert.equal(durationToMinutes("0", "minutes"), 0);

  const interview = serializePostingCreationDraft(baseDraft);
  assert.deepEqual(interview, {
    client_submission_id: "11111111-1111-1111-1111-111111111111",
    recruitment_type: "interview",
    entry_mode: "application_required",
    title: "일정 관리 경험 인터뷰",
    service_summary: "일정 조율 경험을 확인합니다.",
    target_description: "최근 일정 관리 경험자\n• 평일 저녁 참여 가능",
    participant_requirements: ["최근 일정 관리 경험자", "평일 저녁 참여 가능"],
    compensations: [{ type: "cash", amount: 30000, currency: "KRW" }],
    reward_amount: 30000,
    duration_minutes: 60,
    duration_value: 1,
    duration_unit: "hours",
    recruit_count: 4,
    recruitment_limit_mode: "limited",
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
    schedule_mode: "recurring",
    schedule_fixed_slots: [],
    schedule_recurring_windows: ["평일 저녁"],
    schedule_note: null,
    external_provider: null,
    external_url: null,
    participation_deadline_at: null,
    external_data_notice: null,
    beta_test_platforms: null,
    beta_test_starts_at: null,
    beta_test_ends_at: null,
    beta_test_environment: null,
    beta_test_workflow_note: null,
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
  assert.equal(survey.duration_value, 10);
  assert.equal(survey.duration_unit, "minutes");
  assert.equal(survey.recruitment_limit_mode, "unlimited");
  assert.equal(survey.external_url, "https://docs.google.com/forms/d/e/example/viewform");
  assert.equal(survey.participation_deadline_at, "2026-09-05T23:59:59.999+09:00");
  assert.equal(new Date(survey.participation_deadline_at).toISOString(), "2026-09-05T14:59:59.999Z");
  assert.equal(survey.entry_mode, "direct");

  const betaTest = serializePostingCreationDraft({
    ...baseDraft,
    type: "beta_test",
    durationValue: "7",
    durationUnit: "days",
    betaPlatforms: ["ios", "android"],
    betaStartsAt: "2026-09-10",
    betaEndsAt: "2026-09-17",
    environment: "iOS 17 이상",
    workflowNote: "7일 사용 후 설문을 제출해 주세요.",
  });
  assert.equal(betaTest.interview_mode, "online");
  assert.equal(betaTest.location, null);
  assert.equal(betaTest.duration_minutes, 10080);
  assert.equal(betaTest.duration_value, 7);
  assert.equal(betaTest.duration_unit, "days");
  assert.deepEqual(betaTest.beta_test_platforms, ["ios", "android"]);
  assert.equal(betaTest.beta_test_starts_at, "2026-09-10T00:00:00.000+09:00");
  assert.equal(betaTest.beta_test_ends_at, "2026-09-17T23:59:59.999+09:00");
  assert.equal(new Date(betaTest.beta_test_starts_at).toISOString(), "2026-09-09T15:00:00.000Z");
  assert.equal(betaTest.external_url, null);
  assert.equal(betaTest.beta_test_environment, "iOS 17 이상");
  assert.equal(betaTest.beta_test_workflow_note, "7일 사용 후 설문을 제출해 주세요.");
  for (const payload of [survey, betaTest]) {
    assert.equal(payload.schedule_mode, "none");
    assert.deepEqual(payload.schedule_fixed_slots, []);
    assert.deepEqual(payload.schedule_recurring_windows, []);
    assert.equal(payload.schedule_note, null);
  }
  assert.deepEqual(baseDraft.recurringWindows, ["평일 저녁"]);
  assert.equal(getPostingDurationError("beta_test", "7", "days"), null);
  assert.equal(getPostingDurationError("beta_test", "1", "weeks"), null);
  for (const value of ["0", "-1", "1.5", "999"]) {
    assert.ok(getPostingDurationError("beta_test", value, "weeks"));
  }
  assert.ok(getPostingDurationError("survey", "1", "days"));
  for (const url of ["https://forms.gle/example", " https://docs.google.com/forms/d/example/viewform "]) {
    assert.equal(isGoogleFormsParticipationUrl(url), true);
  }
  for (const url of ["http://forms.gle/example", "https://docs.google.com/document/example", "https://forms.gle.evil.test/example", "https://user:password@forms.gle/example"]) {
    assert.equal(isGoogleFormsParticipationUrl(url), false);
  }

  const migratedV1Draft = normalizePostingCreationDraft(
    {
      ...baseDraft,
      schemaVersion: 1,
      clientSubmissionId: "22222222-2222-4222-8222-222222222222",
      scheduleNote: undefined,
      environment: undefined,
      workflowNote: undefined,
      fixedSlots: ["2026-09-05T10:00:00.000Z"],
      recurringWindows: ["주말 오전"],
      betaPlatforms: ["ios"],
    },
    {
      ...baseDraft,
      schemaVersion: 2,
      clientSubmissionId: "new-submission-id",
      scheduleNote: "",
      environment: "",
      workflowNote: "",
    },
    () => "generated-submission-id",
  );
  assert.ok(migratedV1Draft);
  assert.equal(migratedV1Draft.schemaVersion, 2);
  assert.equal(
    migratedV1Draft.clientSubmissionId,
    "22222222-2222-4222-8222-222222222222",
  );
  assert.deepEqual(migratedV1Draft.fixedSlots, ["2026-09-05T10:00:00.000Z"]);
  assert.deepEqual(migratedV1Draft.recurringWindows, ["주말 오전"]);
  assert.deepEqual(migratedV1Draft.betaPlatforms, ["ios"]);
  assert.equal(migratedV1Draft.scheduleNote, "");
  assert.equal(migratedV1Draft.environment, "");
  assert.equal(migratedV1Draft.workflowNote, "");
}

run();
