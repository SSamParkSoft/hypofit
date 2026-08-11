# Mobile Auth Failure Observability Hardening Plan

Status: reference

Last updated: 2026-06-02

## Purpose

Harden the Expo iOS/Android auth flow so signup and login failures are never
collapsed into an untraceable fallback such as `회원가입을 완료하지 못했어요`.

The goal is not to make network, DNS, Supabase, or backend failures impossible.
The goal is to make every failure quickly classifiable, user-recoverable, and
observable in release builds.

## Incident Context

Observed on 2026-06-02 after TestFlight build `18` was installed on a real
iPhone 17.

Confirmed:

- Device had Hypofit `0.1.0` build `18` installed.
- Public API readiness was healthy:
  - `GET https://hypofit-api.bukae.co.kr/api/v1/health/ready -> 200 OK`
- GPU services were healthy:
  - `hypofit-api.service -> active`
  - `hypofit-api-reverse-tunnel.service -> active`
  - `hypofit-db-tunnel.service -> active`
- FastAPI logs did not show `/api/v1/me/sync` after the mobile signup failure.
- Supabase `auth.users` did not show a newly created user for the failed
  signup attempt.
- `auth.users` has no custom signup trigger, so a broken trigger is not the
  current explanation.
- Supabase Auth health responded from the GPU server.
- The local macOS environment showed intermittent DNS failures for Supabase,
  npm registry, and sometimes the API domain.

Interpretation:

```text
iPhone app
  -> Supabase Auth /auth/v1/signup
  -> FastAPI /api/v1/me/sync only if signup returns a session
```

Because FastAPI logs did not receive `/me/sync`, the current failure is
happening before the app reaches the Hypofit API. The highest-priority
hardening target is therefore the pre-auth mobile path:

```text
Expo app -> Supabase Auth
```

## Progress

### 2026-06-02

Implemented:

- Added Expo SDK 53-compatible auth diagnostics dependencies:
  - `@react-native-community/netinfo@11.4.1`
  - `expo-application@~6.1.5`
- Added normalized mobile auth failure codes and `NormalizedAuthError` handling.
- Added network/Supabase Auth preflight before signup and signin.
- Added retryable signup recovery:
  - if signup fails with a retryable auth/network failure, the app attempts one
    password signin recovery before surfacing the original failure.
- Split profile sync failure from generic signup failure with
  `auth_profile_sync_failed`.
- Added compact UI diagnostic codes on login/signup error boxes.
- Added Sentry tags for native app version and native build number.
- Expanded Sentry-safe auth telemetry fields while keeping raw emails,
  passwords, tokens, and request bodies out of diagnostics.
- Mobile typecheck passed after implementation.

Still open:

- Build and submit a new TestFlight build after this implementation.
- Verify real-device scenarios listed in the test plan below.
- Confirm Sentry receives safe `phase/code/provider_status/app_build` fields
  from the new build.
- Decide whether the optional FastAPI client diagnostics endpoint is still
  necessary after Sentry/preflight evidence is available.

## Non-Goals

- Do not move all auth to the GPU server just to hide Supabase from the client.
  Supabase Auth remains the primary user-auth provider.
- Do not expose Supabase service role keys to mobile or web clients.
- Do not log emails, passwords, access tokens, refresh tokens, or raw request
  bodies in Sentry, FastAPI, or screen diagnostics.
- Do not solve this by showing raw provider error messages directly to users.

## Target Outcome

After this work, a failed signup/login should produce all of the following:

- A user-facing Korean message that explains the next action.
- A stable internal failure code.
- A Sentry event or breadcrumb with safe fields.
- A clear answer to whether the failure happened before Supabase Auth, inside
  Supabase Auth, during profile sync, or inside FastAPI.
- A support/debug code visible enough for testers to report.

The phrase `회원가입을 완료하지 못했어요` must no longer be the only signal for a
signup failure.

## Architecture Boundary

Auth flow should be treated as four separately observable phases:

```text
network_preflight
  -> supabase_auth_signup_or_signin
  -> fastapi_profile_sync
  -> post_auth_session_bootstrap
```

Each phase needs a failure code and a recovery policy.

## Failure Code System

Introduce a mobile auth failure code union.

Suggested initial codes:

```ts
type AuthFailureCode =
  | "auth_network_unreachable"
  | "auth_dns_or_tls_failed"
  | "auth_timeout"
  | "auth_invalid_credentials"
  | "auth_email_not_confirmed"
  | "auth_user_already_exists"
  | "auth_signup_disabled"
  | "auth_weak_password"
  | "auth_rate_limited"
  | "auth_validation_failed"
  | "auth_supabase_service_unavailable"
  | "auth_supabase_unexpected"
  | "auth_profile_sync_failed"
  | "auth_session_restore_failed"
  | "auth_unknown";
```

Normalize all Supabase, fetch, API, and local validation failures into:

```ts
type NormalizedAuthError = {
  phase:
    | "network_preflight"
    | "signin"
    | "signup"
    | "signup_recovery_signin"
    | "signup_profile_sync"
    | "session_restore";
  code: AuthFailureCode;
  providerCode: string | null;
  providerStatus: number | null;
  providerName: string | null;
  userMessage: string;
  supportMessage: string;
  retryable: boolean;
};
```

UI should render `userMessage` and a short support code. Sentry should receive
only sanitized fields.

## User-Facing Copy

Use Toss-like Korean copy. Keep it short, calm, and action-oriented.

Examples:

- `auth_network_unreachable`:
  - `인터넷 연결을 확인해 주세요.`
- `auth_dns_or_tls_failed`:
  - `인증 서버에 연결하지 못했어요. 네트워크를 바꿔 다시 시도해 주세요.`
- `auth_timeout`:
  - `요청 시간이 길어지고 있어요. 잠시 후 다시 시도해 주세요.`
- `auth_invalid_credentials`:
  - `이메일 또는 비밀번호를 다시 확인해 주세요.`
- `auth_email_not_confirmed`:
  - `이메일 인증을 먼저 완료해 주세요.`
- `auth_user_already_exists`:
  - `이미 가입된 이메일이에요. 로그인해 주세요.`
- `auth_signup_disabled`:
  - `지금은 새 가입을 받을 수 없어요. 잠시 후 다시 시도해 주세요.`
- `auth_weak_password`:
  - `비밀번호는 영문과 특수문자를 포함해 8자 이상으로 입력해 주세요.`
- `auth_rate_limited`:
  - `요청이 많아요. 잠시 후 다시 시도해 주세요.`
- `auth_profile_sync_failed`:
  - `계정은 만들어졌지만 프로필 설정을 마무리하지 못했어요. 잠시 후 로그인해 주세요.`
- `auth_unknown`:
  - `일시적인 문제가 생겼어요. 잠시 후 다시 시도해 주세요.`

For tester-facing debug support, append a compact diagnostic line:

```text
진단 코드: auth_dns_or_tls_failed · build 19
```

Do not show provider raw messages like `AuthRetryableFetchError` in primary
copy.

## Preflight Strategy

Before signup or login submit:

1. Check device network state with NetInfo.
2. Check Supabase Auth reachability with a short timeout.
3. Optionally check FastAPI readiness when the next phase depends on profile
   sync.

Decision matrix:

```text
Device offline
  -> auth_network_unreachable

Device online + Supabase Auth health fails
  -> auth_dns_or_tls_failed or auth_supabase_service_unavailable

Supabase Auth health OK + FastAPI readiness fails
  -> allow Supabase auth, but expect/profile-sync guard later

Supabase Auth OK + FastAPI OK
  -> proceed normally
```

Implementation notes:

- Use a short timeout, for example 5 seconds.
- Health checks must not block indefinitely.
- Do not use service role keys.
- Supabase Auth health check can call `/auth/v1/health` with the anon `apikey`
  header.
- Record preflight results as breadcrumbs, not as verbose logs.

## Signup Recovery Strategy

Signup has an ambiguous failure mode: a timeout can occur after Supabase creates
the user but before the app receives the response.

If `signUp()` fails with a retryable network/timeout/provider-unavailable code:

```text
signUp failed
  -> classify as retryable
  -> attempt one signInWithPassword(email, password)
  -> if signIn succeeds:
       treat signup as recovered
       continue to /me/sync
     else:
       show normalized signup failure
```

Constraints:

- Only one recovery signin attempt.
- Do not loop.
- Do not run recovery for weak password, invalid email, signup disabled, or
  already-registered classification unless the code explicitly supports it.
- Do not send email/password to Sentry or diagnostics.

## FastAPI Profile Sync Strategy

When Supabase signup/signin succeeds but `/api/v1/me/sync` fails:

- Do not report this as generic signup failure.
- Use `auth_profile_sync_failed`.
- Preserve the FastAPI `ApiError.requestId` when available.
- Show copy that accurately says the account exists but profile setup did not
  finish.
- Let the user try login again.

Expected Sentry fields:

```json
{
  "phase": "signup_profile_sync",
  "code": "auth_profile_sync_failed",
  "api_code": "profile_required",
  "request_id": "mob_..."
}
```

## Sentry Contract

Create a dedicated auth diagnostics helper instead of spreading auth logging
across screens.

Suggested function:

```ts
captureAuthFailure(error: NormalizedAuthError, context?: {
  route?: string;
  appBuild?: string | null;
  appVersion?: string | null;
});
```

Allowed Sentry fields:

- `phase`
- `code`
- `provider_code`
- `provider_status`
- `provider_name`
- `retryable`
- `route`
- `app_build`
- `app_version`
- `api_request_id`

Forbidden Sentry fields:

- email
- password
- access token
- refresh token
- Supabase service role key
- raw request body
- raw response body
- full provider message if it may contain user input

Breadcrumb sequence for signup:

```text
auth_signup_start
auth_preflight_network_done
auth_preflight_supabase_done
auth_signup_request_start
auth_signup_request_success | auth_signup_request_failed
auth_signup_recovery_signin_start
auth_signup_recovery_signin_success | auth_signup_recovery_signin_failed
auth_signup_api_sync_start
auth_signup_api_sync_success | auth_signup_api_sync_failed
```

## Mobile Implementation Tasks

### Task 1. Add network preflight module

Files:

- `apps/mobile/src/shared/network/authPreflight.ts`
- `apps/mobile/package.json`

Work:

- Add NetInfo if not already installed.
- Implement network state check.
- Implement Supabase Auth health check with timeout.
- Return normalized preflight result.

Validation:

- Offline device returns `auth_network_unreachable`.
- DNS/TLS failure returns `auth_dns_or_tls_failed` or
  `auth_supabase_service_unavailable`.

### Task 2. Replace broad auth fallback with normalized auth errors

Files:

- `apps/mobile/src/features/auth/authErrors.ts`
- `apps/mobile/src/features/auth/AuthProvider.tsx`

Work:

- Add `AuthFailureCode`.
- Add `NormalizedAuthError`.
- Normalize Supabase returned errors and thrown errors.
- Normalize `AuthRetryableFetchError`.
- Normalize fetch/load failed/timeouts.
- Keep raw provider messages out of UI and Sentry.

Validation:

- Every thrown auth failure becomes a known failure code.
- `auth_unknown` remains only as a true last resort and still carries safe
  Sentry metadata.

### Task 3. Add signup recovery

Files:

- `apps/mobile/src/features/auth/AuthProvider.tsx`

Work:

- On retryable signup failure, attempt one signin recovery.
- If recovery signin succeeds, proceed to profile sync.
- If recovery signin fails, show normalized failure from the original/recovery
  path.

Validation:

- Simulated timeout after account creation can still recover into logged-in
  flow.
- Non-retryable provider errors do not trigger recovery signin.

### Task 4. Improve auth screens

Files:

- `apps/mobile/src/screens/auth/LoginScreen.tsx`
- `apps/mobile/src/screens/auth/SignUpRoleScreen.tsx`

Work:

- Render normalized user message.
- Render compact diagnostic code in the error box.
- Remove generic-only fallback behavior.

Validation:

- Testers can report a concrete code from the screen.
- Screen copy remains user-friendly and not technical.

### Task 5. Add app build/version diagnostic tags

Files:

- `apps/mobile/src/shared/diagnostics/sentry.ts`
- possibly `apps/mobile/src/shared/diagnostics/appVersion.ts`
- `apps/mobile/package.json`

Work:

- Add Expo Application package if needed.
- Set Sentry tags for app version and native build number.
- Keep `sendDefaultPii: false`.

Validation:

- Sentry event shows build `19` or later.

### Task 6. Optional FastAPI client diagnostics endpoint

Files:

- `apps/api/app/api/v1/routes/diagnostics.py`
- `apps/api/app/api/v1/router.py`
- `apps/api/app/schemas/diagnostics.py`

Work:

- Add unauthenticated, rate-limited endpoint for safe client diagnostics only if
  Sentry alone is insufficient.
- Do not store emails, passwords, tokens, or raw request bodies.

Recommendation:

- Defer this until Sentry/preflight proves insufficient.

## Supabase Dashboard Checklist

Check manually before declaring auth hardening complete:

- Email provider is enabled.
- Signup is enabled.
- Email confirmation policy is known and reflected in UI.
- Password policy matches mobile copy.
- Rate limits are understood.
- CAPTCHA/bot protection status is known.
- Auth logs show or do not show the mobile signup attempt.
- No unexpected auth hook or trigger is blocking user creation.
- Session/timebox settings are not misconfigured.

## Test Plan

Run on TestFlight or release-like build, not only Expo Go.

### Scenario 1. Fresh signup

Expected:

- Supabase Auth user created.
- FastAPI receives `/api/v1/me/sync`.
- App enters home.
- No auth failure Sentry event.

### Scenario 2. Already registered email

Expected:

- UI: `이미 가입된 이메일이에요. 로그인해 주세요.`
- Code: `auth_user_already_exists`.
- No FastAPI `/me/sync` unless signin recovery succeeds intentionally.

### Scenario 3. Weak password

Expected:

- UI: `비밀번호는 영문과 특수문자를 포함해 8자 이상으로 입력해 주세요.`
- Code: `auth_weak_password`.

### Scenario 4. Device offline

Expected:

- UI: `인터넷 연결을 확인해 주세요.`
- Code: `auth_network_unreachable`.
- No Supabase or FastAPI request.

### Scenario 5. DNS/VPN problem

Expected:

- UI: `인증 서버에 연결하지 못했어요. 네트워크를 바꿔 다시 시도해 주세요.`
- Code: `auth_dns_or_tls_failed`.
- No FastAPI `/me/sync`.

### Scenario 6. Supabase Auth service unavailable

Expected:

- UI: `인증 서버 연결이 불안정해요. 잠시 후 다시 시도해 주세요.`
- Code: `auth_supabase_service_unavailable`.

### Scenario 7. Profile sync failure

Expected:

- Supabase Auth succeeds.
- FastAPI `/me/sync` fails with a request ID.
- UI explains account exists but profile setup did not finish.
- Code: `auth_profile_sync_failed`.

### Scenario 8. Normal login

Expected:

- Supabase signin succeeds.
- App restores/syncs profile.
- No fallback message.

## Verification Commands

Before build:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

API health:

```bash
curl -sS -i https://hypofit-api.bukae.co.kr/api/v1/health/ready | head -30
```

GPU logs:

```bash
ssh bukae-gpu "journalctl --user -u hypofit-api.service --since '15 minutes ago' --no-pager"
```

Real-device app version:

```bash
xcrun devicectl device info apps --device F3E444EF-4642-5880-9B10-1C3BD2B77757
```

## Completion Criteria

This reference document records the original completion criteria:

- Signup/login failures always resolve to a stable `AuthFailureCode`.
- Unknown fallback is no longer the main user-visible outcome.
- TestFlight/release build shows diagnostic code on auth failure.
- Sentry captures safe auth failure context for release builds.
- Fresh signup, duplicate signup, weak password, offline, DNS/VPN, normal login,
  and profile sync failure scenarios are verified.
- The team can tell from logs whether a failure happened before Supabase Auth,
  inside Supabase Auth, inside FastAPI profile sync, or after session bootstrap.

## References

- Supabase Auth error codes:
  https://supabase.com/docs/guides/auth/debugging/error-codes
- Supabase AuthRetryableFetchError troubleshooting:
  https://supabase.com/docs/guides/troubleshooting/auth-error-503-authretryablefetcherror-51b88c
- Expo NetInfo:
  https://docs.expo.dev/versions/latest/sdk/netinfo
- Expo Sentry:
  https://docs.expo.dev/guides/using-sentry
