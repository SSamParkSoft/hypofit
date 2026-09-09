import type {
  Compensation,
  CreateInterviewPostInput,
  InterviewPost,
  UpdateInterviewPostInput,
} from "@hypofit/contracts";
import type {
  DurationUnit,
  PostingCreationDraft,
} from "./postingCreationDraft";

export function postingToEditDraft(
  post: InterviewPost,
  defaults: PostingCreationDraft,
): PostingCreationDraft {
  return {
    ...defaults,
    type: post.recruitment_type ?? "interview",
    entryMode: post.entry_mode ?? "application_required",
    title: post.title,
    description: post.service_summary,
    targetParticipant: post.target_description,
    interviewMode: post.interview_mode,
    durationValue: String(post.duration_value ?? post.duration_minutes),
    durationUnit: post.duration_unit ?? "minutes",
    scheduleMode: post.schedule_mode ?? "negotiated",
    fixedSlots: [...(post.schedule_fixed_slots ?? [])],
    recurringWindows: [...(post.schedule_recurring_windows ?? [])],
    // Legacy free text is not reclassified as fixed or recurring slots.
    scheduleNote: post.schedule_note ?? (!post.schedule_mode ? post.schedule_options.join("\n") : ""),
    location: post.location_text ?? post.location ?? "",
    locationAddress: post.location_address ?? "",
    locationPlaceName: post.location_place_name ?? "",
    locationLatitude: post.location_latitude,
    locationLongitude: post.location_longitude,
    locationPrecision: post.location_precision ?? "nearby",
    locationSource: post.location_source,
    externalProvider: post.external_provider ?? "google_forms",
    externalUrl: post.external_url ?? "",
    externalDataNotice: post.external_data_notice ?? "",
    betaPlatforms: [...(post.beta_test_platforms ?? [])],
    betaStartsAt: toKoreanDate(post.beta_test_starts_at),
    betaEndsAt: toKoreanDate(post.beta_test_ends_at),
    environment: post.beta_test_environment ?? "",
    workflowNote: post.beta_test_workflow_note ?? "",
    recruitmentLimitMode: post.recruitment_limit_mode ?? (post.recruit_count === 0 ? "unlimited" : "limited"),
    recruitmentCount: String(post.recruit_count),
    deadlineEnabled: Boolean(post.participation_deadline_at),
    deadline: toKoreanDate(post.participation_deadline_at),
    compensations: post.compensations?.length
      ? post.compensations.map((item) => ({ ...item }))
      : post.reward_amount > 0
        ? [{ type: "cash", amount: post.reward_amount, currency: "KRW" }]
        : [{ type: "none" }],
  };
}

export function serializePostingEditDraft(
  draft: PostingCreationDraft,
  baseline: PostingCreationDraft,
): UpdateInterviewPostInput {
  const before = serializePostingCreationDraft(baseline);
  const after = serializePostingCreationDraft(draft);
  const immutable = new Set(["client_submission_id", "status", "recruitment_type", "entry_mode"]);
  const changes = Object.fromEntries(
    Object.entries(after).filter(([key, value]) =>
      !immutable.has(key) && JSON.stringify(value) !== JSON.stringify(before[key as keyof CreateInterviewPostInput]),
    ),
  );
  // Legacy rows may not have either canonical duration field yet.
  if (draft.durationValue !== baseline.durationValue || draft.durationUnit !== baseline.durationUnit) {
    changes.duration_value = after.duration_value;
    changes.duration_unit = after.duration_unit;
    changes.duration_minutes = after.duration_minutes;
  }
  if (draft.recruitmentLimitMode !== baseline.recruitmentLimitMode || draft.recruitmentCount !== baseline.recruitmentCount) {
    changes.recruitment_limit_mode = after.recruitment_limit_mode;
    changes.recruit_count = after.recruit_count;
  }
  return changes;
}

export function serializePostingCreationDraft(
  draft: PostingCreationDraft,
): CreateInterviewPostInput {
  const durationMinutes = durationToMinutes(
    draft.durationValue,
    draft.durationUnit,
  );
  const usesSchedule = draft.type === "interview";
  const scheduleOptions = !usesSchedule ? [] :
    draft.scheduleMode === "fixed"
      ? draft.fixedSlots
      : draft.scheduleMode === "recurring"
        ? draft.recurringWindows
        : [];
  const isSurvey = draft.type === "survey";
  const isBeta = draft.type === "beta_test";

  return {
    client_submission_id: draft.clientSubmissionId,
    recruitment_type: draft.type,
    entry_mode: draft.entryMode,
    title: draft.title.trim(),
    service_summary: draft.description.trim(),
    target_description: draft.targetParticipant.trim(),
    participant_requirements: toParticipantRequirements(draft.targetParticipant),
    compensations: draft.compensations,
    reward_amount: legacyRewardAmount(draft.compensations),
    duration_minutes: durationMinutes,
    duration_value: toDurationValue(draft.durationValue),
    duration_unit: draft.durationUnit,
    recruit_count:
      draft.recruitmentLimitMode === "limited"
        ? Number(draft.recruitmentCount)
        : 0,
    recruitment_limit_mode: draft.recruitmentLimitMode,
    interview_mode: draft.type === "interview" ? draft.interviewMode : "online",
    location: requiresLocation(draft) ? draft.location.trim() || null : null,
    location_text: requiresLocation(draft)
      ? draft.location.trim() || null
      : null,
    location_address: requiresLocation(draft)
      ? draft.locationAddress.trim() || null
      : null,
    location_place_name: requiresLocation(draft)
      ? draft.locationPlaceName.trim() || null
      : null,
    location_latitude: requiresLocation(draft) ? draft.locationLatitude : null,
    location_longitude: requiresLocation(draft)
      ? draft.locationLongitude
      : null,
    location_precision: requiresLocation(draft)
      ? draft.locationPrecision
      : null,
    location_source: requiresLocation(draft) ? draft.locationSource : null,
    schedule_options: scheduleOptions,
    schedule_mode: usesSchedule ? draft.scheduleMode : "none",
    schedule_fixed_slots: usesSchedule ? draft.fixedSlots : [],
    schedule_recurring_windows: usesSchedule ? draft.recurringWindows : [],
    schedule_note: usesSchedule ? draft.scheduleNote.trim() || null : null,
    external_provider: isSurvey ? draft.externalProvider : null,
    external_url: isSurvey ? draft.externalUrl.trim() : null,
    participation_deadline_at:
      draft.deadlineEnabled ? toDeadlineIso(draft.deadline) : null,
    external_data_notice: isSurvey ? draft.externalDataNotice.trim() : null,
    beta_test_platforms: isBeta ? draft.betaPlatforms : null,
    beta_test_starts_at: isBeta ? toStartIso(draft.betaStartsAt) : null,
    beta_test_ends_at: isBeta ? toDeadlineIso(draft.betaEndsAt) : null,
    beta_test_environment: isBeta ? draft.environment.trim() || null : null,
    beta_test_workflow_note: isBeta ? draft.workflowNote.trim() || null : null,
    status: "open",
  };
}

export function durationToMinutes(value: string, unit: DurationUnit): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
  const multiplier =
    unit === "hours"
      ? 60
      : unit === "days"
        ? 24 * 60
        : unit === "weeks"
          ? 7 * 24 * 60
          : 1;
  return Math.round(numberValue * multiplier);
}

function toDurationValue(value: string): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue)
    : null;
}

export function requiresLocation(draft: PostingCreationDraft): boolean {
  if (draft.type === "interview") return draft.interviewMode !== "online";
  return (
    ["research_experiment", "focus_group", "usability_test"].includes(
      draft.type,
    ) && draft.interviewMode !== "online"
  );
}

function legacyRewardAmount(compensations: Compensation[]): number {
  const cash = compensations.find(
    (compensation) => compensation.type === "cash",
  );
  return cash?.amount && cash.amount > 0 ? cash.amount : 0;
}

function toStartIso(date: string): string | null {
  return date ? `${date}T00:00:00.000+09:00` : null;
}

function toDeadlineIso(date: string): string | null {
  return date ? `${date}T23:59:59.999+09:00` : null;
}

function toKoreanDate(value?: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

function toParticipantRequirements(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•·\-✓\s]+/, "").trim())
    .filter(Boolean);
}
