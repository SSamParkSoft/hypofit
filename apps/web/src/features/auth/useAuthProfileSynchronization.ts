import type { Session } from "@supabase/supabase-js";
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { meApi } from "../../shared/api/me";
import type { AppUser } from "../../shared/api/types";
import { isSupabaseConfigured } from "../../shared/supabase/client";
import { buildDefaultSyncInput, isMissingAppUserError } from "./authProfileModel";

interface UseAuthProfileSynchronizationOptions {
  appUser: AppUser | null;
  latestSessionRef: MutableRefObject<Session | null>;
  requiresRoleOnboarding: boolean;
  session: Session | null;
  sessionRevisionRef: MutableRefObject<number>;
  setAppUser: Dispatch<SetStateAction<AppUser | null>>;
  setErrorMessage: (message: string | null) => void;
  setIsSyncing: (isSyncing: boolean) => void;
}

export function useAuthProfileSynchronization({
  appUser,
  latestSessionRef,
  requiresRoleOnboarding,
  session,
  sessionRevisionRef,
  setAppUser,
  setErrorMessage,
  setIsSyncing,
}: UseAuthProfileSynchronizationOptions) {
  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      !session?.user ||
      requiresRoleOnboarding ||
      appUser?.id === session.user.id
    ) {
      return;
    }

    let isMounted = true;
    const token = session.access_token;
    const currentUser = session.user;
    const requestSessionRevision = sessionRevisionRef.current;
    const isCurrentSessionRequest = () =>
      isMounted &&
      sessionRevisionRef.current === requestSessionRevision &&
      latestSessionRef.current?.user.id === currentUser.id &&
      latestSessionRef.current?.access_token === token;

    setIsSyncing(true);
    setErrorMessage(null);

    void meApi
      .get(token)
      .catch(async (error) => {
        if (!isCurrentSessionRequest()) {
          return null;
        }

        if (isMissingAppUserError(error)) {
          return meApi.sync(buildDefaultSyncInput(currentUser), token);
        }

        throw error;
      })
      .then((loadedUser) => {
        if (loadedUser && isCurrentSessionRequest()) {
          setAppUser(loadedUser);
        }
      })
      .catch((error) => {
        if (isCurrentSessionRequest()) {
          setErrorMessage(error instanceof Error ? error.message : "사용자 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (isCurrentSessionRequest()) {
          setIsSyncing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    appUser?.id,
    latestSessionRef,
    requiresRoleOnboarding,
    session,
    sessionRevisionRef,
    setAppUser,
    setErrorMessage,
    setIsSyncing,
  ]);
}
