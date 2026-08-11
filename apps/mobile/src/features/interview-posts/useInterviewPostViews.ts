import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InterviewPostView } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  interviewPostViewsApi,
  type MarkInterviewPostViewedInput,
} from "@/shared/api/interviewPostViews";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const interviewPostViewQueryKeys = {
  all: ["interview-post-views"] as const,
  list(userId: string | null) {
    return buildAuthQueryKey("interview-post-views", userId);
  },
} as const;

export function useInterviewPostViews(accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: interviewPostViewQueryKeys.list(stableUserId),
    queryFn: () => interviewPostViewsApi.list(accessToken),
    retry: false,
    staleTime: 30_000,
  });
}

export function useMarkInterviewPostViewed(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: (input: MarkInterviewPostViewedInput) =>
      interviewPostViewsApi.markViewed(input, accessToken),
    onSuccess: (view) => {
      queryClient.setQueryData<InterviewPostView[]>(
        interviewPostViewQueryKeys.list(stableUserId),
        (current) => {
          if (!current) return current;

          const hasView = current.some((item) => item.interview_post_id === view.interview_post_id);
          if (hasView) {
            return current.map((item) =>
              item.interview_post_id === view.interview_post_id ? view : item,
            );
          }

          return [view, ...current];
        },
      );
      void queryClient.invalidateQueries({ queryKey: interviewPostViewQueryKeys.all });
    },
  });
}
