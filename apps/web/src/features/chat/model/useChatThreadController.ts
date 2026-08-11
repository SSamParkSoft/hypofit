import { type FormEvent, useCallback, useEffect, useState } from "react";

import type { ChatRoom } from "../../../shared/api/types";
import { useChatMessages } from "../useChatMessages";
import { useMarkChatRoomRead } from "../useMarkChatRoomRead";
import { useSendChatMessage } from "../useSendChatMessage";

interface UseChatThreadControllerArgs {
  accessToken: string | null;
  isBlocked: boolean;
  room: ChatRoom;
}

export function useChatThreadController({
  accessToken,
  isBlocked,
  room,
}: UseChatThreadControllerArgs) {
  const [message, setMessage] = useState("");
  const [isInterviewDetailOpen, setIsInterviewDetailOpen] = useState(false);
  const { data: messages = [], isLoading } = useChatMessages(room.id, accessToken);
  const { mutate: markRoomRead } = useMarkChatRoomRead(accessToken);
  const sendMessage = useSendChatMessage(accessToken);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const body = message.trim();

      if (isBlocked || !body || sendMessage.isPending) {
        return;
      }

      sendMessage.mutate(
        { roomId: room.id, input: { body } },
        {
          onSuccess: () => setMessage(""),
        },
      );
    },
    [isBlocked, message, room.id, sendMessage],
  );

  useEffect(() => {
    if (!isLoading && room.unread_count > 0) {
      markRoomRead(room.id);
    }
  }, [isLoading, markRoomRead, room.id, room.unread_count]);

  return {
    canSend: !isBlocked && Boolean(message.trim()) && !sendMessage.isPending,
    handleSubmit,
    isInterviewDetailOpen,
    isLoading,
    isSendError: sendMessage.isError,
    message,
    messages,
    setIsInterviewDetailOpen,
    setMessage,
  };
}
