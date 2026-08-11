# Hypofit Mobile

Expo React Native app scaffold for the future iOS and Android Hypofit app.

Current goal:

- Rebuild the approved phone-sized `apps/web` experience as native screens.
- Share API/domain contracts through `@hypofit/contracts`.
- Keep mobile UI implementation separate from web DOM/Tailwind components.
- Use NativeWind v4 and Tailwind CSS 3.x for static mobile UI styling.
- Keep dynamic runtime values in normal React Native `style` props when needed
  for safe areas, pressed opacity, gestures, animation, keyboard offsets, or map
  surfaces.

Initial commands after dependencies are installed:

```bash
pnpm --dir apps/mobile start
pnpm --dir apps/mobile ios
pnpm --dir apps/mobile android
pnpm --dir apps/mobile typecheck
pnpm --dir apps/mobile build:ios:local
pnpm --dir apps/mobile build:android:local
```

Styling files:

```text
apps/mobile/global.css
apps/mobile/tailwind.config.js
apps/mobile/metro.config.js
apps/mobile/nativewind-env.d.ts
```

Dependency policy:

- Expo SDK 53 owns the mobile native dependency set. Upgrade Expo, React,
  React Native, Expo Router, Reanimated, Gesture Handler, Safe Area Context,
  and Screens together through an explicit Expo SDK upgrade, not one package at
  a time.
- NativeWind v4 requires Tailwind CSS 3.x. Do not upgrade this app to Tailwind
  CSS 4 unless NativeWind is also intentionally migrated.
- The web app can use Tailwind CSS 4 independently because web and mobile have
  separate package scopes.
- React 19 types belong in this app; React 18 types belong in `apps/web`.

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

If `EXPO_PUBLIC_API_BASE_URL` is omitted, the scaffold defaults to
`http://127.0.0.1:8000` on iOS simulator and `http://10.0.2.2:8000` on Android
emulator in development. Real devices and EAS builds need an explicit reachable
HTTPS API URL, such as `https://hypofit-api.bukae.co.kr`.

The current native UI is being ported from the approved phone-sized web flow.
Use `pnpm --dir apps/mobile typecheck` after changing NativeWind classes or
mobile screen props.

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
- `apps/mobile/plugins/withFmtCxx17.js` patches the generated iOS Podfile so the
  `fmt` Pod compiles as C++17. This keeps Xcode 26 local archives from failing
  on `fmt` C++20 `consteval` checks without committing generated `ios/` files.
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
