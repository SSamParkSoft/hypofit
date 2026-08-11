# Production Code Quality Hardening Plan

Status: completed

Last updated: 2026-06-23

Owner: Codex / Hypofit

## Purpose

Bring the current FastAPI backend and Expo React Native mobile code closer to a
production baseline before broader App Store, Play Store, and external tester
exposure.

This document converts the 2026-06-23 static code review into implementation
work. It is intentionally scoped to concrete code hardening tasks, not general
style guidance.

## Review Baseline

Reviewed areas:

- `apps/api`: FastAPI architecture, config, auth dependencies, error handling,
  repositories, services, account deletion, push/session/chat-related code.
- `apps/mobile`: Expo React Native screens, shared UI, React Query hooks,
  auth-scoped data fetching, push registration/routing, navigation/back behavior,
  keyboard and accessibility surfaces.
- `apps/web`: only reviewed where it was touched by the account-info/password
  change work.

External standards checked:

- FastAPI bigger-application structure and `APIRouter` separation.
- FastAPI dependency/session lifecycle with `yield`.
- Pydantic v2 validation behavior.
- Expo/RN safe-area and system UI guidance.
- React Native release-build performance guidance.
- TanStack Query React Native app-focus and caching guidance.

## Current Assessment

The overall repository structure is workable for MVP:

- Backend already has `routes -> services -> repositories -> models/schemas`.
- Mobile already uses Expo, NativeWind, shared API clients, shared UI primitives,
  SafeAreaProvider, Sentry, and React Query.
- Store-review-sensitive surfaces exist: account deletion, legal pages, support,
  reporting, blocking, push, and reviewer/demo data.

The gaps are mostly production hardening issues:

- Some config and cache failures would be hard to detect before users see them.
- Some backend transaction boundaries are inconsistent.
- Some UI controls are visually usable but weak for accessibility and small
  phones.
- Some push/navigation paths lose user intent.

## Priority 0 - Must Fix Before Next Review Build

### 1. Mobile Auth-Scoped Query Cache Isolation

Problem:

- `apps/mobile/src/features/interview-posts/useInterviewPosts.ts` keys
  authenticated interview post data by `Boolean(accessToken)`, not by account.
- `apps/mobile/src/features/support/useSupportTicket.ts` does not include the
  signed-in user identity in support ticket query keys.
- `apps/mobile/src/providers/AppProviders.tsx` keeps one process-wide
  `QueryClient`.
- `apps/mobile/src/features/auth/AuthProvider.tsx` sign-out does not clear
  auth-scoped query caches.

Risk:

- After sign-out/sign-in without killing the app, account B may briefly see
  account A's cached interview/support data.

Implementation plan:

- Introduce a stable mobile query key convention:
  - public data: `["resource", params, "public"]`
  - auth data: `["resource", userId, params, "api"]`
- Add user id to auth-only hooks where needed:
  - interview posts that include ownership/application state.
  - applications.
  - sessions.
  - support tickets.
  - chat rooms/messages/workflow where currently token is used directly.
- On sign-out and account switch, clear or remove auth-scoped queries.
- Prefer not to use raw access tokens in query keys unless there is no stable
  account id available.

Acceptance criteria:

- Signing out from one reviewer/test account and signing into another account
  cannot show the previous account's support tickets, applications, sessions,
  chat rooms, or owned interview posts.
- Typecheck passes for `apps/mobile`.
- Add or update at least one focused test or smoke note for account switching,
  if the test harness can cover it cheaply.

Implementation note (2026-06-23 bounded mobile subset):

- Mobile auth-scoped query keys now use stable user ids for interview posts,
  interview post views, applications, sessions, support tickets, chat,
  blocks, and notifications.
- `AuthProvider` now removes auth-scoped mobile queries on sign-out and when
  the in-process Supabase user changes.
- Focused smoke: sign in as account A, open support/my interviews/chat, sign
  out without killing the app, sign in as account B, and verify account A data
  does not reappear from cache.

### 2. API Production Config Fail-Fast

Problem:

- `apps/api/app/core/config.py` allows production-critical values to default to
  local or empty values.
- `extra="ignore"` can hide misspelled environment variables.
- `apps/api/app/core/database.py` creates the SQLAlchemy engine at import time
  from whatever config was loaded.

Risk:

- API can boot with a wrong DB URL, missing JWKS/Auth config, missing Resend
  config, or disabled push secrets without failing early.

Implementation plan:

- Add explicit production validation to settings:
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - at least one supported Supabase token verification path
  - `CORS_ORIGINS`
  - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` when outbound email is enabled
  - APNs/FCM variables when each provider is enabled
- Keep local defaults only for `ENV=local` or test contexts.
- Make production config validation run before engine creation.
- Consider `extra="forbid"` for production or a custom unknown-env audit if
  direct forbidding is too noisy.

Acceptance criteria:

- A missing production `DATABASE_URL` fails startup before serving requests.
- A missing production JWT verification path fails startup.
- Existing local development still boots without requiring production secrets.
- `apps/api` tests pass.

### 3. Account Deletion Transaction and External File Purge Ordering

Problem:

- `apps/api/app/services/account_deletion.py` performs irreversible Supabase
  Storage profile-image deletion before the account anonymization transaction is
  fully committed.

Risk:

- If DB commit fails after file deletion, user data and file state can become
  inconsistent.

Implementation plan:

- Treat account deletion as a state transition first:
  - mark deletion requested/processing.
  - anonymize/deactivate DB user state.
  - commit DB state.
- Move profile-image purge to a retryable post-commit step:
  - background worker/job table, or
  - explicit best-effort cleanup with failure recorded for operator follow-up.
- Record purge failure in audit/operations data instead of losing it in logs.

Acceptance criteria:

- DB soft-delete/anonymization cannot be rolled back after external file deletion
  has already occurred.
- File purge failure is visible to operators and retryable.
- Existing account deletion route tests are updated.

## Priority 1 - Should Fix Before Wider Beta

### 4. Backend Error Response Redaction

Problem:

- `apps/api/app/core/error_handlers.py` always includes `debug_message` in the
  public error envelope.
- Request validation errors also expose legacy `detail` with raw validation
  errors.

Risk:

- Client responses can expose implementation detail or rejected input fragments.

Implementation plan:

- In production responses, keep only:
  - `error.code`
  - `error.message`
  - `error.request_id`
  - `error.status`
  - sanitized `field_errors`
- Keep `debug_message` only in local/dev, or remove it from public response and
  preserve it in logs/Sentry only.
- Remove legacy `detail` from production responses unless a compatibility layer
  absolutely requires it.

Acceptance criteria:

- Production-style error response does not include raw exception messages or raw
  request body fragments.
- Mobile `ApiError` still receives enough fields to show user copy and Sentry
  diagnostics.
- Existing error response tests are updated.

### 5. Repository Transaction Boundary Cleanup

Problem:

- Some repositories call `commit()`/`refresh()` directly:
  - `apps/api/app/repositories/users.py`
  - `apps/api/app/repositories/support.py`
  - `apps/api/app/repositories/interview_posts.py`
  - `apps/api/app/repositories/interview_post_views.py`
- Other domains already treat services as the transaction boundary.

Risk:

- Multi-step service workflows cannot be composed atomically.
- Rollback behavior differs by domain.
- Future code can accidentally commit half of a workflow.

Implementation plan:

- Standardize repository methods to:
  - query.
  - mutate models.
  - `flush()` when ids or constraints are needed.
  - never `commit()` unless explicitly named as a standalone persistence helper.
- Move `commit()` and `refresh()` to service methods.
- Document the pattern in `AGENTS.md` or backend reference docs after applying.

Acceptance criteria:

- No ordinary repository method commits implicitly.
- Service-level methods own transaction completion.
- Existing route/service tests still pass.

### 6. Mobile Icon Button Accessibility Labels

Problem:

- Several icon-only `Pressable` controls have `accessibilityRole="button"` but
  no `accessibilityLabel`.
- Examples include shared back buttons and screen-specific close/menu/back
  buttons.

Risk:

- VoiceOver/TalkBack users hear unclear controls.
- App Store accessibility declarations become weaker.

Implementation plan:

- Create or extend a shared `IconButton` primitive with required label.
- Update:
  - `apps/mobile/src/shared/ui/AppScreen.tsx`
  - `CreateInterviewScreen`
  - `InterviewDetailScreen`
  - `ScheduleSessionScreen`
  - `MyInterviewsScreen`
  - `MapScreen`
  - chat/menu controls as needed.

Acceptance criteria:

- Icon-only controls have labels such as `뒤로가기`, `닫기`, `채팅 설정`,
  `알림 끄기`, `검색`, `현재 위치로 이동`.
- Typecheck passes.
- Status 2026-06-23: bounded mobile subset implemented in shared back-button
  surfaces plus `CreateInterviewScreen`, `InterviewDetailScreen`,
  `ScheduleSessionScreen`, `MyInterviewsScreen`, and `MapScreen`.

### 7. Mobile Form Label Accessibility

Problem:

- `apps/mobile/src/shared/ui/TextField.tsx` renders visible labels, but labels
  are not programmatically associated with `TextInput`.
- Some custom password/input fields follow the same pattern.

Risk:

- Screen readers may announce inputs without useful labels.

Implementation plan:

- Add `accessibilityLabel` or `nativeID`/`accessibilityLabelledBy` support to
  shared text input primitives.
- Ensure password fields include labels and visibility-toggle labels.
- Apply to auth, support, schedule, account info, create interview, and other
  form-heavy screens.

Acceptance criteria:

- Shared `TextField` gives inputs a useful accessible name by default.
- No visible label is the only source of input meaning.
- Status 2026-06-23: shared `TextField` now defaults `accessibilityLabel`, and
  custom inputs in create/detail/schedule/support/account forms were patched.

## Priority 2 - Quality and Polish

### 8. Mobile Touch Target Normalization

Problem:

- Several chips/tabs are visually compact and may be below 44x44 logical pixels.

Implementation plan:

- Normalize chip/toggle row components to keep compact visuals but provide a
  44px minimum touch area through `min-h-11`, padding, or `hitSlop`.
- Prioritize:
  - support category chips.
  - interview filter chips.
  - schedule quick-option chips.
  - map filter/list controls.
  - My Interviews segmented controls.

Acceptance criteria:

- Tappable controls meet 44px target or have equivalent `hitSlop`.
- Visual density remains close to current approved design.
- Status 2026-06-23: compact chips/tabs in support, create interview, schedule,
  map filters, and My Interviews were raised to the 44px target.

### 9. Keyboard Safety for AppScreen-Based Forms

Problem:

- `apps/mobile/src/shared/ui/AppScreen.tsx` wraps content in `ScrollView`, but
  does not handle keyboard avoidance.
- Account info and support forms can have bottom buttons covered on small
  phones.

Implementation plan:

- Add opt-in keyboard handling to `AppScreen`, or create a `FormScreen`
  primitive.
- Use `KeyboardAvoidingView` for iOS and safe bottom padding for Android.
- Apply to account info, support, feedback/report if needed.

Acceptance criteria:

- On small iPhone/Android viewports, final input and submit/cancel buttons remain
  reachable while the keyboard is open.
- Status 2026-06-23: `AppScreen` now supports opt-in keyboard avoidance and is
  enabled for support/account form flows.

### 10. ListSurface Accessibility State

Problem:

- `apps/mobile/src/shared/ui/ListSurface.tsx` supports selected/viewed visual
  states but does not expose them via `accessibilityState`.

Implementation plan:

- Add `accessibilityState={{ selected: isSelected }}` where appropriate.
- Add props for row label/hint if needed.
- Use labels for unread/read/selected status where it materially changes meaning.

Acceptance criteria:

- Selected rows are announced as selected.
- Important unread/read state is not color-only.
- Status 2026-06-23: `ListSurface` rows now expose selected state through
  `accessibilityState`.

### 11. Push Registration Preference Gate

Problem:

- Silent push registration can run when OS permission is granted even if the
  user has turned push off in app settings.

Implementation plan:

- Load stored push preference before silent registration.
- Register silently only when app-level push is enabled or unset by product
  policy.
- If user explicitly disables push, preserve that state across app launches.

Acceptance criteria:

- Turning push off in settings cannot be undone by background/silent
  registration.
- Manual re-enable still registers the current device.

Implementation note (2026-06-23 bounded mobile subset):

- Silent/native push re-registration now checks the persisted per-user master
  push preference before re-registering a device.
- The master push toggle uses the explicit registration path again when OS
  permission is already granted, so a prior in-app disable is not silently
  overwritten.

### 12. Support Notification Deep Link Handling

Problem:

- Push routing can pass `ticketId`, but support screen currently opens the
  generic inquiry list.

Implementation plan:

- Parse `ticketId` in support screen route params.
- Auto-expand/focus the matching ticket when available.
- If the ticket is unavailable, show the generic support list with a calm
  fallback message.

Acceptance criteria:

- Tapping a support reply notification lands on the relevant inquiry/report
  thread.

Implementation note (2026-06-23 bounded mobile subset):

- Support notification routing now carries `ticketId` into `/support`.
- The support screen auto-expands and prioritizes the matching ticket when it
  still exists, and falls back to the generic list with a calm message when it
  does not.
- Focused smoke: disable push, relaunch the app, confirm the master push toggle
  stays off, then open a support-reply notification and verify the matching
  ticket is expanded.

### 13. Release Console Logging Gate

Problem:

- `apps/mobile/src/features/auth/authErrors.ts` intentionally uses
  `console.warn` in release TestFlight builds for auth diagnostics.

Risk:

- React Native performance guidance warns that bundled-app `console.*` can
  create JS-thread cost.

Implementation plan:

- Keep Sentry diagnostics as the primary channel.
- Gate console logging behind a dev/debug flag, or remove it from production
  builds once auth has stabilized.

Acceptance criteria:

- Production/release builds do not spam auth diagnostics through `console.warn`.
- Sentry still captures sanitized auth failure metadata.

Implementation note (2026-06-23):

- Auth diagnostics still flow to Sentry with sanitized metadata.
- Console auth diagnostics now return early outside `__DEV__`, so TestFlight and
  production release builds do not emit auth `console.warn` noise.

## Suggested Execution Order

1. Mobile auth-scoped cache isolation.
2. API production config fail-fast.
3. Account deletion external purge ordering.
4. Error response redaction.
5. Accessibility quick pass: icon labels + input labels.
6. Push preference gate + support deep link.
7. Repository transaction boundary cleanup.
8. Keyboard/touch-target/list-state polish.
9. Release console logging gate.

## Validation Plan

Backend:

- `apps/api/.venv/bin/ruff check app tests`
- `apps/api/.venv/bin/pytest`
- FastAPI startup smoke with local env.
- Production-like config validation smoke with missing required values.

Mobile:

- `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
- Manual account-switch smoke:
  - sign in account A.
  - open support, chat, my interviews.
  - sign out.
  - sign in account B.
  - confirm A data does not appear.
- Manual push settings smoke:
  - disable push.
  - restart app.
  - confirm app does not silently re-enable push.
- Small-phone keyboard smoke on account/support forms.

Web:

- `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build`
  only if shared contracts or web auth/profile code changes.

## Non-Goals

- Redesigning mobile UI visuals.
- Replacing polling with WebSocket/realtime.
- Reworking backend hosting topology.
- Adding payment or escrow.
- Refactoring every large screen file only for size. Large files should be split
  only when it directly supports one of the hardening tasks above.

## Implementation Closeout

Completed on 2026-06-23.

Implemented scope:

- Mobile auth-scoped query cache isolation and account-switch cache cleanup.
- API production config fail-fast validation.
- Production CORS validation now rejects missing/default localhost-only origins.
- Production validation now also requires `SUPABASE_SERVICE_ROLE_KEY` so account
  deletion profile-image purge can actually run in production.
- SQLAlchemy engine/session factory creation is lazy, so production startup
  validation can run before database engine creation.
- Account deletion DB-first transition with post-commit profile image purge
  auditing.
- Production error response redaction.
- Repository transaction boundary cleanup for ordinary repository methods.
- Mobile icon button labels, form labels, selected-state accessibility, touch
  target normalization, and keyboard-safe form screens.
- Push registration preference gate and support notification deep-link routing.
- Deferred push notification responses are discarded unless they are bound to
  the same authenticated user, avoiding cross-account routing after sign-out or
  account switching.
- Release console logging gate for auth diagnostics.
- Chat list avatar/menu icon buttons received explicit accessibility labels
  after post-implementation review.
- Backend lint baseline cleanup needed for the documented validation command.

Verification:

- `cd apps/api && .venv/bin/ruff check app tests` passed.
- `cd apps/api && .venv/bin/pytest` passed: 171 passed, 10 skipped.
- `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
  passed.
- `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build`
  passed.

Deferred manual QA:

- Physical-device or simulator smoke for account switching, support deep links,
  push preference persistence, and small-phone keyboard behavior should be run
  before the next TestFlight/App Store review build.
