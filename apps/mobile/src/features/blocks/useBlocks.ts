import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { blocksApi, type BlockUserInput, type UserBlock } from "@/shared/api/blocks";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

export function blockedUsersQueryKey(userId?: string | null) {
  return buildAuthQueryKey("blocked-users", userId ?? null);
}

export function useBlockedUsers(accessToken?: string | null, enabled = true) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId && enabled),
    queryKey: blockedUsersQueryKey(stableUserId),
    queryFn: () => blocksApi.list(accessToken),
    retry: false,
    staleTime: 15_000,
  });
}

export function useBlockUser(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: ({ input, userId }: { input?: BlockUserInput; userId: string }) =>
      blocksApi.block(userId, input ?? {}, accessToken),
    onSuccess: (block) => {
      queryClient.setQueryData<UserBlock[]>(blockedUsersQueryKey(stableUserId), (current) => {
        const next = (current ?? []).filter((item) => item.blocked_user_id !== block.blocked_user_id);
        return [block, ...next];
      });
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-room"] });
    },
  });
}

export function useUnblockUser(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: (userId: string) => blocksApi.unblock(userId, accessToken),
    onSuccess: (_result, userId) => {
      queryClient.setQueryData<UserBlock[]>(blockedUsersQueryKey(stableUserId), (current) =>
        current?.filter((item) => item.blocked_user_id !== userId) ?? [],
      );
      void queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-room"] });
    },
  });
}
