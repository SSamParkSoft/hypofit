import { formatUserDisplayName } from "@hypofit/contracts";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Flag,
  MapPin,
  MonitorUp,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";

import { useCreateApplication } from "../features/applications/useApplicationMutations";
import { useApplications } from "../features/applications/useApplications";
import { useAuth } from "../features/auth/useAuth";
import { OpportunityExpandedDetail } from "../features/interview-posts/components/OpportunityExpandedDetail";
import {
  formatReward,
  interviewModeLabels,
} from "../features/interview-posts/components/interviewPostMeta";
import { useInterviewPosts } from "../features/interview-posts/useInterviewPosts";
import { useMarkInterviewPostViewed } from "../features/interview-posts/useInterviewPostViews";
import type { InterviewPost } from "../shared/api/types";
import { navigateTo } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Badge } from "../shared/ui/badge";
import { Button } from "../shared/ui/button";
import { PageFrame, PageHeader } from "../shared/ui/page";
import { EmptyState, ErrorState, LoadingState } from "../shared/ui/state";
import { ContextPanel, SplitView } from "../shared/ui/workspace";

interface InterviewDetailPageProps {
  accessToken?: string | null;
  postId: string;
}

export function InterviewDetailPage({ accessToken, postId }: InterviewDetailPageProps) {
  const { appUser } = useAuth();
  const { data: posts = [], isError, isLoading } = useInterviewPosts();
  const { data: applications = [] } = useApplications(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);
  const post = useMemo<InterviewPost | null>(
    () => posts.find((interviewPost) => interviewPost.id === postId) ?? null,
    [postId, posts],
  );
  const shouldOpenApply =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("apply") === "1";
  const existingApplication = post
    ? applications.find((application) => application.interview_post_id === post.id) ?? null
    : null;
  const isOwnPost = Boolean(post && appUser && post.founder_id === appUser.id);

  useEffect(() => {
    if (post && accessToken) {
      markPostViewed.mutate({ postId: post.id, source: "detail" });
    }
  }, [accessToken, markPostViewed, post]);

  return (
    <PageFrame className="gap-6">
      <div className="flex items-start gap-3">
        <BackLink
          ariaLabel="인터뷰 목록으로 돌아가기"
          className="mt-1"
          href="/interviews"
        />
        <div className="min-w-0 flex-1">
          <PageHeader
            action={
              post && !isOwnPost ? (
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="ghost"
                  onClick={() => reportInterviewPost(post)}
                >
                  <Flag size={16} />
                  신고하기
                </Button>
              ) : undefined
            }
            description="조건과 진행 방식을 확인하고 참여 여부를 결정하세요."
            title="인터뷰 상세"
          />
        </div>
      </div>

      {isLoading ? <LoadingState title="인터뷰를 불러오는 중입니다." /> : null}

      {isError ? (
        <ErrorState title="인터뷰를 불러오지 못했습니다.">
          API 연결 상태를 확인한 뒤 다시 시도하세요.
        </ErrorState>
      ) : null}

      {!isLoading && !isError && !post ? (
        <EmptyState title="인터뷰를 찾을 수 없어요.">
          모집글이 마감되었거나 삭제되었을 수 있어요.
        </EmptyState>
      ) : null}

      {post ? (
        <>
          <div className="grid gap-4 min-[1200px]:hidden">
            <InterviewDetailArticle post={post} />
            <OpportunityExpandedDetail
              canApply={Boolean(accessToken)}
              className="border-y border-hypo-border bg-transparent sm:border-x-0"
              errorMessage={
                createApplication.error instanceof Error ? createApplication.error.message : null
              }
              existingApplication={existingApplication}
              initialApplyOpen={shouldOpenApply}
              isApplying={createApplication.isPending}
              post={post}
              showDetailButton={false}
              onApply={(input) => {
                createApplication.mutate(input);
              }}
            />
          </div>

          <div className="hidden min-[1200px]:block">
            <SplitView
              detail={
                <ContextPanel className="border-none bg-transparent shadow-none">
                  <div className="grid gap-4 border-t border-hypo-border pt-4">
                    <div>
                      <p className="text-xs font-semibold leading-[18px] text-hypo-text-soft">
                        {existingApplication ? "현재 신청 상태" : "이 인터뷰에 참여하기"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-hypo-text-muted">
                        {existingApplication
                          ? "신청 상태를 확인하고 채팅에서 다음 일정을 조율할 수 있어요."
                          : "관련 경험과 가능한 시간을 남겨 주세요."}
                      </p>
                    </div>
                    <OpportunityExpandedDetail
                      canApply={Boolean(accessToken)}
                      className="border-none bg-transparent p-0"
                      errorMessage={
                        createApplication.error instanceof Error
                          ? createApplication.error.message
                          : null
                      }
                      existingApplication={existingApplication}
                      initialApplyOpen={shouldOpenApply}
                      isApplying={createApplication.isPending}
                      post={post}
                      showDetailButton={false}
                      onApply={(input) => {
                        createApplication.mutate(input);
                      }}
                    />
                  </div>
                </ContextPanel>
              }
              list={<InterviewDetailArticle post={post} />}
            />
          </div>
        </>
      ) : null}
    </PageFrame>
  );
}

function reportInterviewPost(post: InterviewPost) {
  const params = new URLSearchParams({
    target_type: "interview_post",
    target_id: post.id,
    interview_title: post.title,
    category: "interview_post",
  });
  navigateTo(`/report?${params.toString()}`);
}

function InterviewDetailArticle({ post }: { post: InterviewPost }) {
  const founderLabel = formatUserDisplayName(post.founder, "모집자 정보 없음");
  const founderReviewSummary = post.founder_review_summary;

  return (
    <article className="overflow-hidden border-y border-hypo-border bg-hypo-surface sm:border-x">
      <div className="grid gap-4 border-b border-hypo-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="info">{interviewModeLabels[post.interview_mode]}</Badge>
          <Badge intent="neutral">{post.status === "open" ? "모집 중" : "마감"}</Badge>
        </div>

        <div className="grid gap-2">
          <h1 className="text-2xl font-bold leading-8 text-hypo-text">{post.title}</h1>
        </div>
      </div>

      <DetailSection title="서비스 설명">{post.service_summary}</DetailSection>
      <DetailSection title="찾는 응답자">{post.target_description}</DetailSection>

      <DetailSection title="진행 정보">
        <dl className="grid border-y border-hypo-border sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r">
          <DetailFact
            icon={<MonitorUp size={15} />}
            label="진행 방식"
            value={interviewModeLabels[post.interview_mode]}
          />
          <DetailFact icon={<Clock3 size={15} />} label="예상 시간" value={`${post.duration_minutes}분`} />
          <DetailFact
            icon={<MapPin size={15} />}
            label="장소"
            value={post.location || "세부 장소는 모집자와 협의해요."}
          />
          <DetailFact
            icon={<CircleDollarSign size={15} />}
            label="사례비"
            value={formatReward(post.reward_amount)}
          />
        </dl>
      </DetailSection>

      <DetailSection title="가능한 일정">
        {post.schedule_options.length ? (
          <ul className="divide-y divide-hypo-border border-y border-hypo-border">
            {post.schedule_options.map((option) => (
              <li
                key={option}
                className="flex items-start gap-2 py-3 text-sm leading-6 text-hypo-text"
              >
                <CalendarDays className="mt-0.5 shrink-0 text-hypo-brand" size={15} />
                <span>{option}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-hypo-text-muted">
            일정은 신청 후 채팅에서 모집자와 조율해요.
          </p>
        )}
      </DetailSection>

      <DetailSection title="모집자 정보">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="grid gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-hypo-text">
              <UserRound className="text-hypo-brand" size={16} />
              {founderLabel}
            </div>
            <p className="text-sm leading-6 text-hypo-text-muted">신청 후 채팅에서 세부 일정을 조율해요.</p>
          </div>

          {founderReviewSummary?.review_count ? (
            <div className="text-sm font-medium leading-6 text-hypo-text-muted">
              후기 {founderReviewSummary.review_count}건
              {typeof founderReviewSummary.average_rating === "number"
                ? ` · 평균 ${founderReviewSummary.average_rating.toFixed(1)}점`
                : ""}
            </div>
          ) : null}
        </div>
      </DetailSection>
    </article>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-b border-hypo-border px-4 py-5 last:border-b-0 sm:px-6 sm:py-6">
      <h2 className="text-sm font-bold leading-5 text-hypo-text">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-hypo-text-muted">{children}</div>
    </section>
  );
}

function DetailFact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-hypo-border px-3 py-3 last:border-b-0 sm:px-4 sm:py-4">
      <dt className="inline-flex items-center gap-1.5 text-xs font-medium leading-[18px] text-hypo-text-soft">
        <span className="text-hypo-brand">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-hypo-text">{value}</dd>
    </div>
  );
}
