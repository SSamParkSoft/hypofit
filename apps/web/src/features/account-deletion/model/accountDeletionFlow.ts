import type { AccountDeletionRequest } from "../../../shared/api/accountDeletion";

export type FlowStep =
  | "request"
  | "otp"
  | "verifying-link"
  | "confirm"
  | "complete"
  | "link-error";

export type AsyncState = "idle" | "submitting";
export type FeedbackTone = "error" | "success";

export interface FeedbackMessage {
  message: string;
  tone: FeedbackTone;
}

export type Feedback = FeedbackMessage | null;

export interface AccountDeletionVerificationParams {
  code: string | null;
  requestId: string;
  token: string | null;
}

const RESEND_COOLDOWN_SECONDS = 90;

export const EMAIL_INPUT_ID = "account-deletion-email";
export const OTP_INPUT_ID = "account-deletion-otp";

export function getAccountDeletionPath(requestId?: string) {
  if (!requestId) {
    return "/account-deletion";
  }

  const search = new URLSearchParams();
  search.set("request_id", requestId);
  return `/account-deletion?${search.toString()}`;
}

export function parseAccountDeletionVerificationParams(
  search: string,
): AccountDeletionVerificationParams | null {
  const params = new URLSearchParams(search);
  const requestId = params.get("request_id");
  const code = params.get("code");
  const token = params.get("token");

  if (!requestId || (!code && !token)) {
    return null;
  }

  return {
    code,
    requestId,
    token,
  };
}

export function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export const deletionSteps = [
  { label: "가입 이메일 입력", number: "1" },
  { label: "인증번호 확인", number: "2" },
  { label: "마지막 삭제 확인", number: "3" },
] as const;

export function getCurrentStepNumber(step: FlowStep) {
  switch (step) {
    case "otp":
    case "verifying-link":
    case "link-error":
      return 2;
    case "confirm":
    case "complete":
      return 3;
    default:
      return 1;
  }
}

export function getCompletionTitle(request: AccountDeletionRequest | null) {
  if (request?.result === "no_matching_active_account") {
    return "삭제 요청을 마무리했어요";
  }

  return "계정 삭제가 완료됐어요";
}

export function getCompletionDescription(request: AccountDeletionRequest | null) {
  if (request?.result === "no_matching_active_account") {
    return "같은 이메일의 활성 계정을 찾지 못해 요청을 종료했어요. 이미 탈퇴가 끝난 계정이었을 수 있어요.";
  }

  return "계정과 직접 식별 정보 삭제가 시작됐어요. 완료된 이전 활동과 계정 정보는 복구되지 않아요.";
}

export function getResendCooldown(availableAt: string | null | undefined) {
  if (!availableAt) {
    return 0;
  }

  const diffMs = Date.parse(availableAt) - Date.now();
  if (Number.isNaN(diffMs) || diffMs <= 0) {
    return 0;
  }

  return Math.min(RESEND_COOLDOWN_SECONDS, Math.max(1, Math.ceil(diffMs / 1_000)));
}

export function getResendButtonLabel({
  isResending,
  resendCooldown,
}: {
  isResending: boolean;
  resendCooldown: number;
}) {
  if (isResending) {
    return "다시 보내는 중";
  }

  if (resendCooldown > 0) {
    return `${resendCooldown}초 후 다시 받기`;
  }

  return "인증번호 다시 받기";
}

function getApiStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/(\d{3})$/);
  return match ? Number(match[1]) : null;
}

export function getCodeDeliveryFeedback(
  request: AccountDeletionRequest,
  options: { resent: boolean },
): FeedbackMessage {
  const deliveryResult = request.result;

  if (deliveryResult === "verification_code_recently_sent") {
    return {
      message: "최근에 인증번호를 보냈어요. 받은 편지함의 최신 메일을 먼저 확인해 주세요.",
      tone: "success",
    };
  }

  if (deliveryResult === "verification_email_failed") {
    return {
      message:
        import.meta.env.DEV && request.debug_verification_code
          ? "메일 전송을 건너뛰었어요. 로컬 개발 환경에서는 아래 DEV 인증번호로 계속 진행할 수 있어요."
          : "인증번호 메일을 보내지 못했어요. 잠시 후 다시 시도하거나 고객지원에 문의해 주세요.",
      tone: import.meta.env.DEV && request.debug_verification_code ? "success" : "error",
    };
  }

  if (deliveryResult === "verification_email_not_configured") {
    return {
      message:
        import.meta.env.DEV && request.debug_verification_code
          ? "로컬 개발 환경이라 메일 대신 아래 DEV 인증번호를 확인할 수 있어요."
          : "인증 메일 설정을 확인하지 못했어요. 고객지원에 문의해 주세요.",
      tone: import.meta.env.DEV && request.debug_verification_code ? "success" : "error",
    };
  }

  return {
    message: options.resent
      ? "인증번호를 다시 보냈어요. 받은 편지함의 최신 메일을 확인해 주세요."
      : "인증번호를 보냈어요. 받은 편지함의 최신 메일을 확인해 주세요.",
    tone: "success",
  };
}

export function getCreateRequestErrorMessage(error: unknown) {
  const status = getApiStatus(error);

  if (status === 400 || status === 422) {
    return "가입 이메일을 다시 확인해 주세요.";
  }

  if (status === 429) {
    return "잠시 후 다시 시도해 주세요.";
  }

  return "요청을 접수하지 못했어요. 잠시 후 다시 시도하거나 고객지원에 문의해 주세요.";
}

export function getVerifyErrorMessage(error: unknown) {
  const status = getApiStatus(error);

  if (status === 400) {
    return "인증번호 6자리를 다시 확인해 주세요.";
  }

  if (status === 409) {
    return "이미 확인된 요청이거나 지금은 인증을 진행할 수 없어요. 인증번호를 다시 받아 주세요.";
  }

  if (status === 410) {
    return "인증번호가 만료됐어요. 인증번호를 다시 받아 주세요.";
  }

  if (status === 429) {
    return "시도 횟수를 모두 사용했어요. 인증번호를 다시 받아 주세요.";
  }

  if (status === 404) {
    return "삭제 요청을 찾지 못했어요. 다시 시작해 주세요.";
  }

  return "인증번호를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function getResendErrorMessage(error: unknown) {
  const status = getApiStatus(error);

  if (status === 429) {
    return "조금 전 인증번호를 보냈어요. 잠시 후 다시 시도해 주세요.";
  }

  if (status === 404) {
    return "삭제 요청을 찾지 못했어요. 다시 시작해 주세요.";
  }

  if (status === 409) {
    return "지금은 이 요청에 새 인증번호를 보낼 수 없어요. 다시 시작해 주세요.";
  }

  return "인증번호를 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.";
}

export function getConfirmErrorMessage(error: unknown) {
  const status = getApiStatus(error);

  if (status === 400) {
    return "마지막 확인 정보가 올바르지 않아요. 인증번호를 다시 받아 주세요.";
  }

  if (status === 409) {
    return "삭제를 계속하려면 인증번호를 다시 확인해 주세요.";
  }

  if (status === 410) {
    return "마지막 확인 시간이 지났어요. 인증번호를 다시 받아 주세요.";
  }

  if (status === 404) {
    return "삭제 요청을 찾지 못했어요. 다시 시작해 주세요.";
  }

  return "삭제를 완료하지 못했어요. 잠시 후 다시 시도하거나 고객지원에 문의해 주세요.";
}

export function getLegacyLinkErrorMessage(error: unknown) {
  const status = getApiStatus(error);

  if (status === 400) {
    return "링크 확인 정보가 올바르지 않아요. 새 인증번호를 받아 주세요.";
  }

  if (status === 404) {
    return "삭제 요청을 찾지 못했어요. 새 삭제 요청을 시작해 주세요.";
  }

  if (status === 409) {
    return "이미 확인된 링크이거나 지금은 사용할 수 없는 링크예요. 삭제를 마무리하지 못했다면 새 인증번호를 받아 주세요.";
  }

  if (status === 410) {
    return "링크가 만료됐어요. 새 인증번호를 받아 다시 진행해 주세요.";
  }

  if (status === 429) {
    return "시도 횟수를 모두 사용했어요. 새 인증번호를 받아 주세요.";
  }

  return "링크를 확인하지 못했어요. 새 인증번호를 받아 다시 진행해 주세요.";
}
