import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { adminApi } from "../../../shared/api/admin";
import type { AdminModerationAction, AdminSupportTicket, AdminTargetPreview } from "../../../shared/api/types";
import { SupportTicketDetailPanel } from "./SupportTicketDetailPanel";

const reportTicket = {
  id: "ticket-1",
  user_id: "user-12345678",
  kind: "report",
  category: "abuse",
  subject: "스팸 신고",
  body: "반복 메시지를 보냅니다.",
  contact_email: "reporter@example.com",
  target_type: "chat_message",
  target_id: "message-1",
  status: "open",
  deleted_by_user_at: null,
  metadata: {},
  created_at: "2026-07-12T11:58:00Z",
  updated_at: "2026-07-12T12:02:00Z",
  replies: [],
  events: [
    {
      id: "event-1",
      ticket_id: "ticket-1",
      actor_user_id: null,
      actor_type: "user",
      event_type: "created",
      from_status: null,
      to_status: "open",
      message: "신고가 접수되었습니다.",
      metadata: {},
      created_at: "2026-07-12T11:58:00Z",
    },
  ],
} satisfies AdminSupportTicket;

const targetPreview: AdminTargetPreview = {
  target_type: "chat_message",
  target_id: "message-1",
  exists: true,
  title: "문제 메시지",
  summary: "동일한 홍보 문구를 반복 전송",
  status: "visible",
  owner_user_id: "owner-1",
  metadata: {},
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SupportTicketDetailPanel", () => {
  it("rejects too-short visible replies before calling the API", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const replySpy = vi.spyOn(adminApi, "replyToTicket").mockResolvedValue({
      id: "event-2",
      ticket_id: reportTicket.id,
      actor_user_id: "admin-1",
      actor_type: "admin",
      event_type: "reply_created",
      from_status: null,
      to_status: null,
      message: "답변",
      metadata: {},
      created_at: "2026-07-12T12:05:00Z",
    });

    render(
      <SupportTicketDetailPanel
        accessToken="token"
        onAction={vi.fn()}
        onError={onError}
        targetPreview={targetPreview}
        ticket={reportTicket}
      />,
    );

    await user.click(screen.getByRole("button", { name: "답변 보내기" }));

    expect(onError).toHaveBeenCalledWith("답변을 2자 이상 입력해 주세요.");
    expect(replySpy).not.toHaveBeenCalled();
  });

  it("records destructive moderation actions after confirmation", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const result: AdminModerationAction = {
      id: "mod-1",
      actor_user_id: "admin-1",
      target_type: "chat_message",
      target_id: "message-1",
      action: "hide",
      reason: "반복 홍보 메시지",
      source_ticket_id: reportTicket.id,
      metadata: {},
      created_at: "2026-07-12T12:05:00Z",
    };
    const createSpy = vi.spyOn(adminApi, "createModerationAction").mockResolvedValue(result);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <SupportTicketDetailPanel
        accessToken="token"
        onAction={onAction}
        onError={vi.fn()}
        targetPreview={targetPreview}
        ticket={reportTicket}
      />,
    );

    await user.selectOptions(screen.getByLabelText("운영 조치"), "hide");
    await user.type(screen.getByLabelText("조치 사유"), "반복 홍보 메시지");
    await user.click(screen.getByRole("button", { name: "조치 기록" }));

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(
        {
          target_type: "chat_message",
          target_id: "message-1",
          action: "hide",
          reason: "반복 홍보 메시지",
          source_ticket_id: reportTicket.id,
        },
        "token",
      ),
    );
    expect(onAction).toHaveBeenCalledWith("운영 조치를 기록했습니다.");
    expect(screen.getByText("target: chat_message message-1")).toBeInTheDocument();
  });
});
