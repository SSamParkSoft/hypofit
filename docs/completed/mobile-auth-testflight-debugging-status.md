# Mobile Auth TestFlight Debugging Status

Status: completed

Last updated: 2026-06-05

Historical note: this document records the earlier TestFlight auth debugging
incident. The follow-up auth/session hardening work is summarized in
`docs/completed/mobile-auth-session-logout-scope-hardening-plan.md`, and earlier
startup work is summarized in
`docs/completed/mobile-startup-auth-error-hardening-plan.md`.

## Purpose

Track the current iOS TestFlight auth failure investigation until a fixed build
is available to testers and login/signup are verified on a real iPhone.

## Current Finding

The TestFlight auth investigation has had two confirmed mobile-side causes.
Neither pointed to FastAPI, GPU server, API domain routing, or Supabase user
data.

First, build 19 showed `auth_supabase_unexpected` for both login and signup
because the mobile auth preflight check against Supabase Auth health was too
strict:

```text
GET /auth/v1/health
```

The previous implementation sent only the Supabase `apikey` header. Supabase
Auth health returns `401` without an `Authorization: Bearer <anon key>` header.
The app interpreted that preflight `401` as `auth_supabase_unexpected`, so real
`signInWithPassword` and `signUp` never ran.

Local verification:

```text
Supabase Auth health without auth header: 401
Supabase Auth health with apikey + Authorization header: 200
```

Second, build 27 still failed with `auth_supabase_unexpected`, but Sentry showed
the failing phase was `network_preflight` and a startup event included
`auth_provider_create_supabase_client`. This pointed to missing
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` values in the local
EAS JavaScript bundle.

Build 28 proved that loading EAS production env into the build process was not
enough by itself. Sentry showed `readPublicEnv`, and code inspection confirmed
that `apps/mobile/src/shared/api/env.ts` used `process.env[name]`. Expo release
bundles inline `EXPO_PUBLIC_*` through static property access, so the dynamic
lookup still returned empty values on device.

Build 29 replaced dynamic env lookup with a static `publicEnv` map and was
submitted to App Store Connect. The remaining work is to install build 29 from
TestFlight and verify login/signup on a real iPhone.

## Completed Changes

- Added auth failure observability and normalized diagnostic codes.
- Added mobile auth preflight checks for network and provider reachability.
- Added Sentry-safe auth diagnostics and app version/build tags.
- Updated login/signup UI to expose diagnostic codes such as
  `auth_supabase_unexpected`.
- Fixed Supabase Auth health preflight to send both:
  - `apikey: <anon key>`
  - `Authorization: Bearer <anon key>`
- Added a defensive fallback so Supabase Auth health `401` no longer blocks
  real login/signup.

Implemented commits:

```text
8715f3f Harden mobile auth failure diagnostics
671a7e6 Fix Supabase auth preflight probe
```

Validation completed after the fix:

```text
apps/mobile typecheck: passed
expo-doctor: 18/18 passed
git diff --check: passed
```

## Deployment State

Build 19 was already submitted to TestFlight before the preflight fix and still
contains the false-positive auth health failure.

An EAS remote iOS production build was attempted after the fix, but the
Contentruck Expo account has exhausted its free iOS build quota for the month.
The quota resets on 2026-07-01 according to the EAS CLI message.

Remote EAS build status:

```text
Build 19: submitted to App Store Connect, contains the auth preflight bug
Build 20: upload attempted, blocked by EAS free iOS build quota
```

Local EAS iOS build was used as the workaround and is now the preferred
short-term path until EAS Cloud quota is available again:

```text
Attempt 1: failed because fastlane was not installed
Attempt 2: fastlane installed successfully, then failed because pnpm was not on PATH
Attempt 3: pnpm wrapper prepared, user interrupted before completion
Follow-up: repo script added at apps/mobile/scripts/eas-local-ios-build.sh
Follow-up: Apple WWDR G3 certificate imported into the login keychain
Follow-up: Xcode 26 `fmt` C++20 archive failure patched through
apps/mobile/plugins/withFmtCxx17.js
Build 27: local IPA generated successfully at apps/mobile/hypofit-local.ipa
Build 27: submitted to App Store Connect through EAS Submit
Build 28: local IPA generated with EAS production env inlined
Build 28: submitted to App Store Connect through EAS Submit
Build 29: static Expo public env access fix generated locally
Build 29: submitted to App Store Connect through EAS Submit
```

Local tooling changes made during debugging:

```text
fastlane installed with: gem install --user-install fastlane
temporary pnpm wrapper created at: /private/tmp/hypofit-eas-bin/pnpm
```

The temporary wrapper is local-machine setup. The repeatable script is now part
of the repository.

The `fmt` patch is intentionally kept as an Expo config plugin instead of a
committed generated Podfile change, because `apps/mobile/ios` is regenerated by
EAS prebuild.

The local build also required `apps/mobile/babel.config.js` to resolve
`babel-preset-expo` from the installed `expo` package. This keeps pnpm strict
resolution working without adding `babel-preset-expo` as a direct dependency,
which `expo-doctor` rejects for the current Expo SDK managed dependency set.

## Current Blocker

Build 29 was uploaded to App Store Connect and is now the next TestFlight smoke
target. The remaining blocker is real-device auth verification, not binary
generation or submission.

The previous build 27 failure remains the key diagnostic evidence. Sentry
confirmed the build itself was `com.contentruck.hypofit@0.1.0+27` and the
failing phase was `network_preflight`. A separate startup event also showed
`phase=auth_provider_create_supabase_client`.

This points to the local EAS build not inlining the required
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` values into the
JavaScript bundle. Supabase Auth health and direct Supabase signup succeeded
from the local machine with the same project, so the provider itself is not the
current blocker.

The local iOS build script now wraps builds with `eas env:exec production` and
fails fast if required `EXPO_PUBLIC_*` values are missing. Build 29 also removes
the dynamic `process.env[name]` read that prevented Expo from inlining the
Supabase public values into the release bundle.

If build 29 still fails auth, inspect Sentry first and confirm the failing event
release/build tags are `com.contentruck.hypofit@0.1.0+29`.

## Next Options

### Option A: Use EAS remote build

Status: paused.

Use this only when the user explicitly re-enables EAS cloud builds.

Steps:

```bash
cd apps/mobile
npx -y eas-cli build --platform ios --profile production --non-interactive --wait
npx -y eas-cli submit --platform ios --profile production --latest --non-interactive --wait
```

Expected result:

- A new build appears in App Store Connect/TestFlight.
- Testers install the new build.
- `auth_supabase_unexpected` should no longer appear from preflight.

### Option B: Build and submit local EAS IPA

Use this while remote EAS quota remains blocked or cloud builds are intentionally
paused.

Required local PATH:

```bash
cd /Users/sehyeon/hypofit
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm build:mobile:ios:local
```

Equivalent direct command:

```bash
bash apps/mobile/scripts/eas-local-ios-build.sh
```

If IPA generation succeeds, submit it through EAS Submit:

```bash
cd /Users/sehyeon/hypofit/apps/mobile
npx -y eas-cli submit --platform ios --profile production \
  --path ./hypofit-local.ipa \
  --non-interactive \
  --wait
```

Local-build-only rules:

- Do not run EAS cloud build.
- Do not use `eas submit --latest`.
- Submit only a generated local IPA with `--path`.
- The local build script now supplies `HYPOFIT_IOS_BUILD_NUMBER`, and
  `app.config.ts` writes that value to `ios.buildNumber`.
- Default build-number floor is `HYPOFIT_IOS_BUILD_NUMBER_FLOOR=36` so the next
  local archive starts above the previously observed local archive range.

### Option C: Verify the fix before TestFlight

Use Expo/local device build to confirm that auth no longer fails at preflight.
This does not replace TestFlight verification, but it proves the app code path.

Key checks:

- Console should show auth preflight start/done rather than a preflight failure.
- Supabase login/signup request should execute.
- If auth still fails, the diagnostic code should be more specific than
  `auth_supabase_unexpected`, such as password/email, network, timeout, or
  profile sync failure.

## Verification Checklist

- [x] Confirm API readiness endpoint is reachable:
  `https://hypofit-api.bukae.co.kr/api/v1/health/ready`
- [x] Confirm Supabase Auth health requires bearer auth.
- [x] Patch mobile preflight header handling.
- [x] Commit and push the fix.
- [x] Produce a new iOS binary containing `671a7e6`.
- [x] Submit the new binary to App Store Connect.
- [x] Install the new TestFlight build on iPhone.
- [x] Produce build 28 with EAS production env inlined.
- [x] Submit build 28 to App Store Connect.
- [x] Produce build 29 with static Expo public env access.
- [x] Submit build 29 to App Store Connect.
- [x] Produce build 30 after the static env fix.
- [x] Submit build 30 to App Store Connect.
- [x] Confirm the TestFlight auth flow reached the signed-in app state after
  the static env fix.
- [ ] Install the next TestFlight build after the native splash and map-search
  changes.
- [ ] Retry login on the next TestFlight build.
- [ ] Retry signup on the next TestFlight build.
- [ ] Confirm FastAPI receives post-auth profile sync calls on the next
  TestFlight smoke.
- [ ] Confirm no generic `auth_supabase_unexpected` remains for normal auth
  failures on the next TestFlight smoke.

## Notes

If the next build still fails auth, the next investigation should focus on the
new diagnostic code shown in the app and Sentry event context. Do not return to
guessing GPU server, API domain, or Supabase DB issues unless logs show the
request reached those layers.
