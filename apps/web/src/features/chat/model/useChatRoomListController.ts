import { useCallback, useMemo, useState } from "react";

import type { ChatRoom } from "../../../shared/api/types";
import { navigateTo } from "../../../shared/navigation/appNavigation";
import {
  type ChatFilter,
  getCounterpart,
  getFilterCounts,
  getVisibleChatRooms,
} from "./chatRoomModel";

function addSetValue(previous: Set<string>, value: string) {
  const next = new Set(previous);
  next.add(value);
  return next;
}

interface UseChatRoomListControllerArgs {
  appUserId: string | null;
  onSelectedRoomHidden: () => void;
  rooms: ChatRoom[];
  selectedRoomId: string | null;
}

export function useChatRoomListController({
  appUserId,
  onSelectedRoomHidden,
  rooms,
  selectedRoomId,
}: UseChatRoomListControllerArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("all");
  const [mutedRoomOverrides, setMutedRoomOverrides] = useState<Record<string, boolean>>({});
  const [hiddenRoomIds, setHiddenRoomIds] = useState<Set<string>>(new Set());
  const [blockedRoomIds, setBlockedRoomIds] = useState<Set<string>>(new Set());
  const [profileRoom, setProfileRoom] = useState<ChatRoom | null>(null);
  const [blockTargetRoom, setBlockTargetRoom] = useState<ChatRoom | null>(null);

  const visibleRooms = useMemo(
    () =>
      getVisibleChatRooms({
        activeFilter,
        appUserId,
        blockedRoomIds,
        hiddenRoomIds,
        rooms,
        searchQuery,
      }),
    [activeFilter, appUserId, blockedRoomIds, hiddenRoomIds, rooms, searchQuery],
  );

  const filterCounts = useMemo(
    () => getFilterCounts(rooms.filter((room) => !hiddenRoomIds.has(room.id)), blockedRoomIds),
    [blockedRoomIds, hiddenRoomIds, rooms],
  );

  const getIsMuted = useCallback(
    (room: ChatRoom) => mutedRoomOverrides[room.id] ?? room.is_muted,
    [mutedRoomOverrides],
  );

  const toggleMute = useCallback((room: ChatRoom) => {
    setMutedRoomOverrides((previous) => ({
      ...previous,
      [room.id]: !(previous[room.id] ?? room.is_muted),
    }));
  }, []);

  const hideRoom = useCallback(
    (roomId: string) => {
      setHiddenRoomIds((previous) => addSetValue(previous, roomId));

      if (selectedRoomId === roomId) {
        onSelectedRoomHidden();
      }
    },
    [onSelectedRoomHidden, selectedRoomId],
  );

  const requestReport = useCallback(
    (room: ChatRoom) => {
      const counterpart = getCounterpart(room, appUserId);
      const params = new URLSearchParams({
        target_type: "chat_room",
        target_id: room.id,
        counterpart_name: counterpart.name,
        interview_title: room.interview_post?.title ?? "인터뷰 채팅",
      });

      navigateTo(`/report?${params.toString()}`);
    },
    [appUserId],
  );

  const requestBlock = useCallback((room: ChatRoom) => {
    setBlockTargetRoom(room);
  }, []);

  const confirmBlock = useCallback(() => {
    if (!blockTargetRoom) {
      return;
    }

    setBlockedRoomIds((previous) => addSetValue(previous, blockTargetRoom.id));
    setBlockTargetRoom(null);
  }, [blockTargetRoom]);

  return {
    activeFilter,
    blockTargetRoom,
    blockedRoomIds,
    confirmBlock,
    filterCounts,
    getIsMuted,
    hideRoom,
    profileRoom,
    requestBlock,
    requestReport,
    searchQuery,
    setActiveFilter,
    setBlockTargetRoom,
    setProfileRoom,
    setSearchQuery,
    toggleMute,
    visibleRooms,
  };
}
