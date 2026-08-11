# iOS EAS Build and TestFlight Plan

Status: reference - parked until Apple App Store work is scheduled

Last updated: 2026-06-05

## Purpose

Prepare the concrete Expo EAS path for building Hypofit's iOS app and uploading
it to TestFlight/App Store Connect.

This document covers build/submission execution only. Review policy, App Privacy
labels, and screenshots are tracked separately:

- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`

## Source Basis

Official sources checked on 2026-05-31:

- Expo Submit to the Apple App Store:
  https://docs.expo.dev/submit/ios/
- Expo EAS environment variables:
  https://docs.expo.dev/eas/environment-variables/
- Expo EAS environment variable management:
  https://docs.expo.dev/eas/environment-variables/manage/
- Apple App Store Connect upload builds:
  https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds
- Apple App Store Connect API:
  https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api
- Apple TestFlight:
  https://developer.apple.com/testflight

Current official constraints to keep in mind:

- App Store Connect build uploads currently require Apple's supported Xcode/SDK
  toolchain. The broader Apple readiness plan tracks the Xcode 26 / iOS 26 SDK
  requirement.
- EAS Submit for iOS can use an App Store Connect API key through
  `ascApiKeyPath`, `ascApiKeyIssuerId`, and `ascApiKeyId`.
- EAS environment variables should be managed through EAS environments or the
  Expo dashboard. `EXPO_PUBLIC_*` values are embedded into the app bundle and
  must be safe to expose.

## Current Repo State

Mobile app:

- App path:
  - `apps/mobile`
- Expo SDK:
  - `expo ~53.0.27`
- React Native:
  - `0.79.6`
- App name:
  - `Hypofit`
- Slug:
  - `hypofit`
- Scheme:
  - `hypofit`
- Version:
  - `1.0.1`
- iOS bundle identifier:
  - `com.contentruck.hypofit`
- iPad support:
  - `supportsTablet: false`

Current `apps/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": false,
      "environment": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

Current implication:

- EAS profiles exist, but they are generic.
- No App Store Connect app id is configured.
- No App Store Connect API key metadata is configured.
- No explicit EAS `production` environment selection is configured in
  `eas.json`.
- No iOS production/TestFlight build has been verified.

## Required EAS Public Environment

Production iOS build must have these public runtime values:

```bash
EXPO_PUBLIC_API_BASE_URL=https://hypofit-api.bukae.co.kr
EXPO_PUBLIC_WEB_BASE_URL=https://hypofit.bukae.co.kr
EXPO_PUBLIC_SUPABASE_URL=https://rpmddtobulnagpdzdkbl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace_with_supabase_anon_key
EXPO_PUBLIC_SUPPORT_EMAIL=ssamso8282@gmail.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=replace_with_public_google_maps_key_if_ios_uses_google_maps
EXPO_PUBLIC_SENTRY_DSN=replace_with_public_sentry_dsn_if_sentry_is_enabled
SENTRY_ORG=replace_with_sentry_org_slug_if_sourcemaps_are_uploaded
SENTRY_PROJECT=replace_with_sentry_project_slug_if_sourcemaps_are_uploaded
SENTRY_AUTH_TOKEN=replace_with_sensitive_sentry_auth_token_if_sourcemaps_are_uploaded
SENTRY_ENABLE_UPLOAD=true_when_sentry_sourcemap_and_dsym_upload_is_ready
```

Rules:

- `EXPO_PUBLIC_SUPABASE_ANON_KEY` is browser/mobile public by design.
- Do not put Supabase service role key, database password, App Store Connect
  private key contents, or backend secrets into `EXPO_PUBLIC_*`.
- `EXPO_PUBLIC_SUPPORT_EMAIL` is confirmed for the current launch track as
  `ssamso8282@gmail.com`.
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is public and must be restricted in the
  Google Cloud console before release.
- `EXPO_PUBLIC_SENTRY_DSN` is public by design, but crash reporting must be
  reflected in App Privacy/Data safety answers if Sentry remains enabled.
- `SENTRY_AUTH_TOKEN` is a private build-time token. Never expose it through
  `EXPO_PUBLIC_*` and never commit it.
- `SENTRY_ORG` and `SENTRY_PROJECT` enable the Expo Sentry plugin for source map
  upload only when present with `SENTRY_ENABLE_UPLOAD=true`.
- Keep `SENTRY_ENABLE_UPLOAD` unset or `false` when the token/project permission
  is not verified. Runtime crash reporting still uses `EXPO_PUBLIC_SENTRY_DSN`.
- The production API base URL must be HTTPS. Do not ship a production build that
  defaults to simulator/localhost API URLs.

Recommended EAS environment setup:

```bash
cd apps/mobile

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value https://hypofit-api.bukae.co.kr

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_WEB_BASE_URL \
  --value https://hypofit.bukae.co.kr

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://rpmddtobulnagpdzdkbl.supabase.co

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value replace_with_supabase_anon_key

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_SUPPORT_EMAIL \
  --value ssamso8282@gmail.com

npx eas-cli env:create --environment production --visibility plaintext \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value replace_with_restricted_public_key
```

Do not run the commands with placeholder values. Replace them first.

## App Store Connect Setup

Required before `eas submit`:

- [ ] Apple Developer Program account is active.
- [ ] App Store Connect access is available.
- [ ] App record exists for `Hypofit`.
- [ ] Bundle ID matches:
  - `com.contentruck.hypofit`
- [ ] SKU is decided.
- [ ] Primary language is decided.
- [ ] App Store Connect app id, `ascAppId`, is recorded outside git.
- [ ] App Store Connect API key is created.
- [ ] API key id is recorded outside git.
- [ ] API issuer id is recorded outside git.
- [ ] API private key `.p8` file is stored outside git.
- [ ] App Store role/permission allows build upload and TestFlight management.

Do not commit:

- `.p8` API key file.
- Apple ID credentials.
- App-specific password.
- App Store Connect private metadata that should stay internal.

## Suggested `eas.json` Upgrade

Before first iOS TestFlight build, update `apps/mobile/eas.json` deliberately.
The exact identifiers must be filled after App Store Connect setup.

Recommended target shape:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview"
    },
    "production": {
      "autoIncrement": false,
      "environment": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "replace_with_app_store_connect_app_id",
        "ascApiKeyPath": "../../secrets/app-store-connect/AuthKey_REPLACE.p8",
        "ascApiKeyIssuerId": "replace_with_issuer_id",
        "ascApiKeyId": "replace_with_key_id"
      }
    }
  }
}
```

Notes:

- `ascApiKeyPath` must point to a local, git-ignored path.
- Do not place API key files under the repository unless the path is guaranteed
  ignored and the user explicitly chooses that workflow.
- If using Expo-managed credentials interactively, document which credentials
  EAS generated and who can rotate them.
- If using `--auto-submit`, make sure `submit.production.ios` is correct first.

## Build Commands

Preflight:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck

cd /Users/sehyeon/hypofit/apps/mobile
npx eas-cli whoami
npx eas-cli project:info
```

Preferred iOS build path while EAS cloud builds are disabled by repo policy:

```bash
cd /Users/sehyeon/hypofit
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm build:mobile:ios:local
```

This calls `apps/mobile/scripts/eas-local-ios-build.sh`, which:

- wraps the build with `eas env:exec production` unless
  `HYPOFIT_EAS_ENV_WRAPPED=1` is already set
- computes a local iOS build number from the highest existing Hypofit local
  archive and `HYPOFIT_IOS_BUILD_NUMBER_FLOOR`
- exports `HYPOFIT_IOS_BUILD_NUMBER` so `app.config.ts` writes
  `ios.buildNumber`
- fails fast if required release public env values are missing
- creates a temporary `pnpm` wrapper under `/private/tmp/hypofit-eas-bin`
- uses the repo-local Corepack cache at `/Users/sehyeon/hypofit/.corepack`
- adds the user's Ruby gem bin directory so `fastlane` is discoverable
- defaults to `HYPOFIT_XCODE_JOBS=2` and passes
  `-jobs 2 COMPILER_INDEX_STORE_ENABLE=NO` through Fastlane `gym` Xcode
  arguments to reduce local archive load on the MacBook Air
- runs `apps/mobile` typecheck before building
- writes the IPA to `apps/mobile/hypofit-local.ipa` by default

Submit the generated local IPA:

```bash
cd /Users/sehyeon/hypofit/apps/mobile
npx -y eas-cli submit --platform ios --profile production \
  --path ./hypofit-local.ipa \
  --non-interactive \
  --wait
```

Rules:

- Do not run EAS cloud build while the project is in local-build-only mode.
- Cloud builds may be used only if the user explicitly re-enables them.
- Do not use `eas submit --latest` in local-build-only mode.
- Submit only a known local IPA with `--path ./hypofit-local.ipa`.
- If `apps/mobile/hypofit-local.ipa` does not exist, fix local build/export
  first instead of falling back to cloud build.
- After upload and verification, delete the uploaded local IPA unless it is
  still needed for immediate re-upload or crash-symbol matching.
- To force a specific build number:

```bash
cd /Users/sehyeon/hypofit
HYPOFIT_IOS_BUILD_NUMBER=36 \
  COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm build:mobile:ios:local
```
- To reduce local build load further:

```bash
cd /Users/sehyeon/hypofit
HYPOFIT_XCODE_JOBS=1 \
  COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm build:mobile:ios:local
```

Current local iOS build hardening:

- `apps/mobile/plugins/withFmtCxx17.js` is registered in `app.config.ts`.
- The plugin patches the generated Podfile during Expo prebuild and forces the
  CocoaPods `fmt` target to use C++17.
- This is needed for the current Expo SDK 53 / React Native 0.79 build on
  Xcode 26, where `fmt` can otherwise fail archive with C++20 `consteval`
  compile errors.
- Keep this patch in the Expo config plugin layer. Do not commit generated
  `apps/mobile/ios` files just to carry this Podfile change.
- `apps/mobile/babel.config.js` resolves `babel-preset-expo` from the installed
  `expo` package. This is intentional for pnpm strict dependency resolution and
  avoids adding a direct preset dependency that `expo-doctor` flags.
- Build 27 proved why this wrapper matters: the local IPA reached TestFlight,
  but Sentry showed `auth_supabase_unexpected` in `network_preflight` and a
  startup `auth_provider_create_supabase_client` event, consistent with missing
  `EXPO_PUBLIC_SUPABASE_*` values in the JavaScript bundle.
- Build 28 was generated with this wrapper after EAS production env injection
  was made fail-fast. The build log confirmed the required `EXPO_PUBLIC_*`
  values were loaded before the bundle step.
- Build 29 fixed the remaining Expo env issue by replacing dynamic
  `process.env[name]` reads with static `process.env.EXPO_PUBLIC_*` property
  access before bundling.

Local build prerequisites:

```bash
gem install --user-install fastlane
```

Optional overrides:

```bash
EAS_PROFILE=production \
EAS_LOCAL_IOS_OUTPUT=/Users/sehyeon/Desktop/hypofit.ipa \
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm build:mobile:ios:local
```

Use local EAS builds for repeated TestFlight debugging. Use EAS Cloud builds for
important milestone builds when quota or billing allows, because the cloud
environment is more reproducible and easier for the team to audit.

First production-like iOS build without submit:

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile production --environment production
```

Submit latest successful build to TestFlight:

```bash
cd apps/mobile
npx eas-cli submit --platform ios --profile production
```

Build and auto-submit only after submit config is verified:

```bash
cd apps/mobile
npx eas-cli build --platform ios --profile production --environment production --auto-submit
```

Local simulator smoke remains useful but is not submission readiness:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile ios
```

## First TestFlight Runbook

1. Confirm production API health:
   - `https://hypofit-api.bukae.co.kr/health`
   - `https://hypofit-api.bukae.co.kr/api/v1/health/ready`
2. Seed reviewer/demo accounts.
3. Confirm public legal/deletion URLs return HTTP 200.
4. Confirm EAS production environment values.
5. Run `pnpm typecheck`.
6. Create iOS production build through EAS.
7. Wait for EAS build completion.
8. Submit the build to App Store Connect/TestFlight.
9. Wait for Apple processing.
10. Add internal testers first.
11. Install from TestFlight on a real iPhone.
12. Run functional smoke:
    - login
    - session restore
    - home
    - interview discovery
    - interview detail/application
    - map permission allow/deny
    - chat list/thread
    - report/block
    - support
    - account deletion request
    - legal links
13. Capture screenshots only after real-device smoke is stable.
14. Do not invite external testers until privacy, deletion, moderation, and
    review notes are consistent.

## Internal TestFlight Notes

Internal TestFlight can validate:

- install path
- splash/login startup
- production API reachability
- map key validity
- profile image permission/capture flow
- location permission copy
- push absence / no notification permission prompt
- support/report/account deletion visibility
- App Store screenshot capture candidates

Internal TestFlight cannot close by itself:

- App Review policy acceptance.
- App Privacy label accuracy.
- Public deletion verification email completion.
- Operator runbook completeness.
- External TestFlight review if external testers are used.

## Versioning Rules

Current app version:

- `1.0.1`

Version context:

- `1.0.0` is the already reviewed/released baseline.
- New App Store Connect/TestFlight uploads should use `1.0.1` or a later
  marketing version with a new iOS build number.

Rules:

- Increment iOS build number for every upload.
- `eas.json` currently has `appVersionSource: local` and
  `autoIncrement: false` for production while local-build-only mode is active.
- Use `apps/mobile/scripts/eas-local-ios-build.sh` to compute and export the
  next `HYPOFIT_IOS_BUILD_NUMBER`; do not rely on remote EAS auto-increment.
- Keep marketing version aligned with release notes.
- Do not reuse a failed build number.
- Record the submitted build number in this document or a release note before
  App Review submission.

Latest local/TestFlight upload record:

```text
2026-06-04: build 27 generated locally with EAS local build and submitted to
App Store Connect through EAS Submit.
2026-06-05: build 28 generated locally with EAS production env inlined and
submitted to App Store Connect through EAS Submit.
2026-06-05: build 29 generated locally after static Expo public env access fix
and submitted to App Store Connect through EAS Submit.
2026-06-29: version `1.0.1` build 50 generated locally and submitted to App
Store Connect through EAS Submit after `1.0.0` was no longer the correct upload
target for the next release.
```

## Release Build Verification Checklist

- [ ] `EXPO_PUBLIC_API_BASE_URL` in the build points to
      `https://hypofit-api.bukae.co.kr`.
- [ ] Supabase URL and anon key are available in the build.
- [ ] Support email is final.
- [ ] Map provider renders on iPhone.
- [ ] Location permission prompt uses the intended Korean copy.
- [ ] Camera/photo permission prompts use the intended Korean copy.
- [ ] No push permission prompt appears.
- [ ] No tracking/ATT prompt appears.
- [ ] No debug/mock labels are visible.
- [ ] Account deletion is reachable from profile.
- [ ] Report/block are reachable from chat/profile/report surfaces.
- [ ] Privacy and terms open inside the app.
- [ ] Public legal/deletion URLs work outside the app.
- [ ] App Store screenshots can be taken from seeded data.

## Current Blockers

- [ ] Apple Developer account/team details are not documented.
- [ ] App Store Connect app record is not documented.
- [ ] `ascAppId` is not known in repo docs.
- [ ] App Store Connect API key metadata is not configured.
- [x] EAS production environment values are confirmed for the local build
      wrapper path.
- [ ] `apps/mobile/eas.json` does not explicitly select the production
      environment or iOS submit config.
- [x] First iOS production EAS build has been run locally.
- [x] First TestFlight upload has been submitted to App Store Connect.
- [ ] Real iPhone TestFlight smoke has not been completed.
- [ ] Xcode/iOS SDK version used by the EAS build has not been verified against
      Apple's current upload requirement.

## Documentation Links

Keep aligned with:

- `apps/mobile/eas.json`
- `apps/mobile/app.config.ts`
- `apps/mobile/README.md`
- `docs/deployment.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/ui-final-qa-checklist.md`
- `docs/demo-seed.md`
