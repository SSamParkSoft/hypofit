import {
  ClipboardList,
  FlaskConical,
  MessageCircle,
  Microscope,
  MousePointer2,
  Shapes,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  formatCompensationSummary,
  normalizeCompensations,
  postingTypeLabels,
  type PostingType,
} from "@hypofit/contracts";
import type { InterviewPost } from "../../../shared/api/types";
import { cn } from "../../../shared/ui/cn";

const postingTypeIcons: Record<PostingType, LucideIcon> = {
  interview: MessageCircle,
  survey: ClipboardList,
  beta_test: FlaskConical,
  usability_test: MousePointer2,
  research_experiment: Microscope,
  focus_group: UsersRound,
  other: Shapes,
};

function getPostingType(post: InterviewPost): PostingType {
  return post.recruitment_type ?? "interview";
}

export function PostingTypeLabel({
  className,
  post,
}: {
  className?: string;
  post: InterviewPost;
}) {
  const type = getPostingType(post);
  const Icon = postingTypeIcons[type];

  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold leading-5 text-hypo-text-muted", className)}>
      <Icon aria-hidden="true" size={13} strokeWidth={1.9} />
      {postingTypeLabels[type]}
    </span>
  );
}

export function CompensationSummary({
  className,
  post,
}: {
  className?: string;
  post: InterviewPost;
}) {
  return (
    <span className={className}>
      {formatCompensationSummary(normalizeCompensations(post.compensations, post.reward_amount))}
    </span>
  );
}

export function postingPrimaryAction(post: InterviewPost) {
  switch (getPostingType(post)) {
    case "survey":
      return post.external_url ? "설문 참여하기" : "참여하기";
    case "beta_test":
      return "베타테스트 신청하기";
    case "usability_test":
    case "research_experiment":
    case "focus_group":
    case "other":
      return "신청하기";
    default:
      return "인터뷰 신청하기";
  }
}

export function postingParticipationLabel(post: InterviewPost) {
  if (getPostingType(post) === "survey") return "온라인 설문";
  if (getPostingType(post) === "beta_test") return "온라인 테스트";
  return post.interview_mode === "online" ? "온라인" : post.interview_mode === "offline" ? "대면" : "온라인·대면";
}
