import { CalendarDays, CircleDollarSign, MonitorUp, UsersRound } from "lucide-react";

import { ApplicantReviewCard } from "../../applications/components/ApplicantReviewCard";
import type { CreateSessionInput } from "../../../shared/api/sessions";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { InterviewPostStatusBadge } from "../../../shared/ui/status-badge";
import { interviewModeLabels } from "./interviewPostMeta";
import { CompensationSummary, postingDurationLabel, postingParticipationLabel } from "./postingPresentation";

interface FounderPostCardProps {
  applications: Application[];
  isCreatingSession?: boolean;
  isUpdatingApplication?: boolean;
  sessionErrorMessage?: string | null;
  surfaceMode?: "panel" | "plain";
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
  surfaceMode = "panel",
}: FounderPostCardProps) {
  const selectedCount = applications.filter((application) => application.status === "selected").length;
  const isPostActionable = post.status === "open";
  const isPlain = surfaceMode === "plain";
  const duration = postingDurationLabel(post);
  const mode = post.recruitment_type === "beta_test" ? postingParticipationLabel(post) : interviewModeLabels[post.interview_mode];

  return (
    <article
      className={
        isPlain
          ? "grid gap-4"
          : "rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-panel"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InterviewPostStatusBadge status={post.status} />
            <Badge intent="info">{mode}</Badge>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-hypo-text">{post.title}</h3>
          <p className="mt-1 text-sm leading-6 text-hypo-text-muted">{post.target_description}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-hypo-text-muted sm:grid-cols-4">
        <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-hypo-reward">
          <CircleDollarSign size={15} />
          <CompensationSummary post={post} />
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MonitorUp size={15} />
          {mode}
        </span>
        {duration ? <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          {duration}
        </span> : null}
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={15} />
          지원 {applications.length}명 · 선정 {selectedCount}명
        </span>
      </div>

      {applications.length ? (
        <div className="mt-4 grid gap-3 border-t border-hypo-border pt-4">
          {!isPostActionable ? (
            <p className="rounded-hypo-lg border border-hypo-border bg-hypo-bg px-3 py-2 text-xs font-medium text-hypo-text-muted">
              마감된 모집글은 지원자 상태 변경과 일정 생성을 할 수 없습니다.
            </p>
          ) : null}
          {applications.map((application) => (
            <ApplicantReviewCard
              key={application.id}
              application={application}
              disabled={!isPostActionable}
              isCreatingSession={isCreatingSession}
              isUpdating={isUpdatingApplication}
              sessionErrorMessage={sessionErrorMessage}
              supportsInterviewSession={!post.recruitment_type || post.recruitment_type === "interview"}
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
