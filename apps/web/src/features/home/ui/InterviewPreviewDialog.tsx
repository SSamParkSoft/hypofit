import * as Dialog from "@radix-ui/react-dialog";
import type { InterviewPost } from "../../../shared/api/types";

import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { AppIcon } from "../../../shared/ui/icon";

export interface HomeInterviewPreview {
  description: string;
  recruitmentType?: InterviewPost["recruitment_type"];
  entryMode?: InterviewPost["entry_mode"];
  href: string;
  metaLabels: string[];
  sourceLabel: string;
  targetDescription: string;
  title: string;
}

interface InterviewPreviewDialogProps {
  onNavigate: (href: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  preview: HomeInterviewPreview | null;
}

export function InterviewPreviewDialog({
  onNavigate,
  onOpenChange,
  preview,
}: InterviewPreviewDialogProps) {
  return (
    <Dialog.Root open={Boolean(preview)} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hypo-text/35 backdrop-blur-[2px] data-[state=closed]:animate-none" />
        {preview ? (
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-hypo-lg border border-hypo-border bg-hypo-surface shadow-hypo-floating focus-visible:outline-none">
            <div className="flex items-start justify-between gap-5 border-b border-hypo-border/80 px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <p className="ui-metadata text-hypo-brand">{preview.sourceLabel}</p>
                <Dialog.Title className="mt-2 text-xl font-bold leading-7 text-hypo-text sm:text-[1.375rem]">
                  {preview.title}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  aria-label="미리보기 닫기"
                  className="flex size-10 shrink-0 items-center justify-center rounded-hypo-md text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                  type="button"
                >
                  <AppIcon aria-hidden="true" name="close" size={19} />
                </button>
              </Dialog.Close>
            </div>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-wrap gap-2">
                {preview.metaLabels.map((label, index) => (
                  <Badge intent={index === 1 ? "reward" : "neutral"} key={label}>
                    {label}
                  </Badge>
                ))}
              </div>

              <Dialog.Description className="ui-body mt-5 text-hypo-text-muted">
                {preview.description}
              </Dialog.Description>

              <dl className="mt-6 grid gap-5 border-t border-hypo-border/80 pt-5 sm:grid-cols-2">
                <div>
                  <dt className="ui-label flex items-center gap-2 text-hypo-text">
                    <AppIcon className="text-hypo-brand" name="users" size={16} />
                    찾는 분
                  </dt>
                  <dd className="ui-body mt-2 text-hypo-text-muted">
                    {preview.targetDescription}
                  </dd>
                </div>
                <div>
                  <dt className="ui-label flex items-center gap-2 text-hypo-text">
                    <AppIcon className="text-hypo-brand" name="calendar" size={16} />
                    진행 안내
                  </dt>
                  <dd className="ui-body mt-2 text-hypo-text-muted">
                    {preview.recruitmentType === "survey"
                      ? preview.entryMode === "direct"
                        ? "외부 설문에서 바로 참여해요. 설문 답변은 Hypofit에 저장되지 않아요."
                        : "신청 후 선정되면 외부 설문 링크로 참여할 수 있어요. 설문 답변은 Hypofit에 저장되지 않아요."
                      : preview.recruitmentType === "beta_test"
                        ? "선정 후 채팅에서 테스트 준비와 진행 안내를 확인해요."
                        : preview.recruitmentType === "research_experiment"
                          ? "선정 후 채팅에서 연구 일정과 준비 사항을 조율해요."
                          : "가능한 시간과 정확한 장소는 선정 후 채팅에서 조율해요."}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-end gap-2 border-t border-hypo-border/80 bg-hypo-bg/70 px-5 py-4 sm:px-6">
              <Dialog.Close asChild>
                <Button variant="secondary">닫기</Button>
              </Dialog.Close>
              <Button onClick={() => onNavigate(preview.href)}>상세 보기</Button>
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
