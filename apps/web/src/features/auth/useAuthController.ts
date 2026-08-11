import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { clearProtectedQueryCache } from "../../shared/api/queryClient";
import type { AppUser } from "../../shared/api/types";
import type { AuthContextValue } from "./authContext";
import { getMetadataRole } from "./authProfileModel";
import { useAuthLifecycleActions } from "./useAuthLifecycleActions";
import { useAuthOnboardingActions } from "./useAuthOnboardingActions";
import { useAuthProfileActions } from "./useAuthProfileActions";
import { useAuthProfileSynchronization } from "./useAuthProfileSynchronization";
import { useAuthSessionOwner } from "./useAuthSessionOwner";

export function useAuthController(): AuthContextValue {
  const queryClient = useQueryClient();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPendingRoleSync, setHasPendingRoleSync] = useState(false);
  const previousSessionIdentityRef = useRef<string | null>(null);
  const previousSessionUserIdRef = useRef<string | null>(null);
  const {
    applySession,
    isLoading,
    latestSessionRef,
    session,
    sessionRevisionRef,
    updateSessionUser,
  } = useAuthSessionOwner({
    setErrorMessage,
  });

  const requiresRoleOnboarding = session?.user
    ? getMetadataRole(session.user) === null || hasPendingRoleSync
    : false;
  const sessionUserId = session?.user?.id ?? null;
  const sessionAccessToken = session?.access_token ?? null;

  useEffect(() => {
    const nextSessionIdentity =
      sessionUserId && sessionAccessToken ? `${sessionUserId}:${sessionAccessToken}` : null;
    const previousSessionIdentity = previousSessionIdentityRef.current;
    const nextSessionUserId = sessionUserId;
    const previousSessionUserId = previousSessionUserIdRef.current;

    if (previousSessionIdentity !== nextSessionIdentity) {
      previousSessionIdentityRef.current = nextSessionIdentity;
      setIsSyncing(false);
    }

    if (previousSessionUserId !== nextSessionUserId) {
      if (previousSessionUserId) {
        clearProtectedQueryCache(queryClient, previousSessionUserId);
      }

      previousSessionUserIdRef.current = nextSessionUserId;
      setHasPendingRoleSync(false);
      setAppUser((currentUser) =>
        nextSessionUserId && currentUser?.id === nextSessionUserId ? currentUser : null,
      );
      return;
    }

    if (!nextSessionUserId) {
      setAppUser(null);
    }
  }, [queryClient, sessionAccessToken, sessionUserId]);

  useAuthProfileSynchronization({
    appUser,
    latestSessionRef,
    requiresRoleOnboarding,
    session,
    sessionRevisionRef,
    setAppUser,
    setErrorMessage,
    setIsSyncing,
  });

  const { syncCurrentUser, updateCurrentUser } = useAuthProfileActions({
    session,
    setAppUser,
    setErrorMessage,
    setIsSyncing,
  });

  const { completeRoleOnboarding } = useAuthOnboardingActions({
    appUser,
    session,
    setAppUser,
    setErrorMessage,
    setHasPendingRoleSync,
    setIsSyncing,
    updateSessionUser,
  });

  const { signOut } = useAuthLifecycleActions({
    applySession,
    setAppUser,
    setErrorMessage,
    setHasPendingRoleSync,
  });

  return useMemo(
    () => ({
      session,
      user: requiresRoleOnboarding ? null : session?.user ?? null,
      appUser,
      accessToken: session?.access_token ?? null,
      isLoading,
      isSyncing,
      errorMessage,
      requiresRoleOnboarding,
      completeRoleOnboarding,
      signOut,
      syncCurrentUser,
      updateCurrentUser,
    }),
    [
      appUser,
      completeRoleOnboarding,
      errorMessage,
      isLoading,
      isSyncing,
      requiresRoleOnboarding,
      session,
      signOut,
      syncCurrentUser,
      updateCurrentUser,
    ],
  );
}
