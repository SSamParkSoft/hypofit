# Mobile List/Card Surface System Plan

Status: reference

Last updated: 2026-05-29

## Purpose

Hypofit mobile screens currently use cards in many repeated-list areas. This
made the MVP UI stable quickly, but it also makes the app feel heavier and more
dashboard-like than a native mobile marketplace or local community app.

This plan defines when Hypofit should use:

- plain list rows
- grouped list containers
- cards
- expanded panels
- profile cards

The goal is to make the RN mobile app feel lighter, more native, and easier to
scan without losing the trust and clarity needed for paid interview matching.

## References

Research checked on 2026-05-26:

- Apple Human Interface Guidelines, Lists and tables:
  https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- Material Design, Lists:
  https://m1.material.io/components/lists.html
- Material Design, Cards:
  https://m1.material.io/components/cards.html
- Material Design 2, Cards:
  https://m2.material.io/components/cards
- Android Developers, Material Components overview:
  https://developer.android.com/design/ui/mobile/guides/components/material-overview

Key takeaways:

- Apple frames lists/tables as row-based structures for organized data,
  hierarchy, options, and navigation.
- Apple recommends succinct row text and moving large detail content to a
  detail view instead of making rows too tall.
- Material defines lists as continuous vertical rows for homogeneous content.
- Material says cards are better when content is richer, self-contained, or has
  multiple actions.
- Material explicitly notes that a quickly scannable list is appropriate for
  homogeneous content without many actions.
- Material warns against nested scrollable space inside a card on mobile
  because it can create confusing scroll behavior.

## Product Interpretation

Hypofit's core mobile screens are closer to a local marketplace/inbox product
than a dashboard.

The app has two kinds of content:

1. Browseable repeated content
   - recent interview posts
   - interview search results
   - map bottom sheet nearby results
   - chat room list
   - notifications
   - application lists

2. Personal or decision-heavy content
   - profile identity
   - account settings
   - support/report forms
   - selected interview detail
   - application form
   - founder applicant review

Browseable repeated content should mostly use list rows. Personal or
decision-heavy content can use cards and panels.

## Surface Rules

### Rule 1: Discovery Lists Use Rows

Use row-based lists for homogeneous interview post lists:

- home recent interviews
- interview search results
- map bottom sheet nearby interviews
- my application list, if the row mainly navigates to a detail

Default row style:

- full available width
- no individual outer card border by default
- separator line between rows
- transparent or page/surface background
- selected state uses soft brand background
- viewed/read state uses muted text and a very light row background only if
  needed
- one primary tap target per row

Rows should show only the information needed for scanning:

- title
- mode chip or small leading meta
- reward
- target summary
- duration and location/schedule in one compact meta line

Rows should not show:

- long service descriptions
- full schedule lists
- multiple CTAs
- nested card sections
- large bordered sub-blocks

### Rule 2: Expanded Detail Uses Panels

When a user taps a row, the expanded content may use a light panel.

Use this for:

- short service summary
- target condition
- schedule options
- application state
- apply CTA
- detail route CTA

Panel style:

- visually connected to the row
- softer than a standalone card
- smaller radius than auth/profile cards
- no heavy shadow
- no nested card inside card

The expanded panel should collapse when the same row is tapped again.

### Rule 3: Profile And Account Surfaces Keep Cards

Cards are appropriate for:

- profile identity header
- account information section
- settings groups
- legal/help groups
- app version and destructive account actions

Reason:

- profile screens are grouped personal information, not rapid browsing
- users expect settings to be grouped
- cards help separate account, help, legal, and destructive areas

### Rule 4: Forms Keep Cards Or Sheets

Cards/panels are appropriate for forms:

- login
- sign-up
- interview creation
- application answer form
- support inquiry
- report form
- account deletion request

Reason:

- forms need clear boundaries
- error and validation messages need a local container
- primary action belongs to the form, not the surrounding list

### Rule 5: Chat List Uses Inbox Rows

Chat list should stay closer to KakaoTalk/Instagram DM/inbox rows:

- avatar
- name
- connected interview title or last-message context
- last message preview
- relative time near the name or trailing area
- unread count at the trailing lower/right area
- overflow menu as a small trailing icon

Avoid:

- full card per chat room
- thick borders around every room
- excessive chips inside each row

### Rule 6: Map Uses Floating Controls And Sheet Rows

Map needs explicit surfaces because it overlays content on a map:

- search overlay can be card-like because it floats over map content
- selected interview preview can be card-like because it is a focused decision
  panel
- bottom sheet itself is a surface
- rows inside the bottom sheet should be list rows, not cards

The `목록` button can remain a floating pill because it is a mode/control
switch, not content.

### Rule 7: Desktop Web Can Differ

This plan targets `apps/mobile`.

Desktop web may use more cards, columns, and panels because it has more space
and different scanning behavior. Do not force this mobile list/card rule onto
desktop web unless a separate web plan says so.

## Current Mobile Audit

### Should Move Toward List Rows

- `HomeScreen` recent interview post rows
  - Current state: recent-interview area is a large card and each
    `OpportunityRow` is also card-like.
  - Target: keep the outer section if needed, but make each opportunity a
    separator-based row.

- `InterviewSearchScreen` result area
  - Current state: whole result area is a bordered card and each row is also
    card-like.
  - Target: search/filter may sit above; result list should feel like a native
    list, with less outer containment.

- `MapScreen` bottom sheet rows
  - Current state: `MapListRow` uses individual bordered card styling.
  - Target: bottom sheet is already the containing surface, so rows should use
    separators and selected/pressed background only.

- `MyInterviewsScreen` application cards
  - Current state: application and founder post summaries are cards.
  - Target: application list can become grouped rows. Founder applicant review
    can keep panels because it has state changes and multiple actions.

### Should Keep Cards

- `ProfileScreen` profile identity and menu groups
- `AccountInfoScreen` grouped account sections
- support/report/account deletion forms
- auth card
- selected map post preview
- expanded opportunity detail and application form
- founder applicant review cards

### Needs Case-by-Case Treatment

- `InterviewDetailScreen`
  - It is a detail view, so panels are acceptable.
  - Avoid stacking too many equal-weight cards.

- `CreateInterviewScreen`
  - It is a form and can keep panels.
  - Reduce nested card feeling where a panel contains another bordered panel.

## Proposed Visual System

### List Row Token

Use for browse/feed/inbox rows:

```text
container: transparent or surface parent
padding-x: 14-16
padding-y: 12-14
border-bottom: 1px hypo-border
radius: 0 by default
selected radius: 12-14 only if selected background needs containment
pressed opacity: 0.82-0.9
title: 14-15px, bold/black
meta: 10-12px, bold, muted
trailing reward/time: 12-14px, black
```

### Grouped List Token

Use for settings and grouped menus:

```text
outer container: rounded 16
border: 1px hypo-border
background: surface
row separator: border-top except first row
row min-height: 56-64
```

### Card Token

Use for profile/forms/selected decisions:

```text
radius: 16-24 depending on surface importance
border: 1px hypo-border
background: surface
padding: 14-20
shadow: only auth, floating map overlay, bottom sheet, or modal-level surfaces
```

### Expanded Panel Token

Use below a list row:

```text
radius: 12-14
border: 1px hypo-border only if needed
background: hypo-bg or surface-muted
padding: 12
margin-top: 6
```

## Implementation Plan

### Phase 1: Extract Row Surface Components

Create shared mobile UI primitives:

- `ListSection`
- `ListRow`
- `InlineMeta`
- `SelectionPanel`

Location:

```text
apps/mobile/src/shared/ui/
```

Requirements:

- NativeWind-first className API.
- Optional selected/viewed/disabled states.
- Optional leading, main, trailing, and below slots.
- No DOM assumptions.
- Runtime style only for pressed/animated states.

Status on 2026-05-26:

- First-pass primitives were added in
  `apps/mobile/src/shared/ui/ListSurface.tsx`.
- Current primitives:
  - `ListSection`
  - `ListRow`
  - `SelectionPanel`
- `OpportunityRow`, `MapListRow`, and 신청한 인터뷰 summaries now use these
  shared surfaces.
- The mobile notifications route also uses `ListSection` and `ListRow` so the
  home/chat notification entry opens to a native row-based screen instead of a
  missing route.
- Interview search results and chat room rows also use the shared list
  primitives, while preserving their screen-specific row contents.
- Audit follow-ups fixed:
  - chat thread composer now accounts for bottom safe area
  - interview filter sheet bottom actions account for bottom safe area
  - map bottom sheet content accounts for bottom safe area
  - selected map post no longer appears twice in the bottom sheet list
  - application/session lifecycle badges better separate active and settled
    states
- Keep the abstraction intentionally small until simulator visual QA confirms
  the final row density, selected state, and viewed state.

### Phase 2: Refactor Opportunity Rows

Refactor `OpportunityRow` in `HomeScreen.tsx` or move it to:

```text
apps/mobile/src/features/interview-posts/components/OpportunityRow.tsx
```

Targets:

- default row becomes separator-based, not card-based
- selected row gets soft background and subtle radius
- viewed row is lighter through text tone, not heavy card tint
- expanded panel remains visually distinct below the row

Apply to:

- home recent interviews
- interview search results

Status on 2026-05-26:

- Applied first-pass list-row styling to the shared `OpportunityRow`.
- Home and interview search now use separator-based rows instead of individual
  bordered cards for each interview.
- Selected rows keep a soft brand background so the expanded detail still has a
  clear anchor.
- Interview search separates the search/filter controls from the result list
  instead of wrapping the whole page content in one large card.

### Phase 3: Refactor Map Bottom Sheet Rows

Update `MapListRow`:

- remove individual card border as default
- use bottom border separators
- keep selected state as soft brand row background
- keep reward pill only if it helps map scanning
- reduce vertical height so 3-4 rows are visible in mid sheet

Keep selected map post preview as a card/panel.

Status on 2026-05-26:

- Applied first-pass list-row styling to `MapListRow`.
- The bottom sheet remains the containing surface; individual nearby interview
  rows no longer render as standalone bordered cards by default.
- Selected map post preview remains card-like because it is a focused decision
  panel with detail and apply actions.

### Phase 4: Refactor My Interviews Lists

Split the screen:

- application summaries as list rows
- founder post summaries as grouped rows or light panels
- applicant review/action area remains card/panel

Do not remove important statuses:

- 신청됨
- 선정됨
- 예정
- 완료
- 반려
- 종료
- no-show/report-related states when added

Status on 2026-05-26:

- Applied first-pass list-row styling to 신청한 인터뷰 summaries.
- 신청한 인터뷰 now uses a grouped list surface with separator-based rows
  instead of separate cards for each application.
- Founder 모집글 summaries remain light cards/panels because they contain
  applicant review state and status-changing actions.

### Phase 5: Profile Remains Card-Based

Do not flatten profile into plain rows.

Keep:

- profile header card
- settings group cards
- help/legal group cards

Tighten only if needed:

- reduce nested metric card weight
- make logout/account deletion text actions remain understated

### Phase 6: Visual QA

Check on phone-sized RN simulator:

- home first viewport
- interview search with no filters
- interview search with active filters
- expanded interview row
- map min/mid/max sheet
- selected map post
- chat list
- profile

Pass criteria:

- repeated lists feel lighter than before
- profile/settings still feel grouped and trustworthy
- no nested cards inside cards
- at least 4 compact opportunity rows can be scanned on common iPhone height
  before expansion, unless keyboard/sheet state reduces available space
- selected and applied states remain obvious
- touch targets remain at least comfortable mobile size

## Non-Goals

- Do not redesign desktop web.
- Do not change database/API behavior.
- Do not remove expanded detail/application flows.
- Do not sync Figma until the user approves the code direction.
- Do not introduce a third-party UI kit for this cleanup.

## Open Decisions

- Home recent interviews have moved to a flatter feed direction; see
  `docs/completed/home-feed-surface-refinement-plan.md` for the completed
  home-specific pass.
- Whether interview search keeps a subtle list container or becomes flat below
  the search/filter area.
- Whether viewed rows should use a background tint or only muted typography.
- Whether reward should remain a trailing text value or become a small pill.
