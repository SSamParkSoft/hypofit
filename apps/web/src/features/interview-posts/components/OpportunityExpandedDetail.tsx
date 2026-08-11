import { CalendarDays, Target } from "lucide-react";

import { ApplicationForm, useApplicationFormController } from "../../applications/ui";
import type { CreateApplicationInput } from "../../../shared/api/applications";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { navigateTo, navigateToInterviewDetail } from "../../../shared/navigation/appNavigation";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { ApplicationStatusBadge } from "../../../shared/ui/status-badge";

interface OpportunityExpandedDetailProps {
  canApply: boolean;
  className?: string;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  initialApplyOpen?: boolean;
  isApplying?: boolean;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
  appliedStatusMode?: "summary" | "minimal";
  showDetailButton?: boolean;
}

export function OpportunityExpandedDetail({
  canApply,
  className,
  errorMessage,
  existingApplication,
  initialApplyOpen = false,
  isApplying,
  onApply,
  post,
  appliedStatusMode = "summary",
  showDetailButton = true,
}: OpportunityExpandedDetailProps) {
  const applicationForm = useApplicationFormController({
    initialOpen: initialApplyOpen,
    interviewPostId: post.id,
    onApply,
  });
  const hasApplied = Boolean(existingApplication);
  const canSubmit = canApply && post.status === "open" && !hasApplied;

  return (
    <section className={cn("grid gap-4 rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4", className)}>
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-hypo-text-muted">{post.service_summary}</p>

        <div className="grid gap-2">
          <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold text-hypo-text">
            <Target className="text-hypo-brand" size={14} />
            찾는 응답자
          </h4>
          <p className="text-sm leading-6 text-hypo-text-muted">{post.target_description}</p>
        </div>
      </div>

      <div className="grid gap-2 border-t border-hypo-border pt-4">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold text-hypo-text">
          <CalendarDays className="text-hypo-brand" size={14} />
          가능 시간
        </h4>
        {post.schedule_options.length ? (
          <div className="flex flex-wrap gap-2">
            {post.schedule_options.map((option) => (
              <Badge key={option} intent="neutral">
                {option}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-hypo-text-muted">신청 후 모집자와 일정을 조율해요.</p>
        )}
      </div>

      {hasApplied && appliedStatusMode === "minimal" ? (
        <div className="rounded-hypo-md bg-hypo-brand-soft px-4 py-3 text-sm font-semibold text-hypo-brand">
          신청을 보냈어요
        </div>
      ) : hasApplied ? (
        <div className="grid gap-3 border-t border-hypo-border pt-4">
          <div className="rounded-hypo-md bg-hypo-brand-soft px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm font-semibold text-hypo-brand">신청을 보냈어요</strong>
                <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
                  이후 조율은 내 인터뷰나 채팅에서 이어갈 수 있어요.
                </p>
              </div>
              {existingApplication ? <ApplicationStatusBadge status={existingApplication.status} /> : null}
            </div>
          </div>

          <div className={cn("grid gap-2", showDetailButton && "grid-cols-[0.9fr_1.1fr]")}>
            {showDetailButton ? (
              <Button size="sm" variant="secondary" onClick={() => navigateToInterviewDetail(post.id)}>
                상세보기
              </Button>
            ) : null}
            <Button size="sm" variant="tonal" onClick={() => navigateTo("/my-interviews")}>
              내 인터뷰 보기
            </Button>
          </div>
        </div>
      ) : !applicationForm.isOpen ? (
        <div className={cn("grid gap-2 border-t border-hypo-border pt-4", showDetailButton && "grid-cols-[0.9fr_1.1fr]")}>
          {showDetailButton ? (
            <Button size="sm" variant="secondary" onClick={() => navigateToInterviewDetail(post.id)}>
              상세보기
            </Button>
          ) : null}
          <Button
            disabled={!canApply || post.status !== "open"}
            size="sm"
            onClick={applicationForm.open}
          >
            {canApply ? "신청하기" : "로그인 후 신청"}
          </Button>
        </div>
      ) : (
        <ApplicationForm
          actionsClassName="justify-end"
          availableTimes={applicationForm.availableTimes}
          availableTimesPlaceholder="예: 평일 20시 이후"
          buttonSize="sm"
          cancelLabel="접기"
          className="border-t border-hypo-border pt-4"
          errorMessage={errorMessage}
          errors={applicationForm.errors}
          experienceAnswer={applicationForm.experienceAnswer}
          experiencePlaceholder="조건과 맞는 경험을 적어주세요."
          isApplying={isApplying}
          onAvailableTimesChange={applicationForm.setAvailableTimes}
          onCancel={applicationForm.close}
          onExperienceAnswerChange={applicationForm.setExperienceAnswer}
          onSubmit={applicationForm.submit}
          submitDisabled={!canSubmit}
          submitLabel={canApply ? "신청 제출" : "로그인 필요"}
        />
      )}
    </section>
  );
}
