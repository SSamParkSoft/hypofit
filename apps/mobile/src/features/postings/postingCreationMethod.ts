import type { CreationStep, DurationUnit, PostingCreationDraft } from "./postingCreationDraft";
import { isExternalSurveyUrl } from "@hypofit/contracts/survey-urls";
import { surveyProviderOptions } from "@hypofit/contracts/survey-providers";

const durationMultipliers: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
};

export function getPostingDurationError(type: string, value: string, unit: DurationUnit): string | null {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    return "예상 시간은 1 이상 999 이하의 정수로 입력해 주세요.";
  }
  const minutes = number * durationMultipliers[unit];
  if (type === "beta_test") {
    return !Number.isFinite(minutes) || minutes < 10 || minutes > 525600
      ? "예상 참여 기간은 10분 이상 1년 이하로 입력해 주세요."
      : null;
  }
  return minutes < 10 || minutes > 240
    ? "예상 시간은 10분에서 4시간 사이로 입력해 주세요."
    : null;
}

export function betaPlatformLabel(value: string): string {
  const labels: Record<string, string> = { ios: "iOS", android: "Android", web: "Web", other: "기타" };
  return labels[value.trim().toLowerCase()] ?? value;
}

export function toggleBetaPlatform(values: string[], label: string): string[] {
  return values.some((value) => betaPlatformLabel(value) === label)
    ? values.filter((value) => betaPlatformLabel(value) !== label)
    : [...values, label];
}

export interface PostingFieldIssue {
  step: CreationStep;
  field: string;
  message: string;
}

export function isPostingDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getPostingStepIssues(
  step: CreationStep,
  draft: PostingCreationDraft,
  baseline?: PostingCreationDraft,
  now = Date.now(),
): PostingFieldIssue[] {
  const issues: PostingFieldIssue[] = [];
  const changed = (...keys: Array<keyof PostingCreationDraft>) =>
    !baseline || keys.some((key) => JSON.stringify(draft[key]) !== JSON.stringify(baseline[key]));
  const add = (field: string, message: string) => { issues.push({ step, field, message }); };
  const text = (key: keyof PostingCreationDraft, field: string, label: string, min: number, max: number) => {
    if (!changed(key)) return;
    const value = String(draft[key]).trim();
    const object = `${label}${key === "targetParticipant" ? "를" : "을"}`;
    if (value.length < min) add(field, `${object} ${min}자 이상 입력해 주세요.`);
    else if (value.length > max) add(field, `${max}자 이하로 입력해 주세요.`);
    else if (min && !/[A-Za-z0-9가-힣]/.test(value)) add(field, `${label}에 초성이나 특수문자만 입력할 수 없어요.`);
  };
  if (step === 2) {
    text("title", "title", "제목", 2, 120);
    text("description", "service_summary", "공고 설명", 10, 2000);
    text("targetParticipant", "target_description", "찾는 참여자", 10, 2000);
  }
  if (step === 3) {
    const durationError = getPostingDurationError(draft.type, draft.durationValue, draft.durationUnit);
    if (changed("durationValue", "durationUnit") && durationError) add("duration_value", durationError);
    if (draft.type === "interview" || draft.type === "research_experiment") {
      if (!["fixed", "recurring", "negotiated"].includes(draft.scheduleMode))
        add("schedule_mode", "일정 설정 방식을 선택해 주세요.");
      if (changed("interviewMode", "location", "locationLatitude", "locationLongitude", "locationPrecision", "locationSource") &&
          draft.interviewMode !== "online" && (!draft.location.trim() || draft.locationLatitude === null ||
          draft.locationLongitude === null || !draft.locationPrecision || !draft.locationSource)) {
        add("location", "대면 진행에는 지도에서 장소를 선택해 주세요.");
      }
      if (changed("scheduleMode", "fixedSlots") && draft.scheduleMode === "fixed" && !draft.fixedSlots.length)
        add("schedule_mode", "참여 가능한 날짜와 시간을 하나 이상 추가해 주세요.");
      if (changed("scheduleMode", "recurringWindows") && draft.scheduleMode === "recurring" && !draft.recurringWindows.length)
        add("schedule_mode", "반복 가능한 시간대를 하나 이상 선택해 주세요.");
      text("scheduleNote", "schedule_note", "추가 안내", 0, 2000);
    }
    if (draft.type === "survey") {
      if (changed("externalProvider") && !surveyProviderOptions.some((option) => option.value === draft.externalProvider))
        add("external_provider", "설문 종류를 선택해 주세요.");
      if (changed("externalUrl") && !isExternalSurveyUrl(draft.externalUrl))
        add("external_url", "https://로 시작하는 올바른 참여 링크를 2000자 이하로 입력해 주세요.");
      if (changed("externalDataNotice") && !draft.externalDataNotice.trim())
        add("external_data_notice", "외부 설문 안내를 입력해 주세요.");
      else text("externalDataNotice", "external_data_notice", "외부 설문 안내", 0, 2000);
    }
    if (draft.type === "beta_test") {
      if (changed("betaPlatforms") && !draft.betaPlatforms.length)
        add("beta_platforms", "테스트 플랫폼을 하나 이상 선택해 주세요.");
      // Date-only inputs serialize to start/end of the Korea day, so a same-day test is valid.
      if (changed("betaStartsAt", "betaEndsAt") && (!isPostingDate(draft.betaStartsAt) ||
          !isPostingDate(draft.betaEndsAt) || draft.betaStartsAt > draft.betaEndsAt))
        add("beta_dates", "테스트 시작일과 종료일을 확인해 주세요.");
      text("environment", "beta_test_environment", "필요 기기 또는 환경", 0, 1000);
      text("workflowNote", "beta_test_workflow_note", "테스트 방법", 0, 2000);
    }
  }
  if (step === 4) {
    if (changed("recruitmentLimitMode", "recruitmentCount") && draft.recruitmentLimitMode === "limited" &&
        (!Number.isInteger(Number(draft.recruitmentCount)) || Number(draft.recruitmentCount) < 1 || Number(draft.recruitmentCount) > 999))
      add("recruit_count", "모집 인원은 1명 이상 999명 이하로 입력해 주세요.");
    if (changed("deadlineEnabled", "deadline") && draft.deadlineEnabled && (!isPostingDate(draft.deadline) ||
        Date.parse(`${draft.deadline}T23:59:59.999+09:00`) <= now))
      add("participation_deadline_at", "마감일은 오늘 이후 날짜로 입력해 주세요.");
    if (draft.type === "survey" && !draft.deadlineEnabled)
      add("participation_deadline_at", "설문조사에는 마감일이 필요해요.");
    if (changed("compensations")) {
      if (!draft.compensations.length) add("compensations", "보상을 선택해 주세요.");
      else if (draft.compensations.length > 1 && draft.compensations.some((item) => item.type === "none"))
        add("compensations", "보상 없음은 다른 보상과 함께 설정할 수 없어요.");
      else for (const item of draft.compensations) {
        const validAmount = (value: number | null | undefined) =>
          typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647;
        if (item.type === "cash" && !validAmount(item.amount)) {
          add("compensations", "현금 보상은 1원 이상 2,147,483,647원 이하의 정수로 입력해 주세요."); break;
        }
        if (item.type === "points" && !validAmount(item.points)) {
          add("compensations", "포인트는 1 이상 2,147,483,647 이하의 정수로 입력해 주세요."); break;
        }
        if (!["cash", "points", "none"].includes(item.type) && !item.label?.trim()) {
          add("compensations", "보상 이름을 입력해 주세요."); break;
        }
      }
    }
  }
  return issues;
}

export function getPostingDraftIssue(draft: PostingCreationDraft, baseline?: PostingCreationDraft): PostingFieldIssue | null {
  for (const step of [2, 3, 4] as CreationStep[]) {
    const issue = getPostingStepIssues(step, draft, baseline)[0];
    if (issue) return issue;
  }
  return null;
}
