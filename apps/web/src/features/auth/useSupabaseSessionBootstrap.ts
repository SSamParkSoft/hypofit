import type { Session } from "@supabase/supabase-js";
import { useEffect, type MutableRefObject } from "react";

import { supabase } from "../../shared/supabase/client";

interface UseSupabaseSessionBootstrapOptions {
  applySession: (nextSession: Session | null) => void;
  sessionRevisionRef: MutableRefObject<number>;
  setErrorMessage: (message: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export function useSupabaseSessionBootstrap({
  applySession,
  sessionRevisionRef,
  setErrorMessage,
  setIsLoading,
}: UseSupabaseSessionBootstrapOptions) {
  useEffect(() => {
    if (!supabase) {
      setErrorMessage("Supabase 브라우저 환경 변수가 설정되지 않았습니다.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const initialSessionRevision = sessionRevisionRef.current;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted || sessionRevisionRef.current !== initialSessionRevision) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
        }

        applySession(data.session);
      })
      .catch((error) => {
        if (isMounted && sessionRevisionRef.current === initialSessionRevision) {
          setErrorMessage(
            error instanceof Error ? error.message : "로그인 상태를 확인하지 못했습니다.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void event;
      applySession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, sessionRevisionRef, setErrorMessage, setIsLoading]);
}
