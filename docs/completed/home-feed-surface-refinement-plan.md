# Home Feed Surface Refinement Plan

Status: completed

Last updated: 2026-05-27

## Goal

Reduce the card-heavy feeling on the mobile home screen and align the recent
interview feed with the flatter interview-tab list direction.

The home screen should feel like a lightweight app start surface, not a
dashboard card and not another copy of the interview search tab.

## Rationale

Recent mobile app UI patterns use cards when content needs a distinct boundary
or a self-contained action area. For feed and search surfaces, plain vertical
lists are usually easier to scan on phones. Hypofit's home screen is a feed of
recent interview posts, so the list should be the main surface.

## Current Issues

- The entire recent interview feed is wrapped in a bordered white card.
- Rows sit inside that card, so the screen feels dashboard-like.
- Expanded rows show another card-like panel, increasing nested-card feeling.
- After flattening the feed, the home feed can become too similar to the
  interview tab if it only contains recent interview rows.

## Target Design

### Header

- Keep the brand row and notification button.
- Keep the home header brand-led instead of a generic page title.

### Progress Summary

- Add a compact `내 진행 상황` section above the recent interview feed.
- Show small operational metrics that belong on the home start surface.
- For respondent-only users, show:
  - applications submitted by the user.
  - selected applications.
  - viewed interview posts.
- For users who can use founder tools, show:
  - open interview posts created by the user.
  - applicants for the user's open interview posts.
  - applications submitted by the same user.
- This keeps `both` users from losing either side of their activity.
- Keep the metric treatment focused on one primary role-aware metric instead of
  squeezing three equal metrics into narrow columns.
- Use one wide summary block:
  - founder/both: primary `내 모집글`, secondary `지원자`, `신청`.
  - respondent: primary `신청`, secondary `선정`, `읽은 모집글`.
- Avoid a large dashboard card or nested cards.

### Feed

- Use the screen background as the feed background.
- Use row separators instead of card boundaries.
- Use comfortable row height for mobile scanning.
- Preserve pressed opacity behavior.
- Keep `최근 올라온 인터뷰` below the progress summary so the home page
  has a distinct information hierarchy from the interview tab.

### Expanded Item

- Use inline expansion instead of a floating card.
- Keep `상세보기` and `신청하기` actions.
- Avoid repeating card borders unless the user opens the actual application
  form.

### Empty State

- Keep empty/loading/error centered in the available feed area.
- Avoid making the whole section look like a white card.

## Implementation Plan

1. Remove the bordered white feed container from `HomeScreen`.
2. Replace it with a plain `View` that occupies the remaining area.
3. Change home `OpportunityRow` usage to:
   - `rowAppearance="flat"`
   - `rowSize="comfortable"`
4. Change home expanded content to `ExpandedOpportunity chrome="inline"`.
5. Remove per-row wrapper gap so row and expansion read as one item.
6. Keep existing data fetching, read tracking, apply mutation, and welcome modal
   behavior unchanged.
7. Add `HomeProgressSection` above the feed.
8. Add role-aware compact progress metrics:
   - respondent: application count, selected count, viewed post count.
   - founder/both: own open post count, applicant count, application count.
   - render one wide summary block instead of three narrow metric cards or one
     compressed inline row.
9. Keep the home structure limited to two sections for now:
   - `내 진행 상황`
   - `최근 올라온 인터뷰`
10. Keep the recent interview feed scrollable inside the remaining home area.

## QA Checklist

- Home feed no longer appears inside a large white card.
- Rows are separated by lines only.
- Expanded item feels attached to the selected row.
- Last row is not visually trapped inside a card boundary.
- Home no longer reads as a duplicate of the interview tab.
- The user can quickly see their current interview activity from the home screen.
- No separate next-action recommendation row is shown for now.
- TypeScript check passes.

## Implementation Notes

- Implemented in `apps/mobile/src/screens/home/HomeScreen.tsx`.
- Figma sync was intentionally deferred because the UI is still being adjusted
  interactively in code first.
