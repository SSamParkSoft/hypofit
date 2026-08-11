import * as Dialog from "@radix-ui/react-dialog";
import { formatUserDisplayName } from "@hypofit/contracts";
import { CalendarDays, MessageSquareText, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { CreateSessionInput } from "../../../shared/api/sessions";
import type { Application } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { Badge } from "../../../shared/ui/badge";
import { ConfirmActionButton } from "../../../shared/ui/confirm-action";
import { ApplicationStatusBadge } from "../../../shared/ui/status-badge";
import { SessionCreationForm } from "../../sessions/components/SessionCreationForm";
import { formatAnswerLabel } from "../../workflow/readModels";

interface ApplicantReviewCardProps {
  application: Application;
  disabled?: boolean;
  isUpdating?: boolean;
  isCreatingSession?: boolean;
  sessionErrorMessage?: string | null;
  onCreateSession: (input: CreateSessionInput) => void;
  onReject: (rejectionReason: string) => void;
  onSelect: () => void;
}

export function ApplicantReviewCard({
  application,
  disabled,
  isCreatingSession,
  isUpdating,
  onCreateSession,
  onReject,
  onSelect,
  sessionErrorMessage,
}: ApplicantReviewCardProps) {
  const answers = Object.entries(application.answers);
  const respondentLabel = formatUserDisplayName(application.respondent);

  return (
    <article className="rounded-hypo-lg border border-hypo-border bg-hypo-bg p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <Avatar
            alt={respondentLabel}
            className="size-10"
            fallback={respondentLabel.slice(0, 1)}
            src={application.respondent?.profile_image_url}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={application.status} />
              <Badge intent="neutral">{respondentLabel}</Badge>
            </div>
            <h4 className="mt-3 inline-flex items-center gap-2 text-sm font-black text-hypo-text">
              <UserRound size={16} />
              지원자 검토
            </h4>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <RejectApplicationDialog
            disabled={disabled || isUpdating || application.status !== "applied"}
            onConfirm={onReject}
          />
          <ConfirmActionButton
            confirmLabel="선정"
            description="선정 후에는 지원자와 합의한 시간으로 인터뷰 일정을 생성할 수 있습니다."
            disabled={disabled || isUpdating || application.status !== "applied"}
            size="sm"
            title="지원자를 선정할까요?"
            onConfirm={onSelect}
          >
            선정
          </ConfirmActionButton>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-hypo-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText size={15} />
          답변 {answers.length}개
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          가능 시간 {application.available_times.length}개
        </span>
      </div>

      {answers.length ? (
        <div className="mt-3 grid gap-2">
          {answers.slice(0, 2).map(([key, value]) => (
            <p key={key} className="rounded-hypo-md bg-hypo-surface p-3 text-sm leading-6 text-hypo-text-muted">
              <strong className="text-hypo-text">{formatAnswerLabel(key)}</strong>
              <br />
              {value}
            </p>
          ))}
        </div>
      ) : null}

      {application.available_times.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {application.available_times.slice(0, 4).map((time) => (
            <Badge key={time} intent="neutral">
              {time}
            </Badge>
          ))}
        </div>
      ) : null}

      {application.status === "rejected" && application.rejection_reason ? (
        <p className="mt-3 rounded-hypo-md bg-hypo-danger-soft px-3 py-2 text-xs font-bold leading-5 text-hypo-danger">
          반려 사유: {application.rejection_reason}
        </p>
      ) : null}

      {application.status === "selected" ? (
        <SessionCreationForm
          applicationId={application.id}
          disabled={disabled}
          errorMessage={sessionErrorMessage}
          isSubmitting={isCreatingSession}
          onSubmit={onCreateSession}
        />
      ) : null}
    </article>
  );
}

function RejectApplicationDialog({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: (rejectionReason: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const normalizedReason = reason.trim();
  const canSubmit = normalizedReason.length >= 2;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    onConfirm(normalizedReason);
    setReason("");
    setIsOpen(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-hypo-md bg-hypo-surface px-3 text-sm font-black text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
          type="button"
        >
          반려
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hypo-text/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 shadow-hypo-floating focus-visible:outline-none">
          <Dialog.Title className="text-lg font-black text-hypo-text">
            반려 사유를 입력해주세요
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-hypo-text-muted">
            입력한 사유는 지원자에게 안내되고 채팅 기록에도 남아요.
          </Dialog.Description>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-xs font-black text-hypo-text-soft">반려 사유</span>
              <textarea
                className="min-h-28 resize-none rounded-hypo-lg border border-hypo-border bg-hypo-bg px-3 py-3 text-sm leading-6 text-hypo-text outline-none transition placeholder:text-hypo-text-soft focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15"
                maxLength={500}
                placeholder="예: 이번 모집 조건과 경험이 조금 달라서 아쉽지만 다음 모집에서 다시 신청해주세요."
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
              <span className="text-right text-[11px] font-semibold text-hypo-text-soft">
                {normalizedReason.length}/500
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <Dialog.Close asChild>
                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-hypo-md bg-hypo-surface-muted px-4 text-sm font-black text-hypo-text-muted"
                  type="button"
                >
                  취소
                </button>
              </Dialog.Close>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-hypo-md bg-hypo-brand px-4 text-sm font-black text-white transition-colors hover:bg-hypo-brand-strong disabled:pointer-events-none disabled:opacity-50"
                disabled={!canSubmit}
                type="submit"
              >
                반려하기
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
