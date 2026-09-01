import { CircleDollarSign, ClipboardList, UsersRound } from "lucide-react";

import type { Application, InterviewPost } from "../../../shared/api/types";
import { cn } from "../../../shared/ui/cn";
import { InterviewPostStatusBadge } from "../../../shared/ui/status-badge";
import { ListSurface } from "../../../shared/ui/workspace";
import {
  formatReward,
  interviewModeLabels,
} from "../../interview-posts/components/interviewPostMeta";

interface MyInterviewsFounderPostListPaneProps {
  applicationsByPostId: Map<string, Application[]>;
  headingId: string;
  onSelectPost: (postId: string) => void;
  posts: InterviewPost[];
  selectedPostId: string | null;
}

export function MyInterviewsFounderPostListPane({
  applicationsByPostId,
  headingId,
  onSelectPost,
  posts,
  selectedPostId,
}: MyInterviewsFounderPostListPaneProps) {
  return (
    <ListSurface labelledBy={headingId}>
      <div className="flex items-center justify-between border-b border-hypo-border px-4 py-3">
        <div className="min-w-0">
          <h3 id={headingId} className="ui-section-title text-hypo-text">
            내 모집글
          </h3>
          <p className="mt-1 text-xs text-hypo-text-muted">
            지원자 수와 진행 상태를 보고 바로 관리 대상을 고르세요.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-hypo-text-soft">{posts.length}건</span>
      </div>
      <div>
        {posts.map((post) => (
          <FounderPostListRow
            key={post.id}
            applications={applicationsByPostId.get(post.id) ?? []}
            isSelected={post.id === selectedPostId}
            post={post}
            onSelect={() => onSelectPost(post.id)}
          />
        ))}
      </div>
    </ListSurface>
  );
}

interface FounderPostListRowProps {
  applications: Application[];
  isSelected: boolean;
  onSelect: () => void;
  post: InterviewPost;
}

function FounderPostListRow({
  applications,
  isSelected,
  onSelect,
  post,
}: FounderPostListRowProps) {
  const selectedCount = applications.filter((application) => application.status === "selected").length;
  const isMutedPost =
    post.status === "archived" ||
    post.status === "closed" ||
    post.status === "completed" ||
    post.status === "hidden" ||
    post.status === "removed";

  return (
    <button
      className={cn(
        "w-full border-b border-hypo-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-hypo-bg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20",
        isSelected && "bg-hypo-brand-soft/35",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            className={cn(
              "truncate text-sm font-semibold",
              isMutedPost ? "text-hypo-text-muted" : "text-hypo-text",
            )}
          >
            {post.title}
          </h4>
          <p className="mt-1 line-clamp-1 text-xs text-hypo-text-muted">
            {post.target_description}
          </p>
        </div>
        <InterviewPostStatusBadge status={post.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-hypo-text-muted">
        <span className="inline-flex items-center gap-1.5 font-bold text-hypo-reward">
          <CircleDollarSign size={14} />
          {formatReward(post.reward_amount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={14} />
          {interviewModeLabels[post.interview_mode]} · {post.duration_minutes}분
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={14} />
          지원 {applications.length}명 · 선정 {selectedCount}명
        </span>
      </div>
    </button>
  );
}
