import { useContext } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { chatApi, type SendChatMessageInput } from "../../shared/api/chat";
import { resolveStableAuthUserId } from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";
import { chatQueryKeys } from "./useChatRooms";

export function useSendChatMessage(accessToken?: string | null) {
  const queryClient = useQueryClient();
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useMutation({
    mutationFn: ({ input, roomId }: { input: SendChatMessageInput; roomId: string }) =>
      chatApi.sendMessage(roomId, input, effectiveAccessToken),
    onSuccess: (_message, variables) => {
      void queryClient.invalidateQueries({
        queryKey: chatQueryKeys.messages(stableUserId, variables.roomId),
      });
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.lists(stableUserId) });
    },
  });
}
