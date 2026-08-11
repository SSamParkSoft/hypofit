# Map Place Search Autocomplete Plan

Status: completed

Last updated: 2026-06-05

## Purpose

This document defines the implementation plan for upgrading the Expo mobile
`지도` tab place-search experience from submit-only keyword search to a
production-style autocomplete flow.

The goal is not to build a generic map product. The search experience should
help respondents quickly move the map to a neighborhood, station, university,
or place, then browse interview posts in that visible area.

## Source Of Truth

- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/features/places/usePlaceSearch.ts`
- `apps/mobile/src/shared/api/places.ts`
- `apps/mobile/src/shared/ui/SearchField.tsx`
- `apps/api/app/api/v1/routes/places.py`
- `apps/api/app/services/places.py`
- `apps/api/app/schemas/places.py`
- `docs/reference/location-permission-geocoding-radius-plan.md`
- `docs/completed/map-experience-hardening-plan.md`

## External Findings

### Apple Search Field Guidance

Apple treats a search field as an input that should clearly describe what can
be searched. Search can be inline with the content when it filters or navigates
within a specific view.

Hypofit implication:

- The map search field can stay inline at the top of the map because it applies
  to the map area, not the whole app.
- Placeholder copy should name concrete searchable objects such as region,
  station, school, or place.
- Search suggestions should appear close to the field so users understand that
  selecting a suggestion moves the map.

Reference:

- https://developer.apple.com/design/human-interface-guidelines/search-fields

### Google Places Autocomplete Pattern

Google's Places Autocomplete model treats user typing as a session: multiple
prediction requests can happen while typing, then the session ends when the user
selects a place and details/address validation are requested.

Hypofit implication:

- Autocomplete should be debounced and scoped to one typing session.
- Even though Hypofit currently uses Kakao Local REST instead of Google Places,
  the UX pattern still applies:
  - type
  - see predictions
  - select a place
  - move map
  - refresh domain data
- If Hypofit later switches to Google Places, session-token accounting should
  be added then. For Kakao Local REST, there is no equivalent client session
  token requirement in the current API.

Reference:

- https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/autocomplete

### Kakao Local / Places Search Constraints

Kakao place search supports keyword search with center coordinate and radius.
For Kakao Maps Web service, the documented radius is in meters and supports up
to `20000`. The REST Local API includes keyword search, address-to-coordinate,
coordinate-to-region, and coordinate-to-address endpoints.

Hypofit implication:

- Continue proxying Kakao REST calls through FastAPI so the REST key stays
  server-side.
- Keep `lat`, `lng`, and `radius_m` in the mobile-to-API contract.
- Clamp radius to Kakao-compatible bounds.
- Prefer map-center bias for search suggestions, because users expect "안산" or
  "한양대" to be interpreted near the visible map when possible.

References:

- https://apis.map.kakao.com/web/documentation/
- https://developers.kakao.com/docs/ko/rest-api/reference

### Map App Behavior

Modern map apps usually separate two search concepts:

- place search: find a location and move the map
- area result refresh: update the service data for the visible map area

Hypofit implication:

- Do not show a prominent loading banner for every map pan/zoom.
- Keep existing markers/list visible while new area results load.
- If needed, use subtle row/sheet skeletons or quiet replacement instead of
  interrupting map browsing.

Reference:

- Apple Maps public product description notes that results update as the map
  moves: https://www.apple.com/maps/

## Current State

### Mobile

- `MapScreen` has a floating search field.
- Mobile place search now uses debounced autocomplete:
  - the user types a query
  - 2+ character queries open a suggestion dropdown
  - `useDebouncedPlaceSearch(...)` waits for a short debounce before calling
    the FastAPI Kakao proxy
  - choosing a result recenters the map
- Keyboard submit remains as a fallback. If a visible first result strongly
  matches the query, it is selected; otherwise the suggestions stay open.
- Place search is biased by `queryRegion.latitude`, `queryRegion.longitude`,
  and `queryRadiusM`.
- Interview posts are queried automatically from the visible map region with a
  region-derived radius.
- Map pan/zoom no longer shows `이 지역 인터뷰를 찾고 있어요.`
- Group marker selection opens the grouped bottom-sheet state.
- Reselecting the map tab resets selection state and returns the bottom sheet
  to `근처 인터뷰`.

### Backend

- `GET /api/v1/places/search` accepts:
  - `query`
  - `lat`
  - `lng`
  - `radius_m`
  - `limit`
- FastAPI validates coordinate pairing and bounds.
- FastAPI now trims and normalizes query whitespace before calling Kakao.
- Blank or too-short queries after trimming return `422` instead of reaching
  Kakao.
- `services/places.py` calls Kakao Local REST keyword search in a worker thread.
- Results are normalized to `PlaceSearchResult`.

## Implementation Progress

Completed on `2026-06-05`:

- [x] Added `useDebouncedPlaceSearch(...)` for 2+ character map-place
  autocomplete.
- [x] Split visible input state from debounced API query state.
- [x] Reworked the map search dropdown into one floating suggestion surface.
- [x] Added loading, empty, and error states inside the suggestion dropdown.
- [x] Kept keyboard submit as a fallback.
- [x] Place selection clears marker/list/group state and returns the bottom
  sheet to `근처 인터뷰`.
- [x] Added FastAPI query trim/blank-query guard for `/places/search`.

Still pending:

- [ ] Manual simulator QA for typing, clearing, selecting, panning, permission
  denied, and current-location retry cases.
- [ ] TestFlight/device QA after the next iOS build.

## Target UX

### Default

- The search field remains compact and floating at the top of the map.
- Placeholder:
  - `지역, 역, 학교 검색`
  - This is already close to the target copy.
- The current-location button remains inside the search field on the right.
- Mode chips remain below the search field.

### Typing

When the user types:

- If the trimmed query is shorter than 2 characters:
  - no API call
  - no error message
  - no dropdown unless recent searches are implemented later
- If the query is 2+ characters:
  - start a `300ms` debounce
  - call `GET /api/v1/places/search`
  - show a small suggestion dropdown under the chips or directly under the
    search field depending on available space

### Suggestion Dropdown

Each row should show:

- primary: place name
- secondary: road address if available, otherwise address
- optional tertiary: short category, only if it does not clutter the row

Visual rules:

- Use the same gray-white map UI tone as current map overlays.
- Do not use heavy cards for each result.
- Use row separators or subtle spacing.
- Keep row height around `52-60px`.
- The dropdown should have a maximum height so it does not cover the whole map.
- The dropdown should not push the map layout; it floats over the map.

### Selecting A Place

When the user selects a suggestion:

- set search input to the selected place name
- close suggestions
- clear selected post and selected group marker
- close marker preview
- exit list mode
- set bottom sheet to `min`
- move map center to selected place
- keep current mode filter
- keep the new map area as the basis for interview result refresh

### Keyboard Submit Fallback

Keyboard submit should remain supported.

On submit:

- if there are visible suggestions, selecting the first suggestion is allowed
  only if it clearly matches the user's query
- otherwise run the same place search once and show suggestions
- do not show a blocking modal

### Map Movement

When the user pans/zooms the map:

- debounce interview-post refresh
- keep previous markers and bottom-sheet rows while the new request is loading
- do not show `이 지역 인터뷰를 찾고 있어요.`
- if a selected marker is no longer in results, clear the selection
- if user is typing in the search field, do not unexpectedly overwrite their
  input

### Empty And Error States

For search suggestions:

- empty:
  - `검색 결과가 없어요`
  - `다른 지역명이나 역 이름으로 검색해보세요`
- API failure:
  - `지역 검색을 불러오지 못했어요`
  - `잠시 후 다시 검색해보세요`

For map results:

- keep the existing bottom-sheet empty state.
- Do not conflate "no place search result" with "no interview post in this
  area."

## Implementation Plan

### Phase 1. Split Query State

Current state has `mapSearchQuery` and `submittedMapSearchQuery`.

Replace or extend it with:

```ts
const [mapSearchQuery, setMapSearchQuery] = useState("");
const [activePlaceSearchQuery, setActivePlaceSearchQuery] = useState<string | null>(null);
const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
const [isPlaceDropdownOpen, setIsPlaceDropdownOpen] = useState(false);
```

Rules:

- `mapSearchQuery` is the visible input.
- `activePlaceSearchQuery` is the debounced API query.
- `selectedPlaceId` is only used for local UI bookkeeping and future recent
  searches; it should not block search.
- `isPlaceDropdownOpen` controls suggestion visibility.

### Phase 2. Add Debounced Autocomplete Hook

Create a mobile hook:

```text
apps/mobile/src/features/places/useDebouncedPlaceSearch.ts
```

Responsibilities:

- trim query
- require minimum length 2
- debounce by `300ms`
- pass `lat`, `lng`, `radiusM`, `limit`
- return:
  - `results`
  - `isFetching`
  - `isError`
  - `showEmpty`
  - `debouncedQuery`

Keep `usePlaceSearch` as the raw query hook.

Do not implement a new API endpoint in this phase unless the current endpoint
cannot support the UX.

### Phase 3. Refactor Map Search Overlay

Update `MapSearchOverlay` props:

- remove submit-only assumptions
- add `isDropdownOpen`
- add `onFocus`
- add `onBlur` only if needed
- add `onClear`
- use `results` from debounced search

Desired behavior:

- typing opens suggestions
- selecting a result closes suggestions
- clearing the input clears suggestions
- tapping outside the dropdown can close it if implementation remains simple

Do not add global gesture complexity unless needed.

### Phase 4. Place Result Row Design

Create a small local component in `MapScreen.tsx` first:

```ts
function PlaceSuggestionRow(...)
```

Move it to shared UI only if another screen needs the exact same component.

Row content:

- name: `text-[13px] font-black text-hypo-text`
- address: `text-[11px] font-bold text-hypo-muted`
- optional icon: `map-pin`, muted green/gray

Avoid:

- large cards
- dense category strings
- phone numbers
- reward/interview metadata in place results

### Phase 5. Select Place Flow

Update `selectMapPlace`:

- `setMapSearchQuery(place.name)`
- `setActivePlaceSearchQuery(null)`
- `setIsPlaceDropdownOpen(false)`
- `setSelectedPlaceId(place.id)`
- clear marker/list selection state
- `setSheetLevel("min")`
- move region with current zoom or slightly tightened default zoom

Keep:

- `mapModeFilter`
- user's location permission state
- current search input after selection

### Phase 6. Keyboard Submit

Update `submitMapSearch`:

- if query is shorter than 2:
  - set a light inline message only after explicit submit
- if suggestions exist:
  - select the first result only when it is an exact or strong prefix match
  - otherwise just open the dropdown
- if suggestions are loading:
  - keep dropdown open and show loading row

This avoids the frustrating behavior where submit appears to do nothing.

### Phase 7. Backend Guardrails

The current FastAPI endpoint is enough for MVP, but add these improvements when
implementation starts:

- Normalize query whitespace server-side.
- Reject blank/too-short query after trim.
- Consider adding `sort=accuracy|distance` if Kakao result quality requires it.
- Add structured error codes through the existing error handler if current
  client copy needs better distinction.
- Add tests for:
  - trimmed short query validation
  - lat-only/lng-only validation
  - radius upper bound
  - Kakao failure maps to 503

Rate limiting is desirable later, especially because autocomplete increases
request frequency. For MVP implementation, client debounce plus server timeout
is acceptable. Before broad tester rollout, add API-level rate limiting to
`/places/search` if request volume becomes noisy.

### Phase 8. QA Matrix

Test on iPhone simulator and at least one real iPhone/TestFlight build:

- Type 1 character: no API call, no error.
- Type 2 characters: suggestions appear after debounce.
- Fast typing: only latest query result is shown.
- Delete query: suggestions close.
- Select place: map recenters, sheet returns to `근처 인터뷰`, group selection
  clears.
- Pan map while suggestions are closed: no loading banner.
- Pan map while typing: input is not overwritten.
- Search failure: error copy appears only in suggestion dropdown area.
- Empty result: empty copy appears only in suggestion dropdown area.
- Location denied: search still works using visible/default map center.
- Current-location button still works after place search.
- Group marker -> map tab reselect still resets to nearby sheet.

## Non-Goals

- Do not add recent search history in the first pass.
- Do not add popular region recommendations in the first pass.
- Do not add Google Places or native Kakao Map SDK in this pass.
- Do not store respondent search locations on the server.
- Do not add analytics tracking for search terms until privacy docs are updated.

## Privacy And Store Review Notes

- Place search terms can be sensitive when combined with location. Do not log
  raw search terms to Sentry or long-term analytics without a deliberate privacy
  review.
- Current location remains one-shot, foreground-only, and transient.
- If future implementation stores recent searches, update privacy policy,
  Google Play Data safety, and Apple App Privacy labels.

## Completion Criteria

- Mobile map place search shows debounced suggestions for 2+ character queries.
- Place selection recenters the map and refreshes interview posts without a
  disruptive loading banner.
- Search dropdown, map movement, bottom sheet, marker preview, and group marker
  states do not conflict.
- `apps/mobile` typecheck passes.
- Focused API tests pass if backend validation changes are made.
- Manual simulator/device QA covers the matrix above.
