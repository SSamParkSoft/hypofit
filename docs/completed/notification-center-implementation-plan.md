# Notification Center Implementation Plan

Status: completed

Last updated: 2026-05-29

## Purpose

This plan now tracks implementation work for the existing notification backend
and client notification center.

The old assumption in this document was wrong for the current repository state:
Hypofit now has a real in-app notification backend. Manual release checks
are intentionally excluded from this active document because the user will
handle them directly. Native OS push notifications are tracked separately in
`docs/completed/native-push-notification-apns-fcm-plan.md`.

Current target:

```text
FastAPI event creates notification record
  -> Supabase Postgres stores durable notification state
  -> mobile or web client fetches notifications from /api/v1/notifications
  -> user marks one or all notifications read
  -> client navigates to the related interview/chat/support surface
```

Native push target, tracked separately:

```text
notification record created
  -> device push token registered
  -> push sent through Expo Push Service / FCM / APNs
  -> OS permission, channel, and store/privacy disclosures managed
```

## Current Status

### Complete in the repository

- `apps/api/alembic/versions/0012_create_operations_tables.py` creates the
  `notifications` table and indexes.
- `apps/api/app/models/notification.py` defines the `Notification` model.
- `apps/api/app/schemas/notifications.py` defines the API response schema.
- `apps/api/app/repositories/notifications.py` implements create/list/read-state
  persistence helpers.
- `apps/api/app/services/notifications.py` implements create/list/read-state
  service logic.
- `apps/api/app/api/v1/routes/notifications.py` exposes:
  - `GET /api/v1/notifications`
  - `POST /api/v1/notifications/{notification_id}/read`
  - `POST /api/v1/notifications/read-all`
- `apps/api/app/api/v1/router.py` wires the notification routes into the API.
- Backend tests already exist for the route contract and event producers:
  - `apps/api/tests/test_notifications_routes.py`
  - `apps/api/tests/test_application_withdrawal.py`
  - `apps/api/tests/test_sessions_service.py`

Known current project state: this backend work was implemented recently and
deployed.

### Implemented backend event producers

The backend already creates notification records from the current workflow
services:

- `apps/api/app/services/applications.py`
  - `application_created`
  - `application_selected`
  - `application_rejected`
  - `application_withdrawn`
- `apps/api/app/services/chat.py`
  - `chat_message`
- `apps/api/app/services/sessions.py`
  - `session_rescheduled`
  - `session_completed`
  - `session_canceled`
  - `no_show_marked`
- `apps/api/app/services/admin_support.py`
  - `support_replied`

### Still active or unverified on clients

- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx` is now an
  API-backed list.
- `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx` now keeps
  push delivery clearly deferred while describing in-app notification behavior.
- `apps/mobile/src/shared/ui/NotificationButton.tsx` is wired to live unread
  state on mobile surfaces that expose the bell.
- Mobile notification API client and hooks exist under
  `apps/mobile/src/shared/api` and `apps/mobile/src/features`.
- Mark-one-read, mark-all-read, unread badge refresh, and deep-link navigation
  are implemented; remaining work should be limited to client/API wiring
  decisions or concrete implementation gaps.
- `apps/web/src/pages/NotificationsPage.tsx` is now API-backed.
- `apps/web/src/shared/ui/notification-button.tsx` derives unread state from
  the live notification API when no explicit prop is passed.
- Web notification API wiring is implemented for list, mark-read,
  mark-all-read, empty, loading, and error states.

### Explicitly deferred

Do not treat these as part of the current milestone:

- `expo-notifications`
- device push token registration
- Android `POST_NOTIFICATIONS`
- Android notification channels / FCM
- iOS APNs credentials / permission flow
- notification preference toggles backed by storage
- marketing or promotional notifications

## Current Backend Contract

### Implemented data model

The current `notifications` table stores:

```text
id
user_id
type
title
body
target_type
target_id
metadata
read_at
created_at
```

This means the old planned fields such as `actor_id`, `target_route`,
`updated_at`, and a dedicated unread count payload are not part of the current
implementation. Route mapping should stay client-side unless a later phase
proves the backend needs to own it.

### Implemented API behavior

Current notification API behavior is:

- `GET /api/v1/notifications`
  - supports `unread_only`
  - supports `limit`
  - returns `list[NotificationRead]`
- `POST /api/v1/notifications/{notification_id}/read`
  - marks a single notification as read
  - requires the notification to belong to the current user
- `POST /api/v1/notifications/read-all`
  - marks all unread notifications for the current user as read
  - returns `204 No Content`

Important current limitation:

- there is no dedicated unread-count endpoint
- `GET /api/v1/notifications` does not return `unread_count`

For the current client phase, unread badge state should be derived from the
fetched list unless a separate unread-count endpoint becomes necessary.

## Client Work Plan

### Backend closeout checklist

- [x] notification table exists through Alembic migration
- [x] FastAPI notification routes exist
- [x] list, single-read, and read-all repository/service behavior exists
- [x] notification routes are wired into the API router
- [x] application, chat, session, and support services create notification
      records where repo code currently shows that behavior
- [x] backend route path includes `/api/v1/notifications`

### Mobile implementation checklist

- [x] add `apps/mobile/src/shared/api/notifications.ts`
- [x] add notification query/mutation hooks under
      `apps/mobile/src/features/notifications`
- [x] replace the static `NotificationsScreen` with a live API-backed list
- [x] support per-row read state and `POST /read-all`
- [x] define the final mobile target mapping by `target_type` and `target_id`
- [x] navigate safely after tap, including a no-crash fallback when a target is
      missing or unsupported
- [x] derive unread badge state from live notification data
- [x] update `NotificationButton` from a boolean dot-only prop to the final
      unread badge behavior for this app
- [x] wire the unread badge into the mobile surfaces that expose the bell
- [x] update `NotificationSettingsScreen` copy so it reflects real in-app
      notifications while still saying push is not supported yet
- [x] mobile notification surface is API-backed

### Web implementation checklist

Current priority remains mobile, but the web surface should not stay misleading.

- [x] decide whether `/notifications` remains user-facing in this milestone
- [x] if it remains exposed, replace mock rows and static badge state with
      live API wiring
- [x] if it does not remain exposed, keep the milestone mobile-first and remove
      any misleading web unread state before closeout

### Native push phase

Do not track native push closeout in this in-app notification-center document.
Use `docs/completed/native-push-notification-apns-fcm-plan.md` for
`expo-notifications`, APNs/FCM credentials, token registration, delivery
outbox, permission UX, and store/privacy updates.

## Implementation Acceptance Checklist

This plan is finished only when all of the following are true:

- [x] a signed-in mobile user can see live notification rows instead of static
      guidance
- [x] mobile unread badge state matches the unread notifications visible from
      the API
- [x] single-read and read-all behavior are implemented in the mobile client
- [x] tapping a notification either lands on the intended screen or fails
      safely without a crash
- [x] placeholder no-backend notification copy is removed from user-facing
      notification center surfaces
- [x] the web notification surface is either implemented as API-backed or
      explicitly kept out of scope for this milestone
- [x] no push permission is requested and no UI claims push delivery

## Product and Policy Notes

- Keep notification copy short, action-oriented, and tied to the interview
  workflow.
- Do not reintroduce copy that implies the backend does not exist.
- Do not claim push delivery, real-time push, or notification preferences until
  those features actually ship.
- OS push permission requests, FCM/APNs setup, and store disclosures are handled
  by `docs/completed/native-push-notification-apns-fcm-plan.md`.
