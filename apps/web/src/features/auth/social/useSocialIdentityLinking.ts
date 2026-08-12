import { useCallback, useState } from "react";

import { getApiErrorMessage } from "../../../shared/api/errorPresentation";
import { getSupabaseClientOrThrow } from "../authSupabase";
import { useAuth } from "../useAuth";
import { createSocialAuthLinkAttempt } from "./api/socialAuthApi";
import { buildSocialAuthCallbackUrl } from "./lib/returnPath";
import {
  clearStoredSocialAuthAttempt,
  writeStoredSocialAuthAttempt,
} from "./lib/socialAuthStorage";
import {
  getVisibleWebSocialProviderOptions,
  type SocialProviderId,
} from "./model/providerRegistry";

const accountSettingsReturnPath = "/profile/account";
const availableProviders = getVisibleWebSocialProviderOptions();

export function useSocialIdentityLinking() {
  const { accessToken } = useAuth();
  const [pendingProvider, setPendingProvider] = useState<SocialProviderId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const linkProvider = useCallback(
    async (provider: SocialProviderId) => {
      const capability = availableProviders.find((item) => item.provider === provider);
      const callbackUrl = buildSocialAuthCallbackUrl();

      if (!accessToken || !capability || !callbackUrl) {
        setFeedback("지금은 이 로그인 방법을 연결할 수 없어요.");
        return;
      }

      try {
        setPendingProvider(provider);
        setFeedback(null);
        const attempt = await createSocialAuthLinkAttempt(accessToken, {
          provider,
          returnTo: accountSettingsReturnPath,
        });
        const stored = writeStoredSocialAuthAttempt({
          approvedReturnTo: attempt.returnTo,
          attemptId: attempt.attemptId,
          attemptSecret: attempt.attemptSecret,
          completionStartedAt: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          expiresAt: attempt.expiresAt,
          intent: "link",
          navigationTarget: null,
          provider,
          providerIdentifier: capability.providerIdentifier,
        });

        if (!stored) {
          throw new Error("social_storage_unavailable");
        }

        const { data, error } = await getSupabaseClientOrThrow().auth.linkIdentity({
          provider: capability.providerIdentifier,
          options: {
            redirectTo: callbackUrl,
            skipBrowserRedirect: true,
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
        setFeedback(getApiErrorMessage(error, "로그인 방법을 연결하지 못했어요."));
        setPendingProvider(null);
      }
    },
    [accessToken],
  );

  return {
    availableProviders,
    feedback,
    isLoading: false,
    linkProvider,
    pendingProvider,
  };
}
