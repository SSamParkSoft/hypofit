# Hypofit Navigation IA Plan

Status: reference

Last updated: 2026-05-29

## Purpose

Hypofit should feel like an installed mobile app, not a web dashboard. The
bottom navigation should describe top-level product surfaces, while keeping the
MVP interview workflow intact.

## Current Direction

First navigation pass:

```text
홈 / 인터뷰 / 지도 / 채팅 / 프로필
```

## Mobile Route Ownership

2026-06-05 implementation update:

- Expo mobile now uses a local stack inside each bottom tab.
- Tab directories are registered in `app/(tabs)/_layout.tsx` as:
  - `home`
  - `interviews`
  - `map`
  - `chat`
  - `profile`
- Tab-owned detail routes live under their owning tab:
  - `app/(tabs)/profile/*` owns account, role, notification, appearance, and
    account deletion screens.
  - `app/(tabs)/interviews/*` owns interview detail, my-interviews, and create
    interview screens.
  - `app/(tabs)/chat/[roomId].tsx` owns the chat thread.
- Shared routes that can be launched from several tabs remain root-level:
  - `notifications`
  - `notice`
  - `support`
  - `support/report`
  - `support/feedback`
  - `legal/privacy`
  - `legal/terms`
- Shared root-level routes must keep sanitized `returnTo` behavior.
- Cross-tab links into interview detail or chat thread should keep explicit
  parent return behavior until simulator and release-build smoke prove the
  nested stack behavior is stable across iOS and Android.

Back navigation rule:

- Custom back buttons should call the native stack pop path first.
- In Expo Router code, prefer `router.back()` when `router.canGoBack()` is true.
- Use an explicit `returnTo`/`backTo` route only as a fallback for deep links,
  notification entry, auth redirects, or other cases where no previous stack
  entry exists.
- Do not use `router.replace(returnTo)` as the primary implementation of a
  visible back button. `replace` is appropriate for auth/onboarding completion,
  splash redirects, or post-submit route cleanup where the user should not
  return to the previous screen.

Interview tab behavior:

- `인터뷰` is now the detailed discovery/search surface for open interview posts.
- Application/post management lives in the secondary `내 인터뷰` route, opened
  from the `인터뷰` header. It is not a separate bottom navigation tab.
- `founder` and `both` users see their applications and created posts in
  `내 인터뷰`.
- `respondent` users see only their applications in `내 인터뷰`.
- Founders can still apply to other interviews as target customers.
- The backend remains the source of truth: respondent-only users cannot create
  interview posts even if a hidden UI path is reached.

Map tab behavior:

- `지도` is a location-based discovery surface for interview posts.
- MVP should show posts with a `location` value and an offline-capable mode
  (`offline` or `both`).
- The current implementation uses Kakao Maps SDK, custom markers, a mobile
  bottom sheet, and a desktop side panel.
- The map should not replace Home; Home remains the general feed for all
  interview modes.

The first tab changed from `찾기` to `홈` because the first screen is more than
search. It is the place where users start from recent interview opportunities
and later return to ongoing work.

The former schedule tab changed to `채팅` because the lower-risk user model is:

```text
selected application
  -> conversation/coordination room
  -> schedule card inside the room
  -> completed or no-show state
```

This keeps explicit session state while matching how users expect to coordinate
an interview.

## Home Role

The home screen should stay action-oriented:

- recent interview posts
- immediately comparable reward, duration, mode, and target conditions
- simple filters or search affordance
- direct application action

Do not turn home into a marketing landing page.

## Viewed Interview State

2026-05-25 implementation update:

- Viewed/read state for interview posts is now user-scoped server state instead
  of a home-only local UI state.
- `interview_post_views` records:
  - `user_id`
  - `interview_post_id`
  - `first_viewed_at`
  - `last_viewed_at`
  - `view_count`
  - `source`
- Supported sources are `home`, `interviews`, `map`, `detail`, and `chat`.
- Viewing is recorded when the user actively opens a post surface:
  - expanding a row on Home
  - expanding a row on Interviews
  - selecting a marker/list row on Map
  - opening the detail page
- The UI uses one shared viewed set across Home, Interviews, and Map so a post
  read in one surface is visually read everywhere.
- Read styling remains lower priority than selected/application states.

Chat can replace the `일정` tab only if schedule state is preserved inside each
conversation. `InterviewSession` must remain in the domain model because
completion and no-show tracking depend on explicit session state.

The current direction is now a real chat-first flow. Creating an application
must also create a chat room and initial system messages. The top-level app
destination is `chat`, while the underlying `InterviewSession` model remains
the later source of confirmed schedule, completion, and no-show state.

## Chat Current Rule

Use a scoped coordination room created from an application:

- conversation linked to an application
- founder/respondent messages
- initial system guidance message
- unread count and read state per participant
- report, hide, mute, and block surfaces in the room menu
- schedule/session state remains a separate domain model and can be surfaced in
  the room context after selection
- no real-time requirement for the MVP; polling is acceptable

## Implementation Pass

First implementation target:

```text
respondent applies
  -> application row is created
  -> chat room is created
  -> default system messages are created
  -> both founder and respondent can see the room in Chat
  -> either side can send user messages
```

Backend additions:

- `chat_rooms`
- `chat_messages`
- `/api/v1/chat/rooms/`
- `/api/v1/chat/rooms/{room_id}`
- `/api/v1/chat/rooms/{room_id}/messages`

Frontend behavior:

- chat API client
- chat room and message query hooks
- mobile-first two-step chat UI
  - main Chat tab shows the room list only
  - tapping a room opens the message thread
  - mobile thread has a back control to return to the list
  - desktop can keep a list/detail split for faster scanning
- unread badges, room search, status filters, and chat-room menus are part of
  the current UI direction

## Chat List UI Enhancement Plan

Direction:

- The Chat tab should feel like an inbox, not a dashboard section.
- The main mobile Chat tab should show only a flat conversation list.
- Avoid repeated card shadows and heavy bordered blocks in the list area.
- Use row density similar to messaging apps: avatar, counterpart name, related
  interview title, latest message, timestamp, and compact status badge.
- Use thin dividers and a very light selected state instead of standalone cards.
- Keep row tap targets comfortable, around 72-84px minimum height.
- Keep desktop list/detail split, but make the left list visually match the
  mobile inbox instead of a stack of cards.

Implementation details:

- Replace `ChatRoomPreview` card styling with a list row.
- Replace the list body from `grid gap-2 p-3` to a divided list container.
- Keep the outer Chat panel as the screen surface, but remove per-item borders
  and shadows.
- On mobile, no selected row emphasis is needed because tapping opens the
  thread screen.
- On desktop, selected row may use `bg-hypo-brand-soft/70` plus a subtle left
  indicator.
- Keep long interview titles and messages to one line with truncation.
- Keep timestamps small and right-aligned.
- Keep status badges compact and secondary to the latest message.

Acceptance checks:

- Mobile Chat tab initially shows only the conversation list.
- Each conversation row is scannable without feeling like a card.
- The row remains tappable and readable at 375px width.
- Desktop still supports list/detail scanning without dashboard-like card
  repetition.

## Chat UI Iteration Notes

2026-05-21 implementation update:

- Mobile Chat list now behaves like a full-screen inbox rather than a card
  panel.
- Mobile Chat list includes lightweight search for counterpart name, post title,
  and latest message.
- Mobile thread opens as a full-screen overlay above the bottom navigation so it
  feels like entering a real message room.
- Desktop keeps the list/detail split, but selected state is desktop-only.
- The remaining design goal is to reduce workspace-like helper copy in the
  thread after schedule cards and unread states are designed.

## SaaS Inbox Enhancement Plan

Problem:

- The current mobile-first chat treatment can feel like a generic phone
  messenger because it emphasizes avatar, name, and message preview more than
  interview workflow context.

Direction:

- Keep the familiar conversation pattern, but make the screen read as an
  interview coordination inbox.
- The list should answer: what interview is this, what side am I on, what state
  is it in, and what is the next useful action?
- The thread should lead with the interview context and schedule/action surface,
  then let messages handle the actual coordination.

Implementation details:

- Add segmented inbox filters:
  - `전체`
  - `조율 중`
  - `선정됨`
  - `종료`
- Add compact SaaS metadata to each row:
  - status: `조율 중`, `선정됨`, `종료`
  - reward amount
  - interview mode
- Keep chat and post management independent:
  - chat rooms are conversation surfaces
  - the founder is the owner of the chat room
  - the founder is also the owner of the interview post
  - avoid respondent/founder role chips such as `내 신청` in the chat row
- Reduce consumer-chat dominance:
  - Keep counterpart name, but make interview title and status equally visible.
  - Use brand-soft message bubbles for my messages instead of solid brand fill.
- Replace generic helper notice with an interview context bar:
  - post title
  - reward, duration, mode
  - selected/open state
  - future primary action placeholder such as `일정 확정`
- Desktop should support a three-pane SaaS shape:
  - conversation list
  - thread
  - interview context side panel

Acceptance checks:

- Chat no longer reads as a phone SMS clone.
- Mobile still stays simple and thumb-friendly.
- Desktop feels like an operational SaaS workspace without becoming a dense
  admin dashboard.

## Open Items

- Add privacy policy wording for message content retention before public-scale
  chat use.
- Add abuse reporting and moderation policy before public-scale chat use.
- Make block state durable through a `user_blocks` table.

## Chat Safety Actions Update

2026-05-25 implementation update:

- Chat room rows now include a `...` action menu.
- Chat thread headers also expose the same room action menu.
- Counterpart profile photos can open a compact profile sheet.
- The profile sheet shows the counterpart, role, linked interview, and safety
  actions.
- Current actions:
  - profile view
  - mute/unmute notifications
  - hide chat room
  - report
  - block
- Report actions route to `/report` with chat-room context:
  - `target_type=chat_room`
  - `target_id`
  - counterpart name
  - interview title
- The report page stores valid UUID targets in `target_id` and keeps mock or
  non-UUID targets in metadata only.
- Mute, hide, and block are currently frontend-local UI states for iteration.
  They are not durable across reloads yet.
- Blocking immediately disables message input for the current client session.

Backend follow-up:

- Durable per-user chat room settings have started through
  `chat_room_participant_settings`.
- The table stores mute, hide, and `last_read_at`.
- Chat room list responses include `unread_count`, `is_muted`, `is_hidden`, and
  `last_read_at`.
- The frontend shows unread badges on chat rows and marks a room as read after
  the message thread has loaded.
- `POST /api/v1/chat/rooms/{room_id}/read` updates `last_read_at`.
- `PATCH /api/v1/chat/rooms/{room_id}/settings` updates mute/hide settings.
- Hidden rooms are filtered out of the normal room list for that user.
- Rejected applications are now treated as a first-class chat outcome:
  - application status remains `rejected`
  - rejection reason is stored on the application record
  - the linked chat room is moved to `closed`
  - an `application_rejected` system message is appended with the rejection
    reason
  - the chat list has a separate `반려됨` filter/status so rejection is not
    hidden under generic `종료`
- Add a durable `user_blocks` table rather than treating block as only a
  `chat_rooms.status` change.
- Check block state before allowing message send.
- Keep chat deletion as `hide/archive`, not destructive delete, because chat
  content may be needed for reports, no-show disputes, or trust review.
