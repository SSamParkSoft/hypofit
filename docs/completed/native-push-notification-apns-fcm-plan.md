# Native Push Notification APNs/FCM Implementation Plan

Status: completed

Last updated: 2026-06-09

## Purpose

Implement real OS push notifications for the Expo React Native mobile app using
native APNs and FCM delivery instead of Expo Push Service.

The current Hypofit notification foundation is an in-app notification center:

```text
workflow event
  -> FastAPI creates notification row
  -> mobile fetches /api/v1/notifications
  -> user reads notification inside the app
```

The target push flow is:

```text
workflow event
  -> FastAPI creates notification row
  -> FastAPI enqueues push delivery rows
  -> FastAPI push worker sends directly to APNs or FCM
  -> user taps OS notification
  -> mobile opens the matching chat, application, session, support, or detail route
```

This plan does not add separate push-hosting infrastructure. APNs and FCM are
Apple/Google hosted push gateways. The existing FastAPI runtime sends outbound
HTTPS requests to them.

## Decision

Use direct native push providers:

- iOS: APNs HTTP/2 provider API.
- Android: FCM HTTP v1 API.
- Mobile client: `expo-notifications` for permissions, native device token
  collection, local notification behavior, and notification response handling.
- Do not use Expo Push Service for production delivery in this plan.
- Do not collect or store Expo push tokens. Use native tokens from
  `getDevicePushTokenAsync()`, not Expo tokens from `getExpoPushTokenAsync()`.

Reasoning:

- Hypofit is preparing real App Store and Google Play distribution.
- Chat, application selection/rejection, and session coordination are core
  workflow events, not optional marketing messages.
- Direct APNs/FCM avoids Expo Push Service as an additional delivery dependency.
- The backend can retain a provider abstraction so Expo Push Service, OneSignal,
  or another provider can still be added later if the product needs it.

## Official References Checked

Checked on 2026-06-08:

- Expo notifications SDK:
  https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo custom FCM/APNs sending path:
  https://docs.expo.dev/push-notifications/sending-notifications-custom/
- Expo push setup and production credential notes:
  https://docs.expo.dev/push-notifications/push-notifications-setup/
- Apple APNs provider API:
  https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
- Apple notification permission:
  https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications
- Android notification runtime permission:
  https://developer.android.com/develop/ui/views/notifications/notification-permission
- Firebase Cloud Messaging Android setup:
  https://firebase.google.com/docs/cloud-messaging/android/get-started
- FCM HTTP v1 send API:
  https://firebase.google.com/docs/cloud-messaging/send-message
- Google Play Data safety:
  https://support.google.com/googleplay/android-developer/answer/10787469

## Current Repository State

Implemented already:

- In-app `notifications` table and API:
  - `GET /api/v1/notifications`
  - `POST /api/v1/notifications/{notification_id}/read`
  - `POST /api/v1/notifications/read-all`
- Notification event producers exist for applications, chat, sessions, support,
  and no-show workflow events.
- Mobile notification screen consumes the in-app notification API.
- Mobile notification bell consumes unread state.
- Profile `알림 안내` currently says OS push is not sent.

Deployment state as of 2026-06-08:

- FastAPI push code is deployed to the GPU server by git sync.
- API dependency install is updated for APNs HTTP/2 support.
- Alembic migration `0014_push_notification_tables` is applied on the deployed
  Supabase database.
- `PUSH_ENABLED`, APNs provider settings, and FCM provider settings are enabled
  on the GPU runtime `.env`.
- API service was restarted and external route checks passed:
  - `GET /api/v1/health` -> `200`
  - `GET /api/v1/notification-preferences` without auth -> `401`, not `404`
  - `GET /api/v1/push-devices` -> `405`, confirming the route exists and is
    POST-only.
- Provider configuration checks passed without sending a notification:
  - APNs private key file exists and APNs JWT generation succeeds.
  - FCM service-account file exists and Google OAuth access token retrieval
    succeeds.

Implemented after the first APNs delivery check:

- Mobile push response handling now has a shared routing parser/coordinator.
- Foreground/background notification taps and terminated-app startup responses
  go through the same pipeline.
- The mobile app clears handled native responses and dedupes repeated response
  fingerprints within the app session.
- Auth/profile hydration no longer drops a tapped notification; the response is
  queued until the signed-in app user is ready.

Remaining implementation:

- Automated or service-level coverage for workflow delivery, suppression, and
  duplicate dispatch behavior.
- Android FCM configuration/docs alignment where code still needs release
  support.
- Final store/privacy policy/Data safety/App Privacy document updates for
  native push.

Deployment state as of 2026-06-09:

- `hypofit-push-worker.service` was deployed on the GPU server.
- `hypofit-push-worker.service` and `hypofit-api.service` both reported
  `active`.
- `/api/v1/health/ready` reported `push.enabled=true`,
  `push.worker_enabled=true`, APNs configured, and FCM configured.

## Non-Goals

- Do not add marketing or promotional push in this phase.
- Do not add WebSocket/SSE or real-time chat transport in this phase.
- Do not add Expo Push Service.
- Do not add OneSignal, Braze, Firebase Analytics, or other engagement SDKs.
- Do not request notification permission before authentication. After login or
  signup completes and the app user is synced, request permission once on the
  user's first authenticated app entry.
- Do not send sensitive chat, report, support, phone, address, or applicant
  detail data in push payloads.
- Do not run EAS cloud builds. Use local validation/local iOS build paths unless
  the user explicitly re-enables cloud builds.

## Push Copy Policy

Push copy should be useful enough to scan without opening the app, but safe
enough to appear on a lock screen.

Rules:

- Include workflow state, a short interview title, and the next action.
- Chat push may include the sender display name and interview title.
- Do not include raw chat message text in the OS push body.
- Do not include rejection reason, support reply body, phone number, exact
  address, report details, or applicant experience text in OS push copy.
- Keep payload data route-oriented:
  - `notification_id`
  - `type`
  - `target_type`
  - `target_id`
- Use in-app notification/detail screens for sensitive or detailed content.

Current templates:

```text
chat_message:
  title: "{sender_name}님이 메시지를 보냈어요"
  body: "{interview_title} 일정 조율을 이어가 보세요."

application_created:
  title: "새 인터뷰 신청이 도착했어요"
  body: "{interview_title}에 지원자가 있어요."

application_selected:
  title: "인터뷰에 선정됐어요"
  body: "{interview_title} 일정을 조율해 주세요."

application_rejected:
  title: "신청 결과가 도착했어요"
  body: "{interview_title}는 이번에 진행되지 않아요."

session_rescheduled:
  title: "인터뷰 일정이 변경됐어요"
  body: "{interview_title}의 변경된 시간을 확인해 주세요."

session_canceled:
  title: "인터뷰가 취소됐어요"
  body: "{interview_title} 채팅방에서 자세한 내용을 확인해 주세요."

no_show_marked:
  title: "인터뷰 상태가 변경됐어요"
  body: "{interview_title} 참여 기록을 확인해 주세요."

support_replied:
  title: "문의 답변이 도착했어요"
  body: "운영팀 답변을 확인해 주세요."
```

## Architecture

### Mobile

```text
Expo RN app
  -> ask permission at a high-value moment
  -> get native device push token
  -> POST token to FastAPI
  -> listen for notification tap
  -> open matching route
```

Use `expo-notifications` for:

- permission status
- `requestPermissionsAsync`
- `getDevicePushTokenAsync`
- foreground notification behavior
- notification response/tap listener
- Android notification channel setup

Do not call `getExpoPushTokenAsync` in this direct-provider plan.

### FastAPI

```text
notification-producing service
  -> create notifications row
  -> create push_delivery rows for eligible devices
  -> commit durable state
  -> worker sends pending rows to APNs/FCM
  -> update delivery status
  -> disable invalid tokens
```

Use a Postgres-backed outbox instead of Redis or a durable queue on the GPU
server. This matches the current rule that the GPU server is not a durable
coordination store.

### Provider Calls

iOS:

```text
FastAPI
  -> sign APNs JWT with .p8 key
  -> POST HTTP/2 to api.push.apple.com/3/device/{deviceToken}
```

Android:

```text
FastAPI
  -> obtain Google OAuth2 access token from service account
  -> POST to fcm.googleapis.com/v1/projects/{projectId}/messages:send
```

## Data Model Plan

### `push_devices`

Purpose: store native push tokens per user/device/install.

Proposed columns:

```text
id uuid primary key
user_id uuid not null references users(id)
platform text not null -- ios | android
provider text not null -- apns | fcm
environment text not null -- development | production
token text not null
token_hash text not null
installation_id text null
device_label text null
app_version text null
build_number text null
os_version text null
locale text null
timezone text null
permission_status text not null -- granted | denied | provisional | unknown
enabled boolean not null default true
last_registered_at timestamptz not null
last_success_at timestamptz null
last_failure_at timestamptz null
failure_count integer not null default 0
disabled_at timestamptz null
disabled_reason text null
created_at timestamptz not null
updated_at timestamptz not null
```

Indexes:

```text
ix_push_devices_user_id
ix_push_devices_token_hash
ix_push_devices_enabled
ux_push_devices_provider_environment_token_hash
```

Security note:

- The raw token is required for delivery.
- For MVP, keep it server-only and never expose it through read APIs.
- If feasible before launch, encrypt token at rest and keep `token_hash` for
  dedupe.

### `notification_preferences`

Purpose: store user-level push preferences separately from OS permission.

Proposed columns:

```text
user_id uuid primary key references users(id)
push_enabled boolean not null default false
chat_push_enabled boolean not null default true
application_push_enabled boolean not null default true
session_push_enabled boolean not null default true
support_push_enabled boolean not null default true
marketing_push_enabled boolean not null default false
created_at timestamptz not null
updated_at timestamptz not null
```

Rules:

- OS permission granted is not enough; user preference must also allow push.
- Marketing push remains disabled and out of scope.
- Chat room mute and user block must override user-level chat push preference.

### `push_deliveries`

Purpose: durable outbox and audit record for push sends.

Proposed columns:

```text
id uuid primary key
notification_id uuid not null references notifications(id)
push_device_id uuid not null references push_devices(id)
user_id uuid not null references users(id)
provider text not null -- apns | fcm
status text not null -- pending | sending | sent | failed | invalid | skipped
attempt_count integer not null default 0
next_attempt_at timestamptz not null
sent_at timestamptz null
provider_message_id text null
provider_status text null
provider_error_code text null
provider_error_message text null
created_at timestamptz not null
updated_at timestamptz not null
```

Indexes:

```text
ix_push_deliveries_status_next_attempt_at
ix_push_deliveries_notification_id
ix_push_deliveries_user_id
ix_push_deliveries_push_device_id
```

Retry policy:

- retry transient provider/network errors with backoff
- disable token on APNs `BadDeviceToken`, `Unregistered`, FCM
  `UNREGISTERED`, or equivalent invalid-token response
- cap attempts, then mark `failed`

## API Plan

### Register Token

```text
POST /api/v1/push-devices
```

Request:

```json
{
  "platform": "ios",
  "provider": "apns",
  "environment": "production",
  "token": "native-device-token",
  "installation_id": "client-generated-stable-id",
  "permission_status": "granted",
  "app_version": "0.1.0",
  "build_number": "30",
  "os_version": "iOS 26.2"
}
```

Response:

```json
{
  "id": "uuid",
  "platform": "ios",
  "provider": "apns",
  "enabled": true,
  "permission_status": "granted",
  "last_registered_at": "iso8601"
}
```

Rules:

- auth required
- user id comes from verified auth token
- token is never returned in response
- upsert by provider/environment/token hash
- if same token is registered by a new user after logout/login, bind it to the
  current user and disable stale binding if necessary

### Disable Token

```text
DELETE /api/v1/push-devices/{push_device_id}
```

Rules:

- auth required
- only owner can disable
- set `enabled=false`, `disabled_reason=user_removed`
- do not hard delete immediately

### Preferences

```text
GET /api/v1/notification-preferences
PATCH /api/v1/notification-preferences
```

Request:

```json
{
  "push_enabled": true,
  "chat_push_enabled": true,
  "application_push_enabled": true,
  "session_push_enabled": true,
  "support_push_enabled": true
}
```

Rules:

- marketing preference remains false unless a separate opt-in flow and policy
  update are implemented.
- UI should distinguish OS permission, token registration, and app preference.

## Push Event Eligibility

Eligible for OS push:

- `chat_message`
- `application_created`
- `application_selected`
- `application_rejected`
- `session_rescheduled`
- `session_canceled`
- `no_show_marked`
- `support_replied`

Probably not push initially:

- `application_withdrawn`
- `session_completed`
- low-urgency operational events

Suppress push when:

- notification recipient is also the event actor
- chat room is muted for that user
- counterpart is blocked
- user-level push is disabled
- category preference is disabled
- no active enabled token exists
- notification type lacks a safe push template

## Push Payload Rules

Do not put sensitive content in the OS notification body.

Preferred payload shape:

```json
{
  "title": "새 메시지가 왔어요",
  "body": "인터뷰 일정 조율을 이어가 보세요.",
  "data": {
    "notification_id": "uuid",
    "type": "chat_message",
    "target_type": "chat_room",
    "target_id": "uuid"
  }
}
```

Safe copy examples:

- `새 메시지가 왔어요`
- `새 신청이 도착했어요`
- `신청 결과가 업데이트됐어요`
- `인터뷰 일정이 변경됐어요`
- `문의 답변이 도착했어요`

Avoid:

- full chat message text
- phone number
- exact address
- applicant experience text
- report/support body
- private rejection details

## Mobile UX Plan

### Permission Timing

Do not request permission before login/signup is complete.

Current request moments:

- first authenticated app entry after login/signup, once per user
- from profile `알림 안내`

Suggested copy:

```text
선정 결과와 새 메시지를 바로 알려드릴게요.
```

Buttons:

```text
알림 받기
나중에
```

Denied state copy:

```text
알림은 iPhone 설정에서 다시 켤 수 있어요.
```

Android copy should say Android settings when the platform is Android.

### Profile Notification Screen

Replace the current deferred-copy screen with real states:

- permission not requested
- permission granted and token registered
- permission denied
- permission granted but token registration failed
- push enabled but category muted

### Foreground Behavior

Initial MVP behavior:

- Do not show intrusive foreground OS banners by default.
- Refresh notification list and unread badge when an event is received or when
  the user returns to the app.
- Add a lightweight in-app toast later if the current screen would otherwise
  hide a high-value event.

### Tap Routing

On push tap:

- mark matching notification as read when possible
- route by `target_type` and `target_id`
- fallback to `/notifications` if the target is missing or unsupported

Route mapping should match the current in-app notification route mapping.

## App Config Plan

Mobile dependency:

```text
expo-notifications
```

Expo config:

- add `expo-notifications` plugin
- configure Android notification icon and color
- configure Android notification channel in app code
- add Android Firebase config through Expo-managed configuration
- ensure iOS build has APNs entitlement through Apple credentials
- keep no secrets in app config or JavaScript bundle

Android:

- add Firebase project and Android app for `com.contentruck.hypofit`
- add `google-services.json` through a non-git secret or build-time path
- configure notification icon as white transparent asset
- configure default channel:
  - id: `hypofit-workflow`
  - name: `Hypofit 알림`
  - importance: default or high for transactional workflow notifications

iOS:

- Apple Developer push notification capability enabled for
  `com.contentruck.hypofit`
- APNs Auth Key `.p8`, Team ID, Key ID stored only in backend/server env
- distinguish development and production APNs environments
- TestFlight/App Store builds should use the production APNs environment

## Backend Environment Variables

Add placeholders to the root `.env.example` when implementation starts:

```text
PUSH_ENABLED=false
PUSH_WORKER_ENABLED=false
PUSH_APNS_ENABLED=false
PUSH_APNS_ENV=production
PUSH_APNS_TEAM_ID=replace_me
PUSH_APNS_KEY_ID=replace_me
PUSH_APNS_BUNDLE_ID=com.contentruck.hypofit
PUSH_APNS_PRIVATE_KEY_PATH=/path/to/AuthKey_KEYID.p8
PUSH_FCM_ENABLED=false
PUSH_FCM_PROJECT_ID=replace_me
PUSH_FCM_SERVICE_ACCOUNT_JSON_PATH=/path/to/service-account.json
PUSH_MAX_ATTEMPTS=3
PUSH_BATCH_SIZE=100
```

Secrets must stay on the FastAPI runtime host. Do not expose APNs `.p8`, FCM
service account JSON, or provider credentials in mobile, web, Vercel frontend
env, or git.

## GPU/API Runtime Considerations

No separate hosting is required.

The current FastAPI runtime can send push if outbound HTTPS works:

```text
api.push.apple.com:443
fcm.googleapis.com:443
oauth2.googleapis.com:443
```

Before enabling push:

- verify outbound TLS from the GPU server
- verify the DB tunnel and API service remain healthy
- keep push dispatch durable through Postgres outbox rows
- do not place Redis, durable queue, or coordination state on the GPU server

If outbound HTTPS is blocked or unstable:

- keep FastAPI as the API surface
- run the push worker on the EC2 side or another small VPS
- keep the same Supabase-backed `push_deliveries` outbox

## Implementation Phases

### Phase 1: Credential And Policy Preparation

- [x] Create Firebase project/app for Android package `com.contentruck.hypofit`.
- [x] Obtain FCM HTTP v1 service account credential.
- [x] Create or confirm APNs Auth Key in Apple Developer.
- [x] Record APNs Team ID, Key ID, Bundle ID, and environment.
- [x] Decide exact privacy-policy wording for push token and notification
      settings.
- Final Google Play Data safety answers for native push token collection are a
  Play Console submission task and should be completed from the reference
  worksheet at release time.
- Final Apple App Privacy label answers for push token/device identifiers are an
  App Store Connect submission task and should be completed from the reference
  worksheet at release time.

### Phase 2: Database And API

- [x] Add Alembic migration for `push_devices`.
- [x] Add Alembic migration for `notification_preferences`.
- [x] Add Alembic migration for `push_deliveries`.
- [x] Add Pydantic schemas for token registration, preferences, and delivery
      status.
- [x] Add repository/service modules:
  - `push_devices`
  - `notification_preferences`
  - `push_deliveries`
  - `push_dispatch`
- [x] Add protected API routes:
  - `POST /api/v1/push-devices`
  - `DELETE /api/v1/push-devices/{push_device_id}`
  - `GET /api/v1/notification-preferences`
  - `PATCH /api/v1/notification-preferences`
- [x] Ensure token values are never returned by read APIs.
- [x] Add route tests for registration response safety, preference read/update,
      and disable behavior.
- [x] Add deeper service/repository tests for token upsert, ownership,
      delivery creation, retry, and invalid input.

### Phase 3: Provider Clients

- [x] Implement APNs client with JWT signing and HTTP/2 request support.
- [x] Implement FCM HTTP v1 client with Google OAuth2 access token handling.
- [x] Normalize provider result codes into internal statuses.
- [x] Disable invalid tokens automatically.
- [x] Add retry/backoff for transient provider/network errors.
- [x] Add sanitized logs for push dispatch failures.
- [x] Add unit tests with mocked APNs/FCM responses.

### Phase 4: Outbox Worker

- [x] Create push delivery rows when eligible notifications are created.
- [x] Add admin-triggerable dispatch service for pending deliveries.
- [x] Keep dispatch idempotent and safe after API restart through Postgres
      delivery status.
- [x] Add batch size, max attempts, and next-attempt configuration.
- [x] Add health/readiness visibility for push dispatch if enabled.
- [x] Document restart/log commands for deployed push worker behavior.
- [x] Decide and implement separate systemd worker loop for automatic dispatch.
- [x] Deploy the push worker systemd service on the GPU server.

### Phase 5: Mobile Token Registration

- [x] Install `expo-notifications`.
- [x] Add Expo config plugin and Android notification asset settings.
- [x] Add Android notification channel setup.
- [x] Add mobile push service module:
  - permission status check
  - permission request
  - native device token fetch
  - token registration API call
  - token disable on logout or explicit opt-out remains open
- [x] Add stable `installation_id` storage.
- [x] Update profile `알림 안내` screen to real stateful push settings.
- [x] Add notification response listener and route mapping.
- [x] Keep notification permission request out of logged-out app launch.
- [x] Request notification permission once on the first authenticated app entry
      after login/signup.
- [x] Show platform-specific APNs/FCM status and category preferences in
      profile notification settings.
- [x] Add typecheck.

### Phase 6: Workflow Integration

- [x] Enable push outbox eligibility for `chat_message`.
- [x] Enable push outbox eligibility for `application_created`.
- [x] Enable push outbox eligibility for `application_selected`.
- [x] Enable push outbox eligibility for `application_rejected`.
- [x] Enable push outbox eligibility for `session_rescheduled`.
- [x] Enable push outbox eligibility for `session_canceled`.
- [x] Enable push outbox eligibility for `no_show_marked`.
- [x] Enable push outbox eligibility for `support_replied`.
- [x] Add automated/service-level coverage that chat mute suppresses chat push.
- [x] Add automated/service-level coverage that user block suppresses
      counterpart push.
- [x] Add automated/service-level coverage that self-events do not push to the
      actor.

### Phase 7: Store And Legal Updates

- [x] Update `packages/contracts/src/legal.ts` privacy policy wording.
- [x] Update native legal screens through shared legal content.
- [x] Update `docs/reference/google-play-data-safety-worksheet.md`.
- [x] Update `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`.
- [x] Update `docs/reference/google-play-first-launch-readiness-plan.md` push
      section.
- [x] Update `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md`
      if iOS push build behavior changes.
- [x] Remove user-facing copy that says OS push is not sent.
- Add reviewer notes only if push permission behavior could be confusing at
  submission time; this is not repository implementation.

### Phase 8: Implementation Closeout

- [x] Deploy FastAPI code by git sync on GPU server.
- [x] Back up server `.env` before adding provider env values.
- [x] Apply migrations.
- [x] Restart API.
- [x] Confirm invalid-token handling with mocked APNs/FCM provider responses.
- [x] Keep push worker operations documented when implementation changes.

## Validation Commands

Backend:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests/test_health.py -q
apps/api/.venv/bin/python -m pytest apps/api/tests/test_notifications_routes.py -q
apps/api/.venv/bin/python -m pytest apps/api/tests/test_push_copy.py -q
apps/api/.venv/bin/python -m pytest apps/api/tests/test_push_provider_clients.py -q
apps/api/.venv/bin/python -m pytest apps/api/tests/test_push_routes.py -q
```

Deployed GPU operations:

```bash
ssh bukae-gpu "systemctl --user status hypofit-api.service --no-pager -l"
ssh bukae-gpu "journalctl --user -u hypofit-api.service -n 120 --no-pager"
ssh bukae-gpu "systemctl --user restart hypofit-api.service"
curl -sS https://hypofit-api.bukae.co.kr/api/v1/health
curl -sS https://hypofit-api.bukae.co.kr/api/v1/health/ready
```

Push dispatch now has a deployed GPU worker implementation.

Current worker operating values:

```text
PUSH_WORKER_BATCH_SIZE=20
PUSH_WORKER_ACTIVE_SLEEP_SECONDS=2
PUSH_WORKER_IDLE_SLEEP_SECONDS=30
PUSH_WORKER_ERROR_SLEEP_SECONDS=30
```

The 30 second idle polling interval is intentional for the Supabase free plan.

```bash
ssh bukae-gpu "systemctl --user status hypofit-push-worker.service --no-pager -l"
ssh bukae-gpu "journalctl --user -u hypofit-push-worker.service -n 120 --no-pager"
ssh bukae-gpu "systemctl --user restart hypofit-push-worker.service"
```

Mobile:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Runtime reachability:

```bash
ssh bukae-gpu "python - <<'PY'
import socket
for host in ['api.push.apple.com', 'fcm.googleapis.com', 'oauth2.googleapis.com']:
    print(host, socket.create_connection((host, 443), timeout=5).getsockname())
PY"
```

Use a safer scripted check during implementation if provider TLS/HTTP behavior
needs deeper verification.

## Implementation Acceptance Criteria

- [x] A signed-in iOS user can grant notification permission and register an
      APNs token.
- [x] Backend stores enabled push devices without exposing raw tokens through
      read APIs.
- [x] Eligible workflow notification rows create push delivery rows.
- [x] APNs provider send path is implemented and has recorded a successful iOS
      delivery check.
- [x] Notification tap route mapping is implemented for expected
      chat/interview/support targets.
- [x] Chat mute suppresses chat push in service-level behavior.
- [x] Blocked counterpart events do not push in service-level behavior.
- [x] Invalid provider tokens are disabled.
- [x] Privacy policy, Google Play Data safety, and Apple App Privacy docs match
      actual implementation.
- [x] No marketing push is sent or claimed.

## Open Questions

- Should `application_withdrawn` push to founders, or stay in-app only?
- Should foreground chat messages show an in-app toast when the user is outside
  that chat room?
- Should profile notification preferences be one global toggle only for MVP, or
  category-level from the first release?
- The MVP push worker should run as a separate user systemd service on the GPU
  server.
- If GPU outbound HTTPS is blocked again, should EC2 host the push worker while
  the API stays on GPU?

## Closeout Rule

This document can be closed when implementation and automated/service-level
coverage match the shipped push behavior. Manual iOS/Android release checks
are handled by the user and should not keep this implementation document active
by themselves.
