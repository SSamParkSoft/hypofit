import { Button } from "../../../shared/ui/button";
import { ContextPanel, SplitView } from "../../../shared/ui/workspace";
import { ApplicationCard } from "../../applications/components/ApplicationCard";
import type { MyInterviewApplicationRowModel } from "../types";
import { MyInterviewsApplicationListPane } from "./MyInterviewsApplicationListPane";
import { MyInterviewsDetailHeader } from "./MyInterviewsDetailHeader";
import { MyInterviewsEmptyState } from "./MyInterviewsEmptyState";

interface MyInterviewsApplicationsPanelProps {
  onOpenInterviews: () => void;
  onOpenInterviewDetail: (postId: string) => void;
  onReportApplication: (model: MyInterviewApplicationRowModel) => void;
  onSelectApplication: (applicationId: string) => void;
  rows: MyInterviewApplicationRowModel[];
  selectedApplicationModel: MyInterviewApplicationRowModel | null;
}

export function MyInterviewsApplicationsPanel({
  onOpenInterviewDetail,
  onOpenInterviews,
  onReportApplication,
  onSelectApplication,
  rows,
  selectedApplicationModel,
}: MyInterviewsApplicationsPanelProps) {
  const selectedApplicationId = selectedApplicationModel?.application.id ?? null;

  const renderDetailContent = (description: string) => {
    if (!selectedApplicationModel) {
      return <MyInterviewsEmptyState variant="selected-application" />;
    }

    return (
      <div className="grid gap-4">
        <MyInterviewsDetailHeader
          action={
            selectedApplicationModel.post ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onOpenInterviewDetail(selectedApplicationModel.post!.id)}
              >
                모집글 보기
              </Button>
            ) : undefined
          }
          description={description}
          eyebrow="신청 상세"
          title={selectedApplicationModel.displayTitle}
        />
        <ApplicationCard
          model={selectedApplicationModel}
          onReport={() => onReportApplication(selectedApplicationModel)}
        />
      </div>
    );
  };

  return (
    <section
      aria-labelledby="my-interviews-tab-applications"
      className="grid gap-4"
      id="my-interviews-panel-applications"
      role="tabpanel"
    >
      <div className="min-[1200px]:hidden">
        {rows.length ? (
          <div className="grid gap-4">
            <MyInterviewsApplicationListPane
              headingId="my-applications-list-heading-mobile"
              rows={rows}
              selectedApplicationId={selectedApplicationId}
              onSelectApplication={onSelectApplication}
            />
            {selectedApplicationModel ? (
              renderDetailContent("선택한 신청의 상태와 답변 내용을 아래에서 확인할 수 있어요.")
            ) : null}
          </div>
        ) : (
          <MyInterviewsEmptyState variant="applications" onAction={onOpenInterviews} />
        )}
      </div>

      <div className="hidden min-[1200px]:block">
        {rows.length ? (
          <SplitView
            detail={
              <ContextPanel className="border-none bg-transparent shadow-none">
                {renderDetailContent(
                  "신청 상태와 답변 내용을 확인하고 필요한 경우 인터뷰 상세로 이동하세요.",
                )}
              </ContextPanel>
            }
            list={
              <MyInterviewsApplicationListPane
                headingId="my-applications-list-heading-desktop"
                rows={rows}
                selectedApplicationId={selectedApplicationId}
                onSelectApplication={onSelectApplication}
              />
            }
          />
        ) : (
          <MyInterviewsEmptyState variant="applications" onAction={onOpenInterviews} />
        )}
      </div>
    </section>
  );
}
