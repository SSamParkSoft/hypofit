const CHAT_PAGE_PATH = "/chat";
const CHAT_ROOM_QUERY_PARAM = "room";

interface ChatPageLocation {
  pathname: string;
  search: string;
}

export function buildChatRoomPath(roomId: string) {
  return `${CHAT_PAGE_PATH}?${CHAT_ROOM_QUERY_PARAM}=${encodeURIComponent(roomId)}`;
}

export function getChatRoomIdFromLocation(location?: ChatPageLocation | null) {
  const resolvedLocation = resolveLocation(location);

  if (!resolvedLocation || resolvedLocation.pathname !== CHAT_PAGE_PATH) {
    return null;
  }

  return new URLSearchParams(resolvedLocation.search).get(CHAT_ROOM_QUERY_PARAM);
}

function resolveLocation(location?: ChatPageLocation | null) {
  if (location) {
    return location;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.location;
}
