import { CalendarDays, CircleDollarSign, MonitorUp, UsersRound } from "lucide-react";

import { ApplicantReviewCard } from "../../applications/components/ApplicantReviewCard";
import type { CreateSessionInput } from "../../../shared/api/sessions";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { InterviewPostStatusBadge } from "../../../shared/ui/status-badge";
import { formatReward, interviewModeLabels } from "./interviewPostMeta";

interface FounderPostCardProps {
  applications: Application[];
  isCreatingSession?: boolean;
  isUpdatingApplication?: boolean;
  sessionErrorMessage?: string | null;
  onCreateSession: (input: CreateSessionInput) => void;
  onRejectApplication: (applicationId: string, rejectionReason: string) => void;
  onSelectApplication: (applicationId: string) => void;
  post: InterviewPost;
}

export function FounderPostCard({
  applications,
  isCreatingSession,
  isUpdatingApplication,
  onCreateSession,
  onRejectApplication,
  onSelectApplication,
  post,
  sessionErrorMessage,
}: FounderPostCardProps) {
  const selectedCount = applications.filter((application) => application.status === "selected").length;
  const isPostActionable = post.status === "open";

  return (
    <article className="rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InterviewPostStatusBadge status={post.status} />
            <Badge intent="info">{interviewModeLabels[post.interview_mode]}</Badge>
          </div>
          <h3 className="mt-3 text-base font-black leading-6 text-hypo-text">{post.title}</h3>
          <p className="mt-1 text-sm leading-6 text-hypo-text-muted">{post.target_description}</p>
        </div>
        <Button disabled={!applications.length} size="sm" variant="secondary">
          지원자 {applications.length}명
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-hypo-text-muted sm:grid-cols-4">
        <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-hypo-reward">
          <CircleDollarSign size={15} />
          {formatReward(post.reward_amount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MonitorUp size={15} />
          {interviewModeLabels[post.interview_mode]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          {post.duration_minutes}분
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={15} />
          지원 {applications.length}명 · 선정 {selectedCount}명
        </span>
      </div>

      {applications.length ? (
        <div className="mt-4 grid gap-3 border-t border-hypo-border pt-4">
          {!isPostActionable ? (
            <p className="rounded-hypo-md bg-hypo-surface-muted px-3 py-2 text-xs font-bold text-hypo-text-muted">
              마감된 모집글은 지원자 상태 변경과 일정 생성을 할 수 없습니다.
            </p>
          ) : null}
          {applications.slice(0, 3).map((application) => (
            <ApplicantReviewCard
              key={application.id}
              application={application}
              disabled={!isPostActionable}
              isCreatingSession={isCreatingSession}
              isUpdating={isUpdatingApplication}
              sessionErrorMessage={sessionErrorMessage}
              onCreateSession={onCreateSession}
              onReject={(rejectionReason) => onRejectApplication(application.id, rejectionReason)}
              onSelect={() => onSelectApplication(application.id)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
