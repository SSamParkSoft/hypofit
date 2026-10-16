import { formatCompensationSummary, formatUserDisplayName, normalizeCompensations } from "@hypofit/contracts";
import {
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Flag,
  MapPin,
  MonitorUp,
  UserRound,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { useCreateApplication } from "../features/applications/useApplicationMutations";
import { useApplications } from "../features/applications/useApplications";
import { useAuth } from "../features/auth/useAuth";
import { useChatRooms } from "../features/chat/useChatRooms";
import { OpportunityExpandedDetail } from "../features/interview-posts/components/OpportunityExpandedDetail";
import { PostingImageGallery } from "../features/interview-posts/components/PostingImageGallery";
import {
  interviewModeLabels,
} from "../features/interview-posts/components/interviewPostMeta";
import { usePostingDetail } from "../features/interview-posts/usePostingDetail";
import { getPostingDetailStatus } from "../features/interview-posts/model/postingDetailStatus";
import { postingDetailLocationLabel, postingDurationLabel, postingParticipationLabel } from "../features/interview-posts/components/postingPresentation";
import { useMarkInterviewPostViewed } from "../features/interview-posts/useInterviewPostViews";
import { useSessions } from "../features/sessions/useSessions";
import { formatSessionTime } from "../features/workflow/readModels";
import type { InterviewPost, Session } from "../shared/api/types";
import { navigateTo } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Badge } from "../shared/ui/badge";
import { Button } from "../shared/ui/button";
import { PageFrame, PageHeader } from "../shared/ui/page";
import { EmptyState, ErrorState, LoadingState } from "../shared/ui/state";
import { getSafeExternalUrl } from "../shared/ui/safeExternalUrl";
import { ContextPanel, SplitView } from "../shared/ui/workspace";

interface InterviewDetailPageProps {
  accessToken?: string | null;
  postId: string;
}

export function InterviewDetailPage({ accessToken, postId }: InterviewDetailPageProps) {
  const { appUser } = useAuth();
  const { data: post = null, isError, isLoading } = usePostingDetail(postId);
  const { data: applications = [] } = useApplications(accessToken);
  const { data: chatRooms = [] } = useChatRooms(accessToken);
  const { data: sessions = [] } = useSessions(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const { mutate: markPostViewed } = useMarkInterviewPostViewed(accessToken);
  const viewedPostId = post?.id;
  const shouldOpenApply =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("apply") === "1";
  const existingApplication = post
    ? applications.find((application) =>
        application.interview_post_id === post.id && application.respondent_id === appUser?.id,
      ) ?? null
    : null;
  const confirmedSession = post && (!post.recruitment_type || post.recruitment_type === "interview") &&
    existingApplication?.status === "selected"
    ? sessions.find((session) =>
        session.application_id === existingApplication.id && session.status === "scheduled",
      ) ?? null
    : null;
  const isOwnPost = Boolean(post && appUser && post.founder_id === appUser.id);
  const chatRoomId = post?.recruitment_type !== "survey" && existingApplication?.status === "selected"
    ? chatRooms.find((room) =>
        room.application_id === existingApplication.id &&
        room.interview_post_id === post?.id &&
        (room.status === "open" || room.status === "selected") &&
        !room.is_hidden,
      )?.id ?? null
    : null;

  useEffect(() => {
    if (viewedPostId && accessToken) {
      markPostViewed({ postId: viewedPostId, source: "detail" });
    }
  }, [accessToken, markPostViewed, viewedPostId]);

  return (
    <PageFrame className="gap-6">
      <div className="flex items-start gap-3">
        <BackLink
          ariaLabel="공고 목록으로 돌아가기"
          className="mt-1"
          href="/interviews"
        />
        <div className="min-w-0 flex-1">
          <PageHeader
            action={
              post && isOwnPost ? (
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  onClick={() => navigateTo(`/my-interviews?tab=posts&post=${encodeURIComponent(post.id)}`)}
                >
                  공고 관리
                </Button>
              ) : post ? (
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
            description={isOwnPost ? undefined : "조건과 진행 방식을 확인하고 참여 여부를 결정하세요."}
            title="공고 상세"
          />
        </div>
      </div>

      {isLoading ? <LoadingState title="공고를 불러오는 중입니다." /> : null}

      {isError ? (
        <ErrorState title="공고를 불러오지 못했습니다.">
          API 연결 상태를 확인한 뒤 다시 시도하세요.
        </ErrorState>
      ) : null}

      {!isLoading && !isError && !post ? (
        <EmptyState title="공고를 찾을 수 없어요.">
          모집글이 마감되었거나 삭제되었을 수 있어요.
        </EmptyState>
      ) : null}

      {post && isOwnPost ? (
        <div className="w-full max-w-4xl">
          <InterviewDetailArticle confirmedSession={null} isOwner post={post} />
        </div>
      ) : post ? (
        <>
          <div className="grid gap-4 min-[1200px]:hidden">
            <InterviewDetailArticle confirmedSession={confirmedSession} post={post} />
            <OpportunityExpandedDetail
              canApply={Boolean(accessToken)}
              chatRoomId={chatRoomId}
              className="rounded-hypo-lg border border-hypo-border bg-hypo-surface px-4 py-4 shadow-hypo-panel sm:px-5"
              errorMessage={
                createApplication.error instanceof Error ? createApplication.error.message : null
              }
              existingApplication={existingApplication}
              initialApplyOpen={shouldOpenApply}
              isApplying={createApplication.isPending}
              post={post}
              showOverview={false}
              showScheduleOptions={!confirmedSession}
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
                  <div className="grid gap-4 rounded-hypo-lg border border-hypo-border bg-hypo-surface px-5 py-5 shadow-hypo-panel">
                    <div>
                      <p className="text-xs font-semibold leading-[18px] text-hypo-text-soft">
                        {existingApplication ? "현재 신청 상태" : "이 공고에 참여하기"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-hypo-text-muted">
                        {post.recruitment_type && post.recruitment_type !== "interview"
                          ? "신청 상태와 공고의 참여 안내를 확인하세요."
                          : existingApplication
                          ? confirmedSession
                            ? "확정된 일정과 참여 내용을 확인하세요."
                            : "신청 상태를 확인하고 채팅에서 다음 일정을 조율할 수 있어요."
                          : "관련 경험과 가능한 시간을 남겨 주세요."}
                      </p>
                    </div>
                    <OpportunityExpandedDetail
                      canApply={Boolean(accessToken)}
                      chatRoomId={chatRoomId}
                      className="border-t border-hypo-border pt-4"
                      errorMessage={
                        createApplication.error instanceof Error
                          ? createApplication.error.message
                          : null
                      }
                      existingApplication={existingApplication}
                      initialApplyOpen={shouldOpenApply}
                      isApplying={createApplication.isPending}
                      post={post}
                      showOverview={false}
                      showScheduleOptions={!confirmedSession}
                      showDetailButton={false}
                      onApply={(input) => {
                        createApplication.mutate(input);
                      }}
                    />
                  </div>
                </ContextPanel>
              }
              list={<InterviewDetailArticle confirmedSession={confirmedSession} post={post} />}
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

function InterviewDetailArticle({ confirmedSession, isOwner = false, post }: { confirmedSession: Session | null; isOwner?: boolean; post: InterviewPost }) {
  const founderLabel = formatUserDisplayName(post.founder, "모집자 정보 없음");
  const founderReviewSummary = post.founder_review_summary;
  const duration = postingDurationLabel(post);
  const location = postingDetailLocationLabel(post);
  const isBeta = post.recruitment_type === "beta_test";
  const isSurvey = post.recruitment_type === "survey";
  const isInterview = !post.recruitment_type || post.recruitment_type === "interview";
  const mode = isBeta || isSurvey ? postingParticipationLabel(post) : interviewModeLabels[post.interview_mode];
  const meetingUrl = confirmedSession?.meeting_type === "online"
    ? getSafeExternalUrl(confirmedSession.meeting_url)
    : null;

  return (
    <article className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-panel">
      <div className="grid gap-4 border-b border-hypo-border px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge intent="info">{mode}</Badge>
          <Badge intent="neutral">{getPostingDetailStatus(post) === "open" ? "모집 중" : "마감"}</Badge>
        </div>

        <div className="grid gap-2">
          <h2 className="text-[22px] font-bold leading-8 text-hypo-text">{post.title}</h2>
        </div>
      </div>

      {isOwner && post.images?.length ? (
        <div className="border-b border-hypo-border px-4 py-5 sm:px-6 sm:py-6">
          <PostingImageGallery postId={post.id} />
        </div>
      ) : null}

      {confirmedSession ? <DetailSection title="확정된 일정">
        <div className="grid gap-1 text-sm text-hypo-text">
          <time className="font-semibold" dateTime={confirmedSession.scheduled_at}>
            {formatSessionTime(confirmedSession.scheduled_at)}
          </time>
          <p>{confirmedSession.meeting_type === "online" ? "화상" : "대면"}</p>
          {confirmedSession.meeting_type === "offline" && confirmedSession.place ? (
            <p>{confirmedSession.place}</p>
          ) : null}
          {meetingUrl ? <a className="font-medium text-hypo-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            href={meetingUrl} rel="noopener noreferrer" target="_blank">화상 링크 열기</a> : null}
        </div>
      </DetailSection> : null}

      <DetailSection title="서비스 설명">{post.service_summary}</DetailSection>
      <DetailSection title="찾는 응답자">{post.target_description}</DetailSection>

      <DetailSection title="진행 정보">
        <dl className="grid border-y border-hypo-border sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r">
          <DetailFact
            icon={<MonitorUp size={15} />}
            label={isBeta ? "테스트 플랫폼" : "진행 방식"}
            value={mode}
          />
          {duration ? <DetailFact icon={<Clock3 size={15} />} label={isBeta ? "예상 참여 기간" : "예상 시간"} value={duration} /> : null}
          {location ? <DetailFact
            icon={<MapPin size={15} />}
            label="장소"
            value={location}
          /> : null}
          {isSurvey && post.participation_deadline_at ? <DetailFact
            icon={<CalendarDays size={15} />}
            label="참여 마감"
            value={<time dateTime={post.participation_deadline_at}>{new Date(post.participation_deadline_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</time>}
          /> : null}
          <DetailFact
            icon={<CircleDollarSign size={15} />}
            label="보상"
            value={formatCompensationSummary(normalizeCompensations(post.compensations, post.reward_amount))}
          />
        </dl>
      </DetailSection>

      {isInterview && !confirmedSession ? <DetailSection title="가능한 일정">
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
      </DetailSection> : null}

      {!isOwner ? <DetailSection title="모집자 정보">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="grid gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-hypo-text">
              <UserRound className="text-hypo-brand" size={16} />
              {founderLabel}
            </div>
            <p className="text-sm leading-6 text-hypo-text-muted">{confirmedSession ? "확정된 일정은 위에서 확인할 수 있어요." : isInterview ? "신청 후 채팅에서 세부 일정을 조율해요." : "참여에 필요한 세부 내용은 모집자가 안내해요."}</p>
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
      </DetailSection> : null}
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
      <h3 className="text-sm font-bold leading-5 text-hypo-text">{title}</h3>
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
  value: ReactNode;
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
