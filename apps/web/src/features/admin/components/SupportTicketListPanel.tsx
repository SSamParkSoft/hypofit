import type { AdminSupportTicket, SupportTicketStatus } from "../../../shared/api/types";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { EmptyState, LoadingState } from "../../../shared/ui/state";
import {
  deletedTicketFilters,
  formatDate,
  getSectionTitle,
  kindLabels,
  matchesSupportTicketSearch,
  shortText,
  statusIntents,
  statusLabels,
  supportTicketStatusFilters,
  type AdminSection,
} from "../adminViewModel";

interface SupportTicketListPanelProps {
  deletedFilter: "all" | "active" | "deleted";
  isLoading: boolean;
  onDeletedFilterChange: (value: "all" | "active" | "deleted") => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (ticketId: string) => void;
  onStatusFilterChange: (status: SupportTicketStatus | "all") => void;
  search: string;
  section: Extract<AdminSection, "tickets" | "reports">;
  selectedTicketId: string | null;
  statusFilter: SupportTicketStatus | "all";
  tickets: AdminSupportTicket[];
}

export function SupportTicketListPanel({
  deletedFilter,
  isLoading,
  onDeletedFilterChange,
  onRefresh,
  onSearchChange,
  onSelect,
  onStatusFilterChange,
  search,
  section,
  selectedTicketId,
  statusFilter,
  tickets,
}: SupportTicketListPanelProps) {
  const visibleTickets = tickets.filter((ticket) => matchesSupportTicketSearch(ticket, search));

  return (
    <div className="rounded-hypo-xl border border-hypo-border bg-white">
      <div className="flex items-center justify-between border-b border-hypo-border px-5 py-4">
        <div>
          <h2 className="text-lg font-black">{getSectionTitle(section)}</h2>
          <p className="text-sm text-hypo-text-muted">접수된 요청을 검토하고 상태를 바꿉니다.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRefresh}>
          새로고침
        </Button>
      </div>
      <div className="space-y-3 border-b border-hypo-border px-5 py-3">
        <input
          aria-label="티켓 검색"
          className="w-full rounded-hypo-lg border border-hypo-border px-3 py-2 text-sm outline-none focus:border-hypo-brand"
          placeholder="제목, 이메일, 대상 ID, 사용자 ID 검색"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {supportTicketStatusFilters.map((status) => (
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
              {status === "all" ? "전체" : statusLabels[status]}
            </button>
          ))}
          {deletedTicketFilters.map((value) => (
            <button
              key={value}
              className={cn(
                "rounded-hypo-pill px-3 py-1.5 text-xs font-black",
                deletedFilter === value
                  ? "bg-hypo-text text-white"
                  : "bg-hypo-surface-muted text-hypo-text-muted",
              )}
              type="button"
              onClick={() => onDeletedFilterChange(value)}
            >
              {value === "active" ? "활성" : value === "deleted" ? "삭제 요청 포함" : "삭제 전체"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[680px] overflow-y-auto">
        {isLoading ? <LoadingState className="m-4" title="티켓을 불러오는 중입니다." /> : null}
        {!isLoading && visibleTickets.length === 0 ? (
          <EmptyState className="m-4" title="처리할 티켓이 없습니다.">
            필터 조건을 바꾸거나 새로고침해 주세요.
          </EmptyState>
        ) : null}
        {visibleTickets.map((ticket) => (
          <button
            key={ticket.id}
            className={cn(
              "block w-full border-b border-hypo-border px-5 py-4 text-left hover:bg-hypo-surface-muted",
              selectedTicketId === ticket.id && "bg-hypo-brand-soft",
            )}
            type="button"
            onClick={() => onSelect(ticket.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge intent="brand">{kindLabels[ticket.kind]}</Badge>
                  <Badge intent={statusIntents[ticket.status as SupportTicketStatus] ?? "neutral"}>
                    {statusLabels[ticket.status as SupportTicketStatus] ?? ticket.status}
                  </Badge>
                </div>
                <p className="mt-2 truncate text-sm font-black">{ticket.subject || shortText(ticket.body, 48)}</p>
                <p className="mt-1 truncate text-xs text-hypo-text-muted">{ticket.contact_email}</p>
                <p className="mt-1 truncate text-xs text-hypo-text-muted">
                  user {ticket.user_id.slice(0, 8)}
                  {ticket.target_type && ticket.target_id
                    ? ` · ${ticket.target_type} ${ticket.target_id.slice(0, 8)}`
                    : ""}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-hypo-text-muted">
                <p>{formatDate(ticket.updated_at)}</p>
                {ticket.deleted_by_user_at ? <p className="mt-1 font-bold text-hypo-danger">삭제됨</p> : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
