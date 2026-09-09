# Chat Tab Unread Badge Plan

Status: completed-local-implementation

Closed: 2026-09-06. Existing tab-shell wiring and helper were inspected;
`pnpm --dir apps/mobile test:chat-unread-badge` and
`pnpm --dir apps/mobile typecheck` passed on the current dirty checkout.
The Node module-type warning did not affect the passing exit code.
This is local implementation completion, not a deployment/device signoff.
Remaining phone checks are tracked in `docs/reference/ui-final-qa-checklist.md`.

Last updated: 2026-09-06

## Purpose

Show a compact unread badge on the mobile `채팅` bottom-tab icon so a signed-in
user can notice conversations that need attention without opening the chat
list. This is an in-app navigation signal, not an app-icon notification badge.

## Verified Baseline

- `GET /api/v1/chat/rooms` already returns a server-owned `unread_count` for
  each visible room.
- The count excludes messages sent by the current user and uses the
  participant's `last_read_at` value.
- `useMarkChatRoomRead` immediately patches the matching room to
  `unread_count: 0` and invalidates the room-list query.
- The chat list already polls this query every 15 seconds while foregrounded.
- The Expo Router bottom tab is configured in `apps/mobile/app/(tabs)/_layout.tsx`.

## Decisions

### Count Semantics

The tab badge represents **the number of rooms with unread messages**, not the
sum of unread messages.

```text
room A: 12 unread messages
room B: 1 unread message

chat tab badge: 2
```

The chat list keeps its existing per-room message count. The tab answers how
many conversations require attention, avoiding a volatile large number from a
single active conversation.

### Display Rules

| Unread rooms | Tab badge |
| --- | --- |
| `0` | hidden |
| `1` to `99` | exact count |
| `100+` | `99+` |

- Use the existing danger semantic red surface and white text. Emerald remains
  reserved for selection and product workflow meaning.
- Position the badge at the icon's trailing-top edge through the existing
  bottom-tab implementation.
- Keep the tab label `채팅`; do not add explanatory on-screen copy.
- Announce the count through the tab's accessibility label.

### Refresh Rules

1. Fetch room data when an authenticated tab shell mounts.
2. Refetch every 15 seconds while the app is foregrounded.
3. Reuse the existing query cache invalidation after send/read mutations.
4. Do not increment a local counter from push payloads. A foreground push
   handler may invalidate the room-list query later, but the API remains the
   count authority.

## Scope

### In Scope

- Mobile tab-shell query for room unread state.
- `채팅` tab badge and accessible label.
- Existing-query cache coherence after opening a room or sending a message.
- Focused typecheck and visual QA.

### Out Of Scope

- App launcher icon badge and notification permission policy.
- New API endpoint, schema migration, WebSocket, or background polling.
- Changes to unread semantics, chat list layout, push delivery, or backend SQL.

## Implementation Steps

Code audit, 2026-09-06: steps 1-5 below already have implementation in the
current checkout. `unreadChatBadge.ts`, tab-shell `tabBarBadge` wiring, and
`scripts/chatUnreadBadge.node-test.mjs` exist. Do not implement them twice.
This audit did not rerun tests or prove simulator rendering.

Remaining closure work:

- [x] Run `pnpm --dir apps/mobile test:chat-unread-badge` and mobile typecheck
  against the actual release diff.
- [ ] Verify foreground refresh, read mutation, account switch, zero and 99+
  states on the phone layout; record build and screenshots in manual QA.
- [x] After automated checks pass, move implementation history to completed
  and link outstanding device QA from the release checklist.

The numbered list below records implementation scope, not wholly pending work.

1. Add a small pure helper that derives unread-room count and the capped display
   label from `ChatRoom[]`.
2. Use `useChatRooms` from the authenticated tabs shell with 15-second
   foreground polling.
3. Set the existing chat `Tabs.Screen` `tabBarBadge`, badge style, and
   accessibility label from the derived count.
4. Keep `tabBarBadge` absent at zero instead of rendering an empty surface.
5. Add a focused Node test for count semantics and capping.
6. Run mobile typecheck, the focused test, diff check, and simulator QA.

## QA Matrix

| Case | Expected result |
| --- | --- |
| No unread rooms | no chat-tab badge |
| One unread room, several messages | badge `1` |
| Three unread rooms | badge `3` |
| One hundred or more unread rooms | badge `99+` |
| Enter and read one room | tab badge immediately decreases |
| Send own message | tab badge does not increase |
| Screen reader focus | `채팅, 읽지 않은 대화 N개` is announced |
| Chat thread route | tab bar remains hidden as today |

## Completion Criteria

- The badge derives solely from the existing authenticated chat-room response.
- It does not appear at zero and never displays an unbounded long number.
- It updates after the existing read mutation without a new app restart.
- It does not change push permission, app-icon badges, or chat business rules.
