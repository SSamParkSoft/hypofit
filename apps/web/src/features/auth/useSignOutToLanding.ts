import { useCallback } from "react";

import { replacePath } from "../../shared/navigation/appNavigation";
import { useAuth } from "./useAuth";

export function useSignOutToLanding() {
  const { signOut } = useAuth();

  return useCallback(async () => {
    await signOut();
    replacePath("/", { intent: "replace", scroll: "top" });
  }, [signOut]);
}
