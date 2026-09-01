# Mobile Startup Auth Error Hardening Plan

Status: completed

Last updated: 2026-06-29

## Purpose

Fix the release-build startup path where the native app can stay on the
animated splash progress near 90% while authentication or profile bootstrap is
still unresolved.

This plan also expands the auth/profile/push error-code contract so TestFlight
or production startup failures are diagnosable from Sentry without exposing
PII, tokens, or raw request bodies.

## Incident Context

Observed behavior:

- The iOS TestFlight app can stop around 70-90% of the React Native splash
  progress and not move to the login, role onboarding, or home screen.
- Sentry currently has recent release events for
  `com.contentruck.hypofit@1.0.0+46`.
- The latest Sentry issue in the startup window is `HYPOFIT-MOBILE-7`.
- Its breadcrumbs show startup activity followed by:
  - `GET /api/v1/me -> 403`
  - `POST /api/v1/push-devices -> 403`

Current interpretation:

```text
Native launch
  -> native splash
  -> React Native SplashScreen progress to 0.9
  -> AuthProvider session restore
  -> FastAPI /me profile bootstrap
  -> push registration
  -> route to login, role onboarding, or tabs
```

The React Native splash intentionally waits at approximately 90% until
`auth.isLoading` and `auth.isSyncing` are false. Therefore a persistent 90%
state is almost certainly an auth/profile bootstrap state problem, not a visual
progress-bar problem.

## Goals

- The app must never wait indefinitely on the splash screen.
- Startup must choose a safe route even if Supabase session restore, `/me`, or
  push registration fails.
- `/api/v1/me` and `/api/v1/push-devices` 401/403 responses must have stable
  machine-readable error codes.
- Push registration must not run before the app user profile is confirmed.
- Sentry must clearly show which startup phase blocked the user.
- User-facing Korean copy must remain short, calm, and non-technical.

## Non-Goals

- Do not replace Supabase Auth.
- Do not move all auth into FastAPI just to hide Supabase from the client.
- Do not expose Supabase service-role keys or backend secrets to mobile.
- Do not show raw provider errors, access tokens, emails, or request bodies in
  UI, Sentry, or logs.
- Do not build a complex recovery wizard for MVP. Prefer safe fallback routing
  plus high-quality diagnostics.

## Relevant Files

Mobile:

- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/screens/auth/SplashScreen.tsx`
- `apps/mobile/src/features/push/PushNotificationManager.tsx`
- `apps/mobile/src/features/push/pushNotifications.ts`
- `apps/mobile/src/shared/api/client.ts`
- `apps/mobile/src/shared/diagnostics/sentry.ts`
- `apps/mobile/src/features/auth/authErrors.ts`

Backend:

- `apps/api/app/api/dependencies.py`
- `apps/api/app/api/v1/routes/me.py`
- `apps/api/app/api/v1/routes/push.py`
- `apps/api/app/core/errors.py`
- `apps/api/app/core/error_handlers.py`
- `apps/api/app/schemas/errors.py`
- `apps/api/tests/test_error_responses.py`

Reference documents:

- `docs/reference/error-observability-contract.md`
- `docs/completed/mobile-auth-failure-observability-hardening-plan.md`

## Startup State Contract

Startup should have finite state transitions:

```text
session_restore_pending
  -> session_absent
  -> session_present
  -> session_restore_failed
  -> session_restore_timeout

profile_bootstrap_pending
  -> profile_loaded
  -> role_onboarding_required
  -> profile_missing_recoverable
  -> account_inactive
  -> profile_bootstrap_failed
  -> profile_bootstrap_timeout

push_registration_pending
  -> push_registered
  -> push_skipped
  -> push_failed_non_blocking
```

Only session restore and profile bootstrap may affect initial routing. Push
registration must be non-blocking and must never keep the splash visible.

## Target Routing Policy

After the splash minimum display time:

```text
No Supabase session
  -> /(auth)/login

Supabase session exists + app profile loaded
  -> /(tabs)/home

Supabase session exists + app profile missing + no valid role metadata
  -> /(auth)/sign-up-role

Supabase session exists + role onboarding required
  -> /(auth)/sign-up-role

Session restore timeout
  -> /(auth)/login
  -> capture Sentry diagnostic

Profile bootstrap timeout
  -> safe fallback screen or login retry policy
  -> capture Sentry diagnostic
```

For MVP, the preferred timeout fallback is conservative:

- If session restore times out, route to login.
- If profile bootstrap times out and the session is present, route to a
  recoverable auth state rather than leaving the splash blocked. The first
  implementation can show login with a calm retry message if the state cannot be
  classified safely.

## Mobile Implementation Plan

### 1. Add a reusable timeout helper

Create or add a small helper near the auth boundary:

```ts
withTimeout<T>({
  promise,
  timeoutMs,
  code,
  phase,
}): Promise<T>
```

Requirements:

- Reject with a typed local timeout error.
- Include `phase` and `code`.
- Do not include email, token, password, request body, or raw provider payload.
- Use it only around operations where an indefinite await would block startup.

Initial timeout values:

- Supabase `getSession`: 8 seconds.
- App profile bootstrap: 12 seconds.
- Optional push preference/registration paths: keep non-blocking and catch
  internally instead of blocking startup.

### 2. Harden `AuthProvider` session restore

Current risk:

- `supabase.auth.getSession()` can leave `isLoading=true` until it settles.

Target behavior:

- Add breadcrumb before session restore:
  - `auth_provider_get_session_start`
- On success:
  - `auth_provider_get_session_done`
  - include `hasSession`
- On timeout:
  - `auth_provider_get_session_timeout`
  - `setSession(null)`
  - `setIsLoading(false)`
  - capture Sentry message/error with `phase=session_restore`
- On unexpected failure:
  - `auth_provider_get_session_error`
  - `setSession(null)`
  - `setIsLoading(false)`

User-facing copy should not be shown on the splash unless routing to login. If
shown later, use:

```text
로그인 정보를 확인하지 못했어요. 다시 로그인해 주세요.
```

### 3. Harden `AuthProvider` profile bootstrap

Current risk:

- `/me` 403 is ambiguous.
- `isSyncing` can block splash routing if the branch is not classified.

Target behavior:

- Wrap `meApi.get()` and fallback `meApi.sync()` with profile-bootstrap timeout.
- Always clear `isSyncing` through a guarded finalizer.
- Map backend error codes to explicit local states.
- Preserve the existing role-onboarding path.

Required mobile mappings:

| Backend code | Mobile state | Route/action |
| --- | --- | --- |
| `role_onboarding_required` | requires role onboarding | `/(auth)/sign-up-role` |
| `profile_missing` | recoverable missing profile | attempt `/me/sync` if role metadata exists |
| `profile_sync_required` | recoverable missing profile | attempt `/me/sync` |
| `account_inactive` | inactive account | sign out, route login |
| `account_deleted` | deleted account | sign out, route login |
| `auth_invalid_token` | invalid session | sign out, route login |
| `auth_token_expired` | expired session | sign out, route login |
| `permission_denied` | blocked state | show support-safe error |
| `api_timeout` | bootstrap timeout/failure | fallback with diagnostic |
| `network_error` | bootstrap failure | fallback with diagnostic |

### 4. Make push registration wait for `appUser`

Current risk:

- `PushNotificationManager` can derive `stableUserId` from Supabase `user.id`.
- This allows `/push-devices` before `/me` confirms the app profile.

Target behavior:

```ts
const stableUserId = appUser?.id ?? null;
const canRegisterPush = Boolean(accessToken && appUser && !isLoading && !isSyncing);
```

Rules:

- Do not call `syncPushRegistrationIfAlreadyAllowed` without `appUser`.
- Do not call `requestInitialPushPermissionIfNeeded` without `appUser`.
- Push failures are captured as diagnostics only.
- Push failures must not set auth loading/syncing state.

### 5. Add SplashScreen watchdog diagnostics

Current risk:

- A splash wait can happen without a direct Sentry event named after the splash
  state.

Target behavior:

- If the React Native splash waits longer than 10 seconds after the minimum
  display time, capture one diagnostic event:
  - `splash_wait_timeout`
- Include only safe fields:
  - `is_configured`
  - `is_loading`
  - `is_syncing`
  - `has_session`
  - `has_app_user`
  - `requires_role_onboarding`
  - `candidate_route`
  - `app_version`
  - `build_number`
- Deduplicate so the same launch does not send repeated timeout events.

Recommended user behavior:

- Do not leave the user blocked indefinitely.
- Route based on the safe routing policy above.

## Backend Error-Code Expansion

FastAPI must distinguish auth/profile/push states with stable error codes. All
handled errors should continue to use the standard envelope:

```json
{
  "error": {
    "code": "role_onboarding_required",
    "message": "역할 설정이 필요해요.",
    "status": 403,
    "request_id": "req_...",
    "debug_message": "profile missing role metadata",
    "field_errors": null
  }
}
```

### Auth and token codes

| Code | HTTP | Meaning | User copy |
| --- | ---: | --- | --- |
| `auth_required` | 401 | Missing bearer token | `로그인이 필요해요.` |
| `auth_invalid_token` | 401 | Token signature/issuer/audience invalid | `로그인 정보를 다시 확인해 주세요.` |
| `auth_token_expired` | 401 | Token expired | `다시 로그인해 주세요.` |
| `auth_user_not_found` | 401 | Token subject no longer exists | `다시 로그인해 주세요.` |
| `auth_provider_unavailable` | 503 | Supabase/JWKS/provider unavailable | `로그인 확인이 지연되고 있어요.` |

### Profile bootstrap codes

| Code | HTTP | Meaning | Mobile action |
| --- | ---: | --- | --- |
| `profile_missing` | 403 | Auth user exists but app profile row is missing | Try `/me/sync` if role metadata exists |
| `profile_sync_required` | 403 | Profile must be created before protected API use | Try `/me/sync` |
| `role_onboarding_required` | 403 | Role metadata/profile role missing | Route to role onboarding |
| `profile_incomplete` | 409 | Required profile fields missing after sync | Route to profile completion or show retry |
| `account_inactive` | 403 | Soft-deleted or disabled account | Sign out and show inactive account copy |
| `account_deleted` | 403 | Account deletion completed | Sign out and show deleted account copy |
| `account_suspended` | 403 | Moderation/admin suspension | Sign out or block protected access |

### Push registration codes

| Code | HTTP | Meaning | Mobile action |
| --- | ---: | --- | --- |
| `push_profile_required` | 403 | Push registration before app profile exists | Do not retry until `appUser` exists |
| `push_permission_denied` | 409 | App/device permission not granted | Keep settings off |
| `push_token_invalid` | 422 | APNs/FCM token payload invalid | Show settings retry |
| `push_device_conflict` | 409 | Installation/token ownership conflict | Refresh registration |
| `push_provider_unavailable` | 503 | APNs/FCM provider unavailable | Non-blocking retry later |

### General domain codes to preserve

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `validation_failed` | 422 | Request validation failed |
| `permission_denied` | 403 | Authenticated but not allowed |
| `resource_not_found` | 404 | Resource missing or hidden |
| `state_transition_invalid` | 409 | Invalid workflow transition |
| `conflict` | 409 | Duplicate or conflicting resource |
| `database_unavailable` | 503 | DB connection/query unavailable |
| `external_service_unavailable` | 503 | Third-party dependency unavailable |

## Sentry Diagnostic Contract

Allowed tags/extras:

- `phase`
- `code`
- `status`
- `request_id`
- `method`
- `path`
- `route`
- `is_loading`
- `is_syncing`
- `has_session`
- `has_app_user`
- `requires_role_onboarding`
- `app_version`
- `build_number`

Forbidden:

- Email addresses.
- Passwords.
- Supabase access tokens.
- Supabase refresh tokens.
- Service-role keys.
- Raw request or response bodies.
- Full profile records.
- Raw push tokens.

Required startup breadcrumbs:

```text
auth_provider_session_effect_start
auth_provider_get_session_start
auth_provider_get_session_done | auth_provider_get_session_timeout | auth_provider_get_session_error
auth_provider_app_user_sync_start
auth_provider_app_user_sync_done | auth_provider_app_user_needs_role_onboarding | auth_provider_app_user_sync_timeout | auth_provider_app_user_sync_error
push_silent_registration_skipped_until_profile
push_silent_registration_start
push_silent_registration_done | push_silent_registration_error
splash_ready_to_leave
splash_wait_timeout
```

## Tests and Verification

### Mobile checks

Run:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Manual simulator/device scenarios:

- Fresh install with no session routes to login.
- Valid session with valid profile routes to home.
- Valid session with no app profile and no role metadata routes to role
  onboarding.
- Valid session with `/me` returning `profile_missing` and role metadata
  attempts sync.
- API unavailable does not leave splash at 90%.
- Push permission granted does not call `/push-devices` until `appUser` exists.
- Splash watchdog emits at most one `splash_wait_timeout` event per blocked
  launch.

### API checks

Run:

```bash
cd apps/api
.venv/bin/ruff check app tests
.venv/bin/pytest
```

Add or update tests for:

- `/api/v1/me` missing token -> `auth_required`
- invalid token -> `auth_invalid_token`
- expired token -> `auth_token_expired` if fixture supports it
- auth user without app profile -> `profile_missing` or
  `role_onboarding_required` depending on metadata
- inactive/deleted user -> `account_inactive` or `account_deleted`
- `/api/v1/push-devices` before profile exists -> `push_profile_required`
- all responses include `X-Request-ID` and standard error envelope

### Sentry release-build verification

After a TestFlight or local release build:

- Confirm events are tagged with the correct release/build number.
- Confirm no event contains email, password, token, or raw request body.
- Confirm startup breadcrumbs show the exact phase sequence.
- Confirm `/me 403` and `/push-devices 403` can be distinguished by code.

## Implementation Checklist

- [x] Add auth startup timeout helper.
- [x] Add `getSession()` timeout and diagnostic handling.
- [x] Add profile bootstrap timeout and state-safe finalizer.
- [x] Add splash wait watchdog event and safe fallback routing.
- [x] Restrict push registration to confirmed `appUser`.
- [x] Add `push_silent_registration_skipped_until_profile` breadcrumb.
- [x] Add backend auth/profile/push error subclasses or typed factory helpers.
- [x] Update `/api/v1/me` to return profile/account-specific codes.
- [x] Update `/api/v1/push-devices` to return push-specific profile/permission
  codes.
- [x] Update mobile API/auth error handling for non-403 `/me` failures in
      startup bootstrap.
- [x] Add explicit startup fallback handling for invalid/expired token, network,
      5xx, and profile bootstrap sync failures so a stale Supabase session
      cannot route into protected tabs.
- [x] Add `push_silent_registration_start` and
      `push_silent_registration_done` breadcrumbs if the breadcrumb contract is
      still required.
- [x] Add API tests for new error codes.
- [x] Add or confirm dedicated `auth_token_expired` test coverage.
- [x] Run mobile typecheck.
- [x] Run API ruff/pytest.
- [x] Deploy API if backend code changes.
- [x] Build/upload mobile release if mobile startup code changes.
- [x] Re-check Sentry after release.

## Implementation Progress

### 2026-06-23

Implemented:

- Mobile startup:
  - Added finite startup timeout handling around Supabase `getSession()`.
  - Added finite timeout handling around `/me` profile bootstrap.
  - On profile bootstrap timeout, cleared route-driving auth state so the app
    does not route a timed-out session into protected tabs.
  - Added a deduplicated `splash_wait_timeout` Sentry diagnostic after the
    minimum splash window plus the watchdog interval.
  - Added safe Sentry diagnostic fields including `has_session`,
    `has_app_user`, `is_loading`, `is_syncing`, `candidate_route`,
    `app_version`, and `build_number`.
- Push:
  - Restricted silent push registration and first-run push permission prompt to
    confirmed `appUser`.
  - Kept notification-tap deferral able to use the Supabase user id before
    profile bootstrap completes, while registration still waits for `appUser`.
  - Added skip breadcrumbs when push registration/prompt is deferred until the
    profile is available.
- Backend:
  - Added typed auth/profile/account/push error classes.
  - Split missing token, invalid token, expired token, provider unavailable,
    missing profile, inactive/deleted account, push profile missing, and invalid
    push token cases into stable error codes.
  - Split expired JWTs into `auth_token_expired`.
  - Updated `/api/v1/me` missing profile behavior to return
    `profile_missing`; mobile decides role onboarding from local auth metadata.
  - Updated the whole `/api/v1/me` surface, including `PATCH /api/v1/me`, to
    use the segmented profile/account guard.
  - Updated `/api/v1/push-devices` to return `push_profile_required` when push
    registration happens before app profile sync.
  - Added `push_permission_denied` for denied native notification permission
    payloads.
  - Split `/me/sync` deleted and deactivated rows into `account_deleted` and
    `account_inactive`.
  - Preserved development `detail` compatibility while production still redacts
    debug detail.
- Tests:
  - Added/updated API tests for `auth_invalid_token`, `profile_missing`,
    `account_deleted`, `push_profile_required`, and `push_permission_denied`.

Verified:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
apps/api/.venv/bin/ruff check apps/api/app apps/api/tests
cd apps/api && .venv/bin/pytest
```

Result:

- Mobile typecheck passed.
- API ruff passed.
- API pytest passed: `174 passed, 10 skipped`.

### 2026-06-29

Implemented:

- Mobile startup:
  - Routed splash to home only when a synced `appUser` exists, not merely when
    a Supabase session exists.
  - Added safe profile-bootstrap fallback for invalid token, expired token,
    network, 5xx, and other non-403 `/me` failures.
  - Cleared route-driving auth state on profile bootstrap failure so stale
    sessions cannot enter protected tabs.
  - Signed out and disabled the registered push device when the API classifies
    the token as invalid or expired.
- Auth diagnostics:
  - Added mobile normalization for `auth_token_expired` and
    `auth_invalid_token` API errors.
  - Added `push_silent_registration_start` and
    `push_silent_registration_done` breadcrumbs around native push token
    registration.
- Tests:
  - Added dedicated API coverage for `auth_token_expired`.

Verified:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
apps/api/.venv/bin/ruff check apps/api/app apps/api/tests
cd apps/api && .venv/bin/pytest
```

Result:

- Mobile typecheck passed.
- API ruff passed.
- API pytest passed: `175 passed, 10 skipped`.

Still open:

- Re-check Sentry on the new release for classified startup breadcrumbs and the
  absence of repeated `/push-devices` 403 before profile bootstrap.

### 2026-06-29 Production API Smoke

Checked the currently deployed API at `https://hypofit-api.bukae.co.kr`.

Verified:

- `GET /health` returned `200`.
- `GET /api/v1/health` returned `200`.
- `GET /api/v1/health/ready` returned `200` with database `ok`, outbound email
  configured, APNs configured, FCM configured, and push worker enabled.

Release gap found:

- `GET /api/v1/me` without a bearer token returned `401` with
  `error.code = auth_required`, as expected.
- `GET /api/v1/me` with a malformed bearer token returned `401` with
  `error.code = auth_required` and debug message `Invalid token`.
- `POST /api/v1/push-devices` with a malformed bearer token returned the same
  old `auth_required` classification.

This indicated that the deployed API had not yet picked up the latest segmented
auth error-code implementation where malformed tokens should classify as
`auth_invalid_token` and expired tokens as `auth_token_expired`.

### 2026-06-29 API Deployment And iOS Upload

Deployed:

- Pushed backend/mobile hardening commit `985ded8ae017204c6a36a93ad3bf3dfd2131a0fe`
  to `main`.
- Deployed the FastAPI API through the GPU blue/green deploy script.
- Active API color after deployment: `green`.
- Active API SHA after deployment:
  `985ded8ae017204c6a36a93ad3bf3dfd2131a0fe`.
- Bumped the mobile marketing version to `1.0.1` in commit
  `eaa852a` because App Store Connect rejected a new upload for the already
  submitted `1.0.0` version.
- Built local iOS release IPA `1.0.1 (50)` with `HYPOFIT_XCODE_JOBS=1`.
- Submitted the local IPA to App Store Connect with `eas submit --path`.

Verified after API deployment:

- `GET /api/v1/health/ready` returned `200` with database `ok`, outbound email
  configured, APNs configured, FCM configured, and push worker enabled.
- `GET /api/v1/me` with a malformed bearer token returned `401` with
  `error.code = auth_invalid_token`.
- `POST /api/v1/push-devices` with a malformed bearer token returned `401` with
  `error.code = auth_invalid_token`.

Mobile upload result:

- Local iOS build succeeded.
- App Store Connect upload succeeded.
- Apple processing is pending and should be checked in TestFlight.

### 2026-06-29 Sentry Release Verification

Checked Sentry after opening the new TestFlight build.

Verified:

- `release:com.contentruck.hypofit@1.0.1+50` returned no events.
- `app_version:1.0.1` or `app_build:50` returned no events.
- Targeted startup/auth/push searches for `auth_invalid_token`,
  `auth_token_expired`, `push_profile_required`, and `splash_wait_timeout`
  returned no events.
- Recent project events still topped out at the older `1.0.0+46` release.

Conclusion:

- The new `1.0.1 (50)` build did not produce startup, auth, push, crash, or
  splash-timeout Sentry events during the smoke open.
- Sentry does not store breadcrumbs without an event, so this confirms absence
  of related error events rather than successful startup breadcrumb capture.
- The implementation, API deployment, iOS upload, and release-error check are
  complete.

## Completion Criteria

This plan can move to `docs/completed/` when:

- Splash can no longer wait indefinitely on `isLoading` or `isSyncing`.
- `/me` and `/push-devices` 403 errors are classified with stable codes.
- Push registration waits for `appUser`.
- Sentry shows startup phase, code, request ID, release, and build number for
  blocked startup diagnostics.
- Mobile typecheck and API tests pass.
- The fix is included in the deployed API and uploaded mobile build when code
  changes require deployment.
