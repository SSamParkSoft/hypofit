import { useCallback, useEffect, useMemo, useState } from "react";
import type { SocialAuthProvider } from "@hypofit/contracts";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getSocialAuthDiagnosticCode,
  getSocialAuthErrorMessage,
  getPublicMobileSocialProviderIds,
  getPublicMobileSocialProviders,
  getUnsupportedSocialNextStepMessage,
  loadSocialAuthCapabilities,
  resolveSocialAuthRoute,
  startSocialAuth,
} from "./socialAuthService";

export function useSocialAuth() {
  const auth = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<SocialAuthProvider[]>(() =>
    getPublicMobileSocialProviderIds(),
  );
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [busyProvider, setBusyProvider] = useState<SocialAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const response = await loadSocialAuthCapabilities();
        if (!isMounted) {
          return;
        }
        setProviders(getPublicMobileSocialProviders(response.providers).map((capability) => capability.provider));
      } catch (error) {
        if (!isMounted) {
          return;
        }
        // Keep the approved platform methods visible. Attempt creation remains
        // the server-side capability boundary and provides the actionable error.
        setErrorMessage(getSocialAuthErrorMessage(error, "다른 로그인 방법을 불러오지 못했어요."));
        setErrorCode(getSocialAuthDiagnosticCode(error));
      } finally {
        if (isMounted) {
          setIsLoadingProviders(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const start = useCallback(
    async (provider: SocialAuthProvider, returnPath?: unknown) => {
      setBusyProvider(provider);
      setErrorMessage(null);
      setErrorCode(null);

      try {
        const result = await startSocialAuth(provider, returnPath);
        if (result.status === "cancelled" || result.status === "pending_callback") {
          return;
        }

        const nextRoute = resolveSocialAuthRoute(result.response);
        if (!nextRoute) {
          await auth.signOut();
          setErrorMessage(getUnsupportedSocialNextStepMessage(result.response));
          setErrorCode("social_email_missing");
          return;
        }

        router.replace(nextRoute);
      } catch (error) {
        setErrorMessage(getSocialAuthErrorMessage(error, "로그인을 이어가지 못했어요."));
        setErrorCode(getSocialAuthDiagnosticCode(error));
      } finally {
        setBusyProvider(null);
      }
    },
    [auth, router],
  );

  return useMemo(
    () => ({
      providers,
      isLoadingProviders,
      busyProvider,
      isBusy: busyProvider !== null,
      errorMessage,
      errorCode,
      start,
    }),
    [busyProvider, errorCode, errorMessage, isLoadingProviders, providers, start],
  );
}
