import { ArrowRight, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../features/auth/useAuth";
import { completeSocialAuth } from "../features/auth/social/api/socialAuthApi";
import {
  scrubSocialCallbackUrl,
} from "../features/auth/social/lib/returnPath";
import {
  clearStoredSocialAuthAttempt,
  markStoredSocialAuthCompleted,
  markStoredSocialAuthCompletionStarted,
  readStoredSocialAuthAttempt,
} from "../features/auth/social/lib/socialAuthStorage";
import {
  resolveSocialAuthNavigationTarget,
} from "../features/auth/social/model/socialAuthMachine";
import {
  normalizeSocialCallbackError,
  normalizeSocialCallbackUrlError,
} from "../features/auth/social/model/socialAuthErrors";
import { replacePath } from "../shared/navigation/appNavigation";
import { Button } from "../shared/ui/button";

export function AuthCallbackBridgePage() {
  const { accessToken, isLoading } = useAuth();
  const storedSocialAttempt = useMemo(readStoredSocialAuthAttempt, []);
  const [callbackError, setCallbackError] = useState<{
    actionLabel: string;
    message: string;
    title: string;
  } | null>(null);
  const [completionLockEpoch, setCompletionLockEpoch] = useState(0);
  const completionStartedRef = useRef(false);

  const authCallbackParams = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return {
      errorCode: searchParams.get("error"),
      errorDescription: searchParams.get("error_description"),
    };
  }, []);

  useEffect(() => {
    if (storedSocialAttempt) {
      return;
    }

    setCallbackError({
      actionLabel: "로그인으로 돌아가기",
      message: "이전 소셜 로그인 시도를 찾지 못했어요. 로그인 화면에서 다시 시도해 주세요.",
      title: "로그인 요청을 이어갈 수 없어요",
    });
  }, [storedSocialAttempt]);

  useEffect(() => {
    if (!storedSocialAttempt) {
      return;
    }

    if (authCallbackParams.errorCode) {
      scrubSocialCallbackUrl();
      clearStoredSocialAuthAttempt();
      setCallbackError(
        normalizeSocialCallbackUrlError(
          authCallbackParams.errorCode,
          authCallbackParams.errorDescription,
        ),
      );
      return;
    }

    const completionStartedAt = storedSocialAttempt.completionStartedAt
      ? Date.parse(storedSocialAttempt.completionStartedAt)
      : Number.NaN;
    const completionLockRemainingMs = Number.isFinite(completionStartedAt)
      ? 15_000 - (Date.now() - completionStartedAt)
      : 0;

    if (isLoading || completionStartedRef.current) {
      return;
    }

    if (completionLockRemainingMs > 0) {
      const timeoutId = window.setTimeout(
        () => setCompletionLockEpoch((current) => current + 1),
        completionLockRemainingMs + 50,
      );
      return () => window.clearTimeout(timeoutId);
    }

    if (!accessToken) {
      scrubSocialCallbackUrl();
      clearStoredSocialAuthAttempt();
      setCallbackError(
        normalizeSocialCallbackError(new Error("social session missing after callback")),
      );
      return;
    }

    completionStartedRef.current = true;
    markStoredSocialAuthCompletionStarted();

    void completeSocialAuth(accessToken, {
      attemptId: storedSocialAttempt.attemptId,
      attemptSecret: storedSocialAttempt.attemptSecret,
    })
      .then((result) => {
        const navigationTarget = resolveSocialAuthNavigationTarget(
          result.nextStep,
          result.returnTo ?? storedSocialAttempt.approvedReturnTo,
        );
        markStoredSocialAuthCompleted(navigationTarget);
        clearStoredSocialAuthAttempt();
        replacePath(navigationTarget, { intent: "auth" });
      })
      .catch((error) => {
        scrubSocialCallbackUrl();
        clearStoredSocialAuthAttempt();
        setCallbackError(normalizeSocialCallbackError(error));
      });
  }, [accessToken, authCallbackParams, completionLockEpoch, isLoading, storedSocialAttempt]);

  if (storedSocialAttempt) {
    return (
      <main className="grid min-h-dvh place-items-center bg-hypo-bg px-5 py-10">
        <section className="w-full max-w-[420px] rounded-hypo-lg border border-hypo-border bg-hypo-surface p-6 text-center shadow-hypo-panel">
          <p className="text-sm font-black text-hypo-brand">Hypofit</p>
          <h1 className="mt-4 text-[22px] font-black leading-8 text-hypo-text">
            {callbackError?.title ??
              (storedSocialAttempt.intent === "link"
                ? "로그인 방법을 연결하고 있어요"
                : "로그인을 확인하고 있어요")}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-hypo-text-muted">
            {callbackError?.message ??
              (storedSocialAttempt.intent === "link"
                ? "현재 계정에 새 로그인 방법을 안전하게 연결할게요."
                : "안전하게 계정을 확인하고 원래 보던 화면으로 돌아갈게요.")}
          </p>
          {callbackError ? (
            <Button
              className="mt-6 min-h-12 w-full"
              onClick={() => replacePath(storedSocialAttempt.approvedReturnTo, { intent: "auth" })}
            >
              <ArrowRight aria-hidden="true" size={16} />
              {callbackError.actionLabel}
            </Button>
          ) : (
            <div
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-hypo-bg px-4 py-2 text-sm font-semibold text-hypo-text-muted"
              role="status"
            >
              <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
              연결을 마무리하는 중
            </div>
          )}
          <p className="mt-4 text-xs font-semibold leading-5 text-hypo-text-soft">
            URL에 남은 인증 코드와 토큰은 확인이 끝나면 바로 지워집니다.
          </p>
        </section>
      </main>
    );
  }

  if (callbackError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-hypo-bg px-5 py-10">
        <section className="w-full max-w-[420px] rounded-hypo-lg border border-hypo-border bg-hypo-surface p-6 text-center shadow-hypo-panel">
          <p className="text-sm font-black text-hypo-brand">Hypofit</p>
          <h1 className="mt-4 text-[22px] font-black leading-8 text-hypo-text">
            {callbackError.title}
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-hypo-text-muted">
            {callbackError.message}
          </p>
          <Button className="mt-6 min-h-12 w-full" onClick={() => replacePath("/app", { intent: "auth" })}>
            <ArrowRight aria-hidden="true" size={16} />
            {callbackError.actionLabel}
          </Button>
        </section>
      </main>
    );
  }

  return null;
}
