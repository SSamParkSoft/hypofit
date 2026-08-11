import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  interviewPostsApi,
  type ListInterviewPostsParams,
} from "@/shared/api/interviewPosts";
import {
  buildAuthQueryKey,
  buildPublicQueryKey,
  resolveAuthUserId,
} from "@/shared/query/authQuery";

export type InterviewPostLifecycleAction = "archive" | "close" | "reopen";

const interviewPostQueryKeys = {
  all: ["interview-posts"] as const,
  detail: ["interview-post"] as const,
  list(userId: string | null, params?: ListInterviewPostsParams, isAuthenticated?: boolean) {
    return isAuthenticated
      ? buildAuthQueryKey("interview-posts", userId, params ?? null)
      : buildPublicQueryKey("interview-posts", params ?? null);
  },
  item(userId: string | null, postId: string | null | undefined, isAuthenticated?: boolean) {
    return isAuthenticated
      ? buildAuthQueryKey("interview-post", userId, postId ?? null)
      : buildPublicQueryKey("interview-post", postId ?? null);
  },
} as const;

export function useInterviewPosts(params?: ListInterviewPostsParams, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const isAuthenticated = Boolean(accessToken && stableUserId);
  const queryAccessToken = isAuthenticated ? accessToken : null;

  return useQuery({
    queryKey: interviewPostQueryKeys.list(stableUserId, params, isAuthenticated),
    queryFn: () => interviewPostsApi.listForUser(params, queryAccessToken),
    retry: false,
    staleTime: 30_000,
  });
}

export function useInterviewPost(postId?: string | null, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const isAuthenticated = Boolean(accessToken && stableUserId);
  const queryAccessToken = isAuthenticated ? accessToken : null;

  return useQuery({
    enabled: Boolean(postId),
    queryKey: interviewPostQueryKeys.item(stableUserId, postId, isAuthenticated),
    queryFn: () => interviewPostsApi.get(postId as string, queryAccessToken),
    retry: false,
    staleTime: 30_000,
  });
}

export function useUpdateInterviewPostLifecycle(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: ({
      action,
      postId,
    }: {
      action: InterviewPostLifecycleAction;
      postId: string;
    }) => {
      if (action === "archive") {
        return interviewPostsApi.archive(postId, accessToken);
      }

      if (action === "reopen") {
        return interviewPostsApi.reopen(postId, accessToken);
      }

      return interviewPostsApi.close(postId, accessToken);
    },
    onSuccess: (post) => {
      queryClient.setQueryData(interviewPostQueryKeys.item(stableUserId, post.id, true), post);
      void queryClient.invalidateQueries({ queryKey: interviewPostQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: interviewPostQueryKeys.detail });
    },
  });
}
