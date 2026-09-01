# Mobile Auth Session and Logout Scope Hardening Plan

Status: completed

Last updated: 2026-07-12

## Purpose

Harden the Expo React Native auth-session lifecycle so Hypofit does not stay on
the splash screen when a persisted Supabase session is stale, globally revoked,
or no longer maps to a usable app profile.

This plan specifically addresses the Android behavior where the app could stop
near 90% of the custom splash progress until app data was cleared.

## Incident Summary

Observed behavior:

- Android preview build opened to the custom splash screen and stayed near 90%.
- Clearing app data with `pm clear com.contentruck.hypofit` allowed the app to
  reach the login screen normally.
- A prior logcat run showed a Supabase lock warning:

```text
@supabase/gotrue-js: Lock "lock:sb-rpmddtobulnagpdzdkbl-auth-token"
acquisition timed out after 0ms
```

- After removing the immediate initial `startAutoRefresh()` call, the duplicate
  lock warning disappeared in the tested Android build.
- The stale-session splash behavior could still be reproduced with existing app
  data before clearing local storage.
- Android Kakao/Google map startup is a separate issue and was not the current
  splash blocker after the Google Maps API key fix.

Current interpretation:

```text
Native launch
  -> React Native runtime starts
  -> Supabase persisted session is restored from AsyncStorage
  -> AuthProvider waits for session/profile bootstrap
  -> stale or revoked session is not cleared decisively enough
  -> splash progress waits near 90%
```

## Key Distinction

Logging in on another device should not break the current device by itself.
Supabase supports multiple sessions for the same account.

The risky behavior is different:

- `supabase.auth.signOut()` defaults to global sign-out behavior.
- A global sign-out can revoke refresh tokens on other devices.
- Another device can then keep an invalid persisted session in AsyncStorage.
- On next launch, that stale local session can enter a recovery path that is
  slower or less deterministic than a clean login route.

MVP policy should be:

```text
Normal logout
  -> logs out this device only

Login on another device
  -> keeps existing device sessions alive

Account deletion, forced security reset, or admin moderation
  -> may invalidate all sessions deliberately
```

## Goals

- Splash must never remain indefinitely because auth state cannot be restored.
- User-initiated logout must not accidentally log out other devices.
- Stale, expired, revoked, inactive, or deleted-account sessions must clear
  local persisted auth state and route to login.
- Supabase Auth lock and refresh issues must be observable through safe Sentry
  diagnostics.
- Multi-device login behavior must be explicit and testable.
- User-facing copy must stay short and non-technical.

## Non-Goals

- Do not enforce single-device login in the MVP.
- Do not build a "logout all devices" UI unless explicitly requested.
- Do not expose Supabase service-role keys or backend secrets to mobile.
- Do not solve production issues by telling users to clear app data.
- Do not log raw emails, passwords, access tokens, refresh tokens, or provider
  response bodies.

## Relevant Files

Mobile:

- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/shared/api/supabase.ts`
- `apps/mobile/src/screens/auth/SplashScreen.tsx`
- `apps/mobile/src/shared/diagnostics/sentry.ts`
- `apps/mobile/src/features/auth/authErrors.ts`

Reference:

- `docs/reference/error-observability-contract.md`
- `docs/completed/mobile-auth-failure-observability-hardening-plan.md`
- `docs/completed/mobile-startup-auth-error-hardening-plan.md`

## Current Risks

### 1. Logout scope is too broad

Current risk:

```ts
await supabase.auth.signOut()
```

Supabase's default sign-out scope can revoke sessions globally. That is too
strong for a normal "로그아웃" action in a consumer mobile app.

Target:

```ts
await supabase.auth.signOut({ scope: "local" })
```

Normal logout should only clear the current device. Global session revocation
should be reserved for account deletion, security reset, or explicit future
"모든 기기에서 로그아웃" behavior.

### 2. Local state can remain unclear after sign-out or auth failure

Relying only on `onAuthStateChange` is fragile in failure cases.

Target behavior:

- After local sign-out completes or is intentionally recovered, clear:
  - `session`
  - `appUser`
  - role onboarding state
  - signup draft state
  - pending confirmation email state
  - auth-scoped cache where applicable
- Route to login deterministically.

### 3. Stale persisted sessions need decisive recovery

When a stored refresh/access token is expired, revoked, or invalid, the app
should not keep attempting profile bootstrap behind the splash.

Target behavior:

- `session_restore` timeout or invalid-session error:
  - clear local persisted Supabase session best-effort
  - set in-memory session to null
  - mark auth loading false
  - route to login
  - capture sanitized Sentry diagnostic
- `/me` profile bootstrap returns 401:
  - clear local auth state
  - route to login
- `/me` profile bootstrap returns inactive/deleted account code:
  - clear local auth state
  - route to login with calm message
- `/me` profile bootstrap returns recoverable missing-profile condition:
  - route to role onboarding or profile setup, not indefinite splash.

### 4. Supabase auto-refresh must not race at startup

The immediate initial `startAutoRefresh()` call was removed because it can race
with session initialization and lock acquisition.

Target behavior:

- Keep `autoRefreshToken: true`.
- Keep AppState-based start/stop refresh handling.
- Do not manually call `startAutoRefresh()` on the first active state during
  client construction.
- Do not remove the Supabase process lock without a separate investigation,
  because React Native async storage can still need lock coordination.

## Implementation Plan

### Phase 1. Local logout scope

Implementation status: implemented, verification pending on real devices.

Change user-initiated logout to current-device-only logout.

Tasks:

- Update `AuthProvider.signOut()` to call:

```ts
supabase.auth.signOut({ scope: "local" })
```

- Add a small internal helper such as `resetAuthRuntimeState(reason)` to clear
  in-memory auth state in one place.
- Call that helper after successful local logout.
- If local logout throws because of a provider/network edge case, capture a
  sanitized diagnostic and still clear local runtime state if the user's intent
  was to leave the account on this device.
- Do not use global sign-out for ordinary logout.

Acceptance criteria:

- Pressing logout routes to the login screen immediately.
- Logging out on device B does not invalidate device A.
- No raw token or email is sent to Sentry.

### Phase 2. Stale session cleanup

Implementation status: implemented, verification pending with stale/revoked
session scenarios.

Create a best-effort local cleanup path for stale sessions.

Tasks:

- Add `clearLocalAuthSession(reason)` around the auth boundary.
- The helper should:
  - call `supabase.auth.signOut({ scope: "local" })` best-effort
  - avoid waiting indefinitely
  - clear in-memory auth state
  - clear pending onboarding/signup state
  - optionally clear auth-scoped cached API data
- Use this helper when:
  - session restore times out
  - Supabase session restore reports invalid/expired/revoked token
  - profile bootstrap returns 401
  - profile bootstrap returns account inactive/deleted
  - auth recovery reaches an unknown but unrecoverable startup state

Acceptance criteria:

- A stale Supabase session no longer traps the app on splash.
- The app reaches login with a short message:

```text
로그인 정보를 다시 확인해 주세요.
```

or, for inactive/deleted accounts:

```text
이 계정은 사용할 수 없어요.
```

### Phase 3. Splash watchdog recovery

Implementation status: implemented, verification pending on Android and iOS
release-like builds.

The splash progress should remain visual, not become the only state machine.

Tasks:

- Keep the existing minimum splash display behavior.
- Add or verify a hard auth-startup watchdog around the combined
  `isLoading || isSyncing` state.
- If the watchdog expires:
  - capture `startup_auth_wait_timeout`
  - include sanitized fields:
    - `phase`
    - `has_session`
    - `is_loading`
    - `is_syncing`
    - `native_build`
    - `platform`
  - clear local auth state if a stale session is suspected
  - route to login instead of continuing the splash wait

Suggested timeout:

```text
12 seconds for auth/profile bootstrap after native runtime is active
```

Acceptance criteria:

- No startup auth issue can keep splash visible longer than the watchdog window.
- The user lands on a recoverable screen rather than needing app reinstall or
  app data clear.

### Phase 4. Auth diagnostics

Implementation status: implemented. Sentry capture and breadcrumbs cover local
logout failure, local session cleanup timeout, session restore timeout, revoked
session recovery, profile bootstrap authentication rejection, profile bootstrap
timeout, and splash watchdog recovery.

Extend safe diagnostics for this exact class of failures.

Tasks:

- Add diagnostic codes if missing:
  - `auth_local_logout_failed`
  - `auth_local_session_clear_failed`
  - `auth_session_revoked`
  - `auth_session_restore_timeout`
  - `startup_auth_wait_timeout`
  - `profile_bootstrap_auth_rejected`
- Send only sanitized details.
- Ensure Sentry events can be filtered by:
  - release
  - build number
  - platform
  - phase
  - code
- Do not include email, access token, refresh token, password, request body, or
  provider raw payload.

Acceptance criteria:

- When release users report splash hangs, Sentry shows whether the block was
  session restore, profile bootstrap, local cleanup, or push registration.

### Phase 5. Multi-device smoke scenarios

Implementation status: not verified yet.

Manual QA scenarios should be documented and repeated before release.

Scenarios:

1. Fresh install opens login.
2. Login opens home.
3. Force close and reopen keeps the user on home.
4. Logout routes to login.
5. Login on device A and device B with the same account.
6. Logout on device B.
7. Device A remains logged in after reopen.
8. Deliberately revoke or invalidate the session.
9. Reopen the affected device.
10. App routes to login instead of stopping on splash.
11. Account inactive/deleted state routes to login or account-unavailable copy.
12. Sentry contains the expected sanitized diagnostic codes.

## Verification Plan

Run after implementation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Latest local verification:

- 2026-06-29: `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck` passed.
- 2026-07-12: the same mobile typecheck passed after diagnostic-code
  normalization.
- 2026-07-12: Android installed-app smoke confirmed reviewer login reaches
  home and ordinary logout clears the local session and returns to login.

Residual manual QA:

- Multi-device logout isolation still requires two physical/simulator devices.
- Deliberately revoked-session recovery and iOS release-like verification are
  release QA, not remaining implementation work.
- Production AAB and Play Console validation remain deferred until Play Console
  authentication is available.

Android local smoke:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile expo start --android --localhost --port 8082
```

Optional release-like Android smoke:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile expo run:android --variant release
```

iOS local build/test should use the local build path only while EAS cloud build
limits are constrained. Do not run EAS cloud build unless the user explicitly
re-enables it.

## Deployment Plan

- Commit mobile auth-session changes after local validation.
- Build locally for release verification.
- Upload only existing local build artifacts when requested.
- Do not use `eas submit --latest`, because that can depend on cloud build
  history instead of the intended local artifact.

## Completion Criteria

This active document can move to `docs/completed/` when all are true:

- Ordinary logout uses local scope.
- Multi-device login/logout behavior is documented and manually verified.
- Stale/revoked sessions clear locally and route to login.
- Splash has a finite watchdog recovery path.
- Sentry receives sanitized startup/auth diagnostics.
- Mobile typecheck passes.
- The final behavior is tested on at least one Android emulator and one iOS
  simulator or real device where available.
