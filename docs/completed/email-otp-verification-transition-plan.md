# Email OTP Verification Transition Plan

Status: completed

Last updated: 2026-06-15

## Purpose

Move Hypofit signup email verification from link/deep-link confirmation to an
in-app OTP code entry flow.

The current link flow has too many mobile failure points:

```text
email client
  -> Gmail/Apple Mail/Safari link handling
  -> Google safe redirect or in-app browser
  -> Supabase verify URL
  -> Vercel auth callback bridge
  -> hypofit:// native app callback
  -> Expo auth callback route
```

Real-device testing showed the user could reach Safari and then see:

```text
이메일 인증을 확인해 주세요
인증 링크를 확인하지 못했어요
```

For MVP signup conversion, this is too fragile. OTP keeps the verification
inside the app after email delivery and avoids relying on mobile browser/app
link handoff.

## Decision

Use Supabase Auth email OTP for signup confirmation.

Product copy should call this:

- `이메일 인증`
- `인증번호`
- `계정 인증`

Do not call this `본인인증`. NICE/PASS-style real-name identity verification is
still deferred until business registration/provider onboarding is ready.

## Target Architecture

```text
Mobile signup form
  -> Supabase Auth signUp({ email, password, options.data.name })
  -> Supabase sends custom email through Resend SMTP
  -> email template displays {{ .Token }}
  -> app shows OTP entry screen
  -> user enters 6-digit code
  -> app calls supabase.auth.verifyOtp({ email, token, type: "signup" })
  -> Supabase returns a session
  -> app routes to role selection
  -> user chooses founder/respondent/both
  -> AuthProvider syncs profile with FastAPI /api/v1/me/sync using selected role
  -> app routes to home
```

No Resend API key, Supabase service role key, SMTP credential, or backend secret
is bundled into the mobile app.

## Why OTP Is Better For This MVP

### Benefits

- Keeps the critical verification step inside the native app.
- Avoids Safari/Gmail safe-link redirects and custom-scheme callback failures.
- Easier to explain to testers: check mail, enter code.
- Easier to debug in Sentry because failures happen inside one screen action.
- Works even if the user opens the email on another device and manually copies
  the code into the app.
- Reduces dependence on `https://hypofit.vercel.app/auth/callback` availability
  for signup completion.

### Costs

- Adds one manual input step.
- Requires careful OTP input UI, paste handling, and resend cooldown.
- Requires clear handling for expired, wrong, reused, and rate-limited codes.
- Existing link callback code cannot be considered the primary signup path
  after this migration.

### Tradeoff Decision

For MVP beta, the reliability gain is more important than the extra input step.
The link bridge may remain as a fallback for old emails or future magic-link
experiments, but it should not be the default signup confirmation path.

## Supabase Configuration

### Email Confirmation

Supabase email confirmation should remain enabled:

```text
Authentication
  -> Providers
  -> Email
  -> Confirm email: enabled
```

Expected behavior:

- New users must verify email ownership before using the app.
- Existing confirmed users can keep logging in.
- Existing unconfirmed test users may need a new OTP resend or manual cleanup.

### Email Template

Use the signup confirmation email template, but display the OTP token instead of
a primary confirmation link.

The template must include:

```text
{{ .Token }}
```

The template should not use the link button as the primary action.

Recommended email structure:

```text
Hypofit 인증번호

아래 인증번호를 앱에 입력해 주세요.

123456

인증번호는 잠시 후 만료돼요.
요청하지 않은 가입이라면 이 메일은 무시해 주세요.
```

HTML template rules:

- Keep inline CSS only.
- Avoid broken CSS property names from dashboard line wrapping.
- Make the OTP visually large and copyable.
- Do not include raw custom-scheme URLs.
- If a fallback link is kept, it must be secondary and not required for signup
  success.

### Redirect URL Allowlist

OTP entry does not require the bridge for the main flow, but keep current
redirect allowlist entries temporarily for backward compatibility with old
emails and manual testing:

```text
https://hypofit.vercel.app/auth/callback
https://hypofit.vercel.app/**
hypofit://**
hypofit://auth/callback
```

After OTP is fully verified in release builds, reassess whether the web bridge
should remain active or move to reference/completed history.

## Mobile UX Flow

### Target Flow Order

The signup flow should verify email ownership before asking how the user wants
to participate in Hypofit.

```text
계정 정보 입력
  -> 인증번호 받기
  -> 이메일 인증
  -> 역할 선택
  -> 홈
```

Reason:

- Users expect to prove the account email first, then finish onboarding.
- If OTP fails, the user has not spent effort choosing a role that cannot be
  saved.
- The role selection becomes a true onboarding step after authentication, not
  a prerequisite for sending the OTP email.

### Signup Step 1: Account Information

Screen:

- Name
- Email
- Password
- Password confirmation

Validation:

- Email format required.
- Password minimum 6 characters.
- Password confirmation must match.
- Do not expose whether the email exists before submit.

Primary CTA:

```text
인증번호 받기
```

On submit:

- Call Supabase signup immediately.
- Send only profile data that is already known:
  - `name`
  - optional `bio: null`
  - optional `phone: null`
- Do not send `role` yet.
- Store the account draft locally so the role step can recover the name/email
  after OTP verification.
- Route to `/(auth)/email-confirmation`.

### Signup Step 2: Email OTP

Required elements:

- Header: `이메일 인증`
- Email display: one-line, masked only if needed for layout.
- OTP input: 6 cells or one numeric/code input styled as 6 cells.
- Primary CTA: `인증하기`
- Secondary action: `인증번호 다시 받기`
- Tertiary action: `다른 이메일 사용`

`다른 이메일 사용` should return to the account information screen, not the
login screen. Preserve the entered name and password fields, clear only the
email field and pending OTP target, and let the user request a new verification
code with the corrected email.

Recommended copy:

```text
메일로 보낸 인증번호를 입력해 주세요.
```

If the user tries to submit before 6 digits:

```text
인증번호 6자리를 입력해 주세요.
```

If verification succeeds:

```text
인증이 완료됐어요.
```

Then route to:

```text
/(auth)/sign-up-role
```

Do not route directly to home from OTP. The user still needs to choose a role.

### Signup Step 3: Role Selection

Existing role choices remain:

- `창업자로 시작`
- `인터뷰어로 시작`
- `둘 다 사용할게요`

Primary CTA:

```text
시작하기
```

On submit:

- Require an authenticated Supabase session.
- Build the final app profile sync payload:
  - `name` from signup draft or Supabase user metadata
  - selected `role`
  - `bio: null`
  - `phone: null`
- Call FastAPI `/api/v1/me/sync`.
- Store `appUser`.
- Clear signup draft and pending confirmation email.
- Route to `/(tabs)/home?welcome=1`.

Failure copy:

```text
역할을 저장하지 못했어요. 다시 시도해 주세요.
```

### Resend UX

Use cooldown to avoid rate-limit and duplicate email issues:

- Disable resend immediately after signup.
- Show `90초 후 다시 받기`.
- Enable after countdown.
- On success: `인증번호를 다시 보냈어요.`
- On rate limit: `요청이 많아요. 잠시 후 다시 시도해 주세요.`

Do not spam multiple sends when the user taps repeatedly.

### Existing Email Handling

Do not add a public "is this email registered?" check.

Recommended behavior:

- If Supabase returns a clear already-registered error:
  `이미 가입된 이메일이에요. 로그인해 주세요.`
- If Supabase hides account existence and returns a neutral response:
  show OTP screen with neutral copy:
  `가입 가능한 이메일이면 인증번호를 보냈어요. 이미 가입했다면 로그인해 주세요.`
- If user enters an OTP and verification fails:
  show a generic code/expiry error, not account-existence detail.

This avoids account enumeration while still giving the user a path back to
login.

## Mobile Implementation Plan

### Phase 1: Auth Provider Contract

Status: implemented in app code on 2026-06-15 for the new account -> OTP ->
role -> home order. Manual release checks are user-owned and not tracked in
this active implementation plan.

Update `apps/mobile/src/features/auth/AuthProvider.tsx`.

Current implemented contract includes:

```ts
verifySignupOtp(email: string, token: string): Promise<void>
```

Required revised contract:

```ts
startSignUpWithEmail(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ confirmationEmail: string }>

verifySignupOtp(email: string, token: string): Promise<void>

completeOnboardingWithRole(role: UserRole): Promise<void>
```

Implementation detail:

- `startSignUpWithEmail` calls `supabase.auth.signUp`.
- `startSignUpWithEmail` stores `signUpDraft` and `pendingConfirmationEmail`.
- `startSignUpWithEmail` must not require or send a selected role.
- `verifySignupOtp` verifies the Supabase session only.
- `verifySignupOtp` should not call FastAPI `/me/sync` yet unless a role is
  already available from a recovered previous session.
- `completeOnboardingWithRole` calls FastAPI `/me/sync` with the selected
  role, then clears draft state and allows routing to home.

Implementation:

```ts
supabase.auth.verifyOtp({
  email,
  token,
  type: "signup",
})
```

Expected success:

- Supabase returns `data.session`.
- Set the session.
- Keep `signUpDraft` and `pendingConfirmationEmail` until role selection is
  completed.
- Route to role selection.

Profile sync success:

- `/me/sync` returns an app user.
- Set `appUser`.
- Clear `signUpDraft` and `pendingConfirmationEmail`.

Expected failure:

- Normalize through `normalizeAuthError`.
- Add OTP-specific classification where needed:
  - invalid token
  - expired token
  - rate limited
  - network failure
- Capture sanitized Sentry context:
  - `phase: signup_otp_verify`
  - `code`
  - `provider_status`
  - no email/token/password values.

### Phase 2: Account Screen Starts Signup

Status: implemented in app code on 2026-06-15.

Update:

```text
apps/mobile/src/screens/auth/SignUpAccountScreen.tsx
```

Required changes:

- The primary button should say `인증번호 받기`.
- The screen should call `startSignUpWithEmail`.
- It should route to `/(auth)/email-confirmation` after successful signup.
- It should not route to `/(auth)/sign-up-role`.
- It should keep validation local and avoid account enumeration copy.

### Phase 3: Email Confirmation Screen Routing

Status: OTP UI implemented in app code on 2026-06-12; success routing changed
to role selection on 2026-06-15.

Update:

```text
apps/mobile/src/screens/auth/EmailConfirmationScreen.tsx
```

Existing required state:

- `token`
- `isVerifying`
- `isResending`
- `resendCooldownSeconds`
- `message`
- `errorMessage`
- `errorCode`

Behavior:

- Numeric keyboard where possible.
- Accept paste of the full 6-digit token.
- Strip spaces and non-code separators.
- Auto-submit only if it is stable and does not create accidental repeated
  requests; otherwise keep explicit `인증하기`.
- Keep submit button disabled until 6 characters.
- Keep the page keyboard-safe on small iPhones.

Required routing change:

- After successful OTP, route to `/(auth)/sign-up-role`.
- Do not clear the signup draft at this point.
- Do not show home yet.

### Phase 4: Role Selection Completes App Profile

Status: implemented in app code on 2026-06-15.

Update:

```text
apps/mobile/src/screens/auth/SignUpRoleScreen.tsx
```

Change the screen from "start signup" to "complete onboarding".

Required behavior:

- Require an authenticated Supabase session.
- If there is no session, route back to login or account signup with clear copy.
- On role selection submit, call `completeOnboardingWithRole`.
- Button label should be `시작하기` or `완료하기`; prefer `시작하기`.
- On success, route to `/(tabs)/home?welcome=1`.
- On failure, stay on the screen and show actionable Korean copy.

### Phase 5: Automatic Sync And Recovery Guard

Status: implemented in app code on 2026-06-15.

The current AuthProvider can automatically sync `/me` when a Supabase session
exists. That is dangerous for the new order because OTP success creates a
Supabase session before the user has selected a Hypofit role.

Required guard:

```text
Supabase session exists
+ appUser is missing
+ user_metadata.role is missing
= do not auto-sync profile
= route/hold user at role selection
```

Allowed sync paths:

- Existing users with an app profile can load `/me`.
- Existing users whose Supabase metadata already has a role can sync.
- New OTP-verified users without a role must complete role selection first.

Recovery scenarios:

- User closes the app after OTP success but before role selection:
  - On next launch, session exists and app profile is missing.
  - App routes to role selection, not home.
- User presses back from role selection:
  - Avoid returning to OTP if already verified.
  - Prefer login/account flow or keep role selection as the required next step.
- User logs out during pending role selection:
  - Clear draft and pending confirmation state.

### Phase 6: Login Handling

Status: implemented for unconfirmed email routing on 2026-06-12; recovery
handling for verified users without app profile added on 2026-06-15.

Update:

```text
apps/mobile/src/screens/auth/LoginScreen.tsx
```

If login fails with `auth_email_not_confirmed`:

- Set pending confirmation email.
- Route to OTP entry screen.
- Copy should say:
  `이메일 인증을 먼저 완료해 주세요. 인증번호를 다시 받을 수 있어요.`

If login succeeds but app profile does not exist because role selection was not
completed:

- Route to `/(auth)/sign-up-role`.
- Copy should explain:
  `마지막으로 참여 방식을 선택해 주세요.`

### Phase 7: Resend Handling

Status: implemented in app code on 2026-06-12. Supabase dashboard email
template verification is still pending.

Reuse:

```ts
supabase.auth.resend({
  type: "signup",
  email,
  options: ...
})
```

But the UI should now say `인증번호 다시 받기`, not `인증 메일 다시 받기`.

`emailRedirectTo` can be omitted for pure OTP, or left as a compatibility
fallback if Supabase requires it in the current client version. If left, it must
not be described in UI as the expected path.

### Phase 8: Callback Route Retention

Keep for now:

```text
apps/mobile/app/auth/callback.tsx
apps/web/src/pages/AuthCallbackBridgePage.tsx
```

Reason:

- Existing emails may still contain confirmation links.
- Some future auth flows may use deep links.
- Removing them during the OTP migration increases rollback risk.

But mark them as non-primary for signup verification.

## Error Mapping Plan

Update `apps/mobile/src/features/auth/authErrors.ts`.

Status: implemented in app code on 2026-06-12.

Add a phase:

```ts
"signup_otp_verify"
```

Add or reuse codes:

- `auth_validation_failed`: token is empty/too short.
- `auth_invalid_otp`: wrong or expired OTP if Supabase message can be safely
  classified.
- `auth_rate_limited`: too many resend/verify attempts.
- `auth_supabase_service_unavailable`: provider/network 5xx.
- `auth_dns_or_tls_failed`: network failure.

Recommended user messages:

```text
인증번호를 다시 확인해 주세요.
인증번호가 만료됐어요. 다시 받아 주세요.
요청이 많아요. 잠시 후 다시 시도해 주세요.
```

Never show raw Supabase messages or tokens in UI.

## Web Impact

No immediate web signup expansion is required for the mobile-first MVP.

However:

- Existing `/auth/callback` bridge can stay deployed.
- If web signup remains visible, it must either:
  - keep the link flow intentionally, or
  - get its own OTP entry UI.

Do not silently leave mobile on OTP and web on broken link flow without noting
the product/implementation difference.

## Backend Impact

FastAPI does not need to send signup OTP emails. Supabase Auth owns email
delivery for this MVP.

FastAPI remains responsible for:

- `/api/v1/me`
- profile sync after Supabase session exists
- account deletion/support/legal/store-review surfaces

No service-role auth user lookup should be added only to check whether an email
exists during signup.

## Security and Abuse Controls

- Do not expose account existence via a pre-check endpoint.
- Do not log OTP tokens.
- Do not send OTP tokens to Sentry.
- Add resend cooldown in the client.
- Rely on Supabase email OTP expiration and rate limits.
- Keep support/debug codes stable but sanitized.
- If abuse appears, add backend-side telemetry later without storing raw OTP
  values.

## Remaining Implementation Scope

Keep this document active only for code/config changes that the agent can
perform or document directly. User-operated checks are intentionally excluded.

Remaining implementation work:

1. Keep Supabase email template guidance aligned with the app's OTP screen.
2. Keep the old auth callback route as a fallback until the user explicitly
   approves removing link/deep-link signup support.
3. When approved, remove or de-scope link/deep-link signup fallback code and
   move this plan to `docs/completed/`.

## Rollback Plan

If OTP verification fails in production:

1. Keep Supabase confirmation template capable of using `{{ .ConfirmationURL }}`
   as a secondary fallback.
2. Restore link-waiting copy in the email confirmation screen.
3. Keep `/auth/callback` bridge deployed.
4. Rebuild and submit a release with link flow restored.

Do not remove callback bridge files until the user explicitly approves retiring
the old link/deep-link signup fallback.

## Open Tasks

- Keep Supabase email template guidance updated for 6-digit `{{ .Token }}` when
  the user changes Supabase dashboard copy. This is user-operated dashboard
  configuration, not repository implementation.
- [x] Change signup flow order to account -> OTP -> role -> home.
- [x] Add `startSignUpWithEmail`.
- [x] Add `verifySignupOtp` to mobile auth provider.
- [x] Change `verifySignupOtp` success to route/allow role selection before
      FastAPI profile sync.
- [x] Add `completeOnboardingWithRole`.
- [x] Add AuthProvider auto-sync guard for session-without-role.
- [x] Redesign `EmailConfirmationScreen` as OTP entry.
- [x] Update `EmailConfirmationScreen` success routing to role selection.
- [x] Update `SignUpAccountScreen` to request OTP directly.
- [x] Update `SignUpRoleScreen` to complete onboarding after OTP.
- [x] Update login/relaunch recovery for verified users without app profile.
- [x] Update signup/login copy for OTP.
- [x] Add OTP-specific normalized auth phase/error handling.
- [x] Add resend cooldown.
- [x] Run mobile typecheck.
- [x] Move `email-verification-resend-mvp-plan.md` out of active backlog and
      keep it as reference-only fallback context.
- Fully retire link/deep-link signup fallback only when the user approves
  removing the old flow. Do not track it as active implementation until that
  approval is given.

## References

- Supabase email templates:
  `https://supabase.com/docs/guides/auth/auth-email-templates`
- Supabase verify OTP:
  `https://supabase.com/docs/reference/javascript/auth-verifyotp`
- Supabase resend API:
  `https://supabase.com/docs/reference/javascript/auth-resend`
