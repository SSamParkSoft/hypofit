import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { sessionsApi } from "../../shared/api/sessions";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  lists(stableUserId: string | null) {
    return ["sessions", getProtectedQueryUserId(stableUserId)] as const;
  },
  list(stableUserId: string | null) {
    return ["sessions", getProtectedQueryUserId(stableUserId), PROTECTED_QUERY_SCOPE] as const;
  },
} as const;

export function useSessions(accessToken?: string | null) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) => sessionsApi.list(effectiveAccessToken, { signal }),
    queryKey: sessionQueryKeys.list(stableUserId),
    staleTime: 30_000,
  });
}
