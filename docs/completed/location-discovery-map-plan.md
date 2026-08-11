# Location Discovery Map Plan

Status: completed

Last updated: 2026-05-25

## Purpose

The `지도` tab should become Hypofit's location-based interview discovery
surface. It must help users answer this question quickly:

```text
Can I realistically join this interview nearby, at this time, for this reward?
```

The map is not a general map product, a route planner, or a replacement for the
`인터뷰` tab. It is a discovery surface for offline-capable interviews.

## Current Goal for 2026-05-25

Today's goal is to finish the map UI and connect a real map SDK without
introducing unnecessary app-store/privacy risk.

Scope:

- Polish the current `MapPage` UI so it feels like a real mobile app map
  surface.
- Replace the mock map canvas with a real map SDK behind a clean adapter layer.
- Keep map SDK loading isolated to the map route.
- Keep GPS/current-location optional and user-initiated only.
- Continue supporting mock/fallback map rendering when SDK key or coordinates
  are missing.

Out of scope for today:

- Native iOS/Android map SDK integration.
- PostGIS/radius search.
- Background location.
- Continuous location tracking.
- In-map routing/turn-by-turn navigation.
- Payment or reward automation.

## Reference Basis

Official and professional references checked on 2026-05-25:

- Kakao Maps Web API guide:
  https://apis.map.kakao.com/web/guide/
- Kakao Maps Web API documentation:
  https://apis.map.kakao.com/web/documentation/
- NAVER Maps JavaScript API v3 client ID guide:
  https://navermaps.github.io/maps.js.en/docs/tutorial-1-Getting-Client-ID.html
- NAVER Maps JavaScript API namespace documentation:
  https://navermaps.github.io/maps.js.ncp/docs/naver.maps.html
- Apple Core Location authorization guidance:
  https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Google Play background location policy:
  https://support.google.com/googleplay/android-developer/answer/9799150
- Baymard mobile filter UI guidance:
  https://baymard.com/learn/ecommerce-filter-ui

Key takeaways:

- Kakao Maps JavaScript API requires a JavaScript key and registered JavaScript
  SDK domains.
- NAVER Maps JavaScript API requires an NCP key ID and Dynamic Map enabled in
  Naver Cloud Platform.
- Apple recommends requesting location only when the user engages a feature that
  clearly needs it, and prefers When In Use access. Hypofit treats the `지도`
  tab itself as a location feature, so map entry may start a foreground
  one-shot permission flow.
- Google Play expects minimum-scope location use and can reject background
  location without strong justification.
- Mobile filters should not crowd the primary map surface; use visible active
  chips and keep deeper filters in a sheet/drawer.

## SDK Decision

### First SDK: Kakao Maps Web API

Use Kakao Maps as the first web SDK.

Reasons:

- Hypofit is Korea-first.
- The product language and early use case are Korean users around stations,
  campuses, cafes, and neighborhoods.
- Kakao Maps is strong for Korean local context and familiar to local users.
- The current PWA can use the JavaScript SDK before a native wrapper exists.
- It only requires a browser-exposed JavaScript key and domain registration for
  first-pass map display.

NAVER Maps remains a viable fallback if Kakao pricing, quota, account setup, or
domain restrictions become inconvenient.

### Do Not Use Google Maps First

Google Maps is not the first choice for this Korea-first MVP because local
search/address expectations are likely better served by Kakao or Naver.

### Native Store Implication

The first implementation should stay web-SDK based because Hypofit is currently
a PWA. When native wrappers are introduced:

- A WebView/TWA/Capacitor shell can still render the web map.
- Native SDKs should be considered only if the store build needs deeper native
  features.
- Location permission strings and store privacy disclosures must be updated
  before requesting device location in native apps.

## Product Role

Home:

- recent and recommended interview feed
- all modes, including online
- fast first-screen discovery

Interviews:

- detailed search and filtering
- all interview posts
- founder creation and `내 인터뷰` management entry points

Map:

- location-based discovery
- offline or offline-capable posts only
- compare distance, area, reward, duration, and schedule quickly
- route into detail/application flow without becoming a separate workflow

Chat:

- coordination after application
- schedule negotiation and interview context

## Current Implementation State

Implemented on 2026-05-22:

- Posts are loaded through `useInterviewPosts({ status: "open" })`.
- Only posts with `location` and `offline` or `both` mode appear.
- Map-specific filter chips exist:
  - `전체`
  - `대면`
  - `근처`
  - `이번 주`
  - `사례비 높은 순`
- Mobile bottom panel exists.
- Desktop side list/detail panel exists.
- No browser geolocation permission is requested in the current implementation,
  but the target behavior is to request it on `지도` tab entry after clear
  context is shown.

Updated on 2026-05-25:

- `apps/web/src/pages/MapPage.tsx` now renders Kakao Maps through a route-local
  `KakaoMapCanvas`.
- `apps/web/src/shared/map/kakaoMapLoader.ts` loads the Kakao Maps JavaScript
  SDK once with `autoload=false` and the `services` library.
- The map tab no longer uses the previous static mock map background or
  Tailwind-positioned mock markers.
- Visible markers are derived from the same real API interview post list as the
  mobile bottom sheet and desktop side list.
- Marker coordinates are resolved from `post.location` through Kakao keyword
  search when the SDK is available.
- MVP known-location coordinates remain as a fallback for SDK search failures
  or unrecognized location strings.
- SDK missing/failure states render a clear error fallback instead of pretending
  a real map exists.

## Desired UX

### Mobile

Target structure:

```text
full-screen map surface
  top floating search/filter controls
  map markers
  bottom selected-card sheet above bottom navigation
```

Mobile details:

- Keep the map visually dominant.
- Keep top controls compact so they do not cover too much map.
- The top control should include:
  - title or search field
  - `내 주변` icon button
  - horizontal filter chips
- The bottom sheet should show:
  - selected interview title
  - mode and distance
  - reward
  - target description
  - location
  - duration and first schedule option
  - `상세보기`
  - `신청하기`
- The bottom sheet should not cover the bottom navigation.
- It should feel like a map app sheet, not a dashboard card.

First pass sheet behavior:

- fixed bottom panel
- no drag gesture
- selected post card
- two nearby preview rows

Later:

- collapsed / half / expanded states
- drag handle
- marker cluster list
- active filter summary

### Desktop

Target structure:

```text
left: map
right: selected post + location list
```

Desktop details:

- Keep map and list visible together.
- Right panel should be narrow enough to keep map useful.
- Selected post should be pinned above the list.
- List rows should be compact and location-first.

## UI Rules

### Map Surface

For SDK-connected map:

- Hide unnecessary default controls unless useful.
- Keep zoom controls minimal or omit them on mobile.
- Preserve legal/copyright controls required by the SDK.
- Use map center around Seoul initially.
- Fit bounds to markers when marker data is available.
- Use mock map fallback if SDK fails to load.

For fallback map:

- Use calm neutral map-like background.
- Use region labels such as `홍대입구`, `신촌`, `성수`, `강남`.
- Use road-like strokes instead of decorative gradients.

### Markers

Marker rules:

- Display compact reward: `1.5만`, `2만`, etc.
- Selected marker uses strong brand color and grows slightly.
- Unselected marker is white with brand text.
- Marker touch target should stay comfortable on mobile.
- Marker selection updates the bottom sheet/side panel.
- If several posts share a nearby location later, use cluster count markers.

Marker content:

```text
1.5만
```

Do not put full titles in markers.

### List Rows

Rows should emphasize:

- area
- distance
- mode
- reward
- duration
- first schedule option

Example:

```text
동네 운동 루틴 관리 앱 검증
홍대입구 · 1.1km · 30분
대면/화상 · 평일 20시 이후 · 15,000원
```

### Filters

Map filters:

- `전체`
- `대면`
- `근처`
- `이번 주`
- `사례비 높은 순`

Rules:

- Keep filters visible as chips.
- Do not add heavy filter panels to the map today.
- Detailed keyword/category/range search belongs in the `인터뷰` tab.

## Data Strategy

### Current Data

Current frontend type:

```text
InterviewPost.location: string | null
```

This is not enough for real map placement.

### Today's Practical Data Bridge

Until the backend schema has real coordinates:

- Maintain a frontend-only lookup table for known mock/local locations.
- Map location strings to coordinates:
  - `홍대입구역`
  - `신촌`
  - `성수역`
  - `강남역`
  - other known MVP locations
- Keep deterministic fallback coordinates when unknown.
- Clearly isolate this as temporary map view metadata, not product truth.

### Future Backend Fields

Add later:

```text
location_text: string | null
latitude: number | null
longitude: number | null
location_precision: "exact" | "nearby" | "district" | null
location_source: "manual" | "address_search" | "current_location" | null
```

Initial backend storage can use nullable numeric coordinates. Do not introduce
PostGIS until radius search and sorting become backend requirements.

## Environment Variables

Frontend env:

```text
VITE_KAKAO_MAP_APP_KEY=
```

Rules:

- This key is browser-exposed by design.
- Do not put Kakao REST API admin keys or any backend secret in the frontend.
- Document the variable in `apps/web/.env.example` if that file exists.
- Register all required JavaScript SDK domains in Kakao developers:
  - local dev domain, likely `http://localhost:5173`
  - Vercel production domain, `https://hypofit.vercel.app`
  - custom production domain if added later

If using Naver later:

```text
VITE_NAVER_MAP_NCP_KEY_ID=
```

## Architecture Plan

Create a small map abstraction instead of putting SDK loading directly into
`MapPage`.

Recommended files:

```text
apps/web/src/features/maps/
  kakaoMapLoader.ts
  locationMetadata.ts
  mapTypes.ts
  useKakaoMap.ts
```

Responsibilities:

- `kakaoMapLoader.ts`
  - load Kakao SDK script once
  - handle missing key
  - handle load failure
  - expose `window.kakao.maps`
- `locationMetadata.ts`
  - map known location strings to coordinates/area/distance
  - hold temporary mock fallback data
- `mapTypes.ts`
  - define `MapCoordinate`, `MapPostView`, SDK load state
- `useKakaoMap.ts`
  - initialize map
  - create/update markers
  - select marker
  - fit bounds
  - cleanup markers/listeners

`MapPage.tsx` should stay product-focused:

- filter posts
- select post
- render controls
- render selected card/list
- choose between real map and fallback map

## SDK Loading Plan

Kakao script URL pattern:

```text
https://dapi.kakao.com/v2/maps/sdk.js?appkey=${VITE_KAKAO_MAP_APP_KEY}&autoload=false
```

Implementation details:

- Use `autoload=false`.
- After script load, call `kakao.maps.load`.
- Only load on the map route.
- Store a module-level promise so the script is not injected multiple times.
- If key is missing, return `missing_key` and render fallback mock map.
- If script fails, return `failed` and render fallback mock map.
- Do not block the entire page if the SDK fails.

## Marker Implementation Plan

For first SDK pass:

- Use Kakao `CustomOverlay` or `Marker` with custom content.
- Prefer custom overlay for reward pill markers because current UI uses
  branded reward pills.
- On marker click:
  - update `selectedPostId`
  - pan map to marker if needed
  - keep bottom sheet in sync
- On selected post change from list:
  - update selected marker style
  - pan map to marker

Marker z-index:

- selected marker above unselected markers
- bottom sheet above map
- top controls above map

## Current Location Plan

Target behavior:

- Request current-location permission on `지도` tab entry because the map tab is
  explicitly location-based.
- Show concise context before or alongside the browser permission prompt.
- Use foreground browser geolocation only.
- Use one-shot `getCurrentPosition`, not `watchPosition`.
- Do not use background location.
- Do not persist exact respondent GPS coordinates.
- If denied, keep the map usable with default city/last map center and manual
  search.
- `내 주변` remains a refresh/recenter action after the initial permission
  decision.

## Privacy and Store Review Rules

Because the target behavior collects current location on map entry:

- Update privacy policy before production release.
- Update app-store readiness document before native wrapper release.
- Add clear in-app explanation on first map entry.
- Treat respondent current location as precise but ephemeral MVP data.
- Ensure users can use the map by manually browsing/searching if they deny
  permission.

Never:

- request location on app launch
- use background location
- block the map entirely if the user denies location
- imply continuous location tracking

Allowed request triggers:

- entering the `지도` tab
- tapping `내 주변`
- selecting `내 근처` in the `인터뷰` tab filter

## Implementation Plan

### Phase 1: UI Polish Before SDK

- [ ] Re-check mobile layout at iPhone width.
- [ ] Reduce top floating panel if it covers too much map.
- [ ] Ensure bottom panel does not collide with bottom navigation.
- [ ] Make selected card feel like a map bottom sheet:
  - small handle
  - tighter title/meta hierarchy
  - compact CTA buttons
- [ ] Ensure marker labels do not overlap top controls too badly.
- [ ] Keep empty/loading/error states centered and readable.

### Phase 2: Kakao SDK Connection

- [x] Add `VITE_KAKAO_MAP_APP_KEY` placeholder to frontend env example.
- [x] Add `kakaoMapLoader.ts`.
- [x] Add a typed global declaration for `window.kakao`.
- [x] Add MVP known coordinates.
- [x] Resolve post locations through Kakao keyword search before rendering markers.
- [x] Create a `KakaoMapCanvas` component or hook.
- [x] Render Kakao map when key and SDK load successfully.
- [x] Render SDK missing/failure fallback state.
- [x] Add custom reward markers.
- [x] Sync marker click with selected post.
- [x] Sync list click with map pan/selected marker.
- [ ] Fit map bounds around visible markers after filtering.

### Phase 3: Filter and State Integration

- [x] Recompute visible markers from active map filter.
- [x] Reset selected post when filter changes.
- [x] Keep selected post stable when possible.
- [x] Update desktop side list and mobile sheet from the same `MapPostView`.
- [x] Ensure reward sorting affects both list and marker rendering order.

### Phase 4: Manual QA

- [ ] Local desktop map renders with SDK key.
- [ ] Local mobile/simulator map renders.
- [ ] Missing SDK key fallback renders.
- [ ] Marker click updates selected card.
- [ ] List click updates selected marker/map position.
- [ ] Filters update marker/list count.
- [ ] Location permission flow appears on map entry with clear context.
- [ ] Bottom nav remains usable on iPhone simulator.

## Acceptance Criteria for Today's Work

- `지도` tab looks like a real location-discovery product screen on mobile.
- Kakao map renders when `VITE_KAKAO_MAP_APP_KEY` is configured.
- Mock/fallback map still renders when the key is missing.
- GPS permission is requested only for explicit location surfaces/actions:
  `지도`, `내 주변`, or `인터뷰` tab `내 근처`.
- Markers show reward-first information.
- Selecting markers and list rows stays synchronized.
- Filters affect both markers and list.
- The implementation is isolated enough to swap Kakao for Naver later if needed.

## Open Decisions

- Whether map-entry permission should show a custom pre-prompt sheet before the
  browser prompt or use inline context behind the browser prompt.
- Whether `신청하기` opens an inline form on the map or routes to `인터뷰`.
- Whether the create-post form should get address autocomplete before backend
  coordinate storage exists.
- Whether production should use Kakao Maps or switch to Naver Maps after account
  and quota review.
