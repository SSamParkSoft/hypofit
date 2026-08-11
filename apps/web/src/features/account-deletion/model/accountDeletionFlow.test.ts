import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCompletionDescription,
  getCompletionTitle,
  getCurrentStepNumber,
  getAccountDeletionPath,
  getLegacyLinkErrorMessage,
  getResendButtonLabel,
  getResendCooldown,
  getVerifyErrorMessage,
  normalizeOtp,
  parseAccountDeletionVerificationParams,
} from "./accountDeletionFlow";

describe("accountDeletionFlow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps steps to the current progress index", () => {
    expect(getCurrentStepNumber("request")).toBe(1);
    expect(getCurrentStepNumber("otp")).toBe(2);
    expect(getCurrentStepNumber("verifying-link")).toBe(2);
    expect(getCurrentStepNumber("confirm")).toBe(3);
    expect(getCurrentStepNumber("complete")).toBe(3);
  });

  it("returns the completion copy for a missing active account", () => {
    expect(getCompletionTitle({ result: "no_matching_active_account" } as never)).toBe(
      "삭제 요청을 마무리했어요",
    );
    expect(getCompletionDescription({ result: "no_matching_active_account" } as never)).toBe(
      "같은 이메일의 활성 계정을 찾지 못해 요청을 종료했어요. 이미 탈퇴가 끝난 계정이었을 수 있어요.",
    );
  });

  it("returns the standard completion copy for a deleted account", () => {
    expect(getCompletionTitle(null)).toBe("계정 삭제가 완료됐어요");
    expect(getCompletionDescription(null)).toBe(
      "계정과 직접 식별 정보 삭제가 시작됐어요. 완료된 이전 활동과 계정 정보는 복구되지 않아요.",
    );
  });

  it("calculates the resend cooldown from the next available timestamp", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-07-16T00:00:00.000Z"));

    expect(getResendCooldown("2026-07-16T00:00:01.500Z")).toBe(2);
    expect(getResendCooldown("2026-07-16T00:02:30.000Z")).toBe(90);
    expect(getResendCooldown("2026-07-15T23:59:59.000Z")).toBe(0);
  });

  it("maps API status errors to the public verification copy", () => {
    expect(getVerifyErrorMessage(new Error("request failed 410"))).toBe(
      "인증번호가 만료됐어요. 인증번호를 다시 받아 주세요.",
    );
    expect(getLegacyLinkErrorMessage(new Error("request failed 409"))).toBe(
      "이미 확인된 링크이거나 지금은 사용할 수 없는 링크예요. 삭제를 마무리하지 못했다면 새 인증번호를 받아 주세요.",
    );
  });

  it("parses legacy verification params and keeps request-only URLs as the fallback route", () => {
    expect(parseAccountDeletionVerificationParams("?request_id=req-1&token=legacy-token")).toEqual({
      code: null,
      requestId: "req-1",
      token: "legacy-token",
    });
    expect(parseAccountDeletionVerificationParams("?request_id=req-1")).toBeNull();
    expect(getAccountDeletionPath("req-1")).toBe("/account-deletion?request_id=req-1");
    expect(getAccountDeletionPath()).toBe("/account-deletion");
  });

  it("normalizes otp input and resend button copy", () => {
    expect(normalizeOtp("12a3 4-56")).toBe("123456");
    expect(getResendButtonLabel({ isResending: true, resendCooldown: 0 })).toBe(
      "다시 보내는 중",
    );
    expect(getResendButtonLabel({ isResending: false, resendCooldown: 12 })).toBe(
      "12초 후 다시 받기",
    );
  });
});
