import { CalendarDays, CircleDollarSign, MapPin, MonitorUp, Target } from "lucide-react";
import { type ReactNode } from "react";

import { ApplicationForm, useApplicationFormController } from "../../applications/ui";
import type { CreateApplicationInput } from "../../../shared/api/applications";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { ApplicationStatusBadge, InterviewPostStatusBadge } from "../../../shared/ui/status-badge";
import { formatReward, interviewModeLabels } from "./interviewPostMeta";

interface OpportunityDetailPanelProps {
  canApply: boolean;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  isApplying?: boolean;
  onApply?: (input: CreateApplicationInput) => void;
  post: InterviewPost | null;
}

export function OpportunityDetailPanel({
  canApply,
  errorMessage,
  existingApplication,
  isApplying,
  onApply,
  post,
}: OpportunityDetailPanelProps) {
  const applicationForm = useApplicationFormController({
    interviewPostId: post?.id ?? "",
    onApply: (input) => onApply?.(input),
  });

  if (!post) {
    return (
      <aside className="flex min-h-[300px] items-center justify-center px-5 py-10 text-center text-sm leading-6 text-hypo-text-muted">
        목록에서 모집글을 선택하면 조건과 신청 흐름을 오른쪽에서 바로 이어서 볼 수 있어요.
      </aside>
    );
  }

  return (
    <aside className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-panel">
      <div className="grid gap-5 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <InterviewPostStatusBadge status={post.status} />
          <Badge intent="info">{interviewModeLabels[post.interview_mode]}</Badge>
        </div>

        <div className="grid gap-2">
          <h2 className="text-2xl font-bold leading-8 text-hypo-text">{post.title}</h2>
          <p className="text-sm leading-6 text-hypo-text-muted">{post.service_summary}</p>
        </div>
      </div>

      <div className="divide-y divide-hypo-border">
        <section className="grid gap-3 px-5 py-4">
          <DetailMeta icon={<CircleDollarSign size={17} />} label="사례비">
            <strong className="tabular-nums text-hypo-reward">{formatReward(post.reward_amount)}</strong>
          </DetailMeta>
          <DetailMeta icon={<CalendarDays size={17} />} label="예상 시간">
            <span className="tabular-nums">{post.duration_minutes}분</span>
          </DetailMeta>
          <DetailMeta icon={<MonitorUp size={17} />} label="진행 방식">
            {interviewModeLabels[post.interview_mode]}
          </DetailMeta>
          <DetailMeta icon={<MapPin size={17} />} label="장소">
            {post.location ?? "온라인 또는 추후 안내"}
          </DetailMeta>
        </section>

        <section className="grid gap-3 px-5 py-4">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-hypo-text">
            <Target className="text-hypo-brand" size={17} />
            찾는 응답자
          </h3>
          <p className="text-sm leading-6 text-hypo-text-muted">{post.target_description}</p>
        </section>

        <section className="grid gap-3 px-5 py-4">
          <h3 className="text-sm font-semibold text-hypo-text">가능 시간</h3>
          <div className="flex flex-wrap gap-2">
            {post.schedule_options.length ? (
              post.schedule_options.map((option) => (
                <Badge key={option} intent="neutral">
                  {option}
                </Badge>
              ))
            ) : (
              <span className="text-sm leading-6 text-hypo-text-muted">신청 후 모집자와 일정을 조율해요.</span>
            )}
          </div>
        </section>

        <section className="grid gap-4 px-5 py-5">
          {existingApplication ? (
            <div className="rounded-hypo-md bg-hypo-brand-soft px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block text-sm font-semibold text-hypo-brand">신청을 보냈어요</strong>
                  <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
                    내 인터뷰에서 진행 상태를 확인하고 다음 조율을 이어갈 수 있어요.
                  </p>
                </div>
                <ApplicationStatusBadge status={existingApplication.status} />
              </div>
            </div>
          ) : !applicationForm.isOpen ? (
            <Button
              disabled={!canApply || post.status !== "open"}
              onClick={applicationForm.open}
            >
              {canApply ? "신청하기" : "로그인 후 신청"}
            </Button>
          ) : (
            <ApplicationForm
              availableTimes={applicationForm.availableTimes}
              availableTimesPlaceholder={"예: 평일 20시 이후\n토요일 오전"}
              cancelLabel="취소"
              errorMessage={errorMessage}
              errors={applicationForm.errors}
              experienceAnswer={applicationForm.experienceAnswer}
              experiencePlaceholder="이 인터뷰 조건과 맞는 경험을 구체적으로 적어주세요."
              isApplying={isApplying}
              onAvailableTimesChange={applicationForm.setAvailableTimes}
              onCancel={applicationForm.close}
              onExperienceAnswerChange={applicationForm.setExperienceAnswer}
              onSubmit={applicationForm.submit}
              submitDisabled={!canApply || post.status !== "open"}
              submitLabel="신청 제출"
            />
          )}

          <p className="text-xs leading-5 text-hypo-text-soft">
            완료 확인 후 사례비 지급 방식은 모집자가 안내합니다. 자동 결제나 에스크로는 아직 제공하지 않습니다.
          </p>
        </section>
      </div>
    </aside>
  );
}

function DetailMeta({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[22px_72px_minmax(0,1fr)] items-center gap-3 text-sm">
      <span className="text-hypo-brand">{icon}</span>
      <span className="font-semibold text-hypo-text-muted">{label}</span>
      <span className="min-w-0 text-hypo-text">{children}</span>
    </div>
  );
}
