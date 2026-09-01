# Kakao Native Map Upgrade Plan

Status: reference

Last updated: 2026-05-29

## Decision

Hypofit will not start the RN MVP with Kakao Native Map SDK.

The MVP path is:

```text
react-native-maps
  + expo-location
  + Kakao Local REST API through the Spring API
```

Kakao Native Map SDK remains a planned upgrade candidate if Korean map visual
quality becomes a real user-facing bottleneck.

## Why Not Now

Kakao Native Map SDK is product-friendly for Korea, but it moves the app into a
heavier native integration path immediately:

- Expo Go cannot be the main test path.
- iOS and Android native platform registration must be maintained separately.
- Kakao native app keys, URL schemes, Android manifest metadata, and iOS plist
  settings must be verified in development builds.
- React Native wrapper compatibility can break when Expo SDK, RN, or New
  Architecture versions move.
- MVP work would be blocked by native build/debug issues before the interview
  loop is fully proven.

## Current MVP Map Architecture

### Map Rendering

- `apps/mobile` uses `react-native-maps`.
- `expo-location` requests foreground location only.
- Background location is not used.
- Map tab can query interview posts around the current map center.

### Korean Place Quality

Kakao still owns place quality in the MVP:

- The Spring API exposes a server-side place-search proxy.
- Kakao REST API key stays backend-only.
- Founder location selection should use Kakao Local keyword results.
- The backend stores selected place name, address, latitude, longitude, source,
  and precision.

## Upgrade Trigger

Revisit Kakao Native Map SDK when at least one of these is true:

- Users complain that Apple/Google map rendering is materially worse for Korean
  local discovery.
- Kakao-specific POI density is needed directly on the rendered map, not just in
  search results.
- Store release builds and EAS/local native build workflow are already stable.
- The map tab becomes a core conversion surface rather than a supporting
  discovery surface.

## Upgrade Work Required Later

1. Pick and audit a Kakao RN wrapper or write a thin native module.
2. Confirm compatibility with current Expo SDK, RN version, and New
   Architecture status.
3. Register Kakao Android and iOS native platforms:
   - Android package: `com.contentruck.hypofit`
   - iOS bundle id: `com.contentruck.hypofit`
4. Add native app keys and URL schemes outside source control.
5. Create development builds for iOS and Android.
6. Replace only the map renderer; keep existing API contracts and stored
   coordinates.
7. Re-run App Store and Play Store privacy disclosure review.

## Non-Goals For MVP

- Background location.
- Route guidance.
- Check-in.
- Continuous tracking.
- Kakao Native SDK before core interview creation, application, chat, and
  account flows are stable.
