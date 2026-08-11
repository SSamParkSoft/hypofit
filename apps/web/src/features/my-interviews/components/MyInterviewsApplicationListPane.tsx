import { formatUserDisplayName } from "@hypofit/contracts";
import { CalendarDays, ClipboardList, MessageSquareText } from "lucide-react";

import { ListSurface } from "../../../shared/ui/workspace";
import { cn } from "../../../shared/ui/cn";
import {
  ApplicationStatusBadge,
  SessionStatusBadge,
} from "../../../shared/ui/status-badge";
import type { MyInterviewApplicationRowModel } from "../types";

interface MyInterviewsApplicationListPaneProps {
  headingId: string;
  onSelectApplication: (applicationId: string) => void;
  rows: MyInterviewApplicationRowModel[];
  selectedApplicationId: string | null;
}

export function MyInterviewsApplicationListPane({
  headingId,
  onSelectApplication,
  rows,
  selectedApplicationId,
}: MyInterviewsApplicationListPaneProps) {
  return (
    <ListSurface labelledBy={headingId}>
      <div className="flex items-center justify-between border-b border-hypo-border px-4 py-3">
        <div className="min-w-0">
          <h3 id={headingId} className="ui-section-title text-hypo-text">
            신청한 인터뷰
          </h3>
          <p className="mt-1 text-xs text-hypo-text-muted">
            상태와 조율 대기 여부를 빠르게 비교하세요.
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold text-hypo-text-soft">{rows.length}건</span>
      </div>
      <div>
        {rows.map((model) => (
          <ApplicationListRow
            key={model.application.id}
            isSelected={model.application.id === selectedApplicationId}
            model={model}
            onSelect={() => onSelectApplication(model.application.id)}
          />
        ))}
      </div>
    </ListSurface>
  );
}

interface ApplicationListRowProps {
  isSelected: boolean;
  model: MyInterviewApplicationRowModel;
  onSelect: () => void;
}

function ApplicationListRow({
  isSelected,
  model,
  onSelect,
}: ApplicationListRowProps) {
  const founderLabel = formatUserDisplayName(model.post?.founder, "모집자 정보 없음");
  const isMutedApplication =
    model.application.status === "canceled" ||
    model.application.status === "completed" ||
    model.application.status === "rejected" ||
    model.session?.status === "completed";

  return (
    <button
      className={cn(
        "w-full border-b border-hypo-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-hypo-bg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20",
        isSelected && "bg-hypo-brand-soft",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            className={cn(
              "truncate text-sm font-semibold",
              isMutedApplication ? "text-hypo-text-muted" : "text-hypo-text",
            )}
          >
            {model.displayTitle}
          </h4>
          <p className="mt-1 line-clamp-1 text-xs text-hypo-text-muted">
            {founderLabel} · {model.targetSummary}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ApplicationStatusBadge status={model.application.status} />
          {model.session ? <SessionStatusBadge status={model.session.status} /> : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-hypo-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText size={14} />
          답변 {model.answerCount}개
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} />
          {model.sessionTimeLabel ?? "일정 대기"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={14} />
          가능 시간 {model.availableTimeCount}개
        </span>
      </div>
    </button>
  );
}
