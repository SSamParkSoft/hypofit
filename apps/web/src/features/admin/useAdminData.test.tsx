import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../../shared/api/admin";
import type { AdminSupportTicket } from "../../shared/api/types";
import { useAdminData } from "./useAdminData";

const options = { adminId: "admin-1", accessToken: "token", section: "tickets" as const, statusFilter: "all" as const, deletedFilter: "all" as const, deletionStatusFilter: "all" as const, search: "검색 대상", deletionSearch: "", selectedTicketId: null };
const ticket = (id: string): AdminSupportTicket => ({ id, user_id: "user-1", kind: "inquiry", category: "other", subject: id, body: "문의 내용", contact_email: "test@example.com", target_id: null, target_type: null, status: "open", deleted_by_user_at: null, metadata: {}, created_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-05T00:00:00Z", replies: [], events: [] });
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.spyOn(adminApi, "getSummary").mockResolvedValue({ support: { open: 0, in_review: 0, reports_open: 0, account_deletion_open: 0 }, health: { api: "ok", database: "ok", outbound_email: "configured", push: "ready" } });
  vi.spyOn(adminApi, "listTickets").mockResolvedValue([]);
  vi.spyOn(adminApi, "getTicket").mockResolvedValue(ticket("0"));
  vi.spyOn(adminApi, "listNotices").mockResolvedValue([]);
  vi.spyOn(adminApi, "listMaintenances").mockResolvedValue([]);
  vi.spyOn(adminApi, "listAccountDeletionRequests").mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("admin scoped server data", () => {
  it("searches on the server, fetches the next page and removes duplicate rows", async () => {
    vi.mocked(adminApi.listTickets).mockResolvedValueOnce(Array.from({ length: 50 }, (_, index) => ticket(String(index)))).mockResolvedValueOnce([ticket("49"), ticket("50")]);
    const { result } = renderHook(() => useAdminData(options), { wrapper });
    await waitFor(() => expect(result.current.tickets).toHaveLength(50));
    expect(adminApi.listTickets).toHaveBeenCalledWith(expect.objectContaining({ q: "검색 대상", offset: 0, limit: 50, exclude_reports: true, include_events: false }), "token", expect.any(AbortSignal));
    await act(async () => { result.current.loadMoreTickets(); });
    await waitFor(() => expect(result.current.tickets).toHaveLength(51));
    expect(adminApi.listTickets).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 }), "token", expect.any(AbortSignal));
    expect(result.current.hasMoreTickets).toBe(false);
  });
  it("loads only the chosen section and uses stable user identity for keys", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = renderHook(({ accessToken }) => useAdminData({ ...options, accessToken, section: "notices" }), { initialProps: { accessToken: "token" }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await waitFor(() => expect(adminApi.listNotices).toHaveBeenCalled());
    expect(adminApi.listTickets).not.toHaveBeenCalled();
    expect(adminApi.listMaintenances).not.toHaveBeenCalled();
    expect(adminApi.listAccountDeletionRequests).not.toHaveBeenCalled();
    rerender({ accessToken: "refreshed-token" });
    expect(client.getQueryCache().getAll().every((query) => !JSON.stringify(query.queryKey).includes("token"))).toBe(true);
  });
  it("separates reports and resolves a direct ticket link outside the loaded page", async () => {
    vi.mocked(adminApi.getTicket).mockResolvedValue(ticket("direct-id"));
    const { result } = renderHook(() => useAdminData({ ...options, section: "reports", selectedTicketId: "direct-id" }), { wrapper });
    await waitFor(() => expect(result.current.selectedTicket?.id).toBe("direct-id"));
    expect(adminApi.listTickets).toHaveBeenCalledWith(expect.objectContaining({ kind: "report", exclude_reports: false }), "token", expect.any(AbortSignal));
    expect(adminApi.getTicket).toHaveBeenCalledWith("direct-id", "token", expect.any(AbortSignal));
  });
  it("passes deletion search and page to the server", async () => {
    renderHook(() => useAdminData({ ...options, section: "deletion", deletionSearch: "request-id" }), { wrapper });
    await waitFor(() => expect(adminApi.listAccountDeletionRequests).toHaveBeenCalledWith(expect.objectContaining({ q: "request-id", page: 0, limit: 50 }), "token", expect.any(AbortSignal)));
    expect(adminApi.listTickets).not.toHaveBeenCalled();
  });
  it("exposes target lookup failures rather than leaving the preview loading", async () => {
    const error = new Error("target unavailable");
    vi.mocked(adminApi.getTicket).mockResolvedValue({ ...ticket("target-ticket"), target_type: "user", target_id: "user-1" });
    vi.spyOn(adminApi, "getTargetPreview").mockRejectedValue(error);
    const { result } = renderHook(() => useAdminData({ ...options, selectedTicketId: "target-ticket" }), { wrapper });
    await waitFor(() => expect(result.current.targetError).toBe(error));
    expect(result.current.error).toBe(error);
    expect(result.current.selectedTicket?.id).toBe("target-ticket");
  });
});
