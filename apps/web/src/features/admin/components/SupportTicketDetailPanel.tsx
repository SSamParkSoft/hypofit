import { useEffect, useState } from "react";

import { adminApi } from "../../../shared/api/admin";
import type {
  AdminModerationAction,
  AdminModerationActionCreateInput,
  AdminSupportTicket,
  AdminTargetPreview,
  SupportTicketStatus,
} from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { EmptyState } from "../../../shared/ui/state";
import {
  formatDate,
  getErrorMessage,
  kindLabels,
  moderationActions,
  statusIntents,
  statusLabels,
} from "../adminViewModel";

interface SupportTicketDetailPanelProps {
  accessToken: string;
  onAction: (message: string) => void;
  onError: (message: string) => void;
  targetPreview: AdminTargetPreview | null;
  ticket: AdminSupportTicket | null;
}

export function SupportTicketDetailPanel({
  accessToken,
  onAction,
  onError,
  targetPreview,
  ticket,
}: SupportTicketDetailPanelProps) {
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("in_review");
  const [statusReason, setStatusReason] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [moderationAction, setModerationAction] = useState<AdminModerationActionCreateInput["action"]>("close_report");
  const [lastModerationResult, setLastModerationResult] = useState<AdminModerationAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStatusReason("");
    setReplyBody("");
    setModerationReason("");
    setLastModerationResult(null);
    setNextStatus(ticket?.status === "open" ? "in_review" : "resolved");
  }, [ticket?.id, ticket?.status]);

  if (!ticket) {
    return (
      <div className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <EmptyState title="티켓을 선택해 주세요.">왼쪽 목록에서 처리할 항목을 고르세요.</EmptyState>
      </div>
    );
  }

  const currentTicket = ticket;

  async function submitStatus() {
    setIsSubmitting(true);
    try {
      await adminApi.updateTicketStatus(
        currentTicket.id,
        { status: nextStatus, reason: statusReason || null },
        accessToken,
      );
      onAction("티켓 상태를 변경했습니다.");
    } catch (error) {
      onError(getErrorMessage(error, "상태를 변경하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitReply() {
    if (replyBody.trim().length < 2) {
      onError("답변을 2자 이상 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.replyToTicket(currentTicket.id, { body: replyBody, visible_to_user: true }, accessToken);
      setReplyBody("");
      onAction("사용자에게 답변을 보냈습니다.");
    } catch (error) {
      onError(getErrorMessage(error, "답변을 보내지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitModeration() {
    if (!currentTicket.target_type || !currentTicket.target_id) {
      onError("조치할 대상이 없는 티켓입니다.");
      return;
    }

    if (moderationAction !== "close_report" && moderationReason.trim().length < 2) {
      onError("조치 사유를 입력해 주세요.");
      return;
    }

    if (
      ["hide", "remove", "block", "restore"].includes(moderationAction) &&
      !window.confirm("대상 상태가 바뀝니다. 진행할까요?")
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminApi.createModerationAction(
        {
          target_type: currentTicket.target_type,
          target_id: currentTicket.target_id,
          action: moderationAction,
          reason: moderationReason || null,
          source_ticket_id: currentTicket.id,
        },
        accessToken,
      );
      setLastModerationResult(result);
      onAction("운영 조치를 기록했습니다.");
    } catch (error) {
      onError(getErrorMessage(error, "운영 조치를 기록하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge intent="brand">{kindLabels[currentTicket.kind]}</Badge>
              <Badge intent={statusIntents[currentTicket.status as SupportTicketStatus] ?? "neutral"}>
                {statusLabels[currentTicket.status as SupportTicketStatus] ?? currentTicket.status}
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-black">{currentTicket.subject || "제목 없음"}</h2>
            <p className="mt-1 text-sm text-hypo-text-muted">{currentTicket.contact_email}</p>
          </div>
          <code className="rounded bg-hypo-surface-muted px-2 py-1 text-xs text-hypo-text-muted">
            {currentTicket.id.slice(0, 8)}
          </code>
        </div>
        <div className="mt-5 whitespace-pre-wrap rounded-hypo-lg bg-hypo-surface-muted p-4 text-sm leading-6">
          {currentTicket.body}
        </div>
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">대상 정보</h3>
        {currentTicket.target_type && currentTicket.target_id ? (
          <div className="mt-3 rounded-hypo-lg border border-hypo-border p-4 text-sm">
            <p className="font-black">
              {targetPreview?.title ?? `${currentTicket.target_type} ${currentTicket.target_id}`}
            </p>
            <p className="mt-1 text-hypo-text-muted">{targetPreview?.summary ?? "대상 요약을 불러오는 중입니다."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{currentTicket.target_type}</Badge>
              {targetPreview?.status ? <Badge intent="info">{targetPreview.status}</Badge> : null}
              {targetPreview?.exists === false ? <Badge intent="danger">대상 없음</Badge> : null}
            </div>
            {targetPreview?.owner_user_id ? (
              <p className="mt-3 text-xs font-bold text-hypo-text-muted">
                owner_user_id: <span className="font-mono">{targetPreview.owner_user_id}</span>
              </p>
            ) : null}
            {targetPreview?.metadata && Object.keys(targetPreview.metadata).length > 0 ? (
              <details className="mt-3 rounded-hypo-lg bg-hypo-surface-muted p-3">
                <summary className="cursor-pointer text-xs font-black text-hypo-text-muted">metadata</summary>
                <pre className="mt-2 max-h-44 overflow-auto text-xs leading-5">
                  {JSON.stringify(targetPreview.metadata, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-hypo-text-muted">연결된 대상이 없습니다.</p>
        )}
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">상태 변경</h3>
        <div className="mt-3 grid grid-cols-[160px_minmax(0,1fr)] gap-3">
          <select
            aria-label="티켓 상태"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm font-bold"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as SupportTicketStatus)}
          >
            {(["open", "in_review", "resolved", "closed"] as const).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <input
            aria-label="상태 변경 사유"
            className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
            placeholder="변경 사유"
            value={statusReason}
            onChange={(event) => setStatusReason(event.target.value)}
          />
        </div>
        <Button className="mt-3" disabled={isSubmitting} size="sm" onClick={submitStatus}>
          상태 저장
        </Button>
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">답변</h3>
        <textarea
          aria-label="답변 내용"
          className="mt-3 min-h-28 w-full rounded-hypo-lg border border-hypo-border p-3 text-sm leading-6"
          placeholder="사용자에게 보낼 답변을 입력하세요."
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
        />
        <Button className="mt-3" disabled={isSubmitting} size="sm" onClick={submitReply}>
          답변 보내기
        </Button>
      </section>

      {currentTicket.kind === "report" && currentTicket.target_type && currentTicket.target_id ? (
        <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
          <h3 className="text-base font-black">운영 조치</h3>
          <div className="mt-3 grid grid-cols-[160px_minmax(0,1fr)] gap-3">
            <select
              aria-label="운영 조치"
              className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm font-bold"
              value={moderationAction}
              onChange={(event) =>
                setModerationAction(event.target.value as AdminModerationActionCreateInput["action"])
              }
            >
              {moderationActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <input
              aria-label="조치 사유"
              className="rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm"
              placeholder="조치 사유"
              value={moderationReason}
              onChange={(event) => setModerationReason(event.target.value)}
            />
          </div>
          <Button className="mt-3" disabled={isSubmitting} size="sm" variant="outlineDanger" onClick={submitModeration}>
            조치 기록
          </Button>
          {lastModerationResult ? (
            <div className="mt-4 rounded-hypo-lg bg-hypo-surface-muted p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge intent="warning">{lastModerationResult.action}</Badge>
                <span className="font-mono text-xs text-hypo-text-muted">
                  {lastModerationResult.id.slice(0, 8)}
                </span>
              </div>
              <p className="mt-2 text-xs text-hypo-text-muted">
                target: {lastModerationResult.target_type} {lastModerationResult.target_id}
              </p>
              {lastModerationResult.reason ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{lastModerationResult.reason}</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">이벤트 기록</h3>
        <div className="mt-3 space-y-3">
          {currentTicket.events.map((event) => (
            <div key={event.id} className="rounded-hypo-lg bg-hypo-surface-muted p-3 text-sm">
              <div className="flex justify-between gap-3">
                <p className="font-black">{event.event_type}</p>
                <p className="text-xs text-hypo-text-muted">{formatDate(event.created_at)}</p>
              </div>
              {event.message ? <p className="mt-2 whitespace-pre-wrap leading-6">{event.message}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
