import type { Session } from "@supabase/supabase-js";
import { useCallback, type Dispatch, type SetStateAction } from "react";

import { meApi } from "../../shared/api/me";
import type { AppUser, SyncMeInput, UpdateMeInput } from "../../shared/api/types";
import { getSupabaseClientOrThrow } from "./authSupabase";

interface UseAuthProfileActionsOptions {
  session: Session | null;
  setAppUser: Dispatch<SetStateAction<AppUser | null>>;
  setErrorMessage: (message: string | null) => void;
  setIsSyncing: (isSyncing: boolean) => void;
}

export function useAuthProfileActions({
  session,
  setAppUser,
  setErrorMessage,
  setIsSyncing,
}: UseAuthProfileActionsOptions) {
  const syncCurrentUser = useCallback(
    async (input: SyncMeInput) => {
      getSupabaseClientOrThrow();

      const token = session?.access_token;
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      setIsSyncing(true);
      setErrorMessage(null);

      try {
        const syncedUser = await meApi.sync(input, token);
        setAppUser(syncedUser);
        return syncedUser;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "사용자 동기화에 실패했습니다.");
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [session?.access_token, setAppUser, setErrorMessage, setIsSyncing],
  );

  const updateCurrentUser = useCallback(
    async (input: UpdateMeInput) => {
      getSupabaseClientOrThrow();

      const token = session?.access_token;
      if (!token) {
        throw new Error("로그인이 필요합니다.");
      }

      setIsSyncing(true);
      setErrorMessage(null);

      try {
        const updatedUser = await meApi.update(input, token);
        setAppUser(updatedUser);
        return updatedUser;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "계정 정보를 저장하지 못했습니다.");
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [session?.access_token, setAppUser, setErrorMessage, setIsSyncing],
  );

  return {
    syncCurrentUser,
    updateCurrentUser,
  };
}
