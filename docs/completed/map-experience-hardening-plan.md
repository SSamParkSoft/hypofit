# Map Experience Hardening Plan

Status: completed

Last updated: 2026-06-05

## Purpose

This document tracks the next map UX hardening pass for the Expo React Native
mobile app.

The current map MVP already has location permission handling, Kakao Local REST
place search through FastAPI, nearby interview queries, a bottom sheet, a list
overlay, and custom reward markers. The remaining work is about making the map
feel like a production mobile marketplace/discovery surface instead of a basic
map with pins.

This is intentionally scoped to the mobile app first. The web fallback map can
reuse the product decisions later, but it should not drive the phone UI.

## Source Of Truth

- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/screens/map/mapTabEvents.ts`
- `apps/mobile/src/screens/map/mapSheet.ts`
- `apps/mobile/src/features/interview-posts/useInterviewPosts.ts`
- `apps/mobile/src/features/interview-posts/useInterviewPostViews.ts`
- `apps/mobile/src/features/places/useDebouncedPlaceSearch.ts`
- `apps/mobile/src/features/places/usePlaceSearch.ts`
- `apps/mobile/src/shared/api/places.ts`
- `apps/api/app/api/v1/routes/places.py`
- `apps/api/app/services/places.py`
- `docs/reference/location-permission-geocoding-radius-plan.md`
- `docs/completed/map-list-mode-overlay-plan.md`
- `docs/reference/kakao-native-map-upgrade-plan.md`

## External UX References

Use these as direction, not as UI to copy blindly.

- Apple Human Interface Guidelines, Maps:
  https://developer.apple.com/design/human-interface-guidelines/maps
  - Keep maps interactive and familiar.
  - Custom annotations should match the app's visual style.
  - iOS map details commonly appear as place cards or sheets.
- Material Design bottom sheets:
  https://m2.material.io/components/sheets-bottom/android/
  - Standard/persistent bottom sheets can complement a map while keeping map
    context visible.
  - Expanding sheets are appropriate for mobile when more detail is needed.
- Material bottom sheets legacy overview:
  https://m1.material.io/components/bottom-sheets.html
  - Persistent bottom sheets are suitable for map surfaces.
  - Mobile sheets should be full width and should not behave like unrelated
    floating cards.
- Google Maps sheet-based redesign references:
  https://9to5google.com/2025/04/24/google-maps-sheet-redesign-android/
  - Modern map apps preserve map context by using sheets instead of replacing
    the full screen with result/detail pages too early.
- Airbnb map-results pattern reference:
  https://citeables.com/article/airbnb-mobile-booking-ux
  - Map markers can carry immediate decision information, such as price.
  - List cards and map markers should highlight each other.
- Map UI Patterns, cluster marker:
  https://mapuipatterns.com/cluster-marker/
  - Cluster markers reduce visual clutter and communicate grouped results.
- Mapbox clustering reference:
  https://docs.mapbox.com/android/ja/legacy/maps/guides/clustering/
  - Data clustering is a standard way to group dense map points.
- React Native Maps custom marker performance context:
  https://stackoverflow.com/questions/78603658/react-native-maps-what-is-the-tracksviewchanges-prop-in-the-marker-component-e
  - Custom marker views should not continuously track view changes unless
    their visual content is actively changing.

## Current State

### What Works

- [x] Mobile uses `react-native-maps` for map rendering.
- [x] Mobile uses `expo-location` for one-shot foreground current location.
- [x] Mobile place search goes through FastAPI `GET /api/v1/places/search`,
  which proxies Kakao Local REST keyword search server-side.
- [x] Nearby interview posts come from
  `GET /api/v1/interview-posts?lat=...&lng=...&radius_m=...&sort=distance`.
- [x] The public API route was checked on `2026-06-05` around
  `37.296513, 126.837080`.
- [x] The map has custom reward pill markers instead of platform default pins.
- [x] The map has selected preview card, bottom sheet, and list overlay modes.
- [x] Reselecting the `지도` tab now clears selected post/group/list/search
  dropdown state and returns the bottom sheet to the normal nearby state.
- [x] Map place search now uses debounced autocomplete and keeps keyboard
  submit as a fallback path.
- [x] Viewed interview posts can be visually softened through the read-state
  hook.
- [x] Kakao Native Map SDK is intentionally deferred for MVP. The current path
  is `react-native-maps + FastAPI Kakao Local REST`.

### Current Weak Points

- [x] Multiple interview posts at the same coordinate overlap into one visible
  marker.
  - Code-level fix: exact-coordinate group markers were implemented on
    `2026-06-05`.
- Nearby points that are very close to each other can still be visually
  indistinguishable at common zoom levels. This is deferred until the user
  reports a concrete marker-density issue from device testing.
- Marker selection and list-row selection are connected functionally. Additional
  visual strengthening is deferred until a concrete issue is reported.
- [x] The map query radius is fixed at `3000m`, so the result set does not fully
  match the user's visible viewport or zoom intent.
  - Code-level fix: map queries now compute an approximate radius from the
    current query region, clamped between `800m` and `20000m`.
- [x] The selected preview card, bottom sheet, list overlay, grouped marker,
  and map-tab reselect paths now clear competing states consistently.
- Custom reward markers may need implementation refinement for size, hit area,
  truncation, and overlap if the user reports concrete issues.

## Product Principles

### 1. Map First, Not Dashboard First

The map tab should behave like a location-based discovery surface.

The first screen should answer:

- What interviews are around this area?
- Which ones are worth my time?
- What happens if I tap this marker?

The map should not become a static decorative background behind a generic list.

### 2. Marker Shows Decision Information

Markers should show the smallest useful decision cue. For Hypofit, that cue is
usually reward amount.

Use marker text like:

- `1.2만`
- `1.8만`
- `3만`
- `7만+`
- `+3` for grouped posts

Do not put long post titles inside markers.

### 3. Lists And Markers Must Stay Linked

When a marker is selected:

- The marker becomes visually selected.
- The related list row should be easy to find.
- The preview card or sheet should show the same post.

When a list row is selected:

- The map should center or nudge toward the selected marker.
- The marker should become selected.
- The preview card should show the selected post.

### 4. Group Dense Points Before They Become Confusing

If two or more posts share the same coordinate, they should not render as
independent markers on top of each other.

For MVP, exact-coordinate grouping is enough. Do not introduce a heavy
clustering dependency until the app has enough posts to justify it.

### 5. Keep The Map Responsive

Custom marker views are expensive on mobile maps. Keep marker component trees
small, memoized, and static where possible.

Use `tracksViewChanges` only during short visual refresh windows after marker
state changes. Do not keep it permanently enabled.

### 6. Respect Location Privacy

Current location remains:

- foreground-only
- one-shot
- transient client state
- not stored as user profile or product data

Any change that stores user location must update privacy documents and store
review data declarations.

## Target State

### Default Map Screen

The default map tab should have:

- Full-screen map under the safe area.
- Floating search field near the top.
- Current-location icon inside or adjacent to the search field.
- Compact mode filter chips.
- Reward markers on the map.
- A collapsed bottom sheet that says:
  - `근처 인터뷰`
  - `{n}개`
  - one short action hint if needed.
- A list button close to the bottom sheet, not floating randomly in the map.

### Marker States

#### Default Single Marker

- Shows compact reward amount.
- Uses Hypofit brand-compatible accent.
- Has enough contrast over map backgrounds.
- Has a clear tap target.
- Does not use long text.

#### Selected Single Marker

- Uses stronger brand green.
- Slightly elevated or enlarged if stable on both platforms.
- Shows selected preview card.
- Keeps the map context visible.

#### Viewed Single Marker

- Lower emphasis.
- Still readable.
- Should not look disabled, because the user may want to reopen it.

#### Group Marker

Used when multiple posts share a coordinate or are grouped.

- Shows `+2`, `+3`, `+9`, etc.
- Uses a neutral/brand style distinct from reward markers.
- On press, opens a grouped result state rather than choosing an arbitrary
  first post.

### Selected Preview Card

The floating preview card should be lightweight.

Include:

- reward amount
- post title
- place label
- `상세 보기`
- `신청하기` or `내 인터뷰`
- close affordance

Do not include:

- long service summary
- full target description
- full schedule details
- duplicated bottom-sheet detail content

### Bottom Sheet

The bottom sheet should own list browsing.

States:

- Collapsed: count and hint only.
- Mid: 2-3 compact rows.
- Expanded: scrollable list.
- Grouped: rows only for the selected marker group.

The sheet should not fight with the marker preview. If a marker preview is
shown, the sheet can remain collapsed or low-emphasis.

### List Overlay

The full list overlay should be used when the user explicitly wants list-first
browsing.

It should:

- Open from the `목록` button.
- Show `목록` as the title, not `근처 인터뷰`.
- Use rows consistent with the interview tab.
- Preserve selected post state when returning to the map.
- Avoid a separate `지도보기` button if the header back button already returns
  to the map.

## Implementation Plan

## Implementation Status

- [x] Phase 1 code implementation completed on `2026-06-05`.
  - Added `MapMarkerItem` view model.
  - Added exact-coordinate grouping with `latitude.toFixed(6)` and
    `longitude.toFixed(6)`.
  - Added single reward marker and grouped `+N` marker rendering.
  - Added `selectedMarkerGroupId` state.
  - Added grouped bottom-sheet mode that shows only the selected marker
    group's posts.
- [x] Phase 3 code implementation completed on `2026-06-05`.
  - Replaced fixed `3000m` radius with region-derived query radius.
  - Reused debounced `queryRegion` so map movement does not request on every
    drag frame.
- [x] Search UX code implementation completed on `2026-06-05`.
  - Added debounced autocomplete for map place search.
  - Added inline loading, empty, and error states for place suggestions.
  - Removed the prominent loading banner during normal map movement.
  - Added map-tab reselect reset behavior.
- Phase 2 visual refinement remains implementation-only and should be split
  into a new active task only when a concrete issue is reported:
  - strengthen selected marker/list-row visual coupling if needed;
  - clarify preview-card versus bottom-sheet responsibility if needed;
  - adjust marker polish only when a concrete issue is reported.
- [x] Phase 4 state-machine refinement code pass completed on `2026-06-05`.
  - Group and post selection clear each other.
  - Search/filter changes clear selection state.
  - Place selection clears marker/list/group state and returns the bottom
    sheet to the nearby state.
  - Map-tab reselect clears marker/list/group/search dropdown state and returns
    the bottom sheet to the nearby state.
  - A formal `MapSheetContentMode` type is still deferred because the current
    derived `selectedMarkerGroup ? group : nearby` model remains sufficient.
## Phase 1 - Coordinate Grouping MVP

Goal: fix the most visible map correctness problem first.

### 1.1 Add Map Marker View Model

Create a map-specific derived model in `MapScreen.tsx` or a nearby helper file.

Suggested type:

```ts
type MapMarkerItem =
  | {
      type: "single";
      id: string;
      post: InterviewPostWithCoordinates;
      latitude: number;
      longitude: number;
    }
  | {
      type: "group";
      id: string;
      posts: InterviewPostWithCoordinates[];
      latitude: number;
      longitude: number;
    };
```

Grouping key:

```ts
const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
```

Use `toFixed(6)` for exact-enough coordinate grouping. This avoids grouping
posts that are merely nearby while still catching identical selected places.

### 1.2 Render Group Markers

Replace direct `displayMapPosts.map(...)` marker rendering with
`markerItems.map(...)`.

Single marker:

- Use current reward pill marker.

Group marker:

- Show `+{count}`.
- Use neutral surface with brand border or brand fill.
- On press, do not pick the first post.
- Instead set selected group ID and show grouped state.

### 1.3 Add Group Selection State

Add state:

```ts
const [selectedMarkerGroupId, setSelectedMarkerGroupId] = useState<string | null>(null);
```

Rules:

- Selecting a single marker clears selected group.
- Selecting a group clears selected post.
- Selecting a list row clears selected group and selects the row's post.
- Map search/filter change clears both selected post and selected group.

### 1.4 Group Preview Behavior

When a group marker is selected:

- Move bottom sheet to `mid`.
- Show a compact group header in the bottom sheet:
  - `이 위치의 인터뷰 {n}개`
  - place name if common
- Show only that group's rows first.
- Allow each row to be selected normally.

Do not open a modal.

### 1.5 Acceptance Criteria

- Same-coordinate posts no longer hide behind one marker.
- Group marker count is visible.
- Pressing a group marker shows the grouped posts.
- Pressing a grouped row selects the actual post and shows the single preview.
- Typecheck passes.

## Phase 2 - Marker And List Selection Coupling

Goal: make the map feel stateful and coherent.

### 2.1 Strengthen Selected Row State

When `selectedPostId` exists:

- The corresponding `MapListRow` should use selected styling.
- The row should not be buried far below the fold if selected from a marker.

If practical, scroll the bottom sheet list to selected row after marker select.
If this becomes too complex, defer exact scroll positioning but keep selected
visual state.

### 2.2 Selection Card Responsibility

Keep `MarkerPreviewCard` as a lightweight card only.

Move longer details to:

- bottom sheet selected card, or
- interview detail page.

Avoid having both preview card and bottom sheet show the same full metadata at
the same time.

### 2.3 Marker Visual Polish

Check:

- selected marker contrast
- viewed marker contrast
- reward label truncation
- marker pointer alignment
- hit target
- text baseline with the current app font

Do not add complex animations until the static layout is stable.

### 2.4 Acceptance Criteria

- Marker tap and list row tap clearly refer to the same post.
- The selected state does not disappear after map idle refresh unless the post
  genuinely leaves the result set.
- Preview card and bottom sheet do not duplicate too much information.

## Phase 3 - Visible Region Search Semantics

Goal: make results match what the user sees on the map.

### 3.1 Radius From Viewport

Replace fixed `defaultRadiusM = 3000` for map queries with a computed radius
derived from map region deltas.

Candidate approach:

- Keep a min radius, such as `800m`.
- Keep a max radius, such as `10000m` or the backend cap.
- Compute an approximate radius from latitude/longitude deltas.
- Debounce updates after `onRegionChangeComplete`.

This is not exact geospatial bounds filtering, but it is much closer to user
intent than a fixed 3km radius.

### 3.2 Copy Adjustments

Avoid distance-specific copy like:

- `내 주변 3km 안의 인터뷰를 보고 있어요`

Prefer:

- `이 지역 인터뷰를 찾고 있어요`
- `지도에 보이는 지역 기준이에요`

### 3.3 Query Churn Guard

Keep debounce. Do not fire a backend request on every map drag frame.

Potential rule:

- update `region` continuously
- update `queryRegion` after idle debounce
- update `queryRadiusM` with `queryRegion`

### 3.4 Acceptance Criteria

- Zooming in narrows the result set.
- Zooming out broadens the result set within the backend cap.
- Copy no longer promises a fixed radius unless the filter explicitly uses one.
- API requests remain stable during panning.

## Phase 4 - Bottom Sheet State Refinement

Goal: reduce competing map overlays.

### 4.1 Define One State Machine

Current related states:

- `selectedPostId`
- `markerPreviewPoint`
- `isListMode`
- `sheetLevel`

Add carefully:

- `selectedMarkerGroupId`

State rules must be explicit.

Suggested hierarchy:

1. List overlay mode wins over map preview.
2. Selected group owns bottom sheet grouped rows.
3. Selected post owns preview card and selected row.
4. No selection shows normal nearby list.

### 4.2 Bottom Sheet Content Modes

```ts
type MapSheetContentMode = "nearby" | "group" | "selected";
```

The rendered list can derive from this:

- `nearby`: all display posts
- `group`: group posts
- `selected`: selected card plus other posts

### 4.3 Acceptance Criteria

- No state combination shows a selected card for one post and a group list for
  another.
- Closing preview clears selected post only.
- Changing filters clears selected post/group/list mode predictably.
- Bottom sheet does not jump unexpectedly after marker tap.

## Phase 6 - Deferred Native/Kakao Upgrade

Do not start this during MVP map hardening unless the user explicitly asks.

Upgrade to Kakao Native Map SDK only if:

- Korean map visual quality becomes a clear blocker.
- Kakao POI/road rendering quality matters more than delivery speed.
- Android/iOS native implementation capacity is available.
- Expo managed constraints are accounted for.

If this starts, update:

- `docs/reference/kakao-native-map-upgrade-plan.md`
- iOS/Android native config docs
- store privacy/data-safety docs if permissions or SDK behavior change

## Technical Risks

### Custom Marker Performance

Risk:

- Many custom markers can cause flicker, slow map movement, or clipped marker
  snapshots.

Mitigation:

- Keep marker component simple.
- Keep stable keys.
- Keep `tracksViewChanges` false except for short refresh windows.
- Consider image-based marker assets if Android rendering is unstable.
- Add grouping before marker count grows.

### Duplicate Coordinates

Risk:

- Founder-selected places create many posts at exactly the same coordinate.

Mitigation:

- Exact-coordinate grouping now.
- Distance-based clustering later.

### Query Churn

Risk:

- Auto-search on map idle can cause too many requests.

Mitigation:

- Debounce query region.
- Keep result caching through React Query.
- Avoid re-querying for tiny map changes if needed.

### Privacy And Store Review

Risk:

- Location behavior can trigger privacy policy and store form changes.

Mitigation:

- Keep one-shot foreground location only.
- Do not persist respondent current location.
- Keep permission copy aligned with Google Play / App Store docs.

## Implementation Order

1. Implement exact-coordinate marker grouping.
2. Add group marker UI and group bottom-sheet mode.
3. Tighten marker/list selected-state coupling.
4. Refine selected preview card versus bottom-sheet responsibilities.
5. Compute map query radius from visible region.
6. Decide whether Android marker behavior requires image markers or a
   clustering package.

## Open Decisions

- Should grouped markers show `+3` only, or `1.8만 +2` to preserve reward
  information?
  - Recommended MVP: `+3` only. It is clearer and avoids false reward meaning.
- Should group marker press show a preview card or bottom sheet group list?
  - Recommended MVP: bottom sheet group list. A single preview card cannot
    honestly represent multiple posts.
- Should map radius be visible to the user?
  - Recommended MVP: no. Use region-based copy, not numeric radius copy.
- Should selected marker animate?
  - Recommended MVP: no. Avoid animation until a concrete product need appears.
- Should the list overlay replace the bottom sheet?
  - Recommended MVP: no. Keep both, but make their roles clear:
    - bottom sheet for quick map-context browsing
    - list overlay for list-first browsing

## Close Criteria

This plan can be closed when:

- Same-coordinate posts render as group markers.
- Group marker selection works.
- Single marker selection works.
- Bottom sheet/list overlay states are predictable.
- Radius/search copy no longer conflicts with actual query semantics.
- Any concrete marker/list issues reported by the user are either fixed or moved
  to a dedicated implementation plan.
