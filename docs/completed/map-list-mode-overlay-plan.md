# Map List Mode Overlay Plan

Status: completed

Last updated: 2026-05-29

## Purpose

Track the remaining close-out work for map list mode on Expo mobile.

The intended behavior is already clear: `목록` should open a separate list
surface while the map stays mounted underneath. This doc stays active only for
visual QA and any small regressions around sheet/control spacing.

## Scope

- Primary source of truth:
  `apps/mobile/src/screens/map/MapScreen.tsx`
- This doc tracks Expo mobile behavior only.
- Web fallback is not closed by this doc. `apps/web/src/pages/MapPage.tsx`
  still uses the older bottom-sheet expansion behavior for `목록`.

## Confirmed In Code

- [x] `MapScreen` owns explicit `isListMode` state.
- [x] The floating `목록` button opens `MapListOverlay` instead of expanding the
  bottom sheet.
- [x] `MapListOverlay` is a separate full-screen list surface with its own
  header and return affordance.
- [x] The underlying `MapView` remains mounted while list mode is open, so the
  map still reads as the primary surface.
- [x] List mode hides both the floating list button and the bottom sheet.
- [x] The overlay uses the current `displayMapPosts` result set instead of a
  second data source.
- [x] Tapping a row exits list mode, returns the sheet to minimum height,
  selects the post, recenters the map, updates marker preview position, and
  marks the post as viewed.

## Remaining Active Work

- [ ] Expo simulator/device QA for top and bottom safe-area spacing inside the
  overlay header and list body.
- [ ] Visual QA for list button, selected preview card, and bottom-sheet
  spacing after leaving list mode across collapsed/minimum, mid, and expanded
  sheet states.
- [ ] Interaction QA to confirm row tap does not create double transitions,
  preview overlap, or delayed recenter artifacts on slower runtime paths.
- [ ] Device review of the return affordance. The current back control may be
  sufficient, but do not treat that as final until it is checked in Expo.

## Close Criteria

Close this doc when the remaining Expo QA passes or is split into a smaller
map-only bug follow-up.
