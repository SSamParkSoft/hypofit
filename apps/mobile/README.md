# Hypofit Mobile

Expo React Native client for Hypofit on iOS and Android. iOS `1.0.0` is the
released baseline; the current SDK 57 source is a local follow-up, not a newly
published store version.

Current goal:

- Maintain the approved native phone flows and validate SDK-upgrade regressions.
- Share API/domain contracts through `@hypofit/contracts`.
- Keep mobile UI implementation separate from web DOM/Tailwind components.
- Use NativeWind v4 and Tailwind CSS 3.x for static mobile UI styling.
- Keep dynamic runtime values in normal React Native `style` props when needed
  for safe areas, pressed opacity, gestures, animation, keyboard offsets, or map
  surfaces.

Commands after dependencies are installed:

```bash
pnpm --dir apps/mobile start
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile android
pnpm --dir apps/mobile typecheck
```

The start commands require a matching installed development app. On this Mac,
the simulator-only Metro command is:

```bash
cd apps/mobile
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--dns-result-order=ipv4first" \
  pnpm exec expo start --dev-client --localhost --port 8081 --max-workers 2
```

The IPv4 option avoids a localhost IPv6 listener / IPv4 manifest mismatch.
Use the MainVault `reference/mobile-local-build-runbook.md` for native build
commands. Do not run release builds merely to preview JavaScript/UI changes.

Styling files:

```text
apps/mobile/global.css
apps/mobile/tailwind.config.js
apps/mobile/metro.config.js
apps/mobile/nativewind-env.d.ts
```

Dependency policy:

- Expo SDK 57 owns the mobile native dependency set. Upgrade Expo, React,
  React Native, Expo Router, Reanimated, Gesture Handler, Safe Area Context,
  and Screens together through an explicit Expo SDK upgrade, not one package at
  a time.
- NativeWind v4 requires Tailwind CSS 3.x. Do not upgrade this app to Tailwind
  CSS 4 unless NativeWind is also intentionally migrated.
- Keep `react-native-css-interop` aligned with NativeWind's exact engine
  version. Babel emits app-level imports from this package, so pnpm needs it
  as a direct mobile runtime dependency.
- The web app can use Tailwind CSS 4 independently because web and mobile have
  separate package scopes.
- React 19 types belong in this app; React 18 types belong in `apps/web`.
- SDK 57 uses New Architecture, Reanimated 4.5.1 and Worklets 0.10.1.
  NativeWind 4.2.7 supports this SDK while retaining Tailwind 3.4. Do not use
  NativeWind 5 release candidates or bypass Expo dependency checks.
- Development requires a matching native development build. `start` uses
  `--dev-client`; old SDK 53/54 app binaries cannot run this dependency set.
- The floating tab background uses native Liquid Glass on supported iOS 26+
  builds, blur on older iOS, and an opaque surface on Android or when Reduce
  Transparency is enabled. Existing tabs, routes and badges are preserved.
- The old Legacy-only Glass patch is removed. Use the unmodified SDK-matched
  `expo-glass-effect` and precompiled React Native/Expo modules when available.
- iOS requires 16.4 or later. Xcode 27 builds opt into the SDK 57 scene lifecycle
  through `expo-build-properties`; preserve this for launch and linking.
- SDK/native dependency changes require rebuilding the development app.
  Once installed, JS/layout changes use Fast Refresh.
  Do not run native builds during UI iteration without user approval.

Required local environment values:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace_me
EXPO_PUBLIC_SUPPORT_EMAIL=ssamso8282@gmail.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=replace_me_for_android_or_google_ios_maps
HYPOFIT_ANDROID_VERSION_CODE=1
GOOGLE_SERVICES_JSON=/absolute/path/to/google-services.json
```

If `EXPO_PUBLIC_API_BASE_URL` is omitted, development defaults to
`http://127.0.0.1:8000` on iOS simulator and `http://10.0.2.2:8000` on Android
emulator in development. Real devices and EAS builds need an explicit reachable
HTTPS API URL, such as `https://hypofit-api.bukae.co.kr`.

Use targeted verification before declaring changes complete. During small
visual iterations, use Fast Refresh rather than rebuilding after each edit.
SDK57 local checks on September22 passed typecheck, Expo Doctor, mobile Node
fixtures, both platform JS exports and iOS Debug simulator launch. Android
native and signed Release/device QA remain separate; exact evidence and pending
checks live in MainVault `mobile-calm-emerald-native-redesign-plan.md`.

Local native release builds:

- Use `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile build:ios:local`
  for TestFlight/App Store Connect uploads while EAS cloud builds are disabled
  by repo policy.
- The script automatically wraps the build with `eas env:exec production` so
  EAS production `EXPO_PUBLIC_*` values are available to the JavaScript bundle.
  Do not bypass this wrapper for release/TestFlight builds.
- The script standardizes the local `fastlane` and `pnpm` PATH handling that EAS
  local builds need.
- If `fastlane` is missing, install it outside the repo:
  `gem install --user-install fastlane`.
- The default IPA output is `apps/mobile/hypofit-local.ipa`.
- The script still uses EAS credentials and EAS production environment values,
  so do not run it unless the Expo account and App Store Connect credentials are
  already configured.
- The historical `withFmtCxx17` plugin is no longer enabled on SDK 57.
  Do not force React Native source compilation just to reuse that workaround.
- `withAndroidExpoPackageListFix` is also disabled: SDK 57 autolinking emits
  `expo.modules.ExpoModulesPackage` directly. Keep both old plugin files only
  as historical migration context, not active build configuration.
- Google Maps keys are configured through the `react-native-maps` plugin.
  Do not restore the legacy Google Maps Pod integration.
- `apps/mobile/babel.config.js` resolves `babel-preset-expo` from the installed
  `expo` package. This is intentional for pnpm strict dependency resolution;
  do not add `babel-preset-expo` as a direct app dependency just to satisfy the
  Xcode bundle phase.
- If the script reports missing `EXPO_PUBLIC_SUPABASE_URL` or
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, stop. A TestFlight build without those values
  will start but fail auth with `auth_supabase_unexpected`.
- Production Android builds need `HYPOFIT_ANDROID_VERSION_CODE` set to the next
  positive Google Play version code.
- Android push builds need `GOOGLE_SERVICES_JSON` pointing to a local
  `google-services.json` file. Keep that file out of git. Production Android
  config fails early when this value is missing.
- Use `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile build:android:local`
  for a local Android release AAB. The helper wraps `eas build --platform
  android --profile production --local` with `eas env:exec production`, runs
  mobile typecheck first, and writes `apps/mobile/hypofit-local.aab` by
  default. It does not run an EAS cloud build.
- After an IPA/AAB is uploaded and the upload is verified, delete the local
  artifact unless it is still needed for immediate re-upload or crash-symbol
  matching.

Map/location notes:

- The MVP uses `react-native-maps` plus `expo-location`.
- Kakao Local search is called through the Spring API so the Kakao REST API key stays
  backend-only.
- Kakao Native Map SDK is deferred to
  `docs/reference/kakao-native-map-upgrade-plan.md`.
