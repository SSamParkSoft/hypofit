import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { sessionsApi } from "@/shared/api/sessions";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const sessionQueryKeys = {
  all: ["sessions"] as const,
  list(userId: string | null) {
    return buildAuthQueryKey("sessions", userId);
  },
} as const;

export function useSessions(accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: sessionQueryKeys.list(stableUserId),
    queryFn: () => sessionsApi.list(accessToken),
    retry: false,
    staleTime: 30_000,
  });
}
