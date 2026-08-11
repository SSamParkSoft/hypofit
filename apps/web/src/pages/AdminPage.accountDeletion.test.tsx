import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { adminApi } from "../shared/api/admin";
import type { AdminAccountDeletionRequest, AdminMe, AdminSummary } from "../shared/api/types";
import { AdminPage } from "./AdminPage";

const admin: AdminMe = {
  id: "admin-id",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
};

const summary: AdminSummary = {
  support: {
    open: 2,
    in_review: 1,
    reports_open: 1,
    account_deletion_open: 1,
  },
  health: {
    api: "ok",
    database: "ok",
    push: "check_ready_endpoint",
    outbound_email: "check_ready_endpoint",
  },
};

const retryableRequest: AdminAccountDeletionRequest = {
  id: "request-1",
  user_id: "user-1",
  requester_name: null,
  email_display: "삭제 후 비공개 · hash 2f5a9248b1d3",
  email_hash_prefix: "2f5a9248b1d3",
  email_redacted_at: "2026-07-12T12:00:00Z",
  reason: "탈퇴 요청",
  status: "completed",
  source: "public_web",
  verification_status: "verified",
  cleanup_status: "account_deleted",
  result: "account_deleted_and_direct_identifiers_anonymized",
  profile_image_cleanup_status: "delete_failed",
  auth_user_delete_status: "failed_retryable",
  auth_user_deleted_at: null,
  auth_user_delete_error_code: "network_error",
  auth_cleanup_retry_available: true,
  retention_note: "Interview workflow retained.",
  retention_until: "2027-07-12T12:00:00Z",
  verified_at: "2026-07-12T12:00:00Z",
  processed_by: null,
  processed_at: "2026-07-12T12:01:00Z",
  created_at: "2026-07-12T11:58:00Z",
  updated_at: "2026-07-12T12:02:00Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AdminPage account deletion queue", () => {
  it("shows redacted deletion requests without exposing raw email", async () => {
    const user = userEvent.setup();
    vi.spyOn(adminApi, "getMe").mockResolvedValue(admin);
    vi.spyOn(adminApi, "getSummary").mockResolvedValue(summary);
    vi.spyOn(adminApi, "listTickets").mockResolvedValue([]);
    vi.spyOn(adminApi, "listAccountDeletionRequests").mockResolvedValue([retryableRequest]);

    render(<AdminPage accessToken="token" />);

    await user.click(await screen.findByRole("button", { name: "계정 삭제" }));

    expect(await screen.findByText("계정 삭제 큐")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "삭제 후 비공개 · hash 2f5a9248b1d3" })).toBeInTheDocument();
    expect(screen.getAllByText("삭제 후 비공개 · hash 2f5a9248b1d3")).toHaveLength(2);
    expect(screen.queryByText("user@example.com")).not.toBeInTheDocument();
    expect(screen.getByText("Auth 정리 다시 시도")).toBeInTheDocument();
    expect(screen.getByText("이메일 확인 완료")).toBeInTheDocument();
  });

  it("retries auth cleanup from the deletion detail panel", async () => {
    const user = userEvent.setup();
    const updatedRequest = {
      ...retryableRequest,
      auth_user_delete_status: "deleted",
      auth_user_deleted_at: "2026-07-12T12:05:00Z",
      auth_user_delete_error_code: null,
      auth_cleanup_retry_available: false,
      updated_at: "2026-07-12T12:05:00Z",
    } satisfies AdminAccountDeletionRequest;

    vi.spyOn(adminApi, "getMe").mockResolvedValue(admin);
    vi.spyOn(adminApi, "getSummary").mockResolvedValue(summary);
    vi.spyOn(adminApi, "listTickets").mockResolvedValue([]);
    vi.spyOn(adminApi, "listAccountDeletionRequests")
      .mockResolvedValueOnce([retryableRequest])
      .mockResolvedValueOnce([updatedRequest]);
    const retrySpy = vi
      .spyOn(adminApi, "retryAccountDeletionAuthCleanup")
      .mockResolvedValue(updatedRequest);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminPage accessToken="token" />);

    await user.click((await screen.findAllByRole("button", { name: "계정 삭제" }))[0]);
    await user.click(await screen.findByRole("button", { name: "Auth 정리 다시 시도" }));

    await waitFor(() =>
      expect(retrySpy).toHaveBeenCalledWith(retryableRequest.id, "token"),
    );
    expect(await screen.findByText("Auth 정리를 다시 시도했습니다.")).toBeInTheDocument();
  });
});
