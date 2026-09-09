import assert from "node:assert/strict";

import {
  chatTabBadgeMaximum,
  countUnreadChatRooms,
  formatChatTabBadge,
  getChatTabAccessibilityLabel,
} from "../src/features/chat/unreadChatBadge.ts";

const room = (unread_count) => ({ unread_count });

assert.equal(countUnreadChatRooms(undefined), 0);
assert.equal(countUnreadChatRooms([room(0), room(4), room(1)]), 2);
assert.equal(formatChatTabBadge(0), undefined);
assert.equal(formatChatTabBadge(1), "1");
assert.equal(formatChatTabBadge(chatTabBadgeMaximum), "99");
assert.equal(formatChatTabBadge(chatTabBadgeMaximum + 1), "99+");
assert.equal(getChatTabAccessibilityLabel(0), "채팅");
assert.equal(getChatTabAccessibilityLabel(3), "채팅, 읽지 않은 대화 3개");
assert.equal(getChatTabAccessibilityLabel(100), "채팅, 읽지 않은 대화 99개 이상");
