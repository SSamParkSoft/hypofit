import { useCallback, type Dispatch, type SetStateAction } from "react";

import type { AppUser } from "../../shared/api/types";
import { getSupabaseClientOrThrow } from "./authSupabase";
import { clearStoredSocialAuthAttempt } from "./social/lib/socialAuthStorage";

interface UseAuthLifecycleActionsOptions {
  applySession: (nextSession: null) => void;
  setAppUser: Dispatch<SetStateAction<AppUser | null>>;
  setErrorMessage: (message: string | null) => void;
  setHasPendingRoleSync: (hasPendingRoleSync: boolean) => void;
}

export function useAuthLifecycleActions({
  applySession,
  setAppUser,
  setErrorMessage,
  setHasPendingRoleSync,
}: UseAuthLifecycleActionsOptions) {
  const signOut = useCallback(async () => {
    const client = getSupabaseClientOrThrow();

    setErrorMessage(null);
    clearStoredSocialAuthAttempt();
    const { error } = await client.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      throw error;
    }

    setHasPendingRoleSync(false);
    applySession(null);
    setAppUser(null);
  }, [applySession, setAppUser, setErrorMessage, setHasPendingRoleSync]);

  return {
    signOut,
  };
}
