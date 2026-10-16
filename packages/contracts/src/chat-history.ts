import type { ChatMessage } from "./api";

export const CHAT_MESSAGE_PAGE_SIZE = 50;

export type ChatMessageCursor = Pick<ChatMessage, "id" | "created_at">;

export function chatMessageHistorySearch(cursor: ChatMessageCursor) {
  return new URLSearchParams({
    before: cursor.created_at,
    before_id: cursor.id,
    limit: String(CHAT_MESSAGE_PAGE_SIZE),
  }).toString();
}

// Inputs are chronological server pages, oldest first. Keep server ordering,
// including sub-millisecond timestamps that JS Date would otherwise truncate.
export function mergeChatMessagePages(...pages: readonly ChatMessage[][]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const page of pages) {
    for (const message of page) byId.set(message.id, message);
  }
  return [...byId.values()];
}
