import type { Session, User } from "@supabase/supabase-js";
import { createContext } from "react";

import type { AppUser, SyncMeInput, UpdateMeInput, UserRole } from "../../shared/api/types";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  errorMessage: string | null;
  requiresRoleOnboarding: boolean;
  completeRoleOnboarding: (input: CompleteRoleOnboardingInput) => Promise<AppUser>;
  signOut: () => Promise<void>;
  syncCurrentUser: (input: SyncMeInput) => Promise<AppUser>;
  updateCurrentUser: (input: UpdateMeInput) => Promise<AppUser>;
}

export interface CompleteRoleOnboardingInput {
  role: UserRole;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
