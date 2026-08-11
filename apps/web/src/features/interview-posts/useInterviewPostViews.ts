import { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  interviewPostViewsApi,
  type MarkInterviewPostViewedInput,
} from "../../shared/api/interviewPostViews";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import type { InterviewPostView } from "../../shared/api/types";
import { AuthContext } from "../auth/AuthProvider";

export const interviewPostViewQueryKeys = {
  all: ["interview-post-views"] as const,
  lists(stableUserId: string | null) {
    return ["interview-post-views", getProtectedQueryUserId(stableUserId)] as const;
  },
  list(stableUserId: string | null) {
    return [
      "interview-post-views",
      getProtectedQueryUserId(stableUserId),
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

export function useInterviewPostViews(accessToken?: string | null) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) => interviewPostViewsApi.list(effectiveAccessToken, { signal }),
    queryKey: interviewPostViewQueryKeys.list(stableUserId),
    staleTime: 30_000,
  });
}

export function useMarkInterviewPostViewed(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (input: MarkInterviewPostViewedInput) =>
      interviewPostViewsApi.markViewed(input, effectiveAccessToken),
    onMutate: async (input) => {
      const queryKey = interviewPostViewQueryKeys.list(stableUserId);
      await queryClient.cancelQueries({ queryKey });
      const previousViews = queryClient.getQueryData<InterviewPostView[]>(queryKey);
      const now = new Date().toISOString();
      const existingView = previousViews?.find((view) => view.interview_post_id === input.postId);
      const optimisticView: InterviewPostView = existingView
        ? {
            ...existingView,
            last_viewed_at: now,
            source: input.source,
            view_count: existingView.view_count + 1,
          }
        : {
            id: `optimistic-view-${input.postId}`,
            user_id: "current-user",
            interview_post_id: input.postId,
            first_viewed_at: now,
            last_viewed_at: now,
            view_count: 1,
            source: input.source,
          };

      queryClient.setQueryData<InterviewPostView[]>(queryKey, (currentViews = []) =>
        currentViews.some((view) => view.interview_post_id === input.postId)
          ? currentViews.map((view) =>
              view.interview_post_id === input.postId ? optimisticView : view,
            )
          : [optimisticView, ...currentViews],
      );

      return { previousViews, queryKey };
    },
    onError: (_error, _input, context) => {
      if (context?.previousViews) {
        queryClient.setQueryData(context.queryKey, context.previousViews);
      }
    },
    onSuccess: (view) => {
      queryClient.setQueriesData<InterviewPostView[]>(
        { queryKey: interviewPostViewQueryKeys.lists(stableUserId) },
        (currentViews = []) =>
          currentViews.some((item) => item.interview_post_id === view.interview_post_id)
            ? currentViews.map((item) =>
                item.interview_post_id === view.interview_post_id ? view : item,
              )
            : [view, ...currentViews],
      );
    },
  });
}
