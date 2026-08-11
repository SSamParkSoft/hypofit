import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useRef, useState } from "react";

import { useSupabaseSessionBootstrap } from "./useSupabaseSessionBootstrap";

interface UseAuthSessionOwnerOptions {
  setErrorMessage: (message: string | null) => void;
}

export function useAuthSessionOwner({ setErrorMessage }: UseAuthSessionOwnerOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const latestSessionRef = useRef<Session | null>(null);
  const sessionRevisionRef = useRef(0);

  const applySession = useCallback((nextSession: Session | null) => {
    const currentSession = latestSessionRef.current;
    const hasAuthIdentityChanged =
      currentSession?.user.id !== nextSession?.user.id ||
      currentSession?.access_token !== nextSession?.access_token;

    if (hasAuthIdentityChanged) {
      sessionRevisionRef.current += 1;
    }

    latestSessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const updateSessionUser = useCallback((nextUser: User) => {
    setSession((currentSession) => {
      if (!currentSession) {
        latestSessionRef.current = null;
        return currentSession;
      }

      const nextSession = { ...currentSession, user: nextUser };
      latestSessionRef.current = nextSession;
      return nextSession;
    });
  }, []);

  useSupabaseSessionBootstrap({
    applySession,
    sessionRevisionRef,
    setErrorMessage,
    setIsLoading,
  });

  return {
    applySession,
    isLoading,
    latestSessionRef,
    session,
    sessionRevisionRef,
    updateSessionUser,
  };
}
