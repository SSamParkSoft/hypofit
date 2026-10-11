import assert from "node:assert/strict";
import { getPostingDurationError, getPostingStepIssues, getPostingDraftIssue, isPostingDate, betaPlatformLabel, toggleBetaPlatform } from "../src/features/postings/postingCreationMethod.ts";
import { isExternalSurveyUrl } from "@hypofit/contracts/survey-urls";
import { getSurveyProviderLabel, surveyProviderOptions } from "@hypofit/contracts/survey-providers";

import {
  durationToMinutes,
  serializePostingCreationDraft,
  postingToEditDraft,
  serializePostingEditDraft,
} from "../src/features/postings/postingCreationPayload.ts";
import { normalizePostingCreationDraft } from "../src/features/postings/postingCreationDraftMigration.ts";
import {
  getCreatablePostingTypes,
  getPostingCreationCapabilityError,
  canEditPosting,
} from "../src/features/postings/postingCreationCapability.ts";

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
  for (const type of ["interview", "survey", "beta_test", "research_experiment"]) {
    for (const status of ["draft", "open", "closed"]) {
      const post = { founder_id: "owner", status, recruitment_type: type };
      assert.equal(canEditPosting(post, "owner"), true);
      assert.equal(canEditPosting(post, "outsider"), false);
      assert.equal(canEditPosting(post, null), false);
    }
  }
  for (const type of ["usability_test", "other", "focus_group"]) {
    assert.equal(canEditPosting({ founder_id: "owner", status: "open", recruitment_type: type }, "owner"), false);
  }
  for (const status of ["completed", "archived", "hidden", "removed"]) {
    assert.equal(canEditPosting({ founder_id: "owner", status, recruitment_type: "research_experiment" }, "owner"), false);
  }
  assert.equal(canEditPosting(undefined, "owner"), false);
  assert.equal(canEditPosting({ founder_id: "owner", status: "open" }, "owner"), true);
  assert.deepEqual(getCreatablePostingTypes({ enabled_recruitment_types: ["interview"], direct_participation_recruitment_types: [] }), ["interview"]);
  assert.equal(canEditPosting({ founder_id: "owner", status: "open", recruitment_type: "research_experiment" }, "owner"), true);
  console.log("Posting edit access fixtures passed: four types, owner/status guards, legacy and flag-off editing.");
  assert.equal(getPostingDraftIssue(baseDraft), null);
  assert.equal(getPostingDraftIssue({ ...baseDraft, description: "일정 관리 경험을 확인해요.\n두 번째 줄 안내입니다." }), null);
  assert.equal(getPostingDraftIssue({ ...baseDraft, title: "ㅎㅎㅎ" }).message, "제목에 초성이나 특수문자만 입력할 수 없어요.");
  assert.equal(getPostingDraftIssue({ ...baseDraft, title: "" }).field, "title");
  assert.deepEqual(getPostingStepIssues(2, { ...baseDraft, title: "", description: "", targetParticipant: "" })
    .map((issue) => issue.field), ["title", "service_summary", "target_description"]);
  for (const [key, max, field] of [
    ["title", 120, "title"], ["description", 2000, "service_summary"], ["targetParticipant", 2000, "target_description"],
  ]) {
    assert.equal(getPostingStepIssues(2, { ...baseDraft, [key]: "가".repeat(max) }).length, 0);
    assert.equal(getPostingStepIssues(2, { ...baseDraft, [key]: "가".repeat(max + 1) })[0].field, field);
  }
  const legacyDraft = { ...baseDraft, title: "옛", description: "이전", durationValue: "5", durationUnit: "minutes" };
  assert.equal(getPostingDraftIssue({ ...legacyDraft, title: "새 공고 제목" }, legacyDraft), null);
  assert.equal(getPostingStepIssues(3, { ...baseDraft, locationSource: null })[0].field, "location");
  assert.equal(getPostingStepIssues(3, { ...baseDraft, scheduleMode: "fixed", fixedSlots: [] })[0].field, "schedule_mode");
  const surveyDraft = { ...baseDraft, type: "survey", externalUrl: "https://forms.gle/test", deadlineEnabled: true, deadline: "2030-09-11" };
  assert.equal(getPostingDraftIssue(surveyDraft), null);
  assert.equal(getPostingStepIssues(4, { ...surveyDraft, deadlineEnabled: false })[0].field, "participation_deadline_at");
  assert.equal(getPostingStepIssues(3, { ...surveyDraft, externalUrl: "https://example.com/forms" }).length, 0);
  assert.equal(getPostingStepIssues(3, { ...surveyDraft, externalUrl: "not-a-url" })[0].field, "external_url");
  const betaDraft = { ...baseDraft, type: "beta_test", durationValue: "7", durationUnit: "days", betaPlatforms: ["ios", "android"], betaStartsAt: "2030-09-11", betaEndsAt: "2030-09-17" };
  assert.equal(getPostingDraftIssue(betaDraft), null);
  assert.equal(getPostingStepIssues(3, { ...betaDraft, betaEndsAt: betaDraft.betaStartsAt }).length, 0);
  assert.equal(getPostingStepIssues(3, { ...betaDraft, betaEndsAt: "2030-09-10" })[0].field, "beta_dates");
  assert.equal(getPostingStepIssues(3, { ...betaDraft, environment: "가".repeat(1001) })[0].field, "beta_test_environment");
  assert.equal(getPostingStepIssues(3, { ...betaDraft, workflowNote: "가".repeat(2001) })[0].field, "beta_test_workflow_note");
  assert.equal(isPostingDate("2026-02-30"), false);
  assert.equal(isPostingDate("2028-02-29"), true);
  const deadlineDraft = { ...baseDraft, deadlineEnabled: true, deadline: "2030-09-11" };
  assert.equal(getPostingStepIssues(4, deadlineDraft, undefined, Date.parse("2030-09-11T14:59:00Z")).length, 0);
  assert.equal(getPostingStepIssues(4, deadlineDraft, undefined, Date.parse("2030-09-11T15:00:00Z"))[0].field, "participation_deadline_at");
  for (const count of ["0", "1000", "1.5", "x"]) {
    assert.equal(getPostingStepIssues(4, { ...baseDraft, recruitmentCount: count })[0].field, "recruit_count");
  }
  for (const rewards of [[], [{ type: "none" }, { type: "gift_card", label: "Coffee" }], [{ type: "cash", amount: 0 }],
    [{ type: "cash", amount: 2147483648 }], [{ type: "points", points: 1.5 }], [{ type: "gift_card", label: "" }]]) {
    assert.equal(getPostingStepIssues(4, { ...baseDraft, compensations: rewards })[0].field, "compensations");
  }
  assert.deepEqual(["ios", "Android", "web", "other"].map(betaPlatformLabel), ["iOS", "Android", "Web", "기타"]);
  assert.deepEqual([" IOS ", "ANDROID", "Web", "기타", "Windows"].map(betaPlatformLabel), ["iOS", "Android", "Web", "기타", "Windows"]);
  assert.deepEqual(toggleBetaPlatform(["ios", "android"], "iOS"), ["android"]);
  assert.deepEqual(toggleBetaPlatform(["ios", "other"], "기타"), ["ios"]);
  for (const mode of ["fixed", "recurring", "negotiated"]) {
    const input = serializePostingCreationDraft({ ...baseDraft, scheduleMode: mode, fixedSlots: ["2030-09-11 14:00"] });
    assert.deepEqual(input.schedule_fixed_slots, mode === "fixed" ? ["2030-09-11 14:00"] : []);
    assert.deepEqual(input.schedule_recurring_windows, mode === "recurring" ? ["평일 저녁"] : []);
  }
  console.log("Posting field validation fixtures passed: explicit fields, limits, same-day beta, strict dates, legacy edit, rewards, platform prefill, schedule modes.");
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
  assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, externalProvider: "tally", externalUrl: "https://tally.so/r/replacement" }, surveyEdit), { external_url: "https://tally.so/r/replacement", external_provider: "tally" });
  assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, externalUrl: "https://forms.gle/replacement" }, surveyEdit), { external_url: "https://forms.gle/replacement" });
  assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, title: "제목만 바꾼 설문" }, surveyEdit), { title: "제목만 바꾼 설문" });
  assert.deepEqual(surveyProviderOptions.map((option) => option.label), ["Google Forms", "네이버 폼", "Microsoft Forms", "Typeform", "Tally", "기타"]);
  for (const option of surveyProviderOptions) {
    const chosenDraft = { ...surveyDraft, schemaVersion: 2, externalProvider: option.value, externalUrl: "https://research.example.org/form" };
    const recovered = normalizePostingCreationDraft(JSON.parse(JSON.stringify(chosenDraft)), { ...baseDraft, schemaVersion: 2 }, () => "new-id");
    assert.equal(recovered.externalProvider, option.value);
    assert.equal(getPostingStepIssues(3, recovered).length, 0);
    const payload = serializePostingCreationDraft(recovered);
    assert.equal(payload.external_provider, option.value);
    assert.equal(payload.external_url, chosenDraft.externalUrl);
    const refetched = postingToEditDraft({ ...editPost, ...payload, external_url: null }, baseDraft);
    assert.equal(refetched.externalProvider, option.value);
    assert.equal(getSurveyProviderLabel(refetched.externalProvider), option.label);
    assert.deepEqual(serializePostingEditDraft(refetched, refetched), {});
    assert.deepEqual(serializePostingEditDraft({ ...surveyEdit, externalProvider: option.value }, surveyEdit),
      option.value === "google_forms" ? {} : { external_provider: option.value });
  }
  assert.equal(getPostingStepIssues(3, { ...surveyDraft, externalProvider: "unknown" })[0].field, "external_provider");
  assert.equal(normalizePostingCreationDraft({ ...surveyDraft, schemaVersion: 1 }, { ...baseDraft, schemaVersion: 2 }, () => "new-id").externalProvider, "google_forms");
  console.log("Survey provider fixtures passed: six choices, draft restore, create/fetch labels, masked URL edit, provider-independent HTTPS validation.");
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
  for (const type of ["usability_test", "focus_group", "other"]) {
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
  for (const type of ["survey", "beta_test", "research_experiment"]) {
    assert.ok(getPostingCreationCapabilityError({ ...baseDraft, type }, {
      enabled_recruitment_types: ["interview"], direct_participation_recruitment_types: [],
    }));
  }
  assert.equal(durationToMinutes("2", "weeks"), 20160);
  assert.equal(durationToMinutes("0", "minutes"), 0);

  const researchDraft = { ...baseDraft, schemaVersion: 2, type: "research_experiment",
    title: "성인 시각 과제 연구 참여자 모집", scheduleMode: "fixed",
    fixedSlots: ["2099-09-15T10:00:00+09:00"], scheduleNote: "개인 노트북을 준비해 주세요.\n도착 후 담당자에게 연락해 주세요.",
  };
  const researchCapabilities = { ...capabilities,
    enabled_recruitment_types: [...capabilities.enabled_recruitment_types, "research_experiment"],
  };
  assert.equal(getPostingCreationCapabilityError(researchDraft, researchCapabilities), null);
  assert.ok(getPostingCreationCapabilityError(researchDraft, capabilities));
  assert.ok(getPostingCreationCapabilityError({ ...researchDraft, entryMode: "direct" }, researchCapabilities));
  assert.deepEqual(getCreatablePostingTypes(researchCapabilities), researchCapabilities.enabled_recruitment_types);
  for (const interviewMode of ["online", "offline", "both"]) {
    const source = { ...researchDraft, interviewMode };
    const recovered = normalizePostingCreationDraft(JSON.parse(JSON.stringify(source)), { ...baseDraft, schemaVersion: 2 }, () => "new-id");
    assert.equal(getPostingDraftIssue(recovered), null);
    const wire = serializePostingCreationDraft(recovered);
    assert.equal(wire.interview_mode, interviewMode);
    assert.equal(wire.schedule_mode, "fixed");
    assert.deepEqual(wire.schedule_fixed_slots, researchDraft.fixedSlots);
    assert.deepEqual(wire.schedule_recurring_windows, []);
    assert.equal(wire.schedule_note, researchDraft.scheduleNote);
    assert.equal(wire.location_latitude, interviewMode === "online" ? null : baseDraft.locationLatitude);
    assert.equal(wire.beta_test_environment, null);
    assert.equal(wire.external_url, null);
    const restored = postingToEditDraft({ ...editPost, ...wire }, baseDraft);
    assert.equal(restored.type, "research_experiment");
    assert.equal(restored.scheduleNote, researchDraft.scheduleNote);
    assert.deepEqual(serializePostingEditDraft(restored, restored), {});
    assert.deepEqual(serializePostingEditDraft({ ...restored, scheduleNote: "준비물은 없어요." }, restored),
      { schedule_note: "준비물은 없어요." });
  }
  assert.equal(getPostingStepIssues(3, { ...researchDraft, locationSource: null })[0].field, "location");
  assert.equal(getPostingStepIssues(3, { ...researchDraft, fixedSlots: [] })[0].field, "schedule_mode");
  assert.equal(getPostingStepIssues(3, { ...researchDraft, scheduleMode: "none" })[0].field, "schedule_mode");
  assert.equal(getPostingStepIssues(3, { ...researchDraft, durationValue: "5" })[0].field, "duration_value");
  assert.equal(getPostingStepIssues(3, { ...researchDraft, scheduleNote: "가".repeat(2001) })[0].field, "schedule_note");
  console.log("Research creation fixtures passed: capability, modes/location, schedule/preparation, draft recovery, edit and validation.");

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
  for (const url of ["https://forms.gle/example", " https://docs.google.com/forms/d/example/viewform ",
    "https://tally.so/r/example", "https://research.typeform.com/to/example", "https://naver.me/example",
    "https://forms.office.com/r/example", "https://research.example.org/custom?source=hypofit#start",
    "https://docs.google.com/document/example", "https://xn--3e0b707e.example/form"]) {
    assert.equal(isExternalSurveyUrl(url), true, url);
    assert.equal(getPostingStepIssues(3, { ...surveyDraft, externalUrl: url }).length, 0, url);
  }
  for (const url of ["", "not-a-url", "http://forms.gle/example", "javascript:alert(1)", "data:text/html,test",
    "file:///tmp/form", "https://user:password@forms.gle/example", "https://@example.com", "https:example.com",
    "https://localhost/form", "https://127.0.0.1/form", "https://[::1]/form", "https://example.com:99999/",
    "https://example.com:0/", "https://exa mple.com", "https://example.com/line\nbreak", "https://example.com/has space",
    "https://example.com/" + "a".repeat(2000)]) {
    assert.equal(isExternalSurveyUrl(url), false, url);
    assert.equal(getPostingStepIssues(3, { ...surveyDraft, externalUrl: url })[0].field, "external_url", url);
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
