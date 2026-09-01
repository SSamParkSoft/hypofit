import { Plus } from "lucide-react";

import { MyInterviewsApplicationsPanel } from "../features/my-interviews/components/MyInterviewsApplicationsPanel";
import { MyInterviewsPostsPanel } from "../features/my-interviews/components/MyInterviewsPostsPanel";
import { MyInterviewsTabs } from "../features/my-interviews/components/MyInterviewsTabs";
import { useMyInterviewsPageController } from "../features/my-interviews/useMyInterviewsPageController";
import type { MyInterviewApplicationRowModel } from "../features/my-interviews/types";
import type { AppUser } from "../shared/api/types";
import { navigateTo, navigateToInterviewDetail } from "../shared/navigation/appNavigation";
import { BackLink } from "../shared/ui/back-link";
import { Button } from "../shared/ui/button";
import { PageFrame, PageHeader } from "../shared/ui/page";
import { ErrorState, LoadingState } from "../shared/ui/state";

interface MyInterviewsPageProps {
  appUser: AppUser | null;
}

export function MyInterviewsPage({ appUser }: MyInterviewsPageProps) {
  const controller = useMyInterviewsPageController({ appUser });

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
              controller.canManageFounderPosts ? (
                <Button
                  className="w-full sm:w-auto"
                  size="sm"
                  onClick={() => navigateTo("/interviews/new")}
                >
                  <Plus size={16} />
                  모집글 만들기
                </Button>
              ) : undefined
            }
            description="신청 상태와 내 모집글 진행 현황을 목록 중심으로 비교하고 필요한 상세 작업만 이어서 열어 보세요."
            title="내 인터뷰"
          />
        </div>
      </div>

      <MyInterviewsTabs
        activeTab={controller.activeTab}
        tabs={controller.tabs}
        onChange={controller.selectTab}
      />

      {controller.isLoading ? <LoadingState title="내 인터뷰를 불러오는 중입니다." /> : null}

      {controller.isError ? (
        <ErrorState title="내 인터뷰를 불러오지 못했습니다.">
          API 연결 상태를 확인한 뒤 다시 시도하세요.
        </ErrorState>
      ) : null}

      {!controller.isLoading &&
      !controller.isError &&
      controller.activeTab === "applications" ? (
        <MyInterviewsApplicationsPanel
          onOpenInterviewDetail={navigateToInterviewDetail}
          onOpenInterviews={() => navigateTo("/interviews")}
          onReportApplication={reportApplicationProblem}
          onSelectApplication={controller.selectApplication}
          rows={controller.myApplicationRows}
          selectedApplicationModel={controller.selectedApplicationModel}
        />
      ) : null}

      {!controller.isLoading &&
      !controller.isError &&
      controller.activeTab === "posts" &&
      controller.canManageFounderPosts ? (
        <MyInterviewsPostsPanel
          applicationsByPostId={controller.applicationsByPostId}
          createSessionErrorMessage={controller.createSessionErrorMessage}
          isCreatingSession={controller.isCreatingSession}
          isUpdatingApplication={controller.isUpdatingApplication}
          onCreatePost={() => navigateTo("/interviews/new")}
          onCreateSession={controller.createFounderSession}
          onRejectApplication={controller.rejectFounderApplication}
          onSelectApplication={controller.selectFounderApplication}
          onSelectPost={controller.selectPost}
          posts={controller.myFounderPosts}
          selectedFounderPost={controller.selectedFounderPost}
        />
      ) : null}
    </PageFrame>
  );
}

function reportApplicationProblem(model: MyInterviewApplicationRowModel) {
  const params = new URLSearchParams({
    target_type: "application",
    target_id: model.application.id,
    interview_title: model.displayTitle,
    category: model.session ? "no_show" : "application",
  });
  navigateTo(`/report?${params.toString()}`);
}
