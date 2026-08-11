# Chat State Transition Hardening Plan

Status: completed - core implementation deployed; QA history retained

Last updated: 2026-06-01

## Purpose

Close the remaining MVP gaps in Hypofit chat so chat behavior stays consistent
with interview application and session state.

The current chat implementation is usable for MVP testing, but it still treats
chat mainly as an open message room. For launch-quality behavior, chat must
respect the product workflow:

```text
application applied
  -> chat room opens
  -> founder selects or rejects applicant
  -> selected applicant schedules/interviews
  -> session completes, is canceled, or is marked no-show
  -> chat UI and server permissions reflect the final state
```

This plan intentionally keeps the current REST + React Query polling model. It
does not introduce WebSocket, Supabase Realtime, push notifications, typing
indicators, or per-message delivery receipts.

## Source Of Truth

- `apps/api/app/api/v1/routes/chat.py`
- `apps/api/app/services/chat.py`
- `apps/api/app/repositories/chat.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/services/sessions.py`
- `apps/mobile/src/features/chat/useChat.ts`
- `apps/mobile/src/screens/chat/ChatListScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/chat/CounterpartProfileModal.tsx`
- `packages/contracts/src/api/chat.ts`

Related active documents:

- `docs/completed/chat-active-screen-polling-plan.md`
- `docs/completed/chat-thread-ios-ui-hardening-plan.md`
- `docs/completed/notification-center-implementation-plan.md`
- `docs/reference/support-report-flow-plan.md`
- `docs/completed/mobile-api-ui-integration-completion-plan.md`

## Current State Audit

### Implemented And Acceptable

- Chat rooms are created when an application is created.
- Chat messages are scoped to room participants.
- `GET /chat/rooms/{room_id}`, message listing, message sending, read marking,
  and room setting updates all check whether the current user is the founder or
  respondent of the room.
- Sending is blocked when either participant has actively blocked the other.
- Chat thread polling runs only when the route is focused, the app is active,
  the user is signed in, and a room id exists.
- Read marking is guarded so repeated polling does not blindly spam read
  mutations.
- The thread UI shows founder-only applicant actions when the current user owns
  the post and the application is still `applied`.
- Rejection requires a reason in the mobile UI, and the backend schema also
  rejects `rejected` status without a rejection reason.
- List-level room actions support mute, hide, and report entry points.
- Counterpart profile modal supports report, block, and unblock entry points.

### Gaps To Close

1. Message sending is not constrained by room/application/session state.
2. Application cancellation does not create a chat system message or update the
   chat room status.
3. Session completion, cancellation, and no-show do not write chat system
   messages.
4. Muting a chat room does not currently suppress in-app notification record
   creation.
5. Chat list unread and last message freshness is weaker than thread freshness.
6. Message listing has no pagination or recent-window cap.
7. Application-created system messages contain `audience` metadata, but message
   listing does not filter by audience.
8. Blocking prevents sending, but the room itself is not marked `blocked`, and
   the UI does not clearly reflect "blocked by me" versus "blocked by other".
9. Mobile chat error handling is mostly alert-based and does not expose
   message-level resend or pending state.
10. Backend route-level chat tests are thin; current tests cover repository
    scoping more than end-to-end route behavior.

Implementation update on 2026-06-01:

- [x] Message sending is now guarded by chat room status, linked application
  status, latest finalized session state, and existing block checks.
- [x] Application `canceled`, `completed`, and `no_show` transitions now update
  the chat room timeline/state in the backend service layer.
- [x] Session scheduled/rescheduled/canceled/completed/no-show events now write
  chat system messages where they change the conversation context.
- [x] Chat-message notification creation now respects the recipient's room
  `is_muted` setting.
- [x] Mobile chat thread composer now disables itself for closed/final room or
  application states and refreshes the room when the server returns a `409`.
- [x] Mobile chat list now supports focused foreground polling at a slower
  interval than the active thread.
- [x] New application-created rooms now use one neutral system message. Existing
  audience-scoped messages are filtered per user when messages are listed.
- [x] Backend tests cover messageability rejection, mute notification behavior,
  session/application side effects, and existing auth/session routes.
- [x] Message listing now uses a default `limit=50`, max `100`, and optional
  `before` cursor, returning the selected window in ascending render order.
- [x] GPU API deployment completed at commit `9740b3d`.
- [x] Expo simulator QA confirmed chat list rendering, applied/open room
  composer enabled state, and rejected/closed room composer disabled state.
- [ ] Expo simulator QA for selected and blocked rooms remains pending because
  CoreSimulatorService became unstable during additional screenshot capture.
- [ ] Message-level pending/resend UI remains explicitly deferred.

## Product Policy Decisions

These decisions should be implemented unless the product direction changes.

### Message Sending Policy

Allow user messages when:

- `chat_room.status` is `open` or `selected`
- linked application status is `applied` or `selected`
- no active block exists between participants

Disallow user messages when:

- `chat_room.status` is `closed` or `blocked`
- linked application status is `rejected`, `canceled`, `completed`, or
  `no_show`
- linked session is `completed`, `canceled`, or `no_show`, if a session exists
  and the room is being treated as final

Return:

- `403` for access or active block
- `409` for valid participant attempting to send in a non-messageable workflow
  state

Mobile should show:

- blocked: `차단된 상대와는 메시지를 주고받을 수 없어요.`
- closed/rejected/canceled: `종료된 인터뷰라 메시지를 보낼 수 없어요.`
- completed/no-show: `완료된 인터뷰라 새 메시지를 보낼 수 없어요.`

### Chat Room Status Mapping

Use chat room status as a coarse room-level communication state:

```text
application.applied      -> chat_room.open
application.selected     -> chat_room.selected
application.rejected     -> chat_room.closed
application.canceled     -> chat_room.closed
application.completed    -> chat_room.closed
application.no_show      -> chat_room.closed
active user block        -> keep persisted room status, but expose effective blocked state later
```

Do not overload persisted `chat_rooms.status = blocked` unless both of these are
implemented together:

- a clear repository/service rule for when to set and unset it
- a per-user read model that tells which side blocked which user

For the MVP, use active block checks for permission and expose block state in
the client through the existing block APIs.

### System Message Policy

Create system messages for every workflow transition that changes what the room
means:

- application created
- applicant selected
- applicant rejected, including reason
- application withdrawn/canceled
- session scheduled
- session rescheduled
- session canceled
- session completed
- no-show marked

System messages should be visible to both users unless `metadata.audience` is
explicitly set and the API filters by current user audience.

For the first hardening pass, prefer removing audience-specific duplicated
application-created messages and replacing them with one neutral message:

```text
신청이 완료됐어요. 이 방에서 일정과 진행 방식을 조율할 수 있어요.
```

Reason:

- simpler message-list behavior
- avoids leaking two audience-specific copies into the same thread
- acceptable for MVP copy

### Mute Policy

For the current MVP, mute should suppress notification records for chat-message
events only.

Do not suppress high-signal workflow notifications unless explicitly requested:

- selected
- rejected
- session scheduled/rescheduled/canceled
- no-show

Implementation detail:

- `chat_service.send_message` should check recipient room setting before calling
  `notification_service.create_notification`.
- If muted, skip chat-message notification creation.
- Still store the message and update room `last_message_at`.

### Chat List Freshness Policy

Keep thread polling at 3 seconds.

Add focused chat-tab polling only if needed:

```text
chat tab focused + app active + access token exists -> poll rooms every 10-15 seconds
```

Reason:

- list-level unread freshness matters during testing
- room list query is heavier than messages, so do not poll as aggressively as
  the active thread

### Message History Policy

Add pagination before real public testing expands beyond seed data.

Initial API shape:

```text
GET /api/v1/chat/rooms/{room_id}/messages?limit=50&before=<created_at_or_message_id>
```

MVP first implementation may use:

- default `limit=50`
- max `limit=100`
- order newest-window in DB then return ascending for rendering

Mobile should initially load the newest window and keep `load older` as a later
UI action unless long-thread QA proves it is necessary immediately.

## Implementation Plan

### 1. Backend: Add Chat Workflow Guard

Files:

- `apps/api/app/services/chat.py`
- `apps/api/app/repositories/chat.py`
- `apps/api/app/api/v1/routes/chat.py`
- `apps/api/app/schemas/chat.py` if new error/read-model fields are needed

Tasks:

- Add repository helper to load room with linked application and latest active
  session if needed.
- Add service helper:

```text
ensure_room_messageable(session, room, sender_id)
```

- Guard:
  - participant access remains route-level.
  - block remains service-level.
  - workflow state becomes service-level.
- Raise `HTTPException(409, detail=...)` for non-messageable workflow states.
- Keep system messages independent from this guard so backend workflow services
  can still write final-state messages.

Acceptance criteria:

- [x] Sending in `open/applied` succeeds.
- [x] Sending in `selected/selected` succeeds.
- [x] Sending after `rejected`, `canceled`, `completed`, or `no_show` fails with
  `409`.
- [x] Sending after block still fails with the current block error.

### 2. Backend: Complete Application Status Side Effects

Files:

- `apps/api/app/services/applications.py`
- `apps/api/app/services/chat.py`
- `apps/api/app/repositories/chat.py`

Tasks:

- Add chat service methods:
  - `mark_room_canceled_for_application`
  - `mark_room_completed_for_application`
  - `mark_room_no_show_for_application`
- Extend `update_status` side effects:
  - `selected` already exists
  - `rejected` already exists
  - add `canceled`
  - add `completed` if application status is changed directly
  - add `no_show` if application status is changed directly
- Ensure duplicate status calls do not create duplicate system messages.
  Continue using `previous_status != new_status` guards.

Acceptance criteria:

- [x] Cancel/withdraw creates a system message and closes the room.
- [x] Repeated status side effects remain guarded by previous-status checks in
  `update_status`.
- [x] Mobile room list status resolves closed rooms as `종료`.

### 3. Backend: Mirror Session Events Into Chat

Files:

- `apps/api/app/services/sessions.py`
- `apps/api/app/services/chat.py`

Tasks:

- When session is created, add `schedule_created` system message to the linked
  room.
- When session is rescheduled, add a system message.
- When session is canceled, add a system message and decide whether room closes.
  MVP policy: close room only if application is also canceled; otherwise keep
  `selected` so users can reschedule.
- When session is completed, add system message and close room.
- When no-show is marked, add system message and close room.

Acceptance criteria:

- [x] Chat room timeline tells the user why the room state changed.
- [x] Completion/no-show finalizes messaging.

### 4. Backend: Apply Mute To Chat Notifications

Files:

- `apps/api/app/services/chat.py`
- `apps/api/app/repositories/chat.py`

Tasks:

- Add repository helper:

```text
get_chat_room_setting(session, room_id, user_id)
```

already exists; reuse it in `send_message`.

- Before creating chat-message notification, check recipient setting.
- If `is_muted`, skip notification creation.
- Do not skip application/session status notifications in this task.

Acceptance criteria:

- [x] Muted recipient still receives the message in room.
- [x] Muted recipient does not get a new `chat_message` notification record.
- [x] Unmuted recipient still gets notification record through the existing
  notification path.

### 5. Backend: Message Listing Cleanup And Pagination

Files:

- `apps/api/app/api/v1/routes/chat.py`
- `apps/api/app/repositories/chat.py`
- `apps/api/app/services/chat.py`
- `apps/api/app/schemas/chat.py`
- `packages/contracts/src/api/chat.ts`
- `apps/mobile/src/shared/api/chat.ts`

Tasks:

- Add `limit` query parameter with default 50 and max 100.
- Add optional `before` cursor after deciding between timestamp or message id.
  Prefer message id plus created_at internally if cursor stability becomes
  important.
- Filter hidden messages as already done in `_build_message_read`.
- Resolve audience-specific application-created messages:
  - either filter by current user role/id
  - or replace duplicate creation going forward with one neutral system message

Acceptance criteria:

- [x] Existing mobile rendering still works with no query params.
- [x] API cannot accidentally return thousands of messages.
- [x] New rooms no longer show two contradictory application-created messages.
- [x] Existing audience-scoped application-created messages are filtered by
  current user.

### 6. Mobile: State-Aware Composer

Files:

- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/features/chat/useChat.ts`
- `apps/mobile/src/shared/api/chat.ts`

Tasks:

- Derive `composerState` from room/application/session state:
  - enabled
  - blocked
  - closed
  - completed
  - loading/error
- Disable input and send icon when not messageable.
- Replace placeholder with state-specific copy:
  - enabled: `메시지를 입력하세요`
  - closed: `종료된 인터뷰예요`
  - blocked: `차단된 상대와는 대화할 수 없어요`
- Handle `409` from send mutation with a calm alert and room refetch.
- Keep body restore on send error only when the user can retry.

Acceptance criteria:

- [x] User cannot keep typing into a final-state room.
- [x] If server rejects a stale UI state, mobile refreshes and explains the
  state.

### 7. Mobile: Founder Action Strip State Cleanup

Files:

- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`

Tasks:

- Keep action strip visible only for:

```text
current user is founder
application.status === applied
room.status === open
```

- After selection/rejection/cancel success, explicitly invalidate:
  - room detail
  - room list
  - messages
  - applications
- Consider inserting local optimistic system cue only if server round trip feels
  slow in simulator QA.

Acceptance criteria:

- [x] Action strip is limited to founder-owned `open/applied` rooms.
- [x] Existing mutation invalidation refreshes the room/list/application state
  after selection/rejection.

### 8. Mobile: Chat List Polling And Empty State

Files:

- `apps/mobile/src/screens/chat/ChatListScreen.tsx`
- `apps/mobile/src/features/chat/useChat.ts`
- `apps/mobile/src/shared/hooks/useAppActive.ts`

Tasks:

- Add optional polling options to `useChatRooms`.
- Poll every 15 seconds only when:
  - chat tab is focused
  - app active
  - access token exists
- Keep retry false.
- Keep existing empty state copy.

Acceptance criteria:

- [x] Unread count can update without leaving the chat tab through focused
  foreground polling.
- [x] Polling stops when app backgrounds.

### 9. Mobile: Block State UX

Files:

- `apps/mobile/src/screens/chat/CounterpartProfileModal.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/chat/ChatListScreen.tsx`

Tasks:

- After block/unblock success, close profile modal or refresh visible room
  state consistently.
- If current user has blocked counterpart, disable composer immediately.
- If send fails due to counterpart block, show existing 403 copy and refetch.
- Decide whether chat list status should show `차단됨` only when current user
  has an active block, not just room status.

Acceptance criteria:

- Blocking has immediate local UX effect.
- Unblocking lets the composer recover after refetch.

### 10. Tests

Backend tests:

- Add route/service tests for:
  - participant can send in `open/applied`
  - non-participant gets 403
  - blocked participant gets 403
  - rejected/canceled/completed/no-show state gets 409
  - mute suppresses chat-message notification
  - selection/rejection/cancel writes exactly one system message
  - hidden messages return sanitized body

Mobile tests or smoke:

- Typecheck after each implementation batch.
- Expo smoke on a seeded founder account:
  - applied room shows action strip
  - selected room hides strip and allows messaging
  - rejected room hides strip and disables composer
  - mute toggle persists
  - block disables composer
  - unread count updates on list after polling interval

## Implementation Order

1. Add backend messageability guard and tests.
2. Add application cancel/completed/no-show chat side effects.
3. Add session system messages.
4. Add mute-aware notification creation.
5. Add mobile state-aware composer.
6. Tighten founder action strip visibility and invalidation.
7. Add chat-list focused polling if still needed after composer changes.
8. Add pagination/recent-window cap.
9. Run API tests and mobile typecheck.
10. GPU deploy after backend tests pass.
11. Expo simulator smoke with seeded founder/respondent accounts.

## Explicit Deferrals

Do not implement in this hardening pass:

- WebSocket/SSE/Supabase Realtime
- Expo push notifications
- Typing indicators
- Per-message read receipts
- Message reactions
- File/image attachments
- Admin chat console
- Payment or escrow chat automation

These features may be useful later, but they add operational and review scope
before the MVP interview loop is fully stable.

## Close Criteria

This document can move out of `docs/active` when:

- [x] Backend enforces messageability by workflow state.
- [x] Application and session transitions create consistent chat system
  messages.
- [x] Chat mute suppresses chat-message notifications.
- [x] Mobile composer reflects final/blocked states before the user sends.
- [x] Focused chat-list refresh is either implemented or explicitly deferred after
  Expo QA.
- [x] API tests and mobile typecheck pass.
- [x] GPU deployment is completed if backend code changed.
- [ ] Expo smoke confirms founder/respondent chat behavior for applied, selected,
  rejected, canceled, and blocked rooms.
