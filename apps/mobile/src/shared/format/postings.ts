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
  return post.duration_minutes > 0 ? `${post.duration_minutes}분` : null;
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
