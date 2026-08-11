import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn();
const navigateBack = vi.fn();

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => ({
    appUser: { email: "reporter@example.com", id: "user-1" },
    user: { email: "reporter@example.com", id: "user-1" },
  }),
}));

vi.mock("../features/support/useSupportTickets", () => ({
  useCreateSupportTicket: () => ({ isPending: false, mutateAsync }),
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateBack: (...args: unknown[]) => navigateBack(...args),
}));

import { ReportPage } from "./ReportPage";

describe("ReportPage", () => {
  afterEach(() => {
    cleanup();
    mutateAsync.mockReset();
    navigateBack.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("opens as the report form and cancels directly back to profile", async () => {
    const user = userEvent.setup();

    render(<ReportPage />);

    expect(screen.getByRole("heading", { name: "신고하기" })).toBeInTheDocument();
    expect(screen.getByLabelText("신고 내용")).toBeInTheDocument();
    expect(screen.queryByText("개인정보 요청")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(navigateBack).toHaveBeenCalledWith("/profile");
  });

  it("preserves a valid report target and submits the dedicated report contract", async () => {
    const user = userEvent.setup();
    const targetId = "11111111-1111-4111-8111-111111111111";
    window.history.replaceState(
      null,
      "",
      `/report?target_type=chat_room&target_id=${targetId}&counterpart_name=${encodeURIComponent("김창업")}&interview_title=${encodeURIComponent("구독 서비스 인터뷰")}`,
    );
    mutateAsync.mockResolvedValue({ id: "report-1" });

    render(<ReportPage />);

    expect(screen.getByText("김창업 · 구독 서비스 인터뷰")).toBeInTheDocument();
    await user.type(screen.getByLabelText("신고 내용"), "채팅에서 외부 연락처 공유를 강요했어요.");
    await user.click(screen.getByRole("button", { name: "신고하기" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "chat",
          contact_email: "reporter@example.com",
          kind: "report",
          target_id: targetId,
          target_type: "chat_room",
        }),
      );
    });
    expect(await screen.findByRole("heading", { name: "신고가 접수됐어요" })).toBeInTheDocument();
  });
});
