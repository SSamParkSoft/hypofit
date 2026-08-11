# Location Permission, Geocoding, and Radius Search Plan

Status: reference

Last updated: 2026-06-08

## Purpose

This file is now a close-out doc for location UX and map/search behavior.

Most of the original schema, API, and product-planning work is already
implemented. Keep this file active only while there is still concrete Expo
QA or a small amount of remaining regression coverage to close.

## Source Of Truth

- `apps/mobile/src/screens/interviews/CreateInterviewScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`
- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/features/places/useDebouncedPlaceSearch.ts`
- `apps/mobile/src/features/places/usePlaceSearch.ts`
- `apps/mobile/src/shared/api/places.ts`
- `apps/api/app/api/v1/routes/places.py`
- `apps/api/app/services/places.py`
- `apps/web/src/pages/MapPage.tsx`
- `docs/completed/mobile-api-ui-integration-completion-plan.md`

## Confirmed Current State

### Data And API

- [x] Interview posts now support stored location text, address, place name,
  precision, source, latitude/longitude, and optional `distance_meters`.
- [x] Radius filtering and `sort=distance` are implemented on
  `GET /api/v1/interview-posts`.
- [x] Mobile place search uses `GET /api/v1/places/search`, which proxies
  Kakao Local REST keyword search through FastAPI so the Kakao REST key stays
  server-side.
- [x] Public API smoke on `2026-06-05` confirmed
  `https://hypofit-api.bukae.co.kr/api/v1/places/search` returns Kakao Local
  results for the simulator test area around `37.296513, 126.837080`.
- [x] The deployed integration note already documents successful `/places/search`
  responses on `2026-05-27` for both the GPU-local API and the public API
  domain.
- [x] Public nearby-post smoke on `2026-06-05` confirmed
  `GET /api/v1/interview-posts?status=open&lat=37.296513&lng=126.837080&radius_m=3000&sort=distance`
  returns open interview posts with stored coordinates and `distance_meters`.
- [x] The current app flow does not use a separate reverse-geocoding pipeline.
  Founders select Kakao keyword-search results that already include coordinate
  and address data.

### Mobile App Behavior

- [x] Expo post creation uses `usePlaceSearch(...)` against the FastAPI places
  endpoint, stores the selected place coordinates, and lets founders choose the
  public precision level.
- [x] Expo map uses `react-native-maps` for rendering and `expo-location` for
  one-shot foreground location reads.
- [x] Expo map markers use custom reward pill markers instead of platform
  default pins. Marker visual state distinguishes selected, viewed, and
  default posts while keeping `tracksViewChanges` scoped to short visual
  refresh windows.
- [x] Entering the Expo `지도` tab triggers the native foreground permission
  prompt directly when permission is still undetermined. It no longer shows a
  separate app `Alert` before the iOS/Android system permission dialog, because
  that felt like asking for location twice.
- [x] `내 주변 보기` repeats the one-shot current-location read and recenters
  the map. If permission is not available, it updates the map state/copy instead
  of stacking another custom modal.
- [x] The Expo `인터뷰` tab requests location only when the user explicitly
  turns on a distance filter. The first request uses the native system
  permission dialog directly; denied/unavailable states are handled with inline
  copy in the filter flow.
- [x] Expo map search refreshes automatically after
  `onRegionChangeComplete` settles. The current mobile behavior is debounced
  search-on-idle around the map center, not a tap-to-confirm re-search button.
- [x] Expo map interview queries currently use the centered region plus a
  region-derived radius, clamped between `800m` and `20000m`, so zooming the
  map changes the nearby result scope.
- [x] Expo place-search suggestions on the map are biased by the current query
  region using `lat/lng/radius_m` from the visible map region.
- [x] Expo map place search now uses debounced autocomplete for 2+ character
  queries and keeps keyboard submit as a fallback.
- [x] Expo Go smoke on iOS 26.5 / iPhone 17 Pro simulator confirmed the map tab
  renders deployed nearby posts and markers against
  `https://hypofit-api.bukae.co.kr`.

### Web Fallback Behavior

- [x] Web map still uses Kakao Maps JavaScript SDK and Kakao Places JS services
  directly for map rendering and search.
- [x] Web map still requests browser geolocation on entry and keeps manual
  place search / map-browsing fallback copy when permission is denied or
  unavailable.
- [x] Web map computes search radius from the visible viewport bounds and
  auto-applies the updated center/radius after idle debounce.

## Plan Text That Is No Longer Current

- The older manual `이 지역에서 다시 검색` CTA is not the current behavior on
  either active client path.
- The older open decision about moving place search to FastAPI is already
  resolved for Expo mobile. Mobile now uses the FastAPI Kakao REST proxy.
- The architecture is currently split by platform:
  - Expo mobile: FastAPI + Kakao Local REST for place search
  - Web fallback: Kakao Maps JS + Kakao Places JS for search/rendering

## Remaining Active Work

- [ ] Expo simulator/device QA for first-entry allow, deny, retry, and
  `내 주변 보기` recenter flows on iOS and Android after the custom pre-permission
  Alert removal.
- [ ] Small-phone map QA for interaction details between autocomplete
  dropdown, current-location button, list button, marker preview, and bottom
  sheet/list surface. Basic iPhone 17 Pro render smoke passed, but the custom
  reward markers, list-mode, selected-preview transitions, and search
  suggestion flow still need manual interaction QA.
- [ ] Device-level behavior review for automatic search-on-idle. If it causes
  too much churn or accidental refresh, open a smaller follow-up instead of
  treating the current behavior as final.
- [x] Backend regression coverage added for:
  - offline post create requires coordinates
  - online post create allows null location
  - `radius_m` validation cap behavior
  - `distance_meters` response coverage

## Constraints To Keep

- Respondent current location remains foreground-only, one-shot, and transient
  client state. Exact user location is not stored as product data.
- Location behavior must stay aligned with the Google Play privacy and Data
  safety docs already active in this repo.
- Kakao Native Map SDK remains deferred. The current RN MVP map path is still
  `react-native-maps`.

## Close Criteria

Close this doc when the remaining Expo QA passes and the small API regression
gaps are either tested or moved into a backend-only follow-up.

Most of the original content here is now reference material, not active work.
After the remaining QA/test items are closed, move this file to
`docs/reference/` or replace it with a short historical note.
