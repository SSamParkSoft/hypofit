import { act, renderHook, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AccountDeletionRequest,
  AccountDeletionVerification,
} from "../../../shared/api/accountDeletion";

const accountDeletionMocks = vi.hoisted(() => ({
  confirmPublic: vi.fn(),
  createPublic: vi.fn(),
  resendPublic: vi.fn(),
  verifyPublic: vi.fn(),
}));

vi.mock("../../../shared/api/accountDeletion", () => ({
  accountDeletionApi: accountDeletionMocks,
}));

import { useAccountDeletionPageController } from "./useAccountDeletionPageController";

describe("useAccountDeletionPageController", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/account-deletion");
  });

  afterEach(() => {
    accountDeletionMocks.confirmPublic.mockReset();
    accountDeletionMocks.createPublic.mockReset();
    accountDeletionMocks.resendPublic.mockReset();
    accountDeletionMocks.verifyPublic.mockReset();
    window.history.replaceState(null, "", "/account-deletion");
  });

  it("keeps the request_id fallback when a legacy verification link fails", async () => {
    window.history.replaceState(
      null,
      "",
      "/account-deletion?request_id=legacy-request&token=expired-token",
    );
    accountDeletionMocks.verifyPublic.mockRejectedValue(new Error("request failed 410"));

    const { result } = renderHook(() => useAccountDeletionPageController());

    await waitFor(() => expect(result.current.step).toBe("link-error"));

    expect(accountDeletionMocks.verifyPublic).toHaveBeenCalledWith({
      request_id: "legacy-request",
      token: "expired-token",
    });
    expect(result.current.feedback).toEqual({
      message: "링크가 만료됐어요. 새 인증번호를 받아 다시 진행해 주세요.",
      tone: "error",
    });
    expect(window.location.pathname).toBe("/account-deletion");
    expect(window.location.search).toBe("?request_id=legacy-request");
  });

  it("drives the public request flow to completion and clears the query string", async () => {
    accountDeletionMocks.createPublic.mockResolvedValue(
      buildRequest({
        verification_resend_available_at: "2026-07-16T00:01:30.000Z",
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

    const { result } = renderHook(() => useAccountDeletionPageController());

    act(() => {
      result.current.setEmail("member@example.com");
    });

    await act(async () => {
      await result.current.handleRequestSubmit(buildFormEvent());
    });

    await waitFor(() => expect(result.current.step).toBe("otp"));
    expect(window.location.search).toBe("?request_id=request-1");

    act(() => {
      result.current.setOtp("123456");
    });

    await act(async () => {
      await result.current.handleVerifySubmit(buildFormEvent());
    });

    await waitFor(() => expect(result.current.step).toBe("confirm"));
    expect(accountDeletionMocks.verifyPublic).toHaveBeenCalledWith({
      code: "123456",
      request_id: "request-1",
    });

    await act(async () => {
      await result.current.handleConfirmDeletion();
    });

    await waitFor(() => expect(result.current.step).toBe("complete"));
    expect(accountDeletionMocks.confirmPublic).toHaveBeenCalledWith({
      confirm: true,
      deletion_authorization: "delete-auth-token",
      request_id: "request-1",
    });
    expect(window.location.pathname).toBe("/account-deletion");
    expect(window.location.search).toBe("");
  });
});

function buildFormEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>;
}

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
    verification_resend_available_at: "2026-07-14T09:01:30.000Z",
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
