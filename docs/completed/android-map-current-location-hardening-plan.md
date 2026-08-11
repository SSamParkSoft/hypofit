# Android Map Current Location Hardening Plan

Status: completed

Last updated: 2026-07-12

## Purpose

Fix and harden the Android `지도` tab current-location flow in the Expo React
Native app.

The map itself renders correctly. The current issue is that Android can show
`현재 위치를 가져오지 못했어요.` even when:

- Google Maps tiles and custom markers render.
- Foreground location permission is granted.
- Android system location is enabled.
- Nearby interview APIs return valid data.

This document turns the current Android map-location diagnosis into executable
implementation work.

## Current Finding

### Not A Google Maps SDK Failure

Android logcat showed normal Google Maps SDK startup:

```text
MapsInitializer: preferredRenderer: LATEST
Google Android Maps SDK: Google Play services client version: 18020000
Google Android Maps SDK: Google Play services package version: 253334035
Google Android Maps SDK: Google Play services maps renderer version(maps_core): 252725201
Using GMM server: https://clients4.google.com/glm/mmap
Using Paint server URL: https://www.google.com/maps/vt
```

No critical map-auth errors appeared:

```text
API key not found: not observed
Authorization failure: not observed
FATAL EXCEPTION / AndroidRuntime: not observed
```

The emulator screenshot confirmed:

- map tiles render
- reward markers render
- grouped marker renders
- bottom sheet renders
- nearby interview data renders

Therefore the current problem is not the Google Maps API key or native map
renderer.

### FastAPI And Kakao Place APIs Are Healthy

Public API health:

```text
GET https://hypofit-api.bukae.co.kr/api/v1/health/ready -> 200
kakao_rest_api_key: true
```

Place search:

```text
GET /api/v1/places/search?query=안산&limit=5 -> 200
```

Returned Kakao-backed results such as:

- 대부도
- 방아머리해변
- 화랑유원지
- 바다향기수목원
- 구봉도 낙조전망대

Nearby interview search:

```text
GET /api/v1/interview-posts/?status=open&lat=37.296513&lng=126.837080&radius_m=20000&sort=distance -> 200
```

Returned open posts with coordinates and `distance_meters`.

### Android Permission And System State

Confirmed on emulator:

```text
cmd location is-location-enabled -> true
appops:
  COARSE_LOCATION: foreground
  FINE_LOCATION: foreground
```

`dumpsys location` showed location providers are enabled and allowed, but the
latest fused/GPS location remained the emulator default Googleplex coordinate:

```text
fused last location=37.421998,-122.084000
gps last location=37.421998,-122.084000
```

After injecting:

```bash
adb emu geo fix 126.837080 37.296513
```

the app still displayed `현재 위치를 가져오지 못했어요.` until the app-level
current-location flow is retried or hardened.

## Root Cause Hypothesis

The current app calls only:

```ts
Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
```

inside `readCurrentLocation()`.

On Android emulators and some real devices, a one-shot current location read can
fail or hang when:

- Google Play Services location settings are still warming up.
- The fused provider has no fresh location.
- The emulator has a stale last location.
- The system location settings resolver appears and the app does not retry
  after returning.
- The device can only provide a last-known location quickly.

The current implementation catches all errors broadly and only sets:

```ts
setLocationState("unavailable")
```

That loses the provider reason and gives the user a hard failure state even
though map browsing and nearby-post search can continue.

## Goals

- Android map tile rendering must remain unchanged.
- If one-shot current location fails, fallback to last-known location before
  showing an unavailable state.
- Current location failure should be observable through safe diagnostics.
- The user should still see map data around the default or selected region.
- The `내 주변 보기` / current-location button should retry cleanly after
  location settings or emulator coordinates are changed.
- The map should avoid implying the whole map is broken when only current
  location is unavailable.

## Non-Goals

- Do not replace `react-native-maps`.
- Do not add Kakao Native Map SDK in this task.
- Do not store respondent current location on the server.
- Do not add background location.
- Do not request "always" location.
- Do not block the map tab on current location availability.
- Do not expose exact user coordinates in logs, Sentry, or screenshots unless
  explicitly sanitized or rounded for diagnostics.

## Relevant Files

Mobile:

- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/screens/map/mapSheet.ts`
- `apps/mobile/src/features/places/useDebouncedPlaceSearch.ts`
- `apps/mobile/src/shared/api/places.ts`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`

Backend/API:

- `apps/api/app/api/v1/routes/places.py`
- `apps/api/app/services/places.py`
- `apps/api/app/repositories/interview_posts.py`

Reference:

- `docs/reference/location-permission-geocoding-radius-plan.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`

## Implementation Plan

### Phase 1. Add Location Diagnostics

Implementation status: implemented, Android runtime verification pending.

Add safe diagnostics around the current-location flow.

Tasks:

- In `MapScreen.tsx`, add breadcrumbs or Sentry-safe diagnostics for:
  - `map_location_permission_check_start`
  - `map_location_permission_granted`
  - `map_location_permission_denied`
  - `map_location_current_position_start`
  - `map_location_current_position_success`
  - `map_location_current_position_failed`
  - `map_location_last_known_start`
  - `map_location_last_known_success`
  - `map_location_last_known_empty`
  - `map_location_unavailable`
- Include only safe fields:
  - `platform`
  - `permission_status`
  - `can_ask_again`
  - `accuracy`
  - `source=current|last_known`
  - rounded coordinates only if needed, for example 3 decimal places
- Do not log raw exact coordinates by default.

Acceptance criteria:

- Android failures can be classified without guessing from UI copy.
- Logs/Sentry do not contain raw PII, auth tokens, or precise user location.

### Phase 2. Add Current Location Fallback

Implementation status: implemented, Android runtime verification pending.

Create a layered location read helper inside or near `MapScreen.tsx`.

Suggested flow:

```text
getForegroundPermissionsAsync
  -> if denied and cannot ask again: denied
  -> requestForegroundPermissionsAsync when needed
  -> getCurrentPositionAsync with finite timeout
  -> if failed: getLastKnownPositionAsync
  -> if last-known exists and is not too stale: use it
  -> otherwise unavailable
```

Implementation details:

- Add a timeout wrapper around `getCurrentPositionAsync`.
- Suggested timeout: 5-7 seconds.
- Use `Location.Accuracy.Balanced` first.
- On Android, fallback to `Location.getLastKnownPositionAsync(...)`.
- If `getLastKnownPositionAsync` returns a location:
  - update `region`
  - update `queryRegion`
  - set `locationState="granted"`
  - optionally track source internally as `last_known`
- If fallback is empty:
  - keep the current/default map region
  - set `locationState="unavailable"`

Acceptance criteria:

- Map tab no longer shows current-location unavailable just because the fresh
  fused provider is slow.
- Emulator and real-device current location recovery is more reliable.

### Phase 3. Retry Behavior After Location Settings Change

Implementation status: implemented, Android runtime verification pending.

The logs showed Android may open `LocationSettingsCheckerActivity`.

Tasks:

- Ensure returning from Android location settings can trigger a retry:
  - listen to `AppState` becoming active while `locationState` is
    `requesting`, `checking`, or `unavailable`
  - run a guarded retry once, not an infinite loop
- Keep `isLocationRequestInFlightRef` to prevent duplicate requests.
- Preserve the current button retry behavior.

Acceptance criteria:

- If the user enables location and returns to Hypofit, pressing the current
  location button works.
- The app does not show stacked permission/settings prompts.

### Phase 4. Improve User Copy

Implementation status: implemented.

The current copy is too absolute:

```text
현재 위치를 가져오지 못했어요.
```

It can make users think the map itself is broken, even when the map is working.

Recommended copy:

```text
현재 위치 대신 주변 인터뷰를 보여드릴게요.
```

For permission denied:

```text
위치 권한을 켜면 내 주변 인터뷰를 볼 수 있어요.
```

For transient provider failure:

```text
현재 위치를 다시 확인하지 못했어요.
```

Acceptance criteria:

- Users understand the map still works.
- The copy remains short and Toss-like.

### Phase 5. Android QA Matrix

Run these cases after implementation:

1. Fresh install, location permission allow.
2. Fresh install, location permission deny.
3. Permission allowed but system location disabled.
4. System location enabled after returning from settings.
5. Emulator mock location injected before opening map.
6. Emulator mock location injected after opening map, then current-location
   button tapped.
7. No last-known location available.
8. Last-known location available but fresh current location fails.
9. Map search still works while location is unavailable.
10. Nearby interview list still renders from default/selected region.

Commands:

```bash
adb shell cmd location set-location-enabled true
adb emu geo fix 126.837080 37.296513
adb shell appops get com.contentruck.hypofit
adb shell dumpsys location
adb logcat -d -v time | rg "Google Maps|MapsInitializer|API key|Authorization failure|expo-location|Location|map_location|AndroidRuntime"
adb exec-out screencap -p > /private/tmp/hypofit-android-map-check.png
```

API smoke:

```bash
curl -sS -i --max-time 12 'https://hypofit-api.bukae.co.kr/api/v1/health/ready'
curl -sS -i --max-time 12 'https://hypofit-api.bukae.co.kr/api/v1/places/search?query=%EC%95%88%EC%82%B0&limit=5'
curl -sS -i --max-time 12 'https://hypofit-api.bukae.co.kr/api/v1/interview-posts/?status=open&lat=37.296513&lng=126.837080&radius_m=20000&sort=distance'
```

## Verification Already Completed

Completed on 2026-06-29:

- `adb devices` showed `emulator-5554`.
- Google Maps SDK logs showed renderer and tile server startup.
- No Google Maps API key or authorization failure appeared in filtered logcat.
- Screenshot confirmed map tiles and markers render.
- Public API health returned 200.
- Public Kakao place search returned 200.
- Public nearby interview search returned 200.
- Android location permission appops showed foreground fine/coarse access.
- Android system location was enabled.
- Mobile typecheck passed after implementation:
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`.

Remaining:

- Production AAB and Play Console validation are intentionally deferred until
  Play Console authentication is available.

Additional Android emulator QA completed on 2026-07-12:

- Installed app `1.0.1` (`versionCode=1`, target SDK 35) launched successfully.
- Reviewer account login reached the home screen.
- Map tiles rendered without API-key or authorization errors.
- Injected coordinates `37.296513, 126.837080` were reflected by the map.
- After changing the emulator location to `37.300000, 126.840000`, tapping
  `내 주변 보기` moved the map/current-location marker to the new region.
- `dumpsys location` confirmed the GPS and fused providers delivered the new
  coordinates to `com.contentruck.hypofit`.
- No `FATAL EXCEPTION`, map authorization failure, or current-location failure
  appeared in the filtered logcat output.

## Completion Criteria

Move this document to `docs/completed/` when:

- `MapScreen` uses fresh current location with last-known fallback.
- Location failures are observable through safe diagnostics.
- Android emulator current-location retry succeeds after mock coordinate
  injection or degrades gracefully with improved copy.
- Map tiles, markers, search, and nearby interviews remain unaffected.
- Mobile typecheck passes.
- At least one Android emulator QA pass is documented.
