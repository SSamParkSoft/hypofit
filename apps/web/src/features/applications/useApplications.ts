import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { applicationsApi } from "../../shared/api/applications";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";

export const applicationQueryKeys = {
  all: ["applications"] as const,
  lists(stableUserId: string | null) {
    return ["applications", getProtectedQueryUserId(stableUserId)] as const;
  },
  list(stableUserId: string | null) {
    return ["applications", getProtectedQueryUserId(stableUserId), PROTECTED_QUERY_SCOPE] as const;
  },
} as const;

export function useApplications(accessToken?: string | null) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) => applicationsApi.list(effectiveAccessToken, { signal }),
    queryKey: applicationQueryKeys.list(stableUserId),
    staleTime: 30_000,
  });
}
