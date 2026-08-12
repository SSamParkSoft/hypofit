import { useCallback, useMemo, useState } from "react";
import type { SocialAuthProvider } from "@hypofit/contracts";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getSocialAuthDiagnosticCode,
  getSocialAuthErrorMessage,
  getPublicMobileSocialProviderIds,
  getUnsupportedSocialNextStepMessage,
  resolveSocialAuthRoute,
  startSocialAuth,
} from "./socialAuthService";

export function useSocialAuth() {
  const auth = useAuth();
  const router = useRouter();
  const providers = useMemo(() => getPublicMobileSocialProviderIds(), []);
  const [busyProvider, setBusyProvider] = useState<SocialAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
      busyProvider,
      isBusy: busyProvider !== null,
      errorMessage,
      errorCode,
      start,
    }),
    [busyProvider, errorCode, errorMessage, providers, start],
  );
}
