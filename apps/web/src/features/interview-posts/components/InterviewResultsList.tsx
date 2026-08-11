import type { CreateApplicationInput } from "../../../shared/api/applications";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { cn } from "../../../shared/ui/cn";
import { EmptyState, ErrorState } from "../../../shared/ui/state";
import { ListSurface } from "../../../shared/ui/workspace";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityExpandedDetail } from "./OpportunityExpandedDetail";
import { OpportunityListSkeleton } from "./OpportunityListSkeleton";

interface InterviewResultsListProps {
  activePostId: string | null;
  canApply: boolean;
  errorMessage?: string | null;
  filteredPosts: InterviewPost[];
  isError: boolean;
  isLoading: boolean;
  isApplying?: boolean;
  onApply: (input: CreateApplicationInput) => void;
  onSelect: (postId: string) => void;
  selectedPostId: string | null;
  applicationByPostId: Map<string, Application>;
  viewedPostIds: Set<string>;
}

export function InterviewResultsList({
  activePostId,
  applicationByPostId,
  canApply,
  errorMessage,
  filteredPosts,
  isApplying,
  isError,
  isLoading,
  onApply,
  onSelect,
  selectedPostId,
  viewedPostIds,
}: InterviewResultsListProps) {
  return (
    <ListSurface
      className="min-h-0 border-0 bg-transparent shadow-none sm:rounded-none sm:border-0 sm:bg-transparent sm:shadow-none min-[1200px]:flex"
      labelledBy="interviews-page-list-heading"
    >
      <h2 id="interviews-page-list-heading" className="sr-only">
        인터뷰 모집글 목록
      </h2>
      <div
        aria-label="인터뷰 모집글 목록"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-hypo-border"
        role="list"
      >
        {isLoading ? <OpportunityListSkeleton /> : null}

        {isError ? (
          <ErrorState
            className="rounded-none border-0 px-4 py-5 sm:px-5"
            title="모집글을 불러오지 못했습니다."
          >
            API 연결 상태를 확인한 뒤 다시 시도하세요.
          </ErrorState>
        ) : null}

        {!isLoading && !isError && filteredPosts.length === 0 ? (
          <EmptyState
            className="rounded-none border-0 bg-transparent px-4 py-12 sm:px-5"
            title="조건에 맞는 인터뷰가 없습니다."
          >
            검색어와 필터를 조금 넓혀보세요.
          </EmptyState>
        ) : null}

        {filteredPosts.map((post) => (
          <div key={post.id} className="overflow-hidden" role="listitem">
            <OpportunityCard
              isSelected={post.id === activePostId}
              isViewed={viewedPostIds.has(post.id)}
              post={post}
              onSelect={() => onSelect(post.id)}
            />
            <div
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out min-[1200px]:hidden",
                post.id === selectedPostId ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0">
                <OpportunityExpandedDetail
                  canApply={canApply}
                  className="rounded-none border-0 border-t border-hypo-border bg-transparent px-4 pb-4 pt-3 sm:px-5"
                  errorMessage={errorMessage}
                  existingApplication={applicationByPostId.get(post.id) ?? null}
                  isApplying={isApplying}
                  post={post}
                  onApply={onApply}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ListSurface>
  );
}
