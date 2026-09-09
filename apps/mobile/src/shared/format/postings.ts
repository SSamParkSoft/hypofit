import {
  formatCompensationSummary,
  interviewModeLabels,
  normalizeCompensations,
  postingTypeLabels,
  type InterviewPost,
} from "@hypofit/contracts";

export function getPostingTypeLabel(post: InterviewPost) {
  return postingTypeLabels[post.recruitment_type ?? "interview"];
}

export function getPostingCompensationLabel(post: InterviewPost) {
  return formatCompensationSummary(normalizeCompensations(post.compensations, post.reward_amount));
}

export function getPostingModeLabel(post: InterviewPost) {
  if (post.recruitment_type === "survey") {
    return "외부 설문";
  }

  if (post.recruitment_type === "beta_test") {
    return post.beta_test_platforms?.join(" · ") || "베타테스트";
  }

  return interviewModeLabels[post.interview_mode];
}

export function getPostingPlaceOrSchedule(post: InterviewPost) {
  return (
    post.location_place_name ??
    post.location_text ??
    post.location_address ??
    post.location ??
    post.schedule_options[0] ??
    (post.interview_mode === "online" ? "온라인" : "일정 협의")
  );
}

export function getPostingDurationLabel(post: InterviewPost) {
  if (post.duration_value && post.duration_unit) {
    const unitLabel = {
      minutes: "분",
      hours: "시간",
      days: "일",
      weeks: "주",
    }[post.duration_unit];
    return `${post.duration_value}${unitLabel}`;
  }

  if (post.recruitment_type === "beta_test") {
    const periodDays = getBetaTestPeriodDays(
      post.beta_test_starts_at,
      post.beta_test_ends_at,
    );
    if (periodDays) return `${periodDays}일`;
  }

  return post.duration_minutes > 0 ? `${post.duration_minutes}분` : null;
}

export function getPostingScheduleLabel(post: InterviewPost) {
  if (post.schedule_mode === "negotiated") return "선정 후 일정 조율";
  if (post.schedule_mode === "fixed" && post.schedule_fixed_slots?.length) {
    return post.schedule_fixed_slots.join(" · ");
  }
  if (post.schedule_mode === "recurring" && post.schedule_recurring_windows?.length) {
    return post.schedule_recurring_windows.join(" · ");
  }
  return post.schedule_note?.trim() || post.schedule_options[0] || "모집자와 협의";
}

export function getPostingRecruitmentLimitLabel(post: InterviewPost) {
  return post.recruitment_limit_mode === "unlimited"
    ? "인원 제한 없음"
    : `${post.recruit_count}명`;
}

function getBetaTestPeriodDays(
  startsAt?: string | null,
  endsAt?: string | null,
) {
  if (!startsAt || !endsAt) return null;

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

export function getPostingDeadlineLabel(post: InterviewPost) {
  if (!post.participation_deadline_at) {
    return null;
  }

  return `${new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(post.participation_deadline_at))} 마감`;
}

export function getPostingListMetadata(post: InterviewPost) {
  const duration = getPostingDurationLabel(post);
  const context =
    post.recruitment_type === "survey"
      ? getPostingDeadlineLabel(post) ?? "온라인"
      : getPostingPlaceOrSchedule(post);

  return [duration, context].filter(Boolean).join(" · ");
}
