import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatMessage, ChatRoom, ChatWorkflow } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  chatApi,
  type MarkChatRoomReadInput,
  type SendChatMessageInput,
  type UpdateChatRoomSettingsInput,
} from "@/shared/api/chat";
import { buildAuthQueryKey, resolveAuthUserId } from "@/shared/query/authQuery";

interface ChatRoomsOptions {
  pollingEnabled?: boolean;
  pollingIntervalMs?: number;
}

const chatQueryKeys = {
  rooms: ["chat-rooms"] as const,
  room: ["chat-room"] as const,
  workflow: ["chat-workflow"] as const,
  messages: ["chat-messages"] as const,
  roomList(userId: string | null) {
    return buildAuthQueryKey("chat-rooms", userId);
  },
  roomDetail(userId: string | null, roomId?: string | null) {
    return buildAuthQueryKey("chat-room", userId, roomId ?? null);
  },
  workflowDetail(userId: string | null, roomId?: string | null) {
    return buildAuthQueryKey("chat-workflow", userId, roomId ?? null);
  },
  messageList(userId: string | null, roomId?: string | null) {
    return buildAuthQueryKey("chat-messages", userId, roomId ?? null);
  },
} as const;

export function useChatRooms(accessToken?: string | null, options?: ChatRoomsOptions) {
  const pollingIntervalMs = options?.pollingIntervalMs ?? 15_000;
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && stableUserId),
    queryKey: chatQueryKeys.roomList(stableUserId),
    queryFn: () => chatApi.listRooms(accessToken),
    refetchInterval: options?.pollingEnabled ? pollingIntervalMs : false,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 15_000,
  });
}

export function useChatRoom(roomId?: string | null, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && roomId && stableUserId),
    queryKey: chatQueryKeys.roomDetail(stableUserId, roomId),
    queryFn: () => chatApi.getRoom(roomId as string, accessToken),
    retry: false,
    staleTime: 15_000,
  });
}

export function useChatWorkflow(roomId?: string | null, accessToken?: string | null) {
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && roomId && stableUserId),
    queryKey: chatQueryKeys.workflowDetail(stableUserId, roomId),
    queryFn: () => chatApi.getWorkflow(roomId as string, accessToken),
    retry: false,
    staleTime: 5_000,
  });
}

export function invalidateChatWorkflowQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  roomId?: string | null,
) {
  void queryClient.invalidateQueries({ queryKey: chatQueryKeys.workflow });
  void queryClient.invalidateQueries({ queryKey: chatQueryKeys.room });
  void queryClient.invalidateQueries({ queryKey: chatQueryKeys.rooms });
  if (roomId) {
    void queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "chat-messages" && query.queryKey[2] === roomId,
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages });
  }
}

interface ChatMessagesOptions {
  pollingEnabled?: boolean;
  pollingIntervalMs?: number;
}

export function useChatMessages(roomId?: string | null, accessToken?: string | null, options?: ChatMessagesOptions) {
  const pollingIntervalMs = options?.pollingIntervalMs ?? 3_000;
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useQuery({
    enabled: Boolean(accessToken && roomId && stableUserId),
    queryKey: chatQueryKeys.messageList(stableUserId, roomId),
    queryFn: () => chatApi.listMessages(roomId as string, accessToken),
    refetchInterval: options?.pollingEnabled ? pollingIntervalMs : false,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 5_000,
  });
}

export function useSendChatMessage(roomId?: string | null, accessToken?: string | null) {
  const queryClient = useQueryClient();
  const { appUser, user } = useAuth();
  const stableUserId = resolveAuthUserId(appUser?.id, user?.id);

  return useMutation({
    mutationFn: (input: SendChatMessageInput) => chatApi.sendMessage(roomId as string, input, accessToken),
    onSuccess: (message) => {
      queryClient.setQueryData<ChatMessage[]>(chatQueryKeys.messageList(stableUserId, roomId), (current) =>
        current
          ? current.some((item) => item.id === message.id)
            ? current
            : [...current, message]
          : [message],
      );
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.rooms });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.room });
    },
  });
}

export function useMarkChatRoomRead(roomId?: string | null, accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: MarkChatRoomReadInput) => chatApi.markRead(roomId as string, accessToken, input),
    onSuccess: (setting) => {
      queryClient.setQueriesData<ChatRoom[]>({ queryKey: chatQueryKeys.rooms }, (current) =>
        current?.map((room) =>
          room.id === roomId
            ? { ...room, unread_count: 0, last_read_at: setting.last_read_at }
            : room,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.rooms });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.room });
    },
  });
}

export function useUpdateChatRoomSettings(roomId?: string | null, accessToken?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateChatRoomSettingsInput) => chatApi.updateSettings(roomId as string, input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.rooms });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.room });
    },
  });
}
