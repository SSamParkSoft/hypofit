import { CalendarDays, MapPin, Video } from "lucide-react";

import type { SessionReadModel } from "../../workflow/readModels";
import { Badge } from "../../../shared/ui/badge";
import { ConfirmActionButton } from "../../../shared/ui/confirm-action";
import { SessionStatusBadge } from "../../../shared/ui/status-badge";

interface ScheduleAgendaItemProps {
  isMutating?: boolean;
  model: SessionReadModel;
  onComplete: () => void;
  onNoShow: () => void;
}

export function ScheduleAgendaItem({
  isMutating,
  model,
  onComplete,
  onNoShow,
}: ScheduleAgendaItemProps) {
  const { application, session } = model;

  return (
    <article className="rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SessionStatusBadge status={session.status} />
            <Badge intent={session.meeting_type === "online" ? "info" : "neutral"}>
              {session.meeting_type === "online" ? "화상" : "대면"}
            </Badge>
          </div>
          <h3 className="mt-3 text-base font-black text-hypo-text">{model.title}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-hypo-text-muted">
            <CalendarDays size={15} />
            {model.sessionTimeLabel}
          </p>
          {application ? (
            <p className="mt-1 text-xs text-hypo-text-soft">
              {model.respondentLabel} · {model.applicationLabel}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <ConfirmActionButton
            confirmLabel="완료"
            description="완료로 표시하면 이 인터뷰는 완료 기록으로 남고 이후 참여 품질 판단에 사용될 수 있습니다."
            size="sm"
            variant="secondary"
            disabled={isMutating || session.status !== "scheduled"}
            title="인터뷰를 완료 처리할까요?"
            onConfirm={onComplete}
          >
            완료 표시
          </ConfirmActionButton>
          <ConfirmActionButton
            confirmLabel="노쇼"
            description="노쇼로 표시하면 출석 문제 기록으로 남습니다. 실제 불참이 맞는지 확인한 뒤 진행하세요."
            size="sm"
            variant="danger"
            disabled={isMutating || session.status !== "scheduled"}
            title="노쇼로 기록할까요?"
            onConfirm={onNoShow}
          >
            노쇼
          </ConfirmActionButton>
        </div>
      </div>

      <div className="mt-4 text-sm text-hypo-text-muted">
        {session.meeting_type === "online" ? (
          <span className="inline-flex items-center gap-1.5">
            <Video size={15} />
            {session.meeting_url ?? "화상 링크는 일정 확정 후 공유됩니다."}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} />
            {session.place ?? "장소 협의 중"}
          </span>
        )}
      </div>
    </article>
  );
}
