import { type CreationStep } from "@/features/postings/postingCreationDraft";
import { ApiError } from "@/shared/api/client";

export function getPublishErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "공고를 올리지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.";
  }

  const field = normalizeValidationField(error.fieldErrors?.[0]?.field ?? null);
  if (field === "title") return "제목을 다시 확인해 주세요.";
  if (field === "external_provider") return "설문 종류를 선택해 주세요.";
  if (field === "service_summary" || field === "serviceSummary")
    return "공고 설명을 다시 확인해 주세요.";
  if (field === "target_description" || field === "targetDescription")
    return "찾는 참여자를 다시 확인해 주세요.";
  if (
    field === "duration_minutes" ||
    field === "durationMinutes" ||
    field === "duration_value" ||
    field === "durationValue" ||
    field === "duration_unit" ||
    field === "durationUnit"
  )
    return "예상 소요 시간을 다시 확인해 주세요.";
  if (
    field === "recruit_count" ||
    field === "recruitCount" ||
    field === "recruitment_limit_mode" ||
    field === "recruitmentLimitMode"
  )
    return "모집 인원을 다시 확인해 주세요.";
  if (field === "interview_mode" || field === "interviewMode")
    return "진행 방식을 다시 확인해 주세요.";
  if (
    field === "location" ||
    field === "location_text" ||
    field === "locationText" ||
    field === "location_latitude" ||
    field === "locationLatitude" ||
    field === "location_longitude" ||
    field === "locationLongitude" ||
    field === "location_precision" ||
    field === "locationPrecision" ||
    field === "location_source" ||
    field === "locationSource"
  )
    return "대면 진행에는 지도에서 장소를 선택해 주세요.";
  if (
    field === "schedule_options" ||
    field === "scheduleOptions" ||
    field === "schedule_mode" ||
    field === "scheduleMode" ||
    field === "schedule_fixed_slots" ||
    field === "scheduleFixedSlots" ||
    field === "schedule_recurring_windows" ||
    field === "scheduleRecurringWindows" ||
    field === "schedule_note" ||
    field === "scheduleNote"
  )
    return "일정 설정을 다시 확인해 주세요.";
  if (field === "external_url" || field === "externalUrl")
    return "외부 설문 참여 링크를 다시 확인해 주세요.";
  if (field === "participation_deadline_at" || field === "participationDeadlineAt")
    return "마감일을 다시 확인해 주세요.";
  if (field === "compensations") return "보상 내용을 다시 확인해 주세요.";
  if (field === "beta_test_starts_at" || field === "beta_test_ends_at")
    return "테스트 시작일과 종료일을 다시 확인해 주세요.";
  if (field === "beta_test_platforms") return "테스트 플랫폼을 하나 이상 선택해 주세요.";
  if (field === "beta_test_environment") return "필요 기기 또는 환경은 1000자 이하로 입력해 주세요.";
  if (field === "beta_test_workflow_note") return "테스트 방법은 2000자 이하로 입력해 주세요.";
  if (field === "external_data_notice") return "외부 설문 안내를 2000자 이하로 입력해 주세요.";
  if (field === "__root__")
    return "대면 진행에는 지도에서 장소를 선택해 주세요.";

  if (error.code === "recruitment_type_not_supported") {
    return "이 공고 유형은 아직 등록을 준비 중이에요.";
  }
  if (error.code === "auth_verifier_unavailable") {
    return "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status === 401 || error.status === 403) {
    return "인증 정보를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status >= 500) {
    return "공고를 올리지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status === 422) return "입력한 내용을 다시 확인해 주세요.";
  return "공고를 올리지 못했어요. 작성한 내용은 초안으로 보관했어요.";
}

export function getApiValidationField(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const field = normalizeValidationField(error.fieldErrors?.[0]?.field ?? null);
  return getStepForValidationField(field) ? field : null;
}

function normalizeValidationField(field: string | null): string | null {
  if (!field) return null;
  const aliases: Record<string, string> = {
    serviceSummary: "service_summary",
    targetDescription: "target_description",
    durationMinutes: "duration_minutes",
    durationValue: "duration_value",
    durationUnit: "duration_unit",
    recruitCount: "recruit_count",
    recruitmentLimitMode: "recruitment_limit_mode",
    interviewMode: "interview_mode",
    scheduleOptions: "schedule_options",
    scheduleMode: "schedule_mode",
    scheduleFixedSlots: "schedule_fixed_slots",
    scheduleRecurringWindows: "schedule_recurring_windows",
    scheduleNote: "schedule_note",
    betaTestEnvironment: "beta_test_environment",
    betaTestWorkflowNote: "beta_test_workflow_note",
    betaTestPlatforms: "beta_test_platforms",
    betaTestStartsAt: "beta_test_starts_at",
    betaTestEndsAt: "beta_test_ends_at",
    externalProvider: "external_provider",
    externalDataNotice: "external_data_notice",
    externalUrl: "external_url",
    participationDeadlineAt: "participation_deadline_at",
    locationText: "location",
    locationLatitude: "location",
    locationLongitude: "location",
    locationPrecision: "location",
    locationSource: "location",
    location_text: "location",
    location_latitude: "location",
    location_longitude: "location",
    location_precision: "location",
    location_source: "location",
    __root__: "location",
    rewardAmount: "compensations",
    reward_amount: "compensations",
  };
  return aliases[field] ?? field;
}

export function getStepForValidationField(field: string | null): CreationStep | null {
  if (!field) return null;
  if (["title", "service_summary", "target_description"].includes(field)) return 2;
  if (
    [
      "duration_minutes",
      "duration_value",
      "duration_unit",
      "interview_mode",
      "location",
      "schedule_options",
      "schedule_mode",
      "schedule_fixed_slots",
      "schedule_recurring_windows",
      "schedule_note",
      "external_url",
      "external_provider",
      "external_data_notice",
      "beta_platforms",
      "beta_test_platforms",
      "beta_dates",
      "beta_test_starts_at",
      "beta_test_ends_at",
      "beta_test_environment",
      "beta_test_workflow_note",
    ].includes(field)
  )
    return 3;
  if (
    [
      "recruit_count",
      "recruitment_limit_mode",
      "participation_deadline_at",
      "compensations",
      "reward_amount",
    ].includes(field)
  )
    return 4;
  return null;
}

export function resolveAttentionField(field: string | null): string | null {
  if (!field) return null;

  const aliases: Record<string, string> = {
    duration_minutes: "duration_value",
    duration_unit: "duration_value",
    schedule_options: "schedule_mode",
    schedule_fixed_slots: "schedule_mode",
    schedule_recurring_windows: "schedule_mode",
    beta_test_platforms: "beta_platforms",
    beta_test_starts_at: "beta_dates",
    beta_test_ends_at: "beta_dates",
    recruitment_limit_mode: "recruit_count",
  };

  return aliases[field] ?? field;
}
