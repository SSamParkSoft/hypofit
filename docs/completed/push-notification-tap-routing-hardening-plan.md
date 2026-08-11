# Push Notification Tap Routing Hardening Plan

Status: completed - implementation finished; TestFlight smoke tracked elsewhere

Last updated: 2026-06-09

## Purpose

Make native push notifications open the correct Hypofit screen when the user
taps them from every relevant app state:

```text
foreground app
background app
terminated app launched from notification
locked iPhone notification tap
Android notification tap
```

Native push delivery is already partially verified:

- iOS TestFlight build `37` registered a production APNs token.
- A manual APNs smoke sent a real notification to the device.
- APNs returned `sent`.
- The user confirmed the push notification arrived.

This document covers the next quality bar: the tap on that notification must
land on the correct chat, interview, application/session, support, or
notification screen without duplicate navigation, wrong-tab fallback, or
startup timing bugs.

## Why This Is Active Work

Push notifications are now a live user-facing path, not only infrastructure.
If a notification arrives but opens the wrong screen, the feature feels broken
and can cause store-review confusion.

This is especially important for Hypofit because push notifications correspond
to the core workflow:

```text
new chat message
application created
application selected
application rejected
session rescheduled
session canceled
no-show marked
support reply
```

Each event should take the user to a place where they can immediately act.

## Official References Checked

Checked on 2026-06-09:

- Expo receiving notifications:
  https://docs.expo.dev/push-notifications/receiving-notifications/
- Expo Notifications SDK:
  https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo notification behavior overview:
  https://docs.expo.dev/push-notifications/what-you-need-to-know/
- Expo custom APNs/FCM sending path:
  https://docs.expo.dev/push-notifications/sending-notifications-custom/
- Apple APNs payload guidance:
  https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification

Reference conclusions:

- `addNotificationResponseReceivedListener` is the primary listener when a
  user interacts with a notification.
- When an app is not running and is launched by tapping a notification, relying
  on the listener alone can miss the response. Expo recommends checking the
  last notification response through `getLastNotificationResponse`,
  `getLastNotificationResponseAsync`, or `useLastNotificationResponse`.
- After consuming an initial notification response, the app should clear it so
  the same notification does not keep re-routing on later renders.
- Expo Router examples commonly push a route from notification `data`.
- Hypofit uses direct APNs/FCM native tokens, not Expo Push Service, but the
  client-side response handling still goes through `expo-notifications`.

## Current Repository State

Implemented:

- Mobile uses `expo-notifications`.
- Mobile registers native APNs/FCM device tokens through
  `getDevicePushTokenAsync`.
- `PushNotificationManager` is mounted inside `AppProviders`.
- `subscribeNotificationResponses` listens for
  `Notifications.addNotificationResponseReceivedListener`.
- `routeFromNotificationData` maps notification payload data to Expo Router
  routes.
- Server sends route-oriented push data:

```text
notification_id
type
target_type
target_id
```

Current mobile mapping:

```text
target_type=chat_room + target_id
  -> /(tabs)/chat/[roomId]

target_type=interview_post + target_id
  -> /(tabs)/interviews/[postId]

target_type=application
  -> /(tabs)/interviews/my-interviews

target_type=interview_session
  -> /(tabs)/interviews/my-interviews

target_type=support_ticket
  -> /support

unknown or incomplete target
  -> /notifications
```

Implemented in this pass:

- `apps/mobile/src/features/push/notificationRouting.ts` centralizes payload
  parsing, fallback policy, fingerprints, and Expo Router navigation.
- Active/background notification taps use the shared response coordinator.
- Terminated-app startup checks `getLastNotificationResponseAsync`.
- Handled responses call `clearLastNotificationResponseAsync`.
- Duplicate routing is guarded by an in-memory fingerprint set.
- Auth/profile hydration timing is handled by a pending response queue in
  `PushNotificationManager`.
- `apps/api/scripts/manual_push_smoke.py` can create target-specific push
  notifications and optionally dispatch one APNs/FCM delivery without printing
  raw tokens.

Current gaps:

- Mobile has no dedicated unit-test runner configured, so parser coverage is
  currently typecheck/manual-smoke based.
- TestFlight tap smoke is still required for chat, interview, support, and
  malformed/fallback payloads.
- Android FCM token/send/tap smoke is still pending.

## Non-Goals

Do not add these in this task:

- Background silent push processing.
- Push action buttons.
- Notification categories.
- Rich media notification attachments.
- Expo Push Service.
- OneSignal/Braze/Firebase Analytics.
- WebSocket/SSE chat transport.
- Marketing push.
- App-wide deep-link overhaul beyond notification tap routing.

## Product Routing Policy

### Chat Message

Expected payload:

```json
{
  "type": "chat_message",
  "target_type": "chat_room",
  "target_id": "<chat_room_id>"
}
```

Expected route:

```text
/(tabs)/chat/[roomId]
```

Back behavior:

```text
chat room -> back -> chat tab
```

User expectation:

- The user sees the exact conversation that generated the push.
- The bottom tab bar should follow the current chat-thread design decision.
- If the room no longer exists or access is forbidden, show a calm fallback
  state and let the user return to `채팅`.

### Interview Post

Expected payload:

```json
{
  "type": "application_created",
  "target_type": "interview_post",
  "target_id": "<interview_post_id>"
}
```

Expected route:

```text
/(tabs)/interviews/[postId]
```

Back behavior:

```text
interview detail -> back -> notifications or interviews depending launcher
```

For push launch, use:

```text
returnTo=/notifications
```

This preserves a useful place to inspect the triggering notification after
leaving the detail page.

### Application

Expected payload:

```json
{
  "type": "application_selected",
  "target_type": "application",
  "target_id": "<application_id>"
}
```

Current route:

```text
/(tabs)/interviews/my-interviews
```

Reason:

- There is no dedicated application detail page yet.
- The current actionable mobile destination for application status is
  `내 인터뷰`.

Future upgrade:

- Add application detail route.
- Route selected/rejected application push directly to that route.

### Interview Session

Expected payload:

```json
{
  "type": "session_rescheduled",
  "target_type": "interview_session",
  "target_id": "<session_id>"
}
```

Current route:

```text
/(tabs)/interviews/my-interviews
```

Reason:

- There is no dedicated session detail page yet.
- `내 인터뷰` is the current place where the user can inspect schedule state.

Future upgrade:

- Add session detail route or session-focused sheet.
- Route session pushes directly to the session surface.

### Support Ticket

Expected payload:

```json
{
  "type": "support_replied",
  "target_type": "support_ticket",
  "target_id": "<support_ticket_id>"
}
```

Current route:

```text
/support
```

Reason:

- The support list/form screen exists.
- A dedicated ticket detail route may not yet exist in mobile.

Future upgrade:

- If ticket detail exists, route to the exact ticket.
- If `target_id` is missing, keep `/support` fallback.

### Unknown or Incomplete Target

Expected route:

```text
/notifications?returnTo=/(tabs)/home
```

Reason:

- Users should never land on a blank or wrong detail screen.
- The notification center can still explain what happened.

## Architecture Plan

### 1. Split Payload Parsing from Navigation

Create a small notification routing module:

```text
apps/mobile/src/features/push/notificationRouting.ts
```

Responsibilities:

- Normalize notification `data`.
- Validate `target_type`.
- Validate required `target_id` per target.
- Convert payload to a typed navigation target.
- Provide a single function that applies navigation with `router.push`.

Suggested types:

```ts
type PushNavigationTarget =
  | {
      kind: "chat_room";
      notificationId: string | null;
      pathname: "/(tabs)/chat/[roomId]";
      params: { roomId: string; returnTo?: string };
    }
  | {
      kind: "interview_post";
      notificationId: string | null;
      pathname: "/(tabs)/interviews/[postId]";
      params: { postId: string; returnTo: string };
    }
  | {
      kind: "my_interviews";
      notificationId: string | null;
      pathname: "/(tabs)/interviews/my-interviews";
      params: { returnTo: string };
    }
  | {
      kind: "support";
      notificationId: string | null;
      pathname: "/support";
      params: { returnTo: string; ticketId?: string };
    }
  | {
      kind: "notifications";
      notificationId: string | null;
      pathname: "/notifications";
      params: { returnTo: string };
    };
```

Expected parser:

```ts
parsePushNotificationTarget(data: Record<string, unknown>): PushNavigationTarget
```

Expected navigator:

```ts
navigateToPushNotificationTarget(target: PushNavigationTarget): void
```

Benefits:

- Unit tests can validate routing without mounting the app.
- Future target routes are centralized.
- Server payload mistakes become deterministic fallbacks.

### 2. Handle Active and Background Taps

Keep:

```ts
Notifications.addNotificationResponseReceivedListener(...)
```

But replace direct routing with the shared pipeline:

```text
response
  -> extract data
  -> parse target
  -> dedupe
  -> navigate
  -> clear response when appropriate
```

Add breadcrumbs:

```text
push_notification_response_received
push_notification_route_parsed
push_notification_route_navigated
push_notification_route_fallback
push_notification_route_error
```

Do not log raw token, email, or sensitive payload fields.

### 3. Handle Terminated-App Cold Start

On `PushNotificationManager` mount:

```ts
const response = Notifications.getLastNotificationResponse?.()
```

or, if needed for SDK compatibility:

```ts
const response = await Notifications.getLastNotificationResponseAsync()
```

If a response exists:

- Parse and navigate through the same pipeline.
- Clear it after it is handled:

```ts
Notifications.clearLastNotificationResponse?.()
await Notifications.clearLastNotificationResponseAsync?.()
```

Implementation should be tolerant of SDK method differences because Expo SDK
version examples use both sync and async variants across docs.

### 4. Prevent Duplicate Navigation

Use a response fingerprint:

```text
notification_id | target_type | target_id | actionIdentifier
```

Keep a memory-level ref in `PushNotificationManager`:

```ts
const handledResponseFingerprints = useRef(new Set<string>());
```

Policy:

- If the same fingerprint is seen in the same app session, skip it.
- After handling cold-start response, clear the native last response.
- Do not persist every response forever.

Optional if duplicate issues appear in TestFlight:

- Store `lastHandledNotificationResponse` in `AsyncStorage` with timestamp.
- Ignore the same fingerprint for a short TTL such as 10 minutes.

MVP plan:

- Start with in-memory dedupe plus native clear.
- Add persisted dedupe only if real-device smoke shows repeated routing.

### 5. Defer Navigation Until Auth and Router Are Ready

Problem:

- `PushNotificationManager` is mounted inside `AuthProvider`.
- A notification can be tapped before auth state finishes hydrating.
- If the target route requires a logged-in user, immediate routing may land on
  login or be overwritten by auth redirect.

Plan:

- Add a pending target queue inside `PushNotificationManager`.
- If `accessToken` and `appUser` are available, navigate immediately.
- If not available, store the parsed target in memory and optionally
  `AsyncStorage`.
- When `appUser` becomes available, consume pending target once.
- If auth remains missing after app startup, route to login with a safe
  fallback, not to a protected screen.

Recommended behavior:

```text
logged in
  -> open target screen

logged out
  -> open login
  -> after login, open /notifications first or consume pending target
```

For MVP, safer option:

- If logged out, go to `/notifications` only after login is complete.
- Do not expose target content without backend auth.

### 6. Align Back Behavior

For routes opened from notifications:

- Chat room:

```text
returnTo=/(tabs)/chat
```

- Interview detail:

```text
returnTo=/notifications
```

- My interviews:

```text
returnTo=/notifications
```

- Support:

```text
returnTo=/notifications
```

Reason:

- Notification-originated journeys should preserve a reliable escape route.
- For chat, the user expects to return to chat list.
- For result/status events, returning to notification center is more
  understandable than jumping to home.

This must remain compatible with:

- `mobile-tab-stack-back-navigation-plan.md`
- `mobile-nested-tab-stack-migration-plan.md`
- `root-stack-shared-route-transition-plan.md`

### 7. Server Payload QA

No schema migration is required for tap routing.

But push-generating services must consistently set target data:

- Chat message notifications:

```text
target_type=chat_room
target_id=chat_room.id
```

- Application created:

```text
target_type=interview_post
target_id=interview_post.id
```

or, if the user should review applications in one place:

```text
target_type=application
target_id=application.id
```

- Application selected/rejected:

```text
target_type=application
target_id=application.id
```

- Session changed/canceled/no-show:

```text
target_type=interview_session
target_id=session.id
```

- Support replied:

```text
target_type=support_ticket
target_id=support_ticket.id
```

If a service does not have the target id yet, it should use a safe target type
and rely on fallback, but this should be treated as a QA gap.

### 8. Manual Smoke Helpers

Add or document a safe operator smoke script for target-specific pushes.

Suggested script path:

```text
apps/api/scripts/manual_push_smoke.py
```

Inputs:

```text
--email sehyeon73@gmail.com
--target chat_room|interview_post|application|interview_session|support_ticket
--target-id UUID
--dispatch
```

Safety requirements:

- Never print raw device tokens.
- Print only token hash prefix.
- Create clearly marked test notification metadata:

```json
{
  "test": true,
  "source": "manual_push_smoke"
}
```

- Default to `support_replied` or `chat_message` templates only.
- Do not send marketing copy.

This script is useful because the current admin dispatch API requires admin
auth, and deployed `ADMIN_EMAILS` may not always be configured.

## Implementation Steps

### Step 1 - Routing Module

Files:

```text
apps/mobile/src/features/push/notificationRouting.ts
apps/mobile/src/features/push/notificationRouting.test.ts
```

Status: implemented, parser tests deferred because `apps/mobile` has no test
runner configured.

Tasks:

- Add parser.
- Add typed target model.
- Add target fallback rules.
- Add navigation helper.
- Add unit tests for:
  - chat room with id
  - interview post with id
  - application with id
  - interview session with id
  - support ticket with id
  - support ticket without id
  - unknown target type
  - malformed data
  - missing target id for target requiring id

### Step 2 - Response Coordinator

Files:

```text
apps/mobile/src/features/push/pushNotifications.ts
apps/mobile/src/features/push/PushNotificationManager.tsx
```

Status: implemented.

Tasks:

- Replace direct `routeFromNotificationData` with the routing module.
- Add `handleNotificationResponse`.
- Add fingerprint-based dedupe.
- Add Sentry breadcrumbs.
- Keep raw payload details sanitized.

### Step 3 - Cold-Start Capture

Files:

```text
apps/mobile/src/features/push/PushNotificationManager.tsx
apps/mobile/src/features/push/pushNotifications.ts
```

Status: implemented.

Tasks:

- On mount, check last notification response.
- Process it through the same response coordinator.
- Clear native last response after successful parse/attempt.
- Avoid running before `configureNotificationRuntime`.
- Avoid double-routing if listener also fires.

### Step 4 - Auth/Router Readiness

Files:

```text
apps/mobile/src/features/push/PushNotificationManager.tsx
apps/mobile/src/features/auth/AuthProvider.tsx
```

Status: implemented for authenticated startup; logged-out tap remains a
deferred route until the user is authenticated.

Tasks:

- Inspect whether AuthProvider exposes an auth-loading state.
- If not, add a minimal exported status only if needed.
- Queue response while auth is still hydrating.
- Consume queued target after signed-in user is available.
- If no signed-in user, route to login or notification fallback according to
  current auth architecture.

### Step 5 - Server Payload Audit

Files:

```text
apps/api/app/services/chat.py
apps/api/app/services/applications.py
apps/api/app/services/sessions.py
apps/api/app/services/admin_support.py
apps/api/app/services/push_providers.py
```

Status: audited for existing push-producing services; no schema change needed.

Tasks:

- Confirm every push-eligible notification type sets useful `target_type`.
- Confirm `target_id` is present when a direct detail route exists.
- Keep OS push body safe for lock screens.
- Add tests for generated notification target metadata if gaps are found.

### Step 6 - Manual Target Smoke

Files:

```text
apps/api/scripts/manual_push_smoke.py
docs/reference/operator-support-moderation-runbook.md
```

Status: implemented and documented in
`docs/reference/operator-support-moderation-runbook.md`.

Tasks:

- Add a script or runbook command for target-specific smoke.
- Test with:
  - chat room target
  - interview post target
  - support fallback target
- Record APNs result, not raw token.

### Step 7 - TestFlight Verification

Test matrix:

```text
iOS TestFlight build
  foreground notification tap
  background notification tap
  terminated app notification tap
  locked screen notification tap
  chat_room target
  interview_post target
  support_ticket target
  malformed target fallback
```

Manual checks:

- Notification arrives.
- Tap opens expected screen.
- Back button returns to expected parent.
- Tapping the same notification does not route repeatedly.
- App does not flash home before target in a distracting way.
- Sentry breadcrumbs show route parse/navigation result if something fails.

Android follow-up:

```text
Android internal build
  FCM token registration
  FCM send
  background tap
  terminated tap
  channel behavior
```

Android is not blocked by iOS routing implementation, but final Google Play
readiness requires it.

## Verification Commands

Mobile:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

If mobile tests are available for the new routing module:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile test
```

API targeted tests after payload audit:

```bash
cd apps/api
source .venv/bin/activate
pytest tests/test_push_copy.py tests/test_push_provider_clients.py
```

Deployed API readiness:

```bash
curl -s https://hypofit-api.bukae.co.kr/api/v1/health/ready
```

Manual APNs dispatch smoke must be run only against an intended test account
and must not print raw device tokens.

## Acceptance Criteria

This active task can be closed when all are true:

- [x] Notification target parser exists.
- [ ] Notification target parser has focused tests.
- [x] Active/background notification taps use the shared routing coordinator.
- [x] Terminated-app cold-start notification tap is handled.
- [x] Last notification response is cleared after handling.
- [x] Duplicate response routing is prevented.
- [x] Login/auth hydration does not lose a notification target.
- [ ] Chat-room notification opens the exact chat room on TestFlight.
- [ ] Interview-post notification opens the exact interview detail on
      TestFlight.
- [ ] Support notification opens the correct support surface on TestFlight.
- [ ] Malformed payload falls back to notification center.
- [ ] Back behavior from notification-opened screens is predictable.
- [x] Sentry breadcrumbs exist for response received, deferred, deduped,
      parsed, navigated, fallback, and error states.
- [x] Manual target-specific push smoke is documented or scripted.
- [ ] `native-push-notification-apns-fcm-plan.md` is updated with completion
      status for tap-routing smoke.

## Risks and Mitigations

### Risk: Router Push Before App Is Ready

Mitigation:

- Process initial response inside `PushNotificationManager` after providers are
  mounted.
- Queue target while auth/router readiness is unclear.

### Risk: Duplicate Navigation

Mitigation:

- Fingerprint responses.
- Clear native last response.
- Ignore same fingerprint within the same app session.

### Risk: Wrong Screen for Target Type

Mitigation:

- Centralize parser.
- Add tests for every target type.
- Fallback to notification center for invalid payloads.

### Risk: Sensitive Data on Lock Screen

Mitigation:

- Keep route-only payload.
- Keep OS push body short and non-sensitive.
- Do not include raw chat messages, rejection reasons, exact addresses, report
  details, support reply contents, or phone numbers.

### Risk: Logged-Out User Taps Protected Notification

Mitigation:

- Do not expose protected detail data client-side.
- Store pending target only as route metadata.
- Require backend auth on target API calls.
- If auth is absent, route through login or notification center.

### Risk: TestFlight Differs from Expo Dev

Mitigation:

- Validate on TestFlight or release-like build, not Expo Go.
- Keep Sentry breadcrumbs active for release builds.
- Use real APNs production token smoke.

## Relationship to Other Documents

- `native-push-notification-apns-fcm-plan.md`
  - Parent push implementation plan.
  - This document owns tap-routing hardening detail.
- `mobile-tab-stack-back-navigation-plan.md`
  - Back behavior must remain compatible with notification-opened screens.
- `mobile-nested-tab-stack-migration-plan.md`
  - Future route architecture may simplify notification routing.
- `root-stack-shared-route-transition-plan.md`
  - Shared screens such as support/notifications depend on root stack behavior.
- `google-play-data-safety-worksheet.md`
  - Push behavior and notification data must match declared data handling.
- `google-play-first-launch-readiness-plan.md`
  - Android notification tap behavior must be verified before Play launch.
- `ios-store-readiness/ios-eas-testflight-build-plan.md`
  - iOS TestFlight validation path and build constraints remain relevant.

## Current Next Action

Run a TestFlight or release-like build and perform target-specific APNs smoke
with:

```text
chat_room
interview_post
support_ticket
```
