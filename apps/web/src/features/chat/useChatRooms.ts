import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { chatApi } from "../../shared/api/chat";
import {
  getProtectedQueryUserId,
  PROTECTED_QUERY_SCOPE,
  resolveStableAuthUserId,
} from "../../shared/api/queryAuth";
import { AuthContext } from "../auth/AuthProvider";

export const chatQueryKeys = {
  roomsRoot: ["chat-rooms"] as const,
  lists(stableUserId: string | null) {
    return ["chat-rooms", getProtectedQueryUserId(stableUserId)] as const;
  },
  rooms(stableUserId: string | null) {
    return ["chat-rooms", getProtectedQueryUserId(stableUserId), PROTECTED_QUERY_SCOPE] as const;
  },
  messagesRoot: ["chat-messages"] as const,
  messages(stableUserId: string | null, roomId: string | null) {
    return [
      "chat-messages",
      getProtectedQueryUserId(stableUserId),
      roomId ?? "unknown-room",
      PROTECTED_QUERY_SCOPE,
    ] as const;
  },
} as const;

export function useChatRooms(accessToken?: string | null) {
  const authContext = useContext(AuthContext);
  const stableUserId = resolveStableAuthUserId(authContext?.appUser?.id, authContext?.user?.id);
  const effectiveAccessToken = accessToken ?? authContext?.accessToken ?? null;

  return useQuery({
    enabled: Boolean(effectiveAccessToken),
    queryFn: ({ signal }) => chatApi.listRooms(effectiveAccessToken, { signal }),
    queryKey: chatQueryKeys.rooms(stableUserId),
    staleTime: 15_000,
  });
}
