import { useState } from "react";

import { adminApi } from "../../../shared/api/admin";
import type { AdminAccountDeletionRequest } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { EmptyState } from "../../../shared/ui/state";
import {
  getAccountDeletionStatusIntent,
  getAccountDeletionStatusLabel,
  getAuthCleanupIntent,
  getAuthCleanupLabel,
  getCleanupStatusLabel,
  getProfileImageCleanupLabel,
  getVerificationStatusLabel,
} from "../accountDeletionQueue";
import { formatDate, formatDateTime, getErrorMessage } from "../adminViewModel";

interface AccountDeletionDetailPanelProps {
  accessToken: string;
  onAction: (message: string) => void;
  onError: (message: string) => void;
  request: AdminAccountDeletionRequest | null;
}

export function AccountDeletionDetailPanel({
  accessToken,
  onAction,
  onError,
  request,
}: AccountDeletionDetailPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) {
    return (
      <div className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <EmptyState title="삭제 요청을 선택해 주세요.">왼쪽 목록에서 확인할 요청을 고르세요.</EmptyState>
      </div>
    );
  }

  const currentRequest = request;

  async function retryAuthCleanup() {
    if (!currentRequest.auth_cleanup_retry_available) return;
    if (!window.confirm("Supabase Auth 정리를 다시 시도할까요?")) return;

    setIsSubmitting(true);
    try {
      await adminApi.retryAccountDeletionAuthCleanup(currentRequest.id, accessToken);
      onAction("Auth 정리를 다시 시도했습니다.");
    } catch (error) {
      onError(getErrorMessage(error, "Auth 정리를 다시 시도하지 못했습니다."));
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
              <Badge intent={getAccountDeletionStatusIntent(currentRequest.status)}>
                {getAccountDeletionStatusLabel(currentRequest.status)}
              </Badge>
              <Badge intent={getAuthCleanupIntent(currentRequest)}>
                {getAuthCleanupLabel(currentRequest.auth_user_delete_status)}
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-black">{currentRequest.email_display}</h2>
            <p className="mt-1 text-sm text-hypo-text-muted">
              {currentRequest.requester_name ?? "이름 비공개"} · {currentRequest.source}
            </p>
          </div>
          <code className="rounded bg-hypo-surface-muted px-2 py-1 text-xs text-hypo-text-muted">
            {currentRequest.id.slice(0, 8)}
          </code>
        </div>
        {currentRequest.reason ? (
          <div className="mt-5 whitespace-pre-wrap rounded-hypo-lg bg-hypo-surface-muted p-4 text-sm leading-6">
            {currentRequest.reason}
          </div>
        ) : null}
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">처리 상태</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoItem label="요청 상태" value={getAccountDeletionStatusLabel(currentRequest.status)} />
          <InfoItem label="이메일 확인" value={getVerificationStatusLabel(currentRequest.verification_status)} />
          <InfoItem label="계정 정리" value={getCleanupStatusLabel(currentRequest.cleanup_status)} />
          <InfoItem
            label="프로필 이미지"
            value={getProfileImageCleanupLabel(currentRequest.profile_image_cleanup_status)}
          />
          <InfoItem label="Auth 정리" value={getAuthCleanupLabel(currentRequest.auth_user_delete_status)} />
          <InfoItem
            label="보관 만료"
            value={currentRequest.retention_until ? formatDate(currentRequest.retention_until) : "미정"}
          />
        </div>
        {currentRequest.auth_user_delete_error_code ? (
          <p className="mt-3 text-xs font-bold text-hypo-warning">
            error_code: {currentRequest.auth_user_delete_error_code}
          </p>
        ) : null}
        {currentRequest.auth_cleanup_retry_available ? (
          <Button className="mt-4" disabled={isSubmitting} size="sm" variant="secondary" onClick={retryAuthCleanup}>
            Auth 정리 다시 시도
          </Button>
        ) : null}
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">요청 정보</h3>
        <div className="mt-4 space-y-3 text-sm text-hypo-text">
          <MetaLine label="요청 ID" value={currentRequest.id} />
          {currentRequest.user_id ? <MetaLine label="사용자 ID" value={currentRequest.user_id} /> : null}
          {currentRequest.email_hash_prefix ? (
            <MetaLine label="이메일 hash" value={currentRequest.email_hash_prefix} />
          ) : null}
          <MetaLine label="접수 시각" value={formatDateTime(currentRequest.created_at)} />
          <MetaLine label="수정 시각" value={formatDateTime(currentRequest.updated_at)} />
          {currentRequest.verified_at ? (
            <MetaLine label="확인 시각" value={formatDateTime(currentRequest.verified_at)} />
          ) : null}
          {currentRequest.processed_at ? (
            <MetaLine label="처리 시각" value={formatDateTime(currentRequest.processed_at)} />
          ) : null}
          {currentRequest.auth_user_deleted_at ? (
            <MetaLine label="Auth 삭제 시각" value={formatDateTime(currentRequest.auth_user_deleted_at)} />
          ) : null}
        </div>
      </section>

      <section className="rounded-hypo-xl border border-hypo-border bg-white p-5">
        <h3 className="text-base font-black">보관 메모</h3>
        <p className="mt-3 whitespace-pre-wrap rounded-hypo-lg bg-hypo-surface-muted p-4 text-sm leading-6 text-hypo-text-muted">
          {currentRequest.retention_note ?? "보관 메모가 아직 없습니다."}
        </p>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-hypo-lg border border-hypo-border bg-hypo-surface-muted px-4 py-3">
      <p className="text-xs font-bold text-hypo-text-muted">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="w-20 shrink-0 text-xs font-bold text-hypo-text-muted">{label}</span>
      <span className="min-w-0 break-all">{value}</span>
    </div>
  );
}
