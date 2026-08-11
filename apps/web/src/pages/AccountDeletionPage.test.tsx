import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  AccountDeletionRequest,
  AccountDeletionVerification,
} from "../shared/api/accountDeletion";
import { AccountDeletionPage } from "./AccountDeletionPage";

const accountDeletionMocks = vi.hoisted(() => ({
  confirmPublic: vi.fn(),
  createPublic: vi.fn(),
  resendPublic: vi.fn(),
  verifyPublic: vi.fn(),
}));

vi.mock("../shared/api/accountDeletion", () => ({
  accountDeletionApi: accountDeletionMocks,
}));

describe("AccountDeletionPage", () => {
  afterEach(() => {
    cleanup();
    accountDeletionMocks.confirmPublic.mockReset();
    accountDeletionMocks.createPublic.mockReset();
    accountDeletionMocks.resendPublic.mockReset();
    accountDeletionMocks.verifyPublic.mockReset();
    vi.useRealTimers();
    window.history.replaceState(null, "", "/account-deletion");
  });

  it("requests public deletion by email and moves focus to the OTP step", async () => {
    const user = userEvent.setup();
    accountDeletionMocks.createPublic.mockResolvedValue(
      buildRequest({
        debug_verification_code: "123456",
      }),
    );

    render(<AccountDeletionPage />);

    await user.type(screen.getByLabelText("가입 이메일"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));

    expect(accountDeletionMocks.createPublic).toHaveBeenCalledWith({
      email: "member@example.com",
      reason: null,
      requester_name: null,
    });
    expect(await screen.findByRole("heading", { name: "인증번호 입력" })).toBeInTheDocument();
    expect(getOtpInput()).toHaveFocus();
    expect(screen.getByRole("button", { name: "90초 후 다시 받기" })).toBeDisabled();
  });

  it("requires explicit final confirmation after OTP verification", async () => {
    const user = userEvent.setup();
    accountDeletionMocks.createPublic.mockResolvedValue(
      buildRequest({
        debug_verification_code: "123456",
      }),
    );
    accountDeletionMocks.verifyPublic.mockResolvedValue(
      buildVerification({
        deletion_authorization: "delete-auth-token",
      }),
    );
    accountDeletionMocks.confirmPublic.mockResolvedValue(
      buildRequest({
        result: "account_deleted_and_direct_identifiers_anonymized",
        status: "completed",
      }),
    );

    render(<AccountDeletionPage />);

    await user.type(screen.getByLabelText("가입 이메일"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));
    await screen.findByRole("heading", { name: "인증번호 입력" });
    await user.type(getOtpInput(), "123456");
    await user.click(screen.getByRole("button", { name: "인증번호 확인하기" }));

    expect(accountDeletionMocks.verifyPublic).toHaveBeenCalledWith({
      code: "123456",
      request_id: "request-1",
    });
    expect(accountDeletionMocks.confirmPublic).not.toHaveBeenCalled();

    const confirmButton = await screen.findByRole("button", { name: "계정을 삭제할게요" });
    expect(confirmButton).toHaveFocus();

    await user.click(confirmButton);

    expect(accountDeletionMocks.confirmPublic).toHaveBeenCalledWith({
      confirm: true,
      deletion_authorization: "delete-auth-token",
      request_id: "request-1",
    });
    expect(await screen.findByRole("heading", { name: "계정 삭제가 완료됐어요" })).toBeInTheDocument();
  });

  it("keeps legacy token links but stops at the final confirm step", async () => {
    window.history.replaceState(
      null,
      "",
      "/account-deletion?request_id=legacy-request&token=legacy-token",
    );
    accountDeletionMocks.verifyPublic.mockResolvedValue(
      buildVerification({
        deletion_authorization: "legacy-delete-auth",
        request: {
          email: "legacy@example.com",
          id: "legacy-request",
        },
      }),
    );

    render(<AccountDeletionPage />);

    const confirmButton = await screen.findByRole("button", { name: "계정을 삭제할게요" });

    expect(accountDeletionMocks.verifyPublic).toHaveBeenCalledWith({
      request_id: "legacy-request",
      token: "legacy-token",
    });
    expect(accountDeletionMocks.confirmPublic).not.toHaveBeenCalled();
    expect(confirmButton).toHaveFocus();
    expect(
      screen.getByText("링크 확인이 끝났어요. 마지막으로 삭제를 확정해 주세요."),
    ).toBeInTheDocument();
  });

  it("resends the OTP after the 90 second cooldown", async () => {
    const user = userEvent.setup();
    const initialAvailableAt = new Date(Date.now() + 1_500).toISOString();
    accountDeletionMocks.createPublic.mockResolvedValue(
      buildRequest({
        verification_resend_available_at: initialAvailableAt,
      }),
    );
    accountDeletionMocks.resendPublic.mockImplementation(() =>
      Promise.resolve(
        buildRequest({
          debug_verification_code: "654321",
          verification_resend_available_at: new Date(Date.now() + 1_500).toISOString(),
        }),
      ),
    );

    render(<AccountDeletionPage />);

    await user.type(screen.getByLabelText("가입 이메일"), "member@example.com");
    await user.click(screen.getByRole("button", { name: "인증번호 받기" }));

    expect(
      screen.getByRole("button", {
        name: /초 후 다시 받기/,
      }),
    ).toBeDisabled();

    const resendButton = await screen.findByRole(
      "button",
      { name: "인증번호 다시 받기" },
      { timeout: 3_000 },
    );
    expect(resendButton).toBeEnabled();

    await user.click(resendButton);

    expect(accountDeletionMocks.resendPublic).toHaveBeenCalledWith({
      request_id: "request-1",
    });
    expect(
      screen.getByRole("button", {
        name: /초 후 다시 받기/,
      }),
    ).toBeDisabled();
  });
});

function buildRequest(
  overrides: Partial<AccountDeletionRequest> = {},
): AccountDeletionRequest {
  return {
    auth_user_delete_error_code: null,
    auth_user_delete_status: null,
    auth_user_deleted_at: null,
    created_at: "2026-07-14T09:00:00.000Z",
    debug_verification_code: null,
    email: "member@example.com",
    email_hash: "hash",
    email_redacted_at: null,
    id: "request-1",
    reason: null,
    requester_name: null,
    result: "verification_email_sent",
    retention_note: null,
    retention_until: null,
    source: "public_web",
    status: "requested",
    updated_at: "2026-07-14T09:00:00.000Z",
    user_id: null,
    verification_expires_at: "2026-07-14T09:10:00.000Z",
    verification_resend_available_at: new Date(Date.now() + 90_000).toISOString(),
    verified_at: null,
    ...overrides,
  };
}

function buildVerification(
  overrides: {
    deletion_authorization?: string;
    deletion_authorization_expires_at?: string;
    request?: Partial<AccountDeletionRequest>;
  } = {},
): AccountDeletionVerification {
  return {
    deletion_authorization: overrides.deletion_authorization ?? "delete-auth-token",
    deletion_authorization_expires_at:
      overrides.deletion_authorization_expires_at ?? "2026-07-14T09:05:00.000Z",
    request: buildRequest({
      status: "verified",
      verified_at: "2026-07-14T09:00:30.000Z",
      verification_expires_at: null,
      ...overrides.request,
    }),
  };
}

function getOtpInput() {
  return document.getElementById("account-deletion-otp") as HTMLInputElement;
}
