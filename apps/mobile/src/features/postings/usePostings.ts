import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateInterviewPostInput } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  postingsApi,
  type PostingsListParams,
} from "@/features/postings/postingsApi";
import {
  buildAuthQueryKey,
  buildPublicQueryKey,
  resolveAuthUserId,
} from "@/shared/query/authQuery";

export type PostingLifecycleAction = "archive" | "close" | "reopen";

// Keep existing cache namespaces so writes and reads still invalidate the same data.
const postingQueryKeys = {
  all: ["interview-posts"] as const,
  detail: ["interview-post"] as const,
  list(userId: string | null, params?: PostingsListParams, isAuthenticated?: boolean) {
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

export function usePostings(params?: PostingsListParams, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const isAuthenticated = Boolean(accessToken && stableUserId);
  const queryAccessToken = isAuthenticated ? accessToken : null;

  return useQuery({
    queryKey: postingQueryKeys.list(stableUserId, params, isAuthenticated),
    queryFn: ({ signal }) => postingsApi.listForUser(params, queryAccessToken, signal),
    retry: false,
    staleTime: 30_000,
  });
}

export function usePosting(postId?: string | null, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  const isAuthenticated = Boolean(accessToken && stableUserId);
  const queryAccessToken = isAuthenticated ? accessToken : null;

  return useQuery({
    enabled: Boolean(postId),
    queryKey: postingQueryKeys.item(stableUserId, postId, isAuthenticated),
    queryFn: ({ signal }) => postingsApi.get(postId as string, queryAccessToken, signal),
    retry: false,
    staleTime: 30_000,
  });
}

export function usePostingCreationCapabilities(accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: buildAuthQueryKey("interview-post-creation-capabilities", stableUserId),
    queryFn: ({ signal }) => postingsApi.getCreationCapabilities(accessToken, signal),
    retry: false,
    staleTime: 30_000,
  });
}

export function useUpdatePostingLifecycle(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: ({
      action,
      postId,
    }: {
      action: PostingLifecycleAction;
      postId: string;
    }) => {
      if (action === "archive") {
        return postingsApi.archive(postId, accessToken);
      }

      if (action === "reopen") {
        return postingsApi.reopen(postId, accessToken);
      }

      return postingsApi.close(postId, accessToken);
    },
    onSuccess: (post) => {
      queryClient.setQueryData(postingQueryKeys.item(stableUserId, post.id, true), post);
      void queryClient.invalidateQueries({ queryKey: postingQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: postingQueryKeys.detail });
    },
  });
}

export function useUpdatePosting(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);
  return useMutation({
    mutationFn: ({ postId, input }: { postId: string; input: UpdateInterviewPostInput }) =>
      postingsApi.update(postId, input, accessToken),
    onSuccess: (post) => {
      queryClient.setQueryData(postingQueryKeys.item(stableUserId, post.id, true), post);
      void queryClient.invalidateQueries({ queryKey: postingQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: postingQueryKeys.detail });
    },
  });
}
