import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SupportTicket } from "@hypofit/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSupportTickets = vi.fn();
const mockCreateTicket = vi.fn();
const mockReplacePath = vi.fn();

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => ({
    accessToken: "access-token",
    appUser: { email: "user@example.com", id: "user-1" },
    user: { email: "user@example.com", id: "user-1" },
  }),
}));

vi.mock("../features/support/useSupportTickets", () => ({
  useSupportTickets: (...args: unknown[]) => mockUseSupportTickets(...args),
  useCreateSupportTicket: () => ({ isPending: false, mutateAsync: mockCreateTicket }),
  useUpdateSupportTicket: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDeleteSupportTicket: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
  replacePath: (...args: unknown[]) => mockReplacePath(...args),
}));

import { SupportInboxPage } from "./SupportInboxPage";

const ticket: SupportTicket = {
  body: "인터뷰 신청 상태가 바뀌지 않아요.",
  category: "application",
  contact_email: "user@example.com",
  created_at: "2026-07-14T01:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  kind: "inquiry",
  metadata: {},
  replies: [
    {
      created_at: "2026-07-14T02:00:00.000Z",
      id: "reply-1",
      message: "신청 상태를 확인해 반영했어요.",
      ticket_id: "11111111-1111-4111-8111-111111111111",
    },
  ],
  status: "resolved",
  subject: "신청 상태 문의",
  target_id: null,
  target_type: null,
  updated_at: "2026-07-14T02:00:00.000Z",
  user_id: "user-1",
};

describe("SupportInboxPage", () => {
  beforeEach(() => {
    mockCreateTicket.mockReset();
    mockReplacePath.mockReset();
    mockUseSupportTickets.mockReturnValue({
      data: [ticket],
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders a scannable inquiry list with an exact detail link", () => {
    render(<SupportInboxPage mode="list" />);

    expect(screen.getByText("내 문의 1건")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /신청 상태 문의/ })).toHaveAttribute(
      "href",
      `/support/inquiries/${ticket.id}`,
    );
    expect(screen.getByText("답변 완료")).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex,nofollow",
    );
  });

  it("replaces desktop row selection so the page back action returns to profile", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      matches: query === "(min-width: 1200px)",
      media: query,
      removeEventListener: vi.fn(),
    })));
    render(<SupportInboxPage mode="list" />);

    await user.click(screen.getByRole("link", { name: /신청 상태 문의/ }));

    expect(mockReplacePath).toHaveBeenCalledWith(
      `/support/inquiries/${ticket.id}`,
      {
        focus: "none",
        intent: "state",
        scroll: "preserve",
      },
    );
  });

  it("shows the submitted body and operator reply in detail mode", () => {
    render(<SupportInboxPage mode="detail" ticketId={ticket.id} />);

    expect(screen.getByRole("heading", { name: "신청 상태 문의" })).toBeInTheDocument();
    expect(screen.getByText("인터뷰 신청 상태가 바뀌지 않아요.")).toBeInTheDocument();
    expect(screen.getByText("신청 상태를 확인해 반영했어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("replaces the composer route with the created ticket detail", async () => {
    const user = userEvent.setup();
    const createdTicket = { ...ticket, id: "22222222-2222-4222-8222-222222222222", status: "open" };
    mockCreateTicket.mockResolvedValue(createdTicket);

    render(<SupportInboxPage mode="new" />);

    await user.type(screen.getByLabelText("문의 내용"), "신청 결과를 확인하고 싶어요.");
    await user.click(screen.getByRole("button", { name: "문의 남기기" }));

    await waitFor(() => {
      expect(mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "신청 결과를 확인하고 싶어요.",
          contact_email: "user@example.com",
          kind: "inquiry",
        }),
      );
      expect(mockReplacePath).toHaveBeenCalledWith(
        `/support/inquiries/${createdTicket.id}`,
        { intent: "replace" },
      );
    });
  });
});
