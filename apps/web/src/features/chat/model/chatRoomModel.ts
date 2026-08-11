import type {
  ChatMessage,
  ChatRoom,
  InterviewMode,
  UserSummary,
} from "../../../shared/api/types";

export type ChatFilter = "all" | "open" | "selected" | "rejected" | "closed";
export type DisplayChatStatus = ChatRoom["status"] | "rejected";

export const chatFilterLabels: Record<ChatFilter, string> = {
  all: "전체",
  open: "조율 중",
  selected: "선정됨",
  rejected: "반려됨",
  closed: "종료",
};

interface GetVisibleChatRoomsArgs {
  activeFilter: ChatFilter;
  appUserId: string | null;
  blockedRoomIds: Set<string>;
  hiddenRoomIds: Set<string>;
  rooms: ChatRoom[];
  searchQuery: string;
}

export function getVisibleChatRooms({
  activeFilter,
  appUserId,
  blockedRoomIds,
  hiddenRoomIds,
  rooms,
  searchQuery,
}: GetVisibleChatRoomsArgs) {
  const query = searchQuery.trim().toLowerCase();
  const filteredRooms = rooms.filter((room) => {
    if (hiddenRoomIds.has(room.id)) {
      return false;
    }

    const status = getRoomDisplayStatus(room, blockedRoomIds.has(room.id));

    if (activeFilter === "open") {
      return status === "open";
    }

    if (activeFilter === "selected") {
      return status === "selected";
    }

    if (activeFilter === "rejected") {
      return status === "rejected";
    }

    if (activeFilter === "closed") {
      return status === "closed" || status === "blocked";
    }

    return true;
  });

  if (!query) {
    return filteredRooms;
  }

  return filteredRooms.filter((room) => {
    const counterpart = getCounterpart(room, appUserId);
    return [counterpart.name, room.interview_post?.title, room.last_message?.body]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });
}

export function getFilterCounts(
  rooms: ChatRoom[],
  blockedRoomIds: Set<string>,
): Record<ChatFilter, number> {
  return {
    all: rooms.length,
    open: rooms.filter((room) => getRoomDisplayStatus(room, blockedRoomIds.has(room.id)) === "open")
      .length,
    selected: rooms.filter(
      (room) => getRoomDisplayStatus(room, blockedRoomIds.has(room.id)) === "selected",
    ).length,
    rejected: rooms.filter(
      (room) => getRoomDisplayStatus(room, blockedRoomIds.has(room.id)) === "rejected",
    ).length,
    closed: rooms.filter((room) =>
      ["blocked", "closed"].includes(getRoomDisplayStatus(room, blockedRoomIds.has(room.id))),
    ).length,
  };
}

export function getRoomDisplayStatus(
  room: ChatRoom,
  isBlocked: boolean,
): DisplayChatStatus {
  if (isBlocked) {
    return "blocked";
  }

  if (room.application?.status === "rejected") {
    return "rejected";
  }

  return room.status;
}

export function getCounterpart(
  room: ChatRoom,
  appUserId: string | null,
): UserSummary {
  if (appUserId && room.founder_id === appUserId) {
    return (
      room.respondent ?? {
        id: room.respondent_id,
        name: "응답자",
        bio: null,
        role: "respondent",
        profile_image_url: null,
      }
    );
  }

  return (
    room.founder ?? {
      id: room.founder_id,
      name: "창업자",
      bio: null,
      role: "founder",
      profile_image_url: null,
    }
  );
}

export function getCounterpartRoleLabel(role: string) {
  if (role === "founder") {
    return "창업자";
  }

  if (role === "both") {
    return "창업자 · 인터뷰어";
  }

  return "인터뷰어";
}

export function getRoomStatusLabel(status: DisplayChatStatus) {
  if (status === "selected") {
    return "선정됨";
  }

  if (status === "rejected") {
    return "반려됨";
  }

  if (status === "closed") {
    return "종료";
  }

  if (status === "blocked") {
    return "제한됨";
  }

  return "조율 중";
}

export function getRoomStatusClassName(status: DisplayChatStatus) {
  if (status === "selected") {
    return "bg-hypo-success-soft text-hypo-success";
  }

  if (status === "rejected") {
    return "bg-hypo-danger-soft text-hypo-danger";
  }

  if (status === "closed") {
    return "bg-hypo-surface-muted text-hypo-text-muted";
  }

  if (status === "blocked") {
    return "bg-hypo-danger-soft text-hypo-danger";
  }

  return "bg-hypo-info-soft text-hypo-info";
}

export function getRoomBadgeIntent(status: DisplayChatStatus) {
  if (status === "selected") {
    return "success" as const;
  }

  if (status === "rejected" || status === "blocked") {
    return "danger" as const;
  }

  return "info" as const;
}

export function formatReward(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatInterviewMode(mode: InterviewMode) {
  if (mode === "online") {
    return "화상";
  }

  if (mode === "offline") {
    return "대면";
  }

  return "대면/화상";
}

export function formatRelativeTime(value: string, now = Date.now()) {
  const timestamp = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round((now - timestamp) / 60_000));

  if (diffMinutes < 1) {
    return "방금";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  if (diffMinutes < 60 * 24) {
    return `${Math.floor(diffMinutes / 60)}시간 전`;
  }

  return `${Math.floor(diffMinutes / (60 * 24))}일 전`;
}

export function formatClock(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function isSystemMessage(message: ChatMessage) {
  return message.sender_id === null || message.message_type !== "user";
}
