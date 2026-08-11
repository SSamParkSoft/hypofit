# Chat Active-Screen Polling Plan

Status: completed - implementation finished; smoke history retained

Last updated: 2026-06-01

## Purpose

Hypofit chat currently uses REST APIs and React Query cache invalidation. It is
not realtime, and it does not poll automatically while a user keeps a chat room
open.

This plan defines the MVP-grade chat refresh strategy:

```text
chat thread is focused
  + app is foreground active
  + user is signed in
  + room id exists
  -> poll messages on a short interval
  -> mark newly visible counterpart messages as read
```

This intentionally avoids WebSocket/SSE/realtime infrastructure for the current
MVP because Hypofit chat is for interview scheduling and coordination, not a
low-latency messenger product.

## Source Basis

Official references checked on 2026-06-01:

- TanStack Query polling guide:
  https://tanstack.com/query/latest/docs/react/guides/polling
- TanStack Query React Native guide:
  https://tanstack.com/query/latest/docs/framework/react/react-native
- React Native `AppState`:
  https://reactnative.dev/docs/appstate.html
- Expo Router `useFocusEffect`:
  https://docs.expo.dev/versions/latest/sdk/router/

Relevant guidance from those sources:

- `refetchInterval` runs a query on a timer and is independent of `staleTime`.
- `refetchInterval` can return `false` to pause polling.
- React Native does not have browser window focus events; app foreground state
  should be derived from `AppState`.
- `AppState` distinguishes `active`, `background`, and iOS `inactive`.
- Expo Router provides `useFocusEffect` for side effects that start when a route
  is focused and clean up when it loses focus.

## Current Implementation Baseline

Mobile client:

- `apps/mobile/src/features/chat/useChat.ts`
  - `useChatRooms` fetches room list.
  - `useChatRoom` fetches one room.
  - `useChatMessages` fetches messages once per query lifecycle.
  - No `refetchInterval` is configured.
  - `staleTime` is currently:
    - room list: `15_000`
    - room detail: `15_000`
    - messages: `5_000`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
  - marks room read once when entering the room.
  - appends a sent message into the React Query cache on send success.
  - invalidates chat room list/detail after send.
- `apps/mobile/src/screens/chat/ChatListScreen.tsx`
  - shows room list, last message, unread badge, and status.
  - currently does not poll.

Backend:

- `GET /api/v1/chat/rooms/`
- `GET /api/v1/chat/rooms/{room_id}`
- `GET /api/v1/chat/rooms/{room_id}/messages`
- `POST /api/v1/chat/rooms/{room_id}/messages`
- `POST /api/v1/chat/rooms/{room_id}/read`
- `PATCH /api/v1/chat/rooms/{room_id}/settings`

Unread count is server-calculated from:

```text
chat_room_participant_settings.last_read_at
chat_messages.created_at
chat_messages.sender_id != current_user.id
```

## Product Decision

Use active-screen polling now.

Do not implement these in the current task:

- WebSocket gateway
- SSE stream
- Supabase Realtime subscription
- Expo push notifications
- FCM/APNs delivery
- background chat polling
- typing indicators
- delivered/read receipts per message

Why:

- Current GPU/API topology is behind tunnels, so long-lived realtime
  connections add operational risk.
- MVP chat is coordination-heavy but not second-level mission critical.
- REST polling can be implemented with the existing API contract.
- The user only expects near-realtime updates while actively looking at a room.
- Push and realtime can be added later without changing the current core
  message schema.

## Polling Policy

### Chat Thread

Poll when all are true:

- screen route is focused
- app state is `active`
- `accessToken` exists
- `roomId` exists

Stop polling when any are true:

- screen route loses focus
- app state becomes `inactive` or `background`
- user logs out
- room id is missing
- query errors repeatedly enough that React Query pauses/retries according to
  the configured query behavior

Initial interval:

```text
3 seconds
```

Reason:

- Fast enough to feel conversational for scheduling.
- Slow enough to avoid unnecessary load during MVP testing.
- Easy to adjust after observing deployed traffic.

### Chat List

Do not add list polling in the first pass unless the thread polling work exposes
a clear UX gap.

Candidate later interval:

```text
10-15 seconds while the chat tab is focused and app is active
```

Reason:

- Chat list has more rooms and can trigger heavier queries.
- The room list already refreshes after local send/application mutations.
- The most visible UX gap is inside an open thread, not the list.

## Implementation Plan

### 1. Add App Active State Hook

Create:

```text
apps/mobile/src/shared/hooks/useAppActive.ts
```

Behavior:

- initialize from `AppState.currentState === "active"`
- subscribe to `AppState.addEventListener("change", ...)`
- return `true` only for `active`
- treat `inactive`, `background`, and unknown initial state as not active
- clean up the subscription on unmount

Do not replace Supabase auth auto-refresh behavior in
`apps/mobile/src/shared/api/supabase.ts`. That code already uses `AppState` for
auth token refresh and should remain independent.

Implementation status:

- [x] Added `apps/mobile/src/shared/hooks/useAppActive.ts`.
- [x] The hook returns `true` only when React Native `AppState` is `active`.
- [x] The hook cleans up the native app-state subscription on unmount.

### 2. Add Route Focus Tracking to Chat Thread

In:

```text
apps/mobile/src/screens/chat/ChatThreadScreen.tsx
```

Use Expo Router `useFocusEffect`:

```text
focused -> set screen focused true
cleanup -> set screen focused false
```

Wrap the callback in `useCallback` so the focus effect is stable.

Compute:

```text
shouldPollMessages =
  isScreenFocused &&
  isAppActive &&
  Boolean(accessToken && roomId)
```

Implementation status:

- [x] `ChatThreadScreen` now uses Expo Router `useFocusEffect`.
- [x] `shouldPollMessages` combines route focus, app active state, auth token,
      and room id.

### 3. Extend Chat Message Query Options

Update:

```text
apps/mobile/src/features/chat/useChat.ts
```

Target API:

```ts
useChatMessages(roomId, accessToken, {
  pollingEnabled: shouldPollMessages,
  pollingIntervalMs: 3_000,
});
```

Query behavior:

```ts
refetchInterval: pollingEnabled ? pollingIntervalMs : false
refetchIntervalInBackground: false
```

Keep:

- `enabled`
- `retry: false`
- `staleTime: 5_000`

Do not rely on `staleTime` for polling. The interval is the intentional refresh
mechanism.

Implementation status:

- [x] `useChatMessages` accepts `pollingEnabled` and `pollingIntervalMs`.
- [x] Chat thread passes `pollingEnabled: shouldPollMessages`.
- [x] The active interval is `3_000`.
- [x] `refetchIntervalInBackground` remains false.

### 4. Mark Newly Visible Counterpart Messages Read

Problem:

- The screen currently calls `markRead` only once when entering the room.
- If a counterpart message arrives through polling while the user is still in
  the room, the user has effectively seen it, but `last_read_at` can remain
  stale.

Plan:

- find the latest message where:
  - `message.sender_id` exists
  - `message.sender_id !== appUser.id`
- keep a `useRef` of the latest counterpart message id already submitted for
  read marking
- when `shouldPollMessages` is true and a new latest counterpart message appears,
  call `markRead.mutate()`
- skip while `markRead.isPending`
- do not call read marking for system messages
- do not call read marking for the user's own messages

This keeps unread state aligned without sending a read request every polling
tick.

Implementation status:

- [x] `ChatThreadScreen` tracks the latest counterpart message.
- [x] The screen calls `markRead` only for a new latest counterpart message
      while polling is active.
- [x] A ref prevents repeating the same read mutation on every polling tick.
- [x] System messages and the user's own messages do not trigger the extra read
      mutation.

### 5. Preserve Send Optimism

Keep the current send behavior:

- clear input immediately
- append sent message into `chat-messages` cache on success
- restore input on error
- invalidate room list/detail after success

Do not add optimistic temporary messages in this pass. The current server-return
append is safer and enough for MVP.

### 6. Avoid Duplicate Timers

Only the chat thread screen should enable `refetchInterval` for the message
query.

Do not enable message polling in:

- chat list rows
- notification surfaces
- profile/support screens

Reason:

- TanStack Query polling is observer-driven. Multiple mounted observers with
  intervals can create multiple timers for the same query key.

### 7. Error and Load Behavior

If polling fails:

- keep showing the last cached messages
- do not clear the thread
- keep the existing error state only for the initial load failure
- do not show a toast every 3 seconds

Optional later enhancement:

- show a small passive text only after repeated failures, such as
  `새 메시지를 불러오지 못했어요.`

Do not add that UI in the first pass unless testing shows the current error
state is confusing.

## Validation Plan

Run after implementation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Current result:

- [x] `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
      passed on 2026-06-01.

Manual Expo smoke:

- [ ] Open a chat thread.
- [ ] Confirm messages initially load.
- [ ] Send a message and confirm it appears once, not duplicated.
- [ ] From another account or seeded/API path, create a counterpart message.
- [ ] Keep the thread open and confirm the message appears within about 3
      seconds.
- [ ] Confirm unread count clears after the message is visible in the open
      thread.
- [ ] Navigate away from the thread and confirm polling stops.
- [ ] Background the app and confirm polling stops.
- [ ] Return to the thread and confirm polling resumes.
- [ ] Confirm no repeated error alerts appear during a temporary network
      failure.

Backend smoke is not required for the first client-only implementation if the
existing chat REST endpoints are unchanged. Run API tests only if backend routes,
schemas, repository queries, or unread-count logic change.

## Hardening Plan

The first implementation is intentionally small and MVP-safe. The following
hardening pass is needed before calling the chat polling behavior production
quality.

### Source Basis for Hardening

Official and primary references checked on 2026-06-01:

- TanStack Query polling guide:
  https://tanstack.com/query/latest/docs/react/guides/polling
- TanStack Query React Native focus guidance:
  https://tanstack.com/query/v3/docs/react/react-native
- TanStack Query query retries and backoff:
  https://tanstack.dev/query/v5/docs/framework/react/guides/query-retries
- React Native `ScrollView`:
  https://reactnative.dev/docs/scrollview
- React Native `AppState`:
  https://reactnative.dev/docs/appstate.html
- Expo Router `useFocusEffect`:
  https://docs.expo.dev/versions/latest/sdk/router/

Applied interpretation:

- Polling should remain query-owned through `refetchInterval`, not a manual
  `setInterval`.
- In React Native, app foreground should be managed with `AppState` and route
  focus should be managed separately with `useFocusEffect`.
- Polling intervals can be computed dynamically, so error backoff can live in
  the query options without adding a separate timer.
- `ScrollView` exposes `onContentSizeChange` and scroll events, so read marking
  can be tied to content visibility/near-bottom state rather than raw data
  arrival.

### 1. Read-State Accuracy

Current gap:

- The current implementation marks the latest counterpart message read when it
  appears in the fetched message array while the screen is active.
- This is acceptable for the current simple thread because the UI is intended to
  stay at the newest messages, but it is not strictly equivalent to the user
  seeing the message.

Target behavior:

```text
new counterpart message arrives
  -> if user is near the bottom, scroll to bottom
  -> after bottom/content position is confirmed, mark room read

new counterpart message arrives
  -> if user has manually scrolled away from bottom, do not mark read
  -> show a passive "새 메시지" affordance later if needed
```

Implementation tasks:

- [x] Add a `ScrollView` ref in `ChatThreadScreen`.
- [x] Track scroll metrics from `onScroll`:
      `layoutMeasurement.height + contentOffset.y` versus
      `contentSize.height`.
- [x] Define `isNearBottom` with a threshold around 48-72px.
- [x] On `onContentSizeChange`, call `scrollToEnd({ animated: true })` only
      when:
      - the thread first loads, or
      - the latest new message is from the current user, or
      - the user is already near bottom.
- [x] Move `markRead` trigger behind the near-bottom condition.
- [x] Keep the current duplicate guard by latest counterpart message id.
- [x] Do not mark read for system messages or current-user messages.

MVP decision:

- Do not add per-message read receipts.
- Do not add delivery receipts.
- Do not add typing indicators.

### 2. Polling Failure Backoff

Current gap:

- `retry: false` prevents automatic retry bursts, but `refetchInterval` can
  still call the failed query every 3 seconds while the thread stays focused.

Target behavior:

```text
normal state -> 3s interval
1-2 consecutive failures -> 10s interval
3+ consecutive failures -> pause polling or move to 30s interval
manual/send/focus success -> reset to 3s
```

Recommended first implementation:

- [x] Track polling failure count locally in `ChatThreadScreen`, or derive it
      from the query object if the final TanStack Query v5 API is ergonomic.
- [x] Change `useChatMessages` to accept either a numeric interval or a callback
      policy.
- [x] Use a simple app-level policy:

```ts
function resolveChatPollingInterval(failureCount: number) {
  if (failureCount >= 3) return 30_000;
  if (failureCount >= 1) return 10_000;
  return 3_000;
}
```

- [x] Reset failure count to `0` on successful message fetch.
- [x] Do not show repeated alerts for polling failure.
- [x] Keep existing initial-load error UI.

Non-goals:

- Do not add a global circuit breaker yet.
- Do not add WebSocket fallback.

### 3. React Query Native Focus Policy

Current gap:

- Chat polling uses `useAppActive`, so the thread does not poll in background.
- The app does not yet configure TanStack Query `focusManager` globally for
  React Native.

Target behavior:

- App foreground/background should be known globally by TanStack Query.
- Per-screen polling should still use explicit route focus.

Implementation tasks:

- [x] Add a small provider-level hook under `apps/mobile/src/providers` or
      `apps/mobile/src/shared/hooks` that calls TanStack Query `focusManager`
      from `@tanstack/react-query`.
- [x] Wire `focusManager.setFocused(state === "active")` from React Native
      `AppState`.
- [x] Avoid conflicting with Supabase auth token auto-refresh, which already
      has its own `AppState` listener.
- [x] Keep `useAppActive` for chat-specific route + app active decisions unless
      a shared app-state provider replaces it cleanly.

Acceptance:

- Returning from background lets normal queries refetch according to React Query
  rules.
- Chat polling still runs only when the thread route itself is focused.

### 4. Hook Dependency Cleanup

Current gap:

- The read-marking effect depends on the mutation object returned by
  `useMarkChatRoomRead`.
- This is safe enough because a ref prevents duplicate read calls, but it is
  harder to reason about than depending on stable primitive/callback values.

Implementation tasks:

- [x] Destructure `mutate` and `isPending` from the mutation object.
- [x] Use local names such as `markRoomRead` and `isMarkingRead`.
- [x] Keep the latest-message duplicate guard.
- [x] Re-run typecheck after the cleanup.

### 5. Chat List Polling Decision

Current decision:

- Do not add chat-list polling in the first hardening pass.

Reason:

- Chat list polling is a broader network-cost decision than thread polling.
- Room list queries include unread counts, last messages, room status, profile
  summaries, and related interview/application data.

Decision gate:

- Add chat-list polling only if tester feedback shows that unread badges feel
  stale while users stay on the chat tab.

If added later:

```text
chat tab focused + app active -> room list poll every 10-15s
other tabs/background -> no list polling
```

### 6. Performance Boundary

Current endpoint returns the full message list for a room.

This is acceptable for MVP if rooms remain small. It becomes a problem when:

- one room accumulates hundreds or thousands of messages,
- polling repeatedly transfers the full room history,
- `ScrollView` renders too many child views at once.

Future backend/client split:

- [ ] Add cursor or `since` query parameter to message listing.
- [ ] Fetch only messages after the latest local message timestamp/id.
- [ ] Move from `ScrollView` to `FlatList` if long-room performance becomes
      visible.

Do not do this until message volume proves it is needed.

## Acceptance Criteria

- Chat thread messages poll every 3 seconds only while the thread route is
  focused and the app is active.
- Polling stops when the user leaves the thread.
- Polling stops when the app enters background or inactive state.
- Sent messages still appear once and do not duplicate after the next poll.
- Newly received counterpart messages become visible without leaving and
  re-entering the thread.
- Newly visible counterpart messages are marked read without sending a read
  request on every polling tick.
- Chat list unread counts are not made worse by the thread polling change.
- No WebSocket/SSE/push dependencies are introduced.

## Hardening Acceptance Criteria

- Read marking happens only when the user is at or near the newest visible
  messages.
- New incoming messages auto-scroll only when the user has not intentionally
  scrolled away from the bottom.
- Polling backs off during repeated failures and does not hammer the API during
  an outage.
- Global TanStack Query app-focus handling is configured for React Native
  without interfering with Supabase auth refresh.
- Read-marking hook dependencies are easy to reason about and pass typecheck.
- No chat-list polling is added unless the product explicitly accepts the
  network tradeoff.

## Future Upgrade Path

Add only when product usage proves the need:

1. Chat list focused polling at 10-15 seconds.
2. In-app notification list focused polling or unread-count endpoint.
3. Expo push notification infrastructure.
4. Realtime transport:
   - WebSocket or SSE if API hosting becomes stable for long-lived connections.
   - Supabase Realtime only if table-level subscription security and
     operational behavior are explicitly reviewed.
5. Per-message delivery/read receipts and typing indicators.
