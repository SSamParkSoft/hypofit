import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InterviewPostView } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  postingViewsApi,
  type MarkPostingViewedInput,
} from "@/features/postings/postingViewsApi";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

const postingViewQueryKeys = {
  all: ["interview-post-views"] as const,
  list(userId: string | null) {
    return buildAuthQueryKey("interview-post-views", userId);
  },
} as const;

export function usePostingViews(accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: postingViewQueryKeys.list(stableUserId),
    queryFn: () => postingViewsApi.list(accessToken),
    retry: false,
    staleTime: 30_000,
  });
}

export function useMarkPostingViewed(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: (input: MarkPostingViewedInput) =>
      postingViewsApi.markViewed(input, accessToken),
    onSuccess: (view) => {
      queryClient.setQueryData<InterviewPostView[]>(
        postingViewQueryKeys.list(stableUserId),
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
      void queryClient.invalidateQueries({ queryKey: postingViewQueryKeys.all });
    },
  });
}
