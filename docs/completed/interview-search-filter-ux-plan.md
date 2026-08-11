# Interview Search Filter UX Plan

Status: completed

Last updated: 2026-06-01

## Goal

The `인터뷰` tab should work as a high-intent discovery page, not a management
page. Users should quickly narrow interview posts by service, target customer,
reward, mode, and later location/time, while still seeing results immediately.

## Design Direction

Use a compact search-first structure:

```text
title
search input + filter button
active filter chips
result list
detail panel
```

Avoid permanently expanded filter groups on mobile. They push the actual
interview results too far down and make the page feel like a form instead of a
search surface.

## UX Principles

- Search field stays visible because keyword search is the primary narrowing
  action.
- Filters are summarized as chips above the results.
- Detailed filters open in a temporary layer.
- Mobile uses a bottom sheet because it preserves the app-like pattern and
  keeps thumb interaction comfortable.
- Desktop uses a contained side panel/modal layer instead of a full page
  sidebar, because the right side is already used by the interview detail panel.
- Filter choices should not silently hide state. Active filters must remain
  visible after the filter layer closes.
- Empty states should give a recovery path: clear filters or broaden the query.

## Initial Filter Fields

MVP fields:

- Keyword: title, service summary, target description, location.
- Mode: all, online, offline, both.
- Reward: all, `1만원 이하`, `2만원 이상`, `3만원 이상`, `5만원 이상`,
  `7만원 이상`.
- Location radius: all, `1km`, `3km`, `5km`, `10km`, `20km`.
  Selecting a radius starts the current one-shot geolocation flow, then filters
  against structured post coordinates and the radius-search API.

Near-future fields:

- Location region.
- Duration range.
- Time availability.

## Interaction Model

Main page:

- Search input updates results immediately.
- Filter trigger shows count when active filters exist.
- Active chips show selected mode/reward and can be removed individually.
- Result count is shown near the filter button.

Filter layer:

- Opens from `필터`.
- Mobile: bottom sheet.
- Desktop: compact centered panel.
- Has `초기화` and `결과 보기`.
- Uses 44px minimum tap targets.
- Does not navigate away from the current result/detail context.

## Implementation Notes

- Keep the filter state local to `InterviewsPage` for now.
- Do not add a routing/query-string layer until sharing filtered searches is
  needed.
- Do not request current-location permission when the `인터뷰` tab simply opens.
- Request foreground geolocation only when the user selects a concrete distance
  radius such as `3km` or `10km`.
- Use the shared radius policy from
  `docs/reference/location-permission-geocoding-radius-plan.md`.
- Keep non-location filters usable if location permission is denied.

## Acceptance Criteria

- The visible filter area is one compact row plus optional active chips.
- The large always-expanded `진행 방식` and `사례비` groups are removed from the
  main page.
- Users can open a filter layer, change mode/reward, reset, and close it.
- Active filters remain visible after closing the layer.
- Filter chips use 44px-class touch targets.
- Radius options include a 20km upper option for broader nearby search.
- The filter sheet primary CTA uses `결과 보기`.
- Expo mobile typecheck and focused simulator smoke pass before closeout.

Location-radius acceptance criteria:

- Selecting a distance radius starts the one-shot location permission flow.
- Denying location leaves keyword/mode/reward filters usable.
- Active chip shows the selected distance such as `3km`.
- Radius can be changed without clearing unrelated filters.

## Implementation Update

As of 2026-05-25:

- The mobile filter sheet is compact and no longer keeps large mode/reward
  groups permanently expanded on the main page.
- Mode, reward, and distance-radius filters are summarized as active chips.
- Distance-radius filters start a one-shot geolocation flow and keep
  non-location filters usable if permission is denied.
- Radius choices now include 1km, 3km, 5km, 10km, and 20km.
- This document stays active until visual QA/build verification closes the
  filter work.

As of 2026-05-29:

- Expo Go smoke on iOS 26.5 opened the interview search page against the
  deployed API and rendered real posts with application-state chips.
- The search-first layout, compact filter button, and plain row list are present
  in the simulator smoke.
- This document stays active until filter interaction QA verifies reset/result
  behavior and location-permission denial handling.
