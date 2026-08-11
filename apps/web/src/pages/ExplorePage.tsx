import { useMemo, useState } from "react";

import { useCreateApplication } from "../features/applications/useApplicationMutations";
import { useApplications } from "../features/applications/useApplications";
import { useAuth } from "../features/auth/useAuth";
import { OpportunityCard } from "../features/interview-posts/components/OpportunityCard";
import { OpportunityDetailPanel } from "../features/interview-posts/components/OpportunityDetailPanel";
import { OpportunityExpandedDetail } from "../features/interview-posts/components/OpportunityExpandedDetail";
import { OpportunityListSkeleton } from "../features/interview-posts/components/OpportunityListSkeleton";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "../features/interview-posts/useInterviewPostViews";
import { useInterviewPosts } from "../features/interview-posts/useInterviewPosts";
import type { CreateApplicationInput } from "../shared/api/applications";
import type { Application, InterviewPost } from "../shared/api/types";
import { cn } from "../shared/ui/cn";
import { NotificationButton } from "../shared/ui/notification-button";
import { PageLayout } from "../shared/ui/page";
import { EmptyState, ErrorState } from "../shared/ui/state";
import { ContextPanel, ListSurface, SplitView } from "../shared/ui/workspace";

interface ExplorePageProps {
  canApply: boolean;
}

export function ExplorePage({ canApply }: ExplorePageProps) {
  const { accessToken } = useAuth();
  const { data: interviewPosts = [], isError, isLoading } = useInterviewPosts();
  const { data: applications = [] } = useApplications(accessToken);
  const { data: postViews = [] } = useInterviewPostViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const visiblePosts = useMemo(() => {
    return interviewPosts.filter((post) => post.status === "open");
  }, [interviewPosts]);

  const selectedPost = useMemo<InterviewPost | null>(
    () => visiblePosts.find((post) => post.id === selectedPostId) ?? null,
    [selectedPostId, visiblePosts],
  );
  const applicationByPostId = useMemo(
    () => new Map(applications.map((application) => [application.interview_post_id, application])),
    [applications],
  );
  const viewedPostIds = useMemo(
    () => new Set(postViews.map((view) => view.interview_post_id)),
    [postViews],
  );

  const togglePost = (postId: string) => {
    if (accessToken) {
      markPostViewed.mutate({ postId, source: "home" });
    }
    setSelectedPostId(postId === selectedPostId ? null : postId);
  };

  return (
    <PageLayout
      className="h-[var(--app-mobile-content-height)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden min-[1200px]:h-dvh"
      variant="list-detail"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <img
              alt=""
              className="size-10 shrink-0 rounded-hypo-lg"
              src="/brand/hypofit-mark.svg"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-hypo-brand">홈</p>
              <strong className="block truncate font-brand text-lg font-bold leading-6 text-hypo-text">
                Hypofit
              </strong>
            </div>
          </div>
          <p className="hidden text-xs font-semibold text-hypo-text-soft md:block">홈</p>
          <h1
            id="explore-page-title"
            className="sr-only md:not-sr-only md:mt-2 md:block md:text-2xl md:font-bold md:leading-8 md:text-hypo-text"
          >
            최근 인터뷰
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-hypo-text-muted">
            최근 올라온 인터뷰를 한 화면에서 비교하고 바로 신청 흐름으로 이어갈 수 있어요.
          </p>
        </div>
        <div className="shrink-0">
          <NotificationButton />
        </div>
      </header>

      <SplitView
        className="min-h-0"
        detail={visiblePosts.length > 0 ? (
          <ContextPanel className="border-0 bg-transparent shadow-none">
            <OpportunityDetailPanel
              canApply={canApply}
              errorMessage={
                createApplication.error instanceof Error ? createApplication.error.message : null
              }
              isApplying={createApplication.isPending}
              existingApplication={
                selectedPost ? applicationByPostId.get(selectedPost.id) ?? null : null
              }
              post={selectedPost}
              onApply={(input) => {
                createApplication.mutate(input);
              }}
            />
          </ContextPanel>
        ) : null}
        list={
          <ListSurface
            className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] border-0 bg-transparent shadow-none sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none"
            labelledBy="explore-page-list-heading"
          >
            <div className="flex items-center justify-between gap-3 border-b border-hypo-border px-4 py-3 sm:px-5">
              <h2 id="explore-page-list-heading" className="sr-only">
                최근 인터뷰 목록
              </h2>
              <p className="text-sm font-semibold text-hypo-text">
                지금 비교할 수 있는 모집글 {visiblePosts.length}개
              </p>
              {selectedPost ? (
                <p className="hidden text-xs text-hypo-text-soft min-[1200px]:block">
                  선택한 모집글 상세가 오른쪽에 보여요.
                </p>
              ) : null}
            </div>

            <div
              aria-label="최근 인터뷰 목록"
              className="min-h-0 overflow-y-auto overscroll-contain divide-y divide-hypo-border"
              role="list"
            >
              {isLoading ? (
                <OpportunityListSkeleton count={5} />
              ) : null}

              {isError ? (
                <ErrorState
                  className="rounded-none border-0 px-4 py-5 sm:px-5"
                  title="모집글을 불러오지 못했습니다."
                >
                  API 연결 상태를 확인한 뒤 다시 시도하세요.
                </ErrorState>
              ) : null}

              {!isLoading && !isError && visiblePosts.length === 0 ? (
                <EmptyState
                  className="rounded-none border-0 bg-transparent px-4 py-12 sm:px-5"
                  title="조건에 맞는 인터뷰가 없어요."
                >
                  새 모집글이 올라오면 여기에서 바로 볼 수 있어요.
                </EmptyState>
              ) : null}

              {visiblePosts.map((post) => (
                <div key={post.id} className="overflow-hidden" role="listitem">
                  <OpportunityCard
                    isSelected={post.id === selectedPost?.id}
                    isViewed={viewedPostIds.has(post.id)}
                    post={post}
                    variant="compact"
                    onSelect={() => togglePost(post.id)}
                  />
                  <HomeExpandedOpportunity
                    canApply={canApply}
                    errorMessage={
                      createApplication.error instanceof Error
                        ? createApplication.error.message
                        : null
                    }
                    isApplying={createApplication.isPending}
                    isOpen={post.id === selectedPostId}
                    existingApplication={applicationByPostId.get(post.id) ?? null}
                    post={post}
                    onApply={(input) => {
                      createApplication.mutate(input);
                    }}
                  />
                </div>
              ))}
            </div>
          </ListSurface>
        }
      />
    </PageLayout>
  );
}

function HomeExpandedOpportunity({
  canApply,
  errorMessage,
  existingApplication,
  isApplying,
  isOpen,
  onApply,
  post,
}: {
  canApply: boolean;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  isApplying?: boolean;
  isOpen: boolean;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out min-[1200px]:hidden",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0">
        <OpportunityExpandedDetail
          appliedStatusMode="minimal"
          canApply={canApply}
          className="rounded-none border-0 border-t border-hypo-border bg-transparent px-4 pb-4 pt-3 sm:px-5"
          errorMessage={errorMessage}
          existingApplication={existingApplication}
          isApplying={isApplying}
          post={post}
          onApply={onApply}
        />
      </div>
    </div>
  );
}
