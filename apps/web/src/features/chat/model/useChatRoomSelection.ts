import { useCallback, useEffect, useMemo, useState } from "react";

import type { ChatRoom } from "../../../shared/api/types";
import {
  navigateBack,
  navigateTo,
  replacePath,
  subscribeToNavigation,
} from "../../../shared/navigation/appNavigation";
import { buildChatRoomPath, getChatRoomIdFromLocation } from "./chatRoomLocation";

export function useChatRoomSelection(rooms: ChatRoom[]) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() =>
    getChatRoomIdFromLocation(),
  );

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  );

  useEffect(() => {
    const syncRoomFromLocation = () => setSelectedRoomId(getChatRoomIdFromLocation());

    window.addEventListener("popstate", syncRoomFromLocation);
    const unsubscribe = subscribeToNavigation(syncRoomFromLocation);

    return () => {
      window.removeEventListener("popstate", syncRoomFromLocation);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const requestedRoomId = getChatRoomIdFromLocation();

    if (
      requestedRoomId &&
      rooms.length > 0 &&
      !rooms.some((room) => room.id === requestedRoomId)
    ) {
      replacePath("/chat", { intent: "state", scroll: "preserve" });
      setSelectedRoomId(null);
    }
  }, [rooms]);

  const selectRoom = useCallback((roomId: string) => {
    const nextPath = buildChatRoomPath(roomId);

    if (`${window.location.pathname}${window.location.search}` !== nextPath) {
      navigateTo(nextPath, { focus: "none", intent: "state", scroll: "preserve" });
    }

    setSelectedRoomId(roomId);
  }, []);

  const closeThread = useCallback(() => {
    if (getChatRoomIdFromLocation()) {
      navigateBack("/chat");
      return;
    }

    replacePath("/chat", { intent: "state", scroll: "preserve" });
    setSelectedRoomId(null);
  }, []);

  const clearSelectedRoomSelection = useCallback(() => {
    setSelectedRoomId(null);
  }, []);

  return {
    clearSelectedRoomSelection,
    closeThread,
    isThreadOpen: selectedRoom !== null,
    selectRoom,
    selectedRoom,
    selectedRoomId,
  };
}
