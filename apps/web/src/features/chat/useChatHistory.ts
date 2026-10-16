import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_MESSAGE_PAGE_SIZE, mergeChatMessagePages, type ChatMessage } from "@hypofit/contracts";
import { chatApi } from "../../shared/api/chat";

const emptyMessages: ChatMessage[] = [];

export function useChatHistory(
  roomId: string | null | undefined,
  userId: string | null | undefined,
  accessToken: string | null | undefined,
  latest: ChatMessage[] = emptyMessages,
) {
  const scope = JSON.stringify([userId, roomId]);
  const [history, setHistory] = useState<{ scope: string; messages: ChatMessage[]; hasOlder: boolean } | null>(null);
  const [loadingScope, setLoadingScope] = useState<string | null>(null);
  const [errorScope, setErrorScope] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const currentHistory = history?.scope === scope ? history : null;
  const messages = useMemo(
    () => currentHistory ? mergeChatMessagePages(currentHistory.messages, latest) : latest,
    [currentHistory, latest],
  );
  const hasOlder = currentHistory?.hasOlder ?? (latest.length >= CHAT_MESSAGE_PAGE_SIZE);

  useEffect(() => {
    setHistory(null);
    setLoadingScope(null);
    setErrorScope(null);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [scope]);

  // Once history is opened, retain observed live messages as the latest window rolls.
  useEffect(() => {
    setHistory((current) => current?.scope === scope
      ? { ...current, messages: mergeChatMessagePages(current.messages, latest) }
      : current);
  }, [latest, scope]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!roomId || !accessToken || !userId || !oldest || !hasOlder || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoadingScope(scope);
    setErrorScope(null);
    try {
      const page = await chatApi.listOlderMessages(roomId, oldest, accessToken, controller.signal);
      if (controller.signal.aborted) return;
      setHistory((current) => ({
        scope,
        messages: mergeChatMessagePages(page, current?.scope === scope ? current.messages : messages),
        hasOlder: page.length === CHAT_MESSAGE_PAGE_SIZE,
      }));
    } catch {
      if (!controller.signal.aborted) setErrorScope(scope);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoadingScope(null);
      }
    }
  };

  return { messages, hasOlder, loadOlder, isLoadingOlder: loadingScope === scope, isHistoryError: errorScope === scope };
}
