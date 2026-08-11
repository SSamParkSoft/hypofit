import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AccountDeletionRequest,
  type AccountDeletionVerification,
  accountDeletionApi,
} from "../../../shared/api/accountDeletion";
import {
  type AsyncState,
  EMAIL_INPUT_ID,
  getAccountDeletionPath,
  getCodeDeliveryFeedback,
  getCompletionDescription,
  getCompletionTitle,
  getConfirmErrorMessage,
  getCreateRequestErrorMessage,
  getLegacyLinkErrorMessage,
  getResendCooldown,
  getResendErrorMessage,
  getVerifyErrorMessage,
  normalizeOtp,
  OTP_INPUT_ID,
  parseAccountDeletionVerificationParams,
  type Feedback,
  type FlowStep,
} from "./accountDeletionFlow";

export function useAccountDeletionPageController() {
  const verificationParams = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return parseAccountDeletionVerificationParams(window.location.search);
  }, []);

  const [step, setStep] = useState<FlowStep>(verificationParams ? "verifying-link" : "request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [deletionAuthorization, setDeletionAuthorization] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [requestState, setRequestState] = useState<AsyncState>("idle");
  const [verifyState, setVerifyState] = useState<AsyncState>("idle");
  const [confirmState, setConfirmState] = useState<AsyncState>("idle");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const stateTitleRef = useRef<HTMLHeadingElement>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const replaceAccountDeletionUrl = useCallback((nextRequestId?: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.replaceState(null, "", getAccountDeletionPath(nextRequestId));
  }, []);

  const resetRequestFlow = useCallback(() => {
    setStep("request");
    setEmail("");
    setOtp("");
    setRequest(null);
    setDeletionAuthorization(null);
    setFeedback(null);
    setRequestState("idle");
    setVerifyState("idle");
    setConfirmState("idle");
    setIsResending(false);
    setResendCooldown(0);
    replaceAccountDeletionUrl();
  }, [replaceAccountDeletionUrl]);

  const moveToOtpStep = useCallback(
    (
      nextRequest: AccountDeletionRequest,
      nextFeedback: Feedback,
      options: { clearOtp?: boolean } = {},
    ) => {
      setRequest(nextRequest);
      setEmail(nextRequest.email);
      setDeletionAuthorization(null);
      setFeedback(nextFeedback);
      setStep("otp");
      setResendCooldown(getResendCooldown(nextRequest.verification_resend_available_at));
      if (options.clearOtp ?? true) {
        setOtp("");
      }
      replaceAccountDeletionUrl(nextRequest.id);
    },
    [replaceAccountDeletionUrl],
  );

  const moveToConfirmStep = useCallback(
    (verification: AccountDeletionVerification, nextFeedback: Feedback) => {
      setRequest(verification.request);
      setEmail(verification.request.email);
      setDeletionAuthorization(verification.deletion_authorization);
      setFeedback(nextFeedback);
      setStep("confirm");
      setOtp("");
      replaceAccountDeletionUrl(verification.request.id);
    },
    [replaceAccountDeletionUrl],
  );

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldown]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (step === "request") {
      document.getElementById(EMAIL_INPUT_ID)?.focus();
      return;
    }

    if (step === "otp") {
      document.getElementById(OTP_INPUT_ID)?.focus();
      return;
    }

    if (step === "confirm") {
      confirmButtonRef.current?.focus();
      return;
    }

    stateTitleRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!verificationParams) {
      return;
    }
    const linkParams = verificationParams;

    let isMounted = true;

    async function verifyLegacyLink() {
      try {
        const response = await accountDeletionApi.verifyPublic(
          linkParams.code
            ? {
                code: linkParams.code,
                request_id: linkParams.requestId,
              }
            : {
                request_id: linkParams.requestId,
                token: linkParams.token,
              },
        );

        if (!isMounted) {
          return;
        }

        moveToConfirmStep(response, {
          message: "링크 확인이 끝났어요. 마지막으로 삭제를 확정해 주세요.",
          tone: "success",
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setFeedback({
          message: getLegacyLinkErrorMessage(error),
          tone: "error",
        });
        setStep("link-error");
        replaceAccountDeletionUrl(linkParams.requestId);
      }
    }

    void verifyLegacyLink();

    return () => {
      isMounted = false;
    };
  }, [moveToConfirmStep, replaceAccountDeletionUrl, verificationParams]);

  const handleRequestSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setRequestState("submitting");
      clearFeedback();

      try {
        const response = await accountDeletionApi.createPublic({
          email: email.trim(),
          requester_name: null,
          reason: null,
        });

        moveToOtpStep(response, getCodeDeliveryFeedback(response, { resent: false }));
      } catch (error) {
        setFeedback({
          message: getCreateRequestErrorMessage(error),
          tone: "error",
        });
      } finally {
        setRequestState("idle");
      }
    },
    [clearFeedback, email, moveToOtpStep],
  );

  const handleVerifySubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!request) {
        return;
      }

      const normalizedOtp = normalizeOtp(otp);
      if (normalizedOtp.length !== 6) {
        setFeedback({ message: "인증번호 6자리를 입력해 주세요.", tone: "error" });
        return;
      }

      setVerifyState("submitting");
      clearFeedback();

      try {
        const response = await accountDeletionApi.verifyPublic({
          code: normalizedOtp,
          request_id: request.id,
        });

        moveToConfirmStep(response, {
          message: "인증이 끝났어요. 마지막으로 삭제를 확정해 주세요.",
          tone: "success",
        });
      } catch (error) {
        setFeedback({
          message: getVerifyErrorMessage(error),
          tone: "error",
        });
      } finally {
        setVerifyState("idle");
      }
    },
    [clearFeedback, moveToConfirmStep, otp, request],
  );

  const handleResendCode = useCallback(async () => {
    if (!request || isResending || resendCooldown > 0) {
      return;
    }

    setIsResending(true);
    clearFeedback();

    try {
      const response = await accountDeletionApi.resendPublic({
        request_id: request.id,
      });

      moveToOtpStep(response, getCodeDeliveryFeedback(response, { resent: true }));
    } catch (error) {
      setFeedback({
        message: getResendErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsResending(false);
    }
  }, [clearFeedback, isResending, moveToOtpStep, request, resendCooldown]);

  const handleConfirmDeletion = useCallback(async () => {
    if (!request || !deletionAuthorization) {
      return;
    }

    setConfirmState("submitting");
    clearFeedback();

    try {
      const response = await accountDeletionApi.confirmPublic({
        confirm: true,
        deletion_authorization: deletionAuthorization,
        request_id: request.id,
      });

      setRequest(response);
      setDeletionAuthorization(null);
      setFeedback(null);
      setStep("complete");
      setResendCooldown(0);
      replaceAccountDeletionUrl();
    } catch (error) {
      setFeedback({
        message: getConfirmErrorMessage(error),
        tone: "error",
      });
    } finally {
      setConfirmState("idle");
    }
  }, [clearFeedback, deletionAuthorization, replaceAccountDeletionUrl, request]);

  const setEmailDraft = useCallback(
    (nextEmail: string) => {
      clearFeedback();
      setEmail(nextEmail);
    },
    [clearFeedback],
  );

  const setOtpDraft = useCallback(
    (nextOtp: string) => {
      clearFeedback();
      setOtp(normalizeOtp(nextOtp));
    },
    [clearFeedback],
  );

  const returnToOtpStep = useCallback(() => {
    clearFeedback();
    setStep("otp");
  }, [clearFeedback]);

  const devVerificationCode =
    import.meta.env.DEV && step === "otp" ? request?.debug_verification_code ?? null : null;

  return {
    clearFeedback,
    completionDescription: getCompletionDescription(request),
    completionTitle: getCompletionTitle(request),
    confirmButtonRef,
    confirmState,
    devVerificationCode,
    email,
    feedback,
    handleConfirmDeletion,
    handleRequestSubmit,
    handleResendCode,
    handleVerifySubmit,
    isResending,
    requestState,
    resendCooldown,
    request,
    resetRequestFlow,
    returnToOtpStep,
    setEmail: setEmailDraft,
    setOtp: setOtpDraft,
    stateTitleRef,
    step,
    verifyState,
    otp,
  };
}
