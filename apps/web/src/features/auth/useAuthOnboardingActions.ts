import type { Session, User } from "@supabase/supabase-js";
import { useCallback, type Dispatch, type SetStateAction } from "react";

import { meApi } from "../../shared/api/me";
import type { AppUser } from "../../shared/api/types";
import { getSupabaseClientOrThrow } from "./authSupabase";
import type { CompleteRoleOnboardingInput } from "./authContext";
import { buildRoleOnboardingSyncInput, isMissingAppUserError } from "./authProfileModel";

interface UseAuthOnboardingActionsOptions {
  appUser: AppUser | null;
  session: Session | null;
  setAppUser: Dispatch<SetStateAction<AppUser | null>>;
  setErrorMessage: (message: string | null) => void;
  setHasPendingRoleSync: (hasPendingRoleSync: boolean) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  updateSessionUser: (nextUser: User) => void;
}

export function useAuthOnboardingActions({
  appUser,
  session,
  setAppUser,
  setErrorMessage,
  setHasPendingRoleSync,
  setIsSyncing,
  updateSessionUser,
}: UseAuthOnboardingActionsOptions) {
  const completeRoleOnboarding = useCallback(
    async (input: CompleteRoleOnboardingInput) => {
      const client = getSupabaseClientOrThrow();

      if (!session?.user || !session.access_token) {
        throw new Error("로그인이 필요합니다.");
      }

      setHasPendingRoleSync(true);
      setIsSyncing(true);
      setErrorMessage(null);

      try {
        let existingAppUser = appUser;

        if (!existingAppUser) {
          try {
            existingAppUser = await meApi.get(session.access_token);
          } catch (error) {
            if (!isMissingAppUserError(error)) {
              throw error;
            }
          }
        }

        const syncInput = buildRoleOnboardingSyncInput(session.user, input.role, existingAppUser);
        const { data: updateData, error: updateError } = await client.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            name: syncInput.name,
            bio: syncInput.bio,
            phone: syncInput.phone,
            role: input.role,
          },
        });

        if (updateError) {
          throw updateError;
        }

        if (updateData.user) {
          updateSessionUser(updateData.user);
        }

        const syncedUser = await meApi.sync(syncInput, session.access_token);
        setAppUser(syncedUser);
        setHasPendingRoleSync(false);
        return syncedUser;
      } catch (error) {
        setErrorMessage("가입을 완료하지 못했어요.");
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [
      appUser,
      session,
      setAppUser,
      setErrorMessage,
      setHasPendingRoleSync,
      setIsSyncing,
      updateSessionUser,
    ],
  );

  return { completeRoleOnboarding };
}
