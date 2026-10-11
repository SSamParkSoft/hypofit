import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useChatMessages } from "@/features/chat/useChat";
import { useAppActive } from "@/shared/hooks/useAppActive";

/** Pause room polling when unfocused/backgrounded, and back off failed reads. */
export function useChatMessagePolling(roomId: string | undefined, accessToken: string | null) {
  const isAppActive = useAppActive();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [pollingFailureCount, setPollingFailureCount] = useState(0);
  const lastMessagesDataUpdatedAtRef = useRef(0);
  const lastMessagesErrorUpdatedAtRef = useRef(0);
  const shouldPollMessages = isScreenFocused && isAppActive && Boolean(accessToken && roomId);
  const query = useChatMessages(roomId, accessToken, {
    pollingEnabled: shouldPollMessages,
    pollingIntervalMs: resolveChatPollingInterval(pollingFailureCount),
  });

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    setPollingFailureCount(0);
  }, [roomId]);

  useEffect(() => {
    if (query.dataUpdatedAt && query.dataUpdatedAt !== lastMessagesDataUpdatedAtRef.current) {
      lastMessagesDataUpdatedAtRef.current = query.dataUpdatedAt;
      setPollingFailureCount(0);
    }
  }, [query.dataUpdatedAt]);

  useEffect(() => {
    if (query.errorUpdatedAt && query.errorUpdatedAt !== lastMessagesErrorUpdatedAtRef.current) {
      lastMessagesErrorUpdatedAtRef.current = query.errorUpdatedAt;
      setPollingFailureCount((count) => count + 1);
    }
  }, [query.errorUpdatedAt]);

  return { ...query, shouldPollMessages };
}

function resolveChatPollingInterval(failureCount: number) {
  if (failureCount >= 3) return 30_000;
  if (failureCount >= 1) return 10_000;
  return 3_000;
}
