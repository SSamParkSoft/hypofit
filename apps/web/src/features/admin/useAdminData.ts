import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../shared/api/admin";
import { apiRequest } from "../../shared/api/client";
import type { AdminAccountDeletionRequest, SupportTicketStatus } from "../../shared/api/types";
import type { AdminSection } from "./adminViewModel";

interface Options {
  adminId: string;
  accessToken: string;
  section: AdminSection;
  statusFilter: SupportTicketStatus | "all";
  deletedFilter: "all" | "active" | "deleted";
  deletionStatusFilter: AdminAccountDeletionRequest["status"] | "all";
  search: string;
  deletionSearch: string;
  selectedTicketId: string | null;
}

const pageSize = 50;

export function useAdminData(options: Options) {
  const { adminId, accessToken, section, statusFilter, deletedFilter, deletionStatusFilter, search } = options;
  const client = useQueryClient();
  const key = ["admin", adminId, "api"] as const;
  const isTickets = section === "tickets" || section === "reports";
  const summary = useQuery({ queryKey: [...key, "summary"], queryFn: ({ signal }) => adminApi.getSummary(accessToken, signal) });
  const tickets = useInfiniteQuery({
    queryKey: [...key, "tickets", section, statusFilter, deletedFilter, search],
    enabled: isTickets,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => adminApi.listTickets({
      kind: section === "reports" ? "report" : undefined,
      exclude_reports: section === "tickets",
      status: statusFilter === "all" ? undefined : statusFilter,
      deleted_by_user: deletedFilter === "all" ? undefined : deletedFilter === "deleted",
      q: search.trim() || undefined,
      offset: pageParam,
      limit: pageSize,
      include_events: false,
    }, accessToken, signal),
    getNextPageParam: (lastPage, pages) => lastPage.length === pageSize ? pages.length * pageSize : undefined,
  });
  const ticketRows = [...new Map((tickets.data?.pages.flat() ?? []).map((ticket) => [ticket.id, ticket])).values()];
  const ticketId = options.selectedTicketId ?? ticketRows[0]?.id;
  const detail = useQuery({
    queryKey: [...key, "ticket", ticketId], enabled: isTickets && Boolean(ticketId), refetchOnWindowFocus: false,
    queryFn: ({ signal }) => adminApi.getTicket(ticketId!, accessToken, signal),
  });
  const selectedTicket = detail.data ?? ticketRows.find((ticket) => ticket.id === ticketId) ?? null;
  const target = useQuery({
    queryKey: [...key, "target", selectedTicket?.target_type, selectedTicket?.target_id],
    enabled: isTickets && Boolean(selectedTicket?.target_type && selectedTicket.target_id),
    queryFn: ({ signal }) => adminApi.getTargetPreview(selectedTicket!.target_type!, selectedTicket!.target_id!, accessToken, signal),
  });
  const notices = useQuery({ queryKey: [...key, "notices"], enabled: section === "notices", queryFn: ({ signal }) => adminApi.listNotices(accessToken, signal) });
  const operations = useQuery({ queryKey: [...key, "operations"], enabled: section === "operations", queryFn: ({ signal }) => adminApi.listMaintenances(accessToken, signal) });
  const deletion = useInfiniteQuery({
    queryKey: [...key, "deletion", deletionStatusFilter, options.deletionSearch], enabled: section === "deletion", initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => adminApi.listAccountDeletionRequests({ status: deletionStatusFilter === "all" ? undefined : deletionStatusFilter, limit: pageSize, page: pageParam, q: options.deletionSearch.trim() || undefined }, accessToken, signal),
    getNextPageParam: (lastPage, pages) => lastPage.length === pageSize ? pages.length : undefined,
  });
  const health = useQuery({
    queryKey: [...key, "health"], enabled: section === "health",
    queryFn: ({ signal }) => apiRequest<Record<string, unknown>>("/api/v1/health/ready", { signal }),
  });
  const current = isTickets ? tickets : section === "notices" ? notices : section === "operations" ? operations : section === "deletion" ? deletion : health;
  return {
    summary: summary.data ?? null,
    tickets: ticketRows,
    selectedTicket,
    targetPreview: target.data ?? null,
    targetError: target.error,
    notices: notices.data ?? [],
    maintenances: operations.data ?? [],
    deletionRequests: [...new Map((deletion.data?.pages.flat() ?? []).map((request) => [request.id, request])).values()],
    hasMoreDeletionRequests: deletion.hasNextPage,
    loadMoreDeletionRequests: () => { if (!deletion.isFetching) void deletion.fetchNextPage(); },
    health,
    isLoading: section === "push" ? false : current.isFetching,
    error: (section === "push" ? null : current.error) ?? summary.error ?? (isTickets ? detail.error ?? target.error : null),
    hasMoreTickets: tickets.hasNextPage,
    loadMoreTickets: () => { if (!tickets.isFetching) void tickets.fetchNextPage(); },
    refresh: () => {
      void client.invalidateQueries({ queryKey: [...key, "summary"] });
      if (section !== "push") void client.invalidateQueries({ queryKey: [...key, isTickets ? "tickets" : section] });
      if (isTickets) {
        void client.invalidateQueries({ queryKey: [...key, "ticket"] });
        void client.invalidateQueries({ queryKey: [...key, "target"] });
      }
    },
  };
}
