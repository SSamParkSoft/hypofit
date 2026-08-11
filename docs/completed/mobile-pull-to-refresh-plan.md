# Mobile Pull-To-Refresh Plan

Status: completed

Last updated: 2026-06-08

## Purpose

Add native pull-to-refresh behavior to the Expo mobile screens where users
expect manually refreshed interview data:

- `홈` tab recent interview list
- `인터뷰` tab interview search result list

This plan keeps the implementation small for the MVP while following platform
patterns from React Native `RefreshControl` / `FlatList` and mobile
swipe-to-refresh guidance.

## UX Standard

- Pull-to-refresh belongs on dynamic list content where the newest items appear
  near the top.
- It should supplement automatic cache refresh, not replace it.
- The refresh indicator should appear only during the gesture/request and should
  disappear when the refreshed data is visible.
- Do not add custom modal copy or large loading surfaces for a manual refresh.
  Use the native spinner so the interaction feels like iOS/Android.
- Keep map surfaces excluded. The `지도` tab is panning/dragging-first, so
  vertical pull-to-refresh would conflict with map gestures.
- Keep chat thread refresh separate. Chat already uses active-screen polling and
  should not depend on manual pull-to-refresh.

## API Standard

- Do not create a dedicated `/refresh` endpoint.
- Reuse the current list APIs:
  - `GET /api/v1/interview-posts`
  - `GET /api/v1/applications` when authenticated
  - `GET /api/v1/interview-post-views` when authenticated
- Refresh should refetch all read models visible on that screen so counts,
  application status, and viewed state do not drift.
- Keep TanStack Query `staleTime` as the automatic cache rule. Manual refresh is
  an explicit user action and should force `refetch()` even inside `staleTime`.

## Implementation

### Home

- [x] Add `RefreshControl` to the recent interview `ScrollView`.
- [x] On refresh, refetch:
  - open interview posts sorted by newest
  - applications when the user is logged in
  - interview post views when the user is logged in
- [x] Keep `내 진행 상황` visible above the list; its numbers update from the same
  refetched application/post/view data.
- [x] Keep the recent-interview area refreshable even while it is empty,
  loading, or showing an API error.

### Interview Search

- [x] Add `RefreshControl` to the result-list `ScrollView`.
- [x] On refresh, refetch:
  - current interview-post query, including active API params such as location
    radius and sort
  - applications when the user is logged in
  - interview post views when the user is logged in
- [x] Keep search text and filter chips unchanged during refresh.
- [x] Keep the result-list area refreshable even while the result set is empty,
  loading, or showing an API error.

## Current Scope

- Use `ScrollView` + `RefreshControl` for the immediate MVP implementation.
- Do not convert the screens to `FlatList` in this change because the existing
  expandable rows and layout ownership are still being actively tuned.

## Follow-Up

- Move large result lists to `FlatList` once the UI stabilizes.
- Add pagination/cursor support if interview posts grow beyond a small MVP
  dataset.
- Add manual QA on iOS simulator and TestFlight:
  - pull at top of home recent list
  - pull at top of interview result list
  - pull while filters/search are active
  - failed network state
  - authenticated and unauthenticated users

## Close Criteria

- [x] Home and interview result lists expose native pull-to-refresh.
- [x] Manual refresh refetches the visible read models without resetting selected
  filters/search text.
- [x] Typecheck passes.
- [ ] Simulator/TestFlight QA is completed or explicitly deferred.
