import { useQuery } from "@tanstack/react-query";

import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../../shared/api/queryAuth";
import { useAuth } from "../useAuth";
import { reconcileSocialAuthIdentities } from "./api/socialAuthApi";

export const socialAuthIdentityQueryKeys = {
  all: ["social-identities"] as const,
  list(stableUserId: string | null) {
    return [
      "social-identities",
      getProtectedQueryUserId(stableUserId),
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

export function useSocialAuthIdentities() {
  const { accessToken, appUser, user } = useAuth();
  const stableUserId = resolveStableAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken),
    queryFn: ({ signal }) => reconcileSocialAuthIdentities(accessToken ?? "", { signal }),
    queryKey: socialAuthIdentityQueryKeys.list(stableUserId),
    refetchOnMount: "always",
    staleTime: 60_000,
  });
}
