import type { ChatRoom } from "@hypofit/contracts";

export const chatTabBadgeMaximum = 99;

export function countUnreadChatRooms(rooms: ChatRoom[] | undefined): number {
  return rooms?.reduce((count, room) => count + (room.unread_count > 0 ? 1 : 0), 0) ?? 0;
}

export function formatChatTabBadge(unreadRoomCount: number): string | undefined {
  if (unreadRoomCount <= 0) {
    return undefined;
  }

  return unreadRoomCount > chatTabBadgeMaximum ? `${chatTabBadgeMaximum}+` : String(unreadRoomCount);
}

export function getChatTabAccessibilityLabel(unreadRoomCount: number): string {
  if (unreadRoomCount <= 0) {
    return "채팅";
  }

  return unreadRoomCount > chatTabBadgeMaximum
    ? "채팅, 읽지 않은 대화 99개 이상"
    : `채팅, 읽지 않은 대화 ${unreadRoomCount}개`;
}
