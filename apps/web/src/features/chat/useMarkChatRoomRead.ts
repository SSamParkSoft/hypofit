import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatApi } from "../../shared/api/chat";
import { resolveStableAuthUserId } from "../../shared/api/queryAuth";
import type { ChatRoom } from "../../shared/api/types";
import { AuthContext } from "../auth/AuthProvider";
import { chatQueryKeys } from "./useChatRooms";

export function useMarkChatRoomRead(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: (roomId: string) => chatApi.markRead(roomId, effectiveAccessToken),
    onSuccess: (_result, roomId) => {
      queryClient.setQueriesData<ChatRoom[]>(
        { queryKey: chatQueryKeys.lists(stableUserId) },
        (previous) =>
          previous?.map((room) =>
            room.id === roomId
              ? { ...room, last_read_at: new Date().toISOString(), unread_count: 0 }
              : room,
          ),
      );
    },
  });
}
