import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { adminApi } from "../../../shared/api/admin";
import type { AdminAccountDeletionRequest } from "../../../shared/api/types";
import { AccountDeletionDetailPanel } from "./AccountDeletionDetailPanel";

const request: AdminAccountDeletionRequest = {
  id: "deletion-request-1", user_id: "user-1", requester_name: null,
  email_display: "삭제 후 비공개", email_hash_prefix: null, email_redacted_at: "2026-10-18T12:00:00Z",
  reason: null, status: "completed", source: "mobile_app", verification_status: "verified",
  cleanup_status: "account_deleted", result: "account_deleted_and_direct_identifiers_anonymized",
  profile_image_cleanup_status: "delete_failed", auth_user_delete_status: "deleted",
  auth_user_deleted_at: "2026-10-18T12:00:00Z", auth_user_delete_error_code: null,
  auth_cleanup_retry_available: false, retention_note: null, retention_until: "2027-10-18T12:00:00Z",
  verified_at: "2026-10-18T12:00:00Z", processed_by: null, processed_at: "2026-10-18T12:00:00Z",
  created_at: "2026-10-18T12:00:00Z", updated_at: "2026-10-18T12:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(value = request) {
  const onAction = vi.fn();
  const onError = vi.fn();
  render(<AccountDeletionDetailPanel accessToken="fixture-token" request={value} onAction={onAction} onError={onError} />);
  return { onAction, onError };
}

describe("AccountDeletionDetailPanel image cleanup", () => {
  it("requires confirmation before image retry independently of completed Auth cleanup", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const retry = vi.spyOn(adminApi, "retryAccountDeletionProfileImageCleanup")
      .mockResolvedValue({ ...request, profile_image_cleanup_status: "deleted" });
    const { onAction } = setup();
    const button = screen.getByRole("button", { name: "프로필 이미지 삭제 재시도" });
    await userEvent.click(button);
    expect(retry).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await userEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith(request.id, "fixture-token");
    expect(onAction).toHaveBeenCalledWith("프로필 이미지 삭제를 완료했습니다.");
  });

  it.each(["deleted", "already_missing", "no_profile_image", null])("does not retry a %s image", (status) => {
    setup({ ...request, profile_image_cleanup_status: status });
    expect(screen.queryByRole("button", { name: "프로필 이미지 삭제 재시도" })).not.toBeInTheDocument();
  });

  it("does not offer image deletion before account deletion is complete", () => {
    setup({ ...request, status: "verified" });
    expect(screen.queryByRole("button", { name: "프로필 이미지 삭제 재시도" })).not.toBeInTheDocument();
  });

  it("blocks repeated clicks and reports retained photos without claiming deletion", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolve!: (value: AdminAccountDeletionRequest) => void;
    const retry = vi.spyOn(adminApi, "retryAccountDeletionProfileImageCleanup")
      .mockImplementation(() => new Promise((done) => { resolve = done; }));
    const { onAction } = setup();
    const button = screen.getByRole("button", { name: "프로필 이미지 삭제 재시도" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => { resolve(request); });
    expect(onAction).toHaveBeenCalledWith("삭제 재시도 후에도 사진이 남아 있습니다. 처리 상태를 확인해 주세요.");
    expect(button).toBeEnabled();
  });

  it("preserves the request on transport failure and allows another attempt", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(adminApi, "retryAccountDeletionProfileImageCleanup").mockRejectedValue(new Error("offline"));
    const { onAction, onError } = setup();
    const button = screen.getByRole("button", { name: "프로필 이미지 삭제 재시도" });
    await userEvent.click(button);
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByText("삭제 후 비공개")).toBeInTheDocument();
    expect(button).toBeEnabled();
  });
});
