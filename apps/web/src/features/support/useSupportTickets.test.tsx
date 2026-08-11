import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SupportTicket } from "../../shared/api/types";

const mocks = vi.hoisted(() => ({
  createTicket: vi.fn(),
  deleteTicket: vi.fn(),
  listTickets: vi.fn(),
  updateTicket: vi.fn(),
  useAuth: vi.fn(),
}));

const defaultAuthState = {
  accessToken: "token-123",
  appUser: { id: "app-user-1" },
  user: { id: "session-user-1" },
};

vi.mock("../../shared/api/support", () => ({
  supportApi: {
    createTicket: mocks.createTicket,
    deleteTicket: mocks.deleteTicket,
    listTickets: mocks.listTickets,
    updateTicket: mocks.updateTicket,
  },
}));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => mocks.useAuth() ?? defaultAuthState,
}));

import {
  supportTicketQueryKeys,
  useCreateSupportTicket,
  useDeleteSupportTicket,
  useSupportTickets,
} from "./useSupportTickets";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function buildSupportTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    body: "문의 내용을 남겼어요.",
    category: "account",
    contact_email: "founder@example.com",
    created_at: "2026-07-14T10:00:00.000Z",
    id: "ticket-1",
    kind: "inquiry",
    metadata: { source: "web_support" },
    replies: [],
    status: "open",
    subject: "문의 제목",
    target_id: null,
    target_type: null,
    updated_at: "2026-07-14T10:00:00.000Z",
    user_id: "user-1",
    ...overrides,
  };
}

describe("useSupportTickets", () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({
      accessToken: "token-123",
      appUser: { id: "app-user-1" },
      user: { id: "session-user-1" },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps inquiry queries keyed by a stable auth user id instead of the access token", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const ticket = buildSupportTicket({ id: "ticket-stable", user_id: "session-user-1" });

    mocks.listTickets.mockResolvedValue([ticket]);

    const { result, rerender } = renderHook(() => useSupportTickets(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([ticket]));
    expect(mocks.listTickets).toHaveBeenCalledWith(
      "token-123",
      "inquiry",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1", "inquiry")),
    ).toEqual([ticket]);

    mocks.useAuth.mockReturnValue({
      accessToken: "token-456",
      appUser: { id: "session-user-1" },
      user: { id: "session-user-1" },
    });

    rerender();

    await waitFor(() => expect(result.current.data).toEqual([ticket]));
    expect(mocks.listTickets).toHaveBeenCalledTimes(1);
  });

  it("can load all owned ticket kinds for exact notification deep links", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const report = buildSupportTicket({ id: "report-1", kind: "report" });
    mocks.listTickets.mockResolvedValue([report]);

    const { result } = renderHook(() => useSupportTickets(undefined, null), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([report]));
    expect(mocks.listTickets).toHaveBeenCalledWith(
      "token-123",
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1"))).toEqual([report]);
  });

  it("adds a created inquiry ticket only to the matching user caches and invalidates support queries", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const existingInquiry = buildSupportTicket({
      created_at: "2026-07-14T09:00:00.000Z",
      id: "ticket-existing-inquiry",
      user_id: "session-user-1",
    });
    const existingReport = buildSupportTicket({
      category: "abuse",
      created_at: "2026-07-14T09:30:00.000Z",
      id: "ticket-existing-report",
      kind: "report",
      subject: "신고",
      user_id: "session-user-1",
    });
    const otherUserInquiry = buildSupportTicket({
      created_at: "2026-07-14T08:00:00.000Z",
      id: "ticket-other-user",
      user_id: "other-user",
    });
    const createdTicket = buildSupportTicket({
      created_at: "2026-07-14T11:00:00.000Z",
      id: "ticket-created",
      subject: "새 문의",
      user_id: "session-user-1",
    });

    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1", "inquiry"), [existingInquiry]);
    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1"), [existingReport, existingInquiry]);
    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1", "report"), [existingReport]);
    queryClient.setQueryData(supportTicketQueryKeys.list("other-user", "inquiry"), [otherUserInquiry]);

    mocks.createTicket.mockResolvedValue(createdTicket);

    const { result } = renderHook(() => useCreateSupportTicket(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        body: "새 문의 내용을 남겼어요.",
        category: "account",
        contact_email: "founder@example.com",
        kind: "inquiry",
        subject: "새 문의",
      });
    });

    expect(mocks.createTicket).toHaveBeenCalledWith(
      {
        body: "새 문의 내용을 남겼어요.",
        category: "account",
        contact_email: "founder@example.com",
        kind: "inquiry",
        subject: "새 문의",
      },
      "token-123",
    );
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1", "inquiry"))).toEqual([
      createdTicket,
      existingInquiry,
    ]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1"))).toEqual([
      createdTicket,
      existingReport,
      existingInquiry,
    ]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1", "report"))).toEqual([
      existingReport,
    ]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("other-user", "inquiry"))).toEqual([
      otherUserInquiry,
    ]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: supportTicketQueryKeys.lists("session-user-1"),
    });
  });

  it("removes a deleted inquiry ticket only from the matching user caches and invalidates support queries", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const existingInquiry = buildSupportTicket({
      created_at: "2026-07-14T09:00:00.000Z",
      id: "ticket-existing-inquiry",
      user_id: "session-user-1",
    });
    const existingReport = buildSupportTicket({
      category: "abuse",
      created_at: "2026-07-14T09:30:00.000Z",
      id: "ticket-existing-report",
      kind: "report",
      subject: "신고",
      user_id: "session-user-1",
    });
    const otherUserInquiry = buildSupportTicket({
      created_at: "2026-07-14T08:00:00.000Z",
      id: "ticket-other-user",
      user_id: "other-user",
    });

    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1", "inquiry"), [existingInquiry]);
    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1"), [existingReport, existingInquiry]);
    queryClient.setQueryData(supportTicketQueryKeys.list("session-user-1", "report"), [existingReport]);
    queryClient.setQueryData(supportTicketQueryKeys.list("other-user", "inquiry"), [otherUserInquiry]);

    mocks.deleteTicket.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteSupportTicket(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(existingInquiry.id);
    });

    expect(mocks.deleteTicket).toHaveBeenCalledWith(existingInquiry.id, "token-123");
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1", "inquiry"))).toEqual([]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1"))).toEqual([
      existingReport,
    ]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("session-user-1", "report"))).toEqual([
      existingReport,
    ]);
    expect(queryClient.getQueryData(supportTicketQueryKeys.list("other-user", "inquiry"))).toEqual([
      otherUserInquiry,
    ]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: supportTicketQueryKeys.lists("session-user-1"),
    });
  });
});
