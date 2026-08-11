import type { AdminAccountDeletionRequest } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { EmptyState, LoadingState } from "../../../shared/ui/state";
import {
  getAccountDeletionStatusIntent,
  getAccountDeletionStatusLabel,
  getAuthCleanupIntent,
  getAuthCleanupLabel,
  getCleanupStatusLabel,
  getVerificationStatusLabel,
  matchesAccountDeletionSearch,
} from "../accountDeletionQueue";
import { accountDeletionStatusFilters, formatDate } from "../adminViewModel";

interface AccountDeletionListPanelProps {
  isLoading: boolean;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (requestId: string) => void;
  onStatusFilterChange: (status: AdminAccountDeletionRequest["status"] | "all") => void;
  requests: AdminAccountDeletionRequest[];
  search: string;
  selectedRequestId: string | null;
  statusFilter: AdminAccountDeletionRequest["status"] | "all";
}

export function AccountDeletionListPanel({
  isLoading,
  onRefresh,
  onSearchChange,
  onSelect,
  onStatusFilterChange,
  requests,
  search,
  selectedRequestId,
  statusFilter,
}: AccountDeletionListPanelProps) {
  const visibleRequests = requests.filter((request) => matchesAccountDeletionSearch(request, search));

  return (
    <div className="rounded-hypo-xl border border-hypo-border bg-white">
      <div className="flex items-center justify-between border-b border-hypo-border px-5 py-4">
        <div>
          <h2 className="text-lg font-black">계정 삭제 큐</h2>
          <p className="text-sm text-hypo-text-muted">삭제 요청, 정리 상태, Auth 재시도 필요 여부를 확인합니다.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          새로고침
        </Button>
      </div>
      <div className="space-y-3 border-b border-hypo-border px-5 py-3">
        <input
          aria-label="삭제 요청 검색"
          className="w-full rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm outline-none focus:border-hypo-brand"
          placeholder="이메일 참조, 요청 ID, 사용자 ID, 사유 검색"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {accountDeletionStatusFilters.map((status) => (
            <button
              key={status}
              className={cn(
                "rounded-hypo-pill px-3 py-1.5 text-xs font-black",
                statusFilter === status
                  ? "bg-hypo-brand text-white"
                  : "bg-hypo-surface-muted text-hypo-text-muted",
              )}
              type="button"
              onClick={() => onStatusFilterChange(status)}
            >
              {status === "all" ? "전체" : getAccountDeletionStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[680px] overflow-y-auto">
        {isLoading ? <LoadingState className="m-4" title="삭제 요청을 불러오는 중입니다." /> : null}
        {!isLoading && visibleRequests.length === 0 ? (
          <EmptyState className="m-4" title="처리할 삭제 요청이 없습니다.">
            필터 조건을 바꾸거나 새로고침해 주세요.
          </EmptyState>
        ) : null}
        {visibleRequests.map((request) => (
          <button
            key={request.id}
            className={cn(
              "block w-full border-b border-hypo-border px-5 py-4 text-left hover:bg-hypo-surface-muted",
              selectedRequestId === request.id && "bg-hypo-brand-soft",
            )}
            type="button"
            onClick={() => onSelect(request.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge intent={getAccountDeletionStatusIntent(request.status)}>
                    {getAccountDeletionStatusLabel(request.status)}
                  </Badge>
                  <Badge intent={getAuthCleanupIntent(request)}>{getAuthCleanupLabel(request.auth_user_delete_status)}</Badge>
                </div>
                <p className="mt-2 truncate text-sm font-black">{request.email_display}</p>
                <p className="mt-1 truncate text-xs text-hypo-text-muted">
                  {getVerificationStatusLabel(request.verification_status)} · {getCleanupStatusLabel(request.cleanup_status)}
                </p>
                <p className="mt-1 truncate text-xs text-hypo-text-muted">
                  request {request.id.slice(0, 8)}
                  {request.user_id ? ` · user ${request.user_id.slice(0, 8)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-hypo-text-muted">
                <p>{formatDate(request.updated_at)}</p>
                {request.auth_cleanup_retry_available ? (
                  <p className="mt-1 font-bold text-hypo-warning">재시도 가능</p>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
