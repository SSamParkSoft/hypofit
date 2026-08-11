import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { chatApi } from "../../shared/api/chat";
import { resolveStableAuthUserId } from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";
import { chatQueryKeys } from "./useChatRooms";

export function useChatMessages(roomId: string | null, accessToken?: string | null) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken && roomId),
    queryFn: ({ signal }) => {
      if (!roomId) {
        return Promise.resolve([]);
      }

      return chatApi.listMessages(roomId, effectiveAccessToken, { signal });
    },
    queryKey: chatQueryKeys.messages(stableUserId, roomId),
    refetchInterval: 5_000,
    staleTime: 5_000,
  });
}
