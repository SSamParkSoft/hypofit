import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SurveyParticipation, SurveyParticipationAction } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { surveyParticipationsApi } from "@/shared/api/surveyParticipations";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const surveyParticipationQueryKeys = {
  current(userId: string | null, postId: string | null | undefined) {
    return buildAuthQueryKey("survey-participation", userId, postId ?? null);
  },
} as const;

export function useSurveyParticipation(postId?: string | null, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const enabled = Boolean(accessToken && stableUserId && postId);

  return useQuery({
    enabled,
    queryKey: surveyParticipationQueryKeys.current(stableUserId, postId),
    queryFn: () => surveyParticipationsApi.current(postId as string, accessToken),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSurveyParticipationMutations(postId: string, accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const queryKey = surveyParticipationQueryKeys.current(stableUserId, postId);

  const updateCurrent = (participation: SurveyParticipation | SurveyParticipationAction) => {
    queryClient.setQueryData(queryKey, participation);
  };

  return {
    open: useMutation({
      mutationFn: () => surveyParticipationsApi.open(postId, accessToken),
      onSuccess: updateCurrent,
    }),
    submit: useMutation({
      mutationFn: () => surveyParticipationsApi.submit(postId, accessToken),
      onSuccess: updateCurrent,
    }),
    withdraw: useMutation({
      mutationFn: () => surveyParticipationsApi.withdraw(postId, accessToken),
      onSuccess: updateCurrent,
    }),
  };
}
