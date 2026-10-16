import { CalendarDays, Target } from "lucide-react";
import { SurveyParticipationPanel } from "./SurveyParticipationPanel";
import { PostingImageGallery } from "./PostingImageGallery";
import { getPostingDetailStatus } from "../model/postingDetailStatus";

import { ApplicationForm, useApplicationFormController } from "../../applications/ui";
import type { CreateApplicationInput } from "../../../shared/api/applications";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { navigateTo, navigateToInterviewDetail } from "../../../shared/navigation/appNavigation";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { ApplicationStatusBadge } from "../../../shared/ui/status-badge";

interface OpportunityExpandedDetailProps {
  canApply: boolean;
  chatRoomId?: string | null;
  className?: string;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  initialApplyOpen?: boolean;
  isApplying?: boolean;
  isOwner?: boolean;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
  appliedStatusMode?: "summary" | "minimal";
  showDetailButton?: boolean;
  showImages?: boolean;
  showOverview?: boolean;
  showScheduleOptions?: boolean;
}

export function OpportunityExpandedDetail({
  canApply,
  chatRoomId,
  className,
  errorMessage,
  existingApplication,
  initialApplyOpen = false,
  isApplying,
  isOwner = false,
  onApply,
  post,
  appliedStatusMode = "summary",
  showDetailButton = true,
  showImages = true,
  showOverview = true,
  showScheduleOptions = true,
}: OpportunityExpandedDetailProps) {
  const applicationForm = useApplicationFormController({
    initialOpen: initialApplyOpen,
    interviewPostId: post.id,
    onApply,
  });
  const hasApplied = Boolean(existingApplication);
  const status = getPostingDetailStatus(post);
  const canSubmit = canApply && status === "open" && !hasApplied;
  const chatRoomPath = chatRoomId && existingApplication?.status === "selected" && post.recruitment_type !== "survey"
    ? `/chat?room=${encodeURIComponent(chatRoomId)}`
    : null;
  const showImageGallery = showImages && Boolean(post.cover_image || post.images?.length);

  return (
    <section className={cn("grid gap-4", className)}>
      {(showOverview || showImageGallery) ? <div className="grid gap-3">
        {showOverview ? <p className="text-sm leading-6 text-hypo-text-muted">{post.service_summary}</p> : null}
        {showImageGallery ? <PostingImageGallery postId={post.id} /> : null}

        {showOverview ? <div className="grid gap-2">
          <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold text-hypo-text">
            <Target className="text-hypo-brand" size={14} />
            찾는 응답자
          </h4>
          <p className="text-sm leading-6 text-hypo-text-muted">{post.target_description}</p>
        </div> : null}
      </div> : null}

      {showScheduleOptions && (!post.recruitment_type || post.recruitment_type === "interview") && <div className="grid gap-2 border-t border-hypo-border pt-4">
        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold text-hypo-text">
          <CalendarDays className="text-hypo-brand" size={14} />
          가능 시간
        </h4>
        {post.schedule_options.length ? (
          <ul className="divide-y divide-hypo-border rounded-hypo-lg border border-hypo-border bg-hypo-bg">
            {post.schedule_options.map((option) => (
              <li key={option} className="px-3 py-2 text-sm leading-6 text-hypo-text">
                {option}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-hypo-text-muted">신청 후 모집자와 일정을 조율해요.</p>
        )}
      </div>}

      {isOwner ? (
        <div className={cn("grid gap-2", showDetailButton && "grid-cols-2")}>
          {showDetailButton ? (
            <Button size="sm" variant="secondary" onClick={() => navigateToInterviewDetail(post.id)}>
              상세보기
            </Button>
          ) : null}
          <Button size="sm" onClick={() => navigateTo(`/my-interviews?tab=posts&post=${encodeURIComponent(post.id)}`)}>
            공고 관리
          </Button>
        </div>
      ) : post.recruitment_type === "survey" && (post.entry_mode === "direct" || existingApplication?.status === "selected") ? (
        <SurveyParticipationPanel key={post.id} post={post} />
      ) : hasApplied && appliedStatusMode === "minimal" ? (
        <div className="rounded-hypo-lg border border-hypo-border bg-hypo-bg px-4 py-3 text-sm font-semibold text-hypo-text">
          신청 내역
        </div>
      ) : hasApplied ? (
        <div className={cn("grid gap-3", showOverview && "border-t border-hypo-border pt-4")}>
          <div className="rounded-hypo-lg border border-hypo-border bg-hypo-bg px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <strong className="block text-sm font-semibold text-hypo-text">신청 내역</strong>
                <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
                  내 참여에서 현재 신청 상태를 확인하세요.
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
            <Button size="sm" variant="tonal" onClick={() => navigateTo(chatRoomPath ?? "/my-interviews")}>
              {chatRoomPath ? "채팅 보기" : "내 참여 보기"}
            </Button>
          </div>
        </div>
      ) : !applicationForm.isOpen ? (
        <div className={cn("grid gap-2", showOverview && "border-t border-hypo-border pt-4", showDetailButton && "grid-cols-[0.9fr_1.1fr]")}>
          {showDetailButton ? (
            <Button size="sm" variant="secondary" onClick={() => navigateToInterviewDetail(post.id)}>
              상세보기
            </Button>
          ) : null}
          <Button
            disabled={!canApply || status !== "open"}
            size="sm"
            onClick={applicationForm.open}
          >
            {post.recruitment_type === "survey" && status !== "open" ? "모집 종료" : canApply ? "신청하기" : "로그인 후 신청"}
          </Button>
        </div>
      ) : (
        <ApplicationForm
          actionsClassName="justify-end"
          availableTimes={applicationForm.availableTimes}
          availableTimesPlaceholder="예: 평일 20시 이후"
          buttonSize="sm"
          cancelLabel="접기"
          className={cn(showOverview && "border-t border-hypo-border pt-4")}
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
