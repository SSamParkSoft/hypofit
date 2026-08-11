import { useEffect, useState } from "react";

import { Button } from "../../shared/ui/button";
import {
  AUTH_BOOTSTRAP_STATUS_DELAY_MS,
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  getAuthBootstrapState,
} from "./authEntryState";

interface AuthBootstrapGateProps {
  authErrorMessage?: string | null;
  isChecking: boolean;
  isOnline: boolean;
  onGoToLanding: () => void;
  onRetry: () => void;
}

export function AuthBootstrapGate({
  authErrorMessage = null,
  isChecking,
  isOnline,
  onGoToLanding,
  onRetry,
}: AuthBootstrapGateProps) {
  const [hasDelayedFeedbackStarted, setHasDelayedFeedbackStarted] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    setHasDelayedFeedbackStarted(false);
    setHasTimedOut(false);

    if (!isChecking || !isOnline) {
      return;
    }

    const delayedTimeoutId = window.setTimeout(() => {
      setHasDelayedFeedbackStarted(true);
    }, AUTH_BOOTSTRAP_STATUS_DELAY_MS);
    const recoveryTimeoutId = window.setTimeout(() => {
      setHasTimedOut(true);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      window.clearTimeout(delayedTimeoutId);
      window.clearTimeout(recoveryTimeoutId);
    };
  }, [isChecking, isOnline]);

  const state = getAuthBootstrapState({
    elapsedMs: hasTimedOut
      ? AUTH_BOOTSTRAP_TIMEOUT_MS
      : hasDelayedFeedbackStarted
        ? AUTH_BOOTSTRAP_STATUS_DELAY_MS
        : 0,
    hasError: Boolean(authErrorMessage),
    isChecking,
    isOnline,
  });
  const isBusy = state === "checking" || state === "delayed";

  return (
    <main aria-busy={isBusy} className="min-h-dvh bg-hypo-bg text-hypo-text">
      <div className="mx-auto grid min-h-dvh w-full max-w-[480px] items-center px-4 pb-[calc(var(--app-safe-bottom)+1.5rem)] pt-[calc(var(--app-safe-top)+1.5rem)] sm:px-6 sm:py-10">
        <section className="mx-auto flex w-full max-w-[440px] flex-col gap-5">
          <button
            className="inline-flex w-fit items-center gap-2.5 self-center rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            type="button"
            onClick={onGoToLanding}
            aria-label="Hypofit 처음으로"
          >
            <img
              src="/brand/hypofit-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-9 object-contain"
            />
            <strong className="font-brand text-xl font-black text-hypo-text">Hypofit</strong>
          </button>

          <div className="py-2 sm:rounded-hypo-lg sm:border sm:border-hypo-border sm:bg-hypo-surface sm:p-7 sm:shadow-hypo-panel">
            <div aria-hidden="true" className="grid gap-3">
              <div className="h-8 w-40 rounded-full bg-hypo-bg motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-full max-w-[280px] rounded-full bg-hypo-bg motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="mt-3 grid gap-3">
                <div className="h-11 rounded-hypo-md bg-hypo-bg motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-11 rounded-hypo-md bg-hypo-bg motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="mt-1 h-12 rounded-hypo-md bg-hypo-brand/15 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            </div>

            {state === "delayed" ? (
              <div
                className="mt-5 flex items-center gap-2 text-sm font-bold text-hypo-text-muted"
                role="status"
              >
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-hypo-brand motion-safe:animate-pulse motion-reduce:animate-none"
                />
                계정을 확인하고 있어요
              </div>
            ) : null}

            {state === "offline" ? (
              <div
                className="mt-5 rounded-hypo-lg border border-hypo-border bg-hypo-bg/70 p-4"
                role="alert"
              >
                <p className="text-sm font-black text-hypo-text">인터넷 연결을 확인해 주세요</p>
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={onRetry}>
                    다시 시도
                  </Button>
                </div>
              </div>
            ) : null}

            {state === "recoverable-error" ? (
              <div
                className="mt-5 rounded-hypo-lg border border-hypo-border bg-hypo-bg/70 p-4"
                role="alert"
              >
                <p className="text-sm font-black text-hypo-text">로그인 상태를 확인하지 못했어요</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={onRetry}>
                    다시 시도
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onGoToLanding}>
                    랜딩으로
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
