# Mobile Local Build Runbook

Status: reference

Last updated: 2026-06-30

## Purpose

This runbook explains how to run the Hypofit Expo mobile app locally, build
native artifacts on this Mac, and upload the iOS local build to App Store
Connect without using EAS cloud build quota.

Use this when:

- Expo/Metro needs to be started for simulator QA.
- A local iOS IPA must be built and submitted to TestFlight.
- A local Android AAB must be built for Play Console testing.
- Expo start appears stuck at `Starting project at ...`.
- The MacBook should avoid unnecessary EAS cloud builds.

## Current Mobile Build Policy

- App path: `apps/mobile`
- Expo SDK: `53`
- React Native: `0.79.6`
- Current app version: `1.0.1`
- `1.0.0` is the already reviewed/released baseline. New mobile uploads should
  use `1.0.1` or a later marketing version with a new platform build number.
- iOS bundle id: `com.contentruck.hypofit`
- Android package: `com.contentruck.hypofit`
- EAS cloud builds are disabled until the user explicitly re-enables them.
- Use local iOS/Android builds through the scripts in `apps/mobile/scripts`.
- For iOS upload, submit the explicit local IPA path. Do not use
  `eas submit --latest`.

## Recommended Node Runtime

Use the installed Homebrew Node 20 runtime for Expo development and local
build commands:

```bash
PATH=/opt/homebrew/opt/node@20/bin:$PATH node -v
```

Expected current local version:

```text
v20.19.3
```

Avoid relying on the global Homebrew `node` symlink if it points to Node 24.
Expo SDK 53 and the current React Native toolchain are more predictable on the
Node 20 LTS line.

## Start Expo Metro Locally

Run Expo from `apps/mobile`, with Node 20 first on `PATH`:

```bash
cd /Users/sehyeon/hypofit/apps/mobile

PATH=/opt/homebrew/opt/node@20/bin:$PATH \
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
EXPO_NO_TELEMETRY=1 \
corepack pnpm exec expo start --localhost --port 8082
```

Expected successful output:

```text
Starting Metro Bundler
› Metro waiting on exp://127.0.0.1:8082
› Web is waiting on http://localhost:8082
```

Then press `i` in the Expo terminal to open the iOS simulator.

## Important: Run Expo Outside the Sandbox

Expo/Metro needs access to Watchman. In a restricted sandbox, Expo can appear
to hang after this line:

```text
Starting project at /Users/sehyeon/hypofit/apps/mobile
```

The actual failure can be confirmed with:

```bash
watchman version
```

If the output contains this error, the Expo server must be started outside the
sandbox:

```text
unable to talk to your watchman ... Operation not permitted
```

In that case, rerun the Expo start command with elevated process permissions.
The issue is not a TypeScript/build failure; Metro is blocked before it opens
port `8082`.

## Check Whether Metro Is Running

Use either command:

```bash
curl -I --max-time 2 http://127.0.0.1:8082
```

```bash
lsof -nP -iTCP:8082 -sTCP:LISTEN
```

If both fail, Metro is not listening.

## Common Expo Start Warnings

### New Architecture Warning

Expo Go always enables the New Architecture in SDK 53, while this project
currently disables it for release builds:

```text
React Native's New Architecture is always enabled in Expo Go,
but it is explicitly disabled in your project's app config.
```

Meaning:

- Expo Go behavior may differ from TestFlight or local release builds.
- Treat Expo Go as fast UI smoke only.
- Use development builds, local IPA, or TestFlight for release-sensitive QA.

### expo-notifications Warning

Expo Go does not fully support the current remote notification behavior:

```text
expo-notifications functionality is not fully supported in Expo Go
```

Meaning:

- Push permission, token registration, deep-link routing from notifications,
  and production notification behavior must be checked in a development build,
  TestFlight build, or store build.
- Do not mark push QA complete from Expo Go alone.

### Watchman Recrawl Warning

Expo can print:

```text
Recrawled this watch ... MustScanSubDirs UserDropped
```

If Metro still starts, this is usually not blocking. If file updates stop being
detected or startup becomes slow, clear and re-add the watch:

```bash
watchman watch-del '/Users/sehyeon/hypofit'
watchman watch-project '/Users/sehyeon/hypofit'
```

## Local iOS Build

Use the repository script. It wraps EAS `env:exec`, injects production
environment variables, runs mobile typecheck, selects a local build number, and
builds a local IPA.

```bash
cd /Users/sehyeon/hypofit

COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
bash apps/mobile/scripts/eas-local-ios-build.sh
```

Default output:

```text
apps/mobile/hypofit-local.ipa
```

Useful overrides:

```bash
HYPOFIT_IOS_BUILD_NUMBER=46 \
EAS_LOCAL_IOS_OUTPUT=/Users/sehyeon/hypofit/apps/mobile/hypofit-build-46.ipa \
bash apps/mobile/scripts/eas-local-ios-build.sh
```

The script requires production EAS environment values, including:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`

It also expects local iOS build tooling such as Xcode and fastlane to be ready.

## Upload Local iOS IPA to App Store Connect

Submit the exact local artifact path:

```bash
cd /Users/sehyeon/hypofit/apps/mobile

npx -y eas-cli submit \
  --platform ios \
  --profile production \
  --path ./hypofit-local.ipa \
  --non-interactive
```

Do not use:

```bash
npx -y eas-cli submit --platform ios --latest
```

`--latest` can pick an EAS cloud artifact history item instead of the IPA just
built on this machine.

## Local Android Build

Use the repository script:

```bash
cd /Users/sehyeon/hypofit

COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
bash apps/mobile/scripts/eas-local-android-build.sh
```

Default output:

```text
apps/mobile/hypofit-local.aab
```

Required production values include:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_SERVICES_JSON`

`GOOGLE_SERVICES_JSON` must point to a readable local `google-services.json`
file outside git.

## Artifact Cleanup

Local build artifacts can be large. After upload and verification, remove the
uploaded local artifact instead of leaving it on disk:

```bash
rm -f /Users/sehyeon/hypofit/apps/mobile/hypofit-local.ipa
rm -f /Users/sehyeon/hypofit/apps/mobile/hypofit-local.aab
```

Keep an artifact only while it is still needed for upload, immediate re-upload,
or crash-symbol matching. Once that reason is gone, delete it during the same
deployment pass.

Do not commit:

- `.ipa`
- `.aab`
- `.xcarchive`
- `.p8`
- provisioning profiles
- Apple credentials
- Google service account credentials
- real `.env` files

## Minimal Local QA Before Upload

Before uploading a native build:

```bash
cd /Users/sehyeon/hypofit

COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
corepack pnpm --dir apps/mobile typecheck
```

Then check on simulator or device:

- App opens past native splash.
- Login works with the current review or internal QA account.
- Home, Interviews, Map, Chat, Notifications, Profile open.
- Map does not crash on marker/list interactions.
- Push permission screen appears only when expected.
- Legal, support, report, and account deletion screens are reachable.

## Troubleshooting Checklist

### Expo Start Hangs Before Metro Opens

Symptoms:

- Last log is `Starting project at ...`.
- `curl http://127.0.0.1:8082` fails.
- `lsof -iTCP:8082` shows no listener.

Check:

```bash
watchman version
```

If Watchman returns `Operation not permitted`, run Expo outside the sandbox.

### Port Already In Use

Check:

```bash
lsof -nP -iTCP:8082 -sTCP:LISTEN
```

Either stop the existing process or start Expo on another port:

```bash
corepack pnpm exec expo start --localhost --port 8083
```

### Expo Go Differs From TestFlight

Use Expo Go only for fast UI checks. For native behavior, prefer:

- iOS local IPA + TestFlight
- Android local AAB/internal testing
- development build if fast iteration on native modules is needed

Native-sensitive areas:

- Push notifications
- App startup/splash
- Native map behavior
- Camera/photo permissions
- Location permissions
- Sentry release-build crash capture

### Build Fails Because Env Is Missing

The local build scripts intentionally fail if required production env values are
missing. Re-run through EAS `env:exec`, or fix the production EAS environment
variables before building.

### MacBook Gets Too Hot During iOS Build

The iOS local build script limits Xcode jobs with:

```bash
HYPOFIT_XCODE_JOBS=2
```

To reduce load further:

```bash
HYPOFIT_XCODE_JOBS=1 bash apps/mobile/scripts/eas-local-ios-build.sh
```

This is slower but easier on a MacBook Air.

## Related Documents

- `docs/deployment.md`
- `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md`
- `docs/reference/native-store-submission-readiness-plan.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
