import type {
  Compensation,
  CreateInterviewPostInput,
} from "@hypofit/contracts";
import type {
  DurationUnit,
  PostingCreationDraft,
} from "./postingCreationDraft";

export function serializePostingCreationDraft(
  draft: PostingCreationDraft,
): CreateInterviewPostInput {
  const durationMinutes = durationToMinutes(
    draft.durationValue,
    draft.durationUnit,
  );
  const scheduleOptions =
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
    compensations: draft.compensations,
    reward_amount: legacyRewardAmount(draft.compensations),
    duration_minutes: durationMinutes,
    recruit_count:
      draft.recruitmentLimitMode === "limited"
        ? Number(draft.recruitmentCount)
        : 0,
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
    external_provider: isSurvey ? draft.externalProvider : null,
    external_url: isSurvey ? draft.externalUrl.trim() : null,
    participation_deadline_at:
      isSurvey && draft.deadlineEnabled ? toDeadlineIso(draft.deadline) : null,
    external_data_notice: isSurvey ? draft.externalDataNotice.trim() : null,
    beta_test_platforms: isBeta ? draft.betaPlatforms : null,
    beta_test_starts_at: isBeta ? toStartIso(draft.betaStartsAt) : null,
    beta_test_ends_at: isBeta ? toDeadlineIso(draft.betaEndsAt) : null,
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
  return date ? `${date}T00:00:00.000Z` : null;
}

function toDeadlineIso(date: string): string | null {
  return date ? `${date}T23:59:59.999Z` : null;
}
