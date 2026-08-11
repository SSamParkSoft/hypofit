import type { ReactNode } from "react";

import { AuthContext } from "./authContext";
import { useAuthController } from "./useAuthController";

export { AuthContext } from "./authContext";
export type { CompleteRoleOnboardingInput } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthController();

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
