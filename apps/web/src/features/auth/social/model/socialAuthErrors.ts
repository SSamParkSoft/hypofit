import { getApiErrorPresentation } from "../../../../shared/api/errorPresentation";

export interface SocialAuthFeedback {
  message: string;
  tone: "error" | "success";
}

export interface SocialAuthCallbackErrorPresentation {
  actionLabel: string;
  message: string;
  title: string;
}

function isStorageUnavailableMessage(message: string) {
  return (
    message.includes("storage unavailable") ||
    message.includes("storage_unavailable") ||
    message.includes("sessionstorage")
  );
}

function isCancelledMessage(message: string) {
  return (
    message.includes("access_denied") ||
    message.includes("cancel") ||
    message.includes("closed by user") ||
    message.includes("user denied") ||
    message.includes("user_cancelled")
  );
}

function isMissingAttemptMessage(message: string) {
  return message.includes("attempt") && (message.includes("expired") || message.includes("not found"));
}

export function normalizeSocialEntryError(error: unknown): SocialAuthFeedback {
  const { code, message } = getApiErrorPresentation(
    error,
    "소셜 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
  );
  const lowerCode = code?.toLowerCase() ?? "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerCode === "social_provider_review_pending" ||
    lowerCode === "provider_review_pending"
  ) {
    return {
      message: "아직 준비 중인 로그인 방법이에요.",
      tone: "error",
    };
  }

  if (
    lowerCode === "social_unsupported_platform" ||
    lowerCode === "social_provider_disabled"
  ) {
    return {
      message: "지금은 이 로그인 방법을 사용할 수 없어요.",
      tone: "error",
    };
  }

  if (isStorageUnavailableMessage(lowerMessage)) {
    return {
      message: "브라우저 보안 설정 때문에 소셜 로그인을 시작하지 못했어요.",
      tone: "error",
    };
  }

  if (isCancelledMessage(lowerMessage)) {
    return {
      message: "로그인을 취소했어요. 다른 방법으로 계속할 수 있어요.",
      tone: "error",
    };
  }

  return {
    message,
    tone: "error",
  };
}

export function normalizeSocialCallbackUrlError(
  errorCode: string | null,
  errorDescription: string | null,
): SocialAuthCallbackErrorPresentation {
  const normalizedCode = errorCode?.trim().toLowerCase() ?? "";
  const normalizedDescription = errorDescription?.trim().toLowerCase() ?? "";

  if (
    normalizedCode === "access_denied" ||
    normalizedCode === "user_cancelled" ||
    normalizedDescription.includes("cancel")
  ) {
    return {
      actionLabel: "다시 로그인하기",
      message: "로그인을 취소했어요. 같은 소셜 로그인 방법으로 다시 시도해 주세요.",
      title: "소셜 로그인을 취소했어요",
    };
  }

  return {
    actionLabel: "다시 시도하기",
    message: "소셜 로그인을 완료하지 못했어요. 같은 버튼으로 다시 시작해 주세요.",
    title: "로그인을 완료하지 못했어요",
  };
}

export function normalizeSocialCallbackError(error: unknown): SocialAuthCallbackErrorPresentation {
  const { code, message } = getApiErrorPresentation(
    error,
    "소셜 로그인을 완료하지 못했어요. 다시 시도해 주세요.",
  );
  const lowerCode = code?.toLowerCase() ?? "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerCode === "social_attempt_expired" ||
    lowerCode === "social_attempt_not_found" ||
    isMissingAttemptMessage(lowerMessage)
  ) {
    return {
      actionLabel: "다시 로그인하기",
      message: "로그인 연결 시간이 지나서 다시 시작해야 해요.",
      title: "로그인을 다시 시작해 주세요",
    };
  }

  if (
    lowerCode === "social_identity_conflict" ||
    lowerCode === "social_account_link_required" ||
    lowerCode === "identity_already_exists"
  ) {
    return {
      actionLabel: "계정 정보 확인하기",
      message:
        lowerCode === "social_account_link_required"
          ? "같은 이메일의 Hypofit 계정이 있어요. 기존 계정으로 로그인한 뒤 연결해 주세요."
          : "다른 Hypofit 계정에 이미 연결된 로그인 방법이에요.",
      title: "이미 연결된 로그인 방법이에요",
    };
  }

  if (isCancelledMessage(lowerMessage)) {
    return {
      actionLabel: "다시 로그인하기",
      message: "로그인을 취소했어요. 다른 방법으로 계속할 수 있어요.",
      title: "소셜 로그인을 취소했어요",
    };
  }

  return {
    actionLabel: "다시 시도하기",
    message,
    title: "로그인을 완료하지 못했어요",
  };
}
