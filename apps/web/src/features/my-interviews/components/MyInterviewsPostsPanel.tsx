import { Plus } from "lucide-react";

import type { CreateSessionInput } from "../../../shared/api/sessions";
import type { Application, InterviewPost } from "../../../shared/api/types";
import { Button } from "../../../shared/ui/button";
import { ContextPanel, SplitView } from "../../../shared/ui/workspace";
import { FounderPostCard } from "../../interview-posts/components/FounderPostCard";
import { MyInterviewsDetailHeader } from "./MyInterviewsDetailHeader";
import { MyInterviewsEmptyState } from "./MyInterviewsEmptyState";
import { MyInterviewsFounderPostListPane } from "./MyInterviewsFounderPostListPane";

interface MyInterviewsPostsPanelProps {
  applicationsByPostId: Map<string, Application[]>;
  createSessionErrorMessage: string | null;
  isCreatingSession: boolean;
  isUpdatingApplication: boolean;
  onCreatePost: () => void;
  onCreateSession: (input: CreateSessionInput) => void;
  onRejectApplication: (applicationId: string, rejectionReason: string) => void;
  onSelectApplication: (applicationId: string) => void;
  onSelectPost: (postId: string) => void;
  posts: InterviewPost[];
  selectedFounderPost: InterviewPost | null;
}

export function MyInterviewsPostsPanel({
  applicationsByPostId,
  createSessionErrorMessage,
  isCreatingSession,
  isUpdatingApplication,
  onCreatePost,
  onCreateSession,
  onRejectApplication,
  onSelectApplication,
  onSelectPost,
  posts,
  selectedFounderPost,
}: MyInterviewsPostsPanelProps) {
  const selectedPostId = selectedFounderPost?.id ?? null;

  const renderCreatePostAction = () => (
    <Button size="sm" onClick={onCreatePost}>
      <Plus size={16} />
      새 모집글
    </Button>
  );

  const renderDetailContent = (description: string) => {
    if (!selectedFounderPost) {
      return <MyInterviewsEmptyState variant="selected-post" />;
    }

    return (
      <div className="grid gap-4">
        <MyInterviewsDetailHeader
          action={renderCreatePostAction()}
          description={description}
          eyebrow="모집글 관리"
          title={selectedFounderPost.title}
        />
        <FounderPostCard
          applications={applicationsByPostId.get(selectedFounderPost.id) ?? []}
          isCreatingSession={isCreatingSession}
          isUpdatingApplication={isUpdatingApplication}
          post={selectedFounderPost}
          sessionErrorMessage={createSessionErrorMessage}
          onCreateSession={onCreateSession}
          onRejectApplication={onRejectApplication}
          onSelectApplication={onSelectApplication}
        />
      </div>
    );
  };

  return (
    <section
      aria-labelledby="my-interviews-tab-posts"
      className="grid gap-4"
      id="my-interviews-panel-posts"
      role="tabpanel"
    >
      <div className="min-[1200px]:hidden">
        {posts.length ? (
          <div className="grid gap-4">
            <MyInterviewsFounderPostListPane
              applicationsByPostId={applicationsByPostId}
              headingId="my-posts-list-heading-mobile"
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={onSelectPost}
            />
            {selectedFounderPost
              ? renderDetailContent(
                  "선택한 모집글의 지원자 검토와 일정 생성을 아래에서 이어가세요.",
                )
              : null}
          </div>
        ) : (
          <MyInterviewsEmptyState variant="posts" onAction={onCreatePost} />
        )}
      </div>

      <div className="hidden min-[1200px]:block">
        {posts.length ? (
          <SplitView
            detail={
              <ContextPanel className="border-none bg-transparent shadow-none">
                {renderDetailContent(
                  "선택한 모집글의 지원자 검토와 일정 생성을 오른쪽에서 이어가세요.",
                )}
              </ContextPanel>
            }
            list={
              <MyInterviewsFounderPostListPane
                applicationsByPostId={applicationsByPostId}
                headingId="my-posts-list-heading-desktop"
                posts={posts}
                selectedPostId={selectedPostId}
                onSelectPost={onSelectPost}
              />
            }
          />
        ) : (
          <MyInterviewsEmptyState variant="posts" onAction={onCreatePost} />
        )}
      </div>
    </section>
  );
}
