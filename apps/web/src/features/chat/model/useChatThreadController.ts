import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import type { ChatRoom } from "../../../shared/api/types";
import { useChatMessages } from "../useChatMessages";
import { useMarkChatRoomRead } from "../useMarkChatRoomRead";
import { useSendChatMessage } from "../useSendChatMessage";
import { useChatHistory } from "../useChatHistory";

interface UseChatThreadControllerArgs {
  accessToken: string | null;
  isBlocked: boolean;
  room: ChatRoom;
  appUserId: string | null;
}

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function useChatThreadController({
  accessToken,
  isBlocked,
  room,
  appUserId,
}: UseChatThreadControllerArgs) {
  const [message, setMessage] = useState("");
  const [isInterviewDetailOpen, setIsInterviewDetailOpen] = useState(false);
  const sendAttempt = useRef<{ body: string; clientMessageId: string; roomId: string } | null>(null);
  const { data: latestMessages, isLoading } = useChatMessages(room.id, accessToken);
  const history = useChatHistory(room.id, appUserId, accessToken, latestMessages);
  const { mutate: markRoomRead } = useMarkChatRoomRead(accessToken);
  const sendMessage = useSendChatMessage(accessToken);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const body = message.trim();

      if (isBlocked || !body || sendMessage.isPending) {
        return;
      }

      const clientMessageId =
        sendAttempt.current?.roomId === room.id && sendAttempt.current.body === body
          ? sendAttempt.current.clientMessageId
          : createClientMessageId();
      sendAttempt.current = { body, clientMessageId, roomId: room.id };
      const submittedMessage = message;

      sendMessage.mutate(
        {
          roomId: room.id,
          input: { body, client_message_id: clientMessageId },
        },
        {
          onSuccess: () => {
            if (sendAttempt.current?.clientMessageId === clientMessageId) {
              sendAttempt.current = null;
            }
            setMessage((current) => (current === submittedMessage ? "" : current));
          },
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
    ...history,
    setIsInterviewDetailOpen,
    setMessage,
  };
}
