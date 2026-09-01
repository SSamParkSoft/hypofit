# Email Verification Resend MVP Plan

Status: completed - superseded authentication history

Last updated: 2026-06-12

> Update 2026-06-12: real-device testing showed the link/deep-link confirmation
> path can fail after opening Safari from mobile email. Signup confirmation is
> now planned to move to in-app OTP entry in
> `docs/completed/email-otp-verification-transition-plan.md`. Keep this document
> as historical bridge reference only. Do not treat the checklist below as the
> current active signup verification backlog unless the link flow is explicitly
> reactivated.

## Purpose

Hypofit will use email ownership verification as the MVP account gate until a
real identity-verification provider such as NICE/PASS becomes available after
business registration.

This is intentionally not called `본인인증`. Product copy should call it
`이메일 인증` or `계정 인증`.

## Decision

Use Supabase Auth email confirmation with a custom SMTP provider backed by the
Resend free plan.

Reasoning:

- Supabase Auth already owns signup, login, session persistence, and resend
  APIs.
- Resend supports SMTP relay, so Supabase can send confirmation emails without
  adding a custom backend email service for the signup flow.
- Resend's free tier is enough for MVP tester volume if signup/test volume stays
  under the free daily sending limit. As of 2026-06-11, the public pricing page
  lists Free plan daily sending at 100 emails and custom domains at 1.
- Supabase's default SMTP server is not suitable for real tester signup because
  it is restricted to authorized team addresses, has very low rate limits, and
  is documented as non-production/best-effort.

## Architecture

```text
Mobile app
  -> Supabase Auth signUp({ emailRedirectTo })
  -> Supabase Auth email confirmation template
  -> Resend SMTP delivery
  -> user opens Supabase HTTPS confirmation link from email
  -> Supabase verifies the email
  -> Supabase redirects to https://hypofit.bukae.co.kr/auth/callback
  -> web callback bridge opens hypofit://auth/callback with the auth params
  -> Expo route /auth/callback
  -> Supabase session restoration
  -> FastAPI profile sync after session exists
```

No Resend secret should be bundled into the mobile app.

No Supabase service-role key is needed on the mobile side.

## Implemented App Behavior

- [x] Signup passes an email-confirmation redirect URL.
- [x] Release signup uses an HTTPS web callback bridge instead of sending email
      clients directly to the app custom scheme.
- [x] Web `/auth/callback` forwards Supabase callback query/hash params to the
      native `hypofit://auth/callback` route.
- [x] Signup without an immediate session routes to the email-confirmation
      waiting screen.
- [x] Login with `auth_email_not_confirmed` routes to the same waiting screen.
- [x] Email-confirmation waiting screen supports resending the signup email.
- [x] Auth callback route handles the supported Supabase callback shapes:
      `code`, `access_token`/`refresh_token`, and `token_hash`.
- [x] Callback errors are Sentry-safe and do not log raw email/password/token
      values.
- [x] Mobile typecheck passes after the app changes.

## Required Supabase Dashboard Settings

### 1. Enable Email Confirmation

Supabase Dashboard:

```text
Authentication
  -> Providers
  -> Email
  -> Confirm email: enabled
```

Expected behavior:

- New users cannot fully use the app until the confirmation link is opened.
- Existing already-confirmed test users continue to work.
- Existing unconfirmed users may need a resend or manual cleanup during testing.

### 2. Configure Custom SMTP With Resend

Supabase Dashboard:

```text
Authentication
  -> SMTP Settings / Custom SMTP
```

Values:

```text
SMTP host: Resend SMTP host from the Resend dashboard/docs
SMTP port: Resend SMTP port from the Resend dashboard/docs
SMTP user: Resend SMTP user from the Resend dashboard/docs
SMTP password: Resend API key or SMTP credential from Resend
Sender name: Hypofit
From email: verified sender address
```

Rules:

- Store the Resend credential only in Supabase/Resend settings.
- Do not commit the credential.
- Prefer a verified domain sender before external beta. If the final domain
  email is not ready, use the best available verified sender and keep public
  legal/support contact copy aligned.

### 3. Add Redirect URL Allowlist

Supabase Dashboard:

```text
Authentication
  -> URL Configuration
  -> Redirect URLs
```

Add the production HTTPS bridge and mobile callback patterns:

```text
https://hypofit.bukae.co.kr/auth/callback
https://hypofit.bukae.co.kr/**
hypofit://**
hypofit://auth/callback
```

The production email confirmation `redirectTo` should be the HTTPS bridge
(`https://hypofit.bukae.co.kr/auth/callback`). The custom app scheme remains in
the allowlist because the bridge forwards verified callback params into the
native app.

Do not put `{{ .RedirectTo }}` directly in the email template. Use
`{{ .ConfirmationURL }}` so Supabase verifies the email first and then redirects
to the configured HTTPS bridge.

During Expo local development, add the current Expo dev URL only when needed.
Do not leave stale dev redirect URLs as if they were production requirements.

## MVP Smoke Test

Run this after Supabase/Resend settings are saved:

1. Create a new test account from the release/TestFlight app.
2. Confirm that the app shows the email-confirmation waiting screen.
3. Confirm that the email arrives in a real external inbox.
4. Tap the email link on the same device.
5. Confirm that the browser briefly opens `https://hypofit.bukae.co.kr/auth/callback`.
6. Confirm that the bridge opens the Hypofit app and lands in the signed-in home
   flow.
7. Sign out.
8. Try signing in before and after confirmation with a second test account.
9. Confirm that `인증 메일 다시 받기` sends a new email.
10. Check Sentry for `auth_callback_exchange` and `auth_email_not_confirmed`
   events without raw PII or token values.

## Open Tasks

- [ ] Create or verify the Resend sender/domain.
- [ ] Configure Resend SMTP credentials in Supabase Auth.
- [ ] Enable Supabase email confirmation for the project.
- [ ] Add Supabase redirect URL allowlist entries for the native app.
- [ ] Smoke test from a real external email inbox on a real device.
- [ ] Decide whether web signup remains active and, if so, add/verify the web
      email-confirmation callback path.
- [ ] Later, replace or supplement this with NICE/PASS identity verification
      when 사업자 registration and provider onboarding are ready.

## Not In Scope Yet

- NICE/PASS real-name identity verification.
- SMS OTP.
- Paid verification provider integration.
- Backend-owned transactional email for support/deletion workflows.

Public deletion verification email is tracked separately in
`docs/completed/api-operations-readiness-plan.md`.

## References

- Supabase custom SMTP:
  `https://supabase.com/docs/guides/auth/auth-smtp`
- Supabase resend API:
  `https://supabase.com/docs/reference/javascript/auth-resend`
- Supabase native mobile deep linking:
  `https://supabase.com/docs/guides/auth/native-mobile-deep-linking`
- Resend pricing:
  `https://resend.com/pricing`
