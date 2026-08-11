import { CalendarDays, ClipboardList, Flag, MessageSquareText } from "lucide-react";

import type { ApplicationReadModel } from "../../workflow/readModels";
import { Avatar } from "../../../shared/ui/avatar";
import { Badge } from "../../../shared/ui/badge";
import { ApplicationStatusBadge, SessionStatusBadge } from "../../../shared/ui/status-badge";

interface ApplicationCardProps {
  model: ApplicationReadModel;
  onReport?: () => void;
}

export function ApplicationCard({ model, onReport }: ApplicationCardProps) {
  return (
    <article className="rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <Avatar
            alt={model.respondentLabel}
            className="size-11"
            fallback={model.respondentLabel.slice(0, 1)}
            src={model.application.respondent?.profile_image_url}
          />
          <div className="min-w-0">
            <h3 className="text-base font-black text-hypo-text">{model.displayTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-hypo-text-muted">{model.targetSummary}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ApplicationStatusBadge status={model.application.status} />
          {model.session ? <SessionStatusBadge status={model.session.status} /> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-hypo-text-muted sm:grid-cols-3">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText size={15} />
          답변 {model.answerCount}개
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          가능 시간 {model.availableTimeCount}개
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ClipboardList size={15} />
          {model.sessionTimeLabel ?? "일정 대기"}
        </span>
      </div>

      {model.application.available_times.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {model.application.available_times.slice(0, 3).map((time) => (
            <Badge key={time} intent="neutral">
              {time}
            </Badge>
          ))}
        </div>
      ) : null}

      {onReport ? (
        <div className="mt-4 border-t border-hypo-border pt-3">
          <button
            className="inline-flex min-h-10 items-center gap-1.5 rounded-hypo-pill px-3 text-xs font-black text-hypo-text-muted transition-colors hover:bg-hypo-danger-soft hover:text-hypo-danger focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-danger/20"
            type="button"
            onClick={onReport}
          >
            <Flag size={15} />
            문제 신고
          </button>
        </div>
      ) : null}
    </article>
  );
}
