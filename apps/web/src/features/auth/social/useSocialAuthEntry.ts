import { useCallback, useState } from "react";

import { getSupabaseClientOrThrow } from "../authSupabase";
import type { AuthFeedback } from "../authScreenModel";
import { createSocialAuthAttempt } from "./api/socialAuthApi";
import { readLastUsedSocialProvider } from "./lib/lastUsedSocialProvider";
import { buildSocialAuthCallbackUrl, getApprovedSocialReturnTo } from "./lib/returnPath";
import {
  clearStoredSocialAuthAttempt,
  writeStoredSocialAuthAttempt,
  type SocialAuthEntryIntent,
} from "./lib/socialAuthStorage";
import { normalizeSocialEntryError } from "./model/socialAuthErrors";
import {
  getVisibleWebSocialProviderOptions,
  type SocialProviderId,
} from "./model/providerRegistry";

const visibleProviders = getVisibleWebSocialProviderOptions();

function getAccountSelectionQueryParams(providerId: SocialProviderId) {
  if (providerId === "google" || providerId === "kakao") {
    return { prompt: "select_account" };
  }

  return null;
}

function getCapabilityErrorFeedback(error: unknown): AuthFeedback {
  return {
    message: normalizeSocialEntryError(error).message,
    tone: "error",
  };
}

export function useSocialAuthEntry() {
  const [lastUsedProviderId] = useState(readLastUsedSocialProvider);
  const [feedback, setFeedback] = useState<AuthFeedback>(null);
  const [pendingProviderId, setPendingProviderId] = useState<SocialProviderId | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const startSocialAuth = useCallback(
    async (providerId: SocialProviderId, intent: SocialAuthEntryIntent) => {
      const capability = visibleProviders.find((candidate) => candidate.provider === providerId);

      if (!capability) {
        setFeedback({
          message: "지금은 이 로그인 방법을 사용할 수 없어요.",
          tone: "error",
        });
        return;
      }

      const callbackUrl = buildSocialAuthCallbackUrl();
      if (!callbackUrl) {
        setFeedback({
          message: "브라우저 환경을 확인한 뒤 다시 시도해 주세요.",
          tone: "error",
        });
        return;
      }

      try {
        clearFeedback();
        setPendingProviderId(providerId);

        const approvedReturnTo = getApprovedSocialReturnTo();
        const attempt = await createSocialAuthAttempt({
          intent,
          provider: capability.provider,
          returnTo: approvedReturnTo,
        });

        if (!attempt.attemptId) {
          throw new Error("social_attempt_missing");
        }

        const didStoreAttempt = writeStoredSocialAuthAttempt({
          approvedReturnTo: attempt.returnTo,
          attemptId: attempt.attemptId,
          attemptSecret: attempt.attemptSecret,
          completionStartedAt: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          expiresAt: attempt.expiresAt,
          intent,
          navigationTarget: null,
          provider: capability.provider,
          providerIdentifier: capability.providerIdentifier,
        });

        if (!didStoreAttempt) {
          throw new Error("social_storage_unavailable");
        }

        const client = getSupabaseClientOrThrow();
        const queryParams = getAccountSelectionQueryParams(providerId);
        const { data, error } = await client.auth.signInWithOAuth({
          provider: capability.providerIdentifier,
          options: {
            redirectTo: callbackUrl,
            skipBrowserRedirect: true,
            ...(queryParams ? { queryParams } : {}),
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.url) {
          throw new Error("social_provider_url_missing");
        }

        window.location.assign(data.url);
      } catch (error) {
        clearStoredSocialAuthAttempt();
        setFeedback(getCapabilityErrorFeedback(error));
      } finally {
        setPendingProviderId(null);
      }
    },
    [clearFeedback],
  );

  return {
    clearFeedback,
    feedback,
    lastUsedProviderId,
    pendingProviderId,
    providers: visibleProviders,
    startSocialAuth,
  };
}
