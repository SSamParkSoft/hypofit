import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { applicationsApi } from "@/shared/api/applications";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const applicationQueryKeys = {
  all: ["applications"] as const,
  list(userId: string | null) {
    return buildAuthQueryKey("applications", userId);
  },
} as const;

export function useApplications(accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: applicationQueryKeys.list(stableUserId),
    queryFn: () => applicationsApi.list(accessToken),
    retry: false,
    staleTime: 30_000,
  });
}
