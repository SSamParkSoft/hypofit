# Design System And Screen Patterns

Status: service-source-of-truth

Last updated: 2026-07-02

This document is the practical design reference for agents changing Hypofit UI.
It sits above historical UI plans and points to the detailed reference docs when
needed.

When using AI tools, Figma MCP, generated images, or web references to produce
or critique UI, also read `15-ai-assisted-design-workflow.md`.

## Current Source Of Truth

Current mobile navigation is:

```text
홈 / 인터뷰 / 지도 / 채팅 / 프로필
```

Older completed plans may mention historical labels such as `찾기`, `내 신청`,
`내 모집`, or `일정`. Those are historical unless a current active plan says
otherwise.

## Product Feel

Hypofit should feel like a focused interview-coordination app:

- practical,
- trustworthy,
- phone-first,
- calm,
- compact,
- easy to scan,
- clear about status and next action.

Avoid:

- generic SaaS dashboards on mobile,
- marketing-style hero sections inside the app,
- decorative cards that do not carry decisions,
- nested cards,
- excessive gradients or single-color themes,
- vague AI/mockup copy,
- UI that hides review-sensitive paths.

## Surface Taxonomy

### Rows

Use rows for repeated operational content:

- interview lists,
- chat list,
- notification list,
- profile/settings menu,
- support ticket list,
- applicant list,
- my applications/posts.

Rows should have:

- one strong title,
- one useful secondary line,
- concise metadata,
- optional status badge,
- clear press affordance when navigable.

### Cards

Use cards sparingly for:

- forms,
- selected detail panels,
- profile/account summaries,
- map selected marker preview,
- destructive confirmations,
- complex grouped decision surfaces.

Do not put cards inside cards. If a section only separates rows, use dividers
and spacing instead.

### Bottom Sheets

Use bottom sheets for:

- map list context,
- temporary contextual selection,
- filter or option panels where the map remains relevant.

Do not use bottom sheets for flows that need sustained reading or typing.
Create/apply/legal/chat flows should use full-screen pushed pages.

### Full-Screen Task Pages

Use full-screen pages for:

- signup,
- login,
- create post,
- apply,
- chat thread,
- support/report,
- account information,
- account deletion,
- legal documents.

## Mobile Screen Patterns

### Home

Purpose:

- orient the user,
- show recent interviews,
- show lightweight progress.

Do:

- keep it compact,
- avoid duplicating the full interview search tab,
- make recent interviews tappable,
- preserve notification entry.

Do not:

- add dashboard metric clutter,
- create marketing panels,
- show irrelevant profile editing content.

### Interviews

Purpose:

- detailed search/browse,
- application entry,
- my interviews/my posts entry.

Do:

- keep filters concise,
- use compact scannable rows,
- keep row detail and full detail page distinct,
- show status clearly after application.

Do not:

- overload each row with every field,
- make create/manage buttons visually fight the search task.

### Map

Purpose:

- location-based discovery for relevant interview posts.

Do:

- keep map gesture ownership clear,
- keep search visible but not oversized,
- show current/search location when meaningful,
- keep list/bottom sheet behavior predictable,
- handle denied/unavailable location calmly.

Do not:

- show constant noisy loading copy while the user pans,
- mix scroll and map drag on the same gesture,
- imply exact meeting location if only district/nearby precision is public.

### Chat List

Purpose:

- quickly return to active coordination.

Do:

- order by latest meaningful activity/unread state,
- show counterpart, interview context, last message, unread count, status,
- keep row height efficient,
- use a contextual overflow menu close to the more button.

Do not:

- show reward/mode if it makes the row heavy,
- place time where it truncates easily,
- use bottom sheets for tiny row overflow menus unless the platform pattern
  clearly benefits.

### Chat Thread

Purpose:

- coordinate one interview.

Do:

- hide bottom tab bar,
- keep composer keyboard-safe,
- align my messages right and counterpart messages left,
- show date separators when date changes,
- keep workflow actions close to the composer when they affect the next step,
- put secondary room actions under header icons/menus.

Do not:

- keep interview summary expanded by default if it crowds messages,
- duplicate detail information already reachable through `인터뷰 상세정보`.

### Profile

Purpose:

- settings, trust, legal, support, and account actions.

Do:

- use row-based settings sections,
- keep legal/support/report/account deletion reachable,
- avoid excessive cards,
- keep destructive actions clear but not visually dominant until selected.

Do not:

- bury account deletion,
- remove report/support paths,
- make profile a dashboard.

## Web Screen Patterns

Desktop web can be more spacious and comparison-oriented:

- persistent filters,
- split list/detail where useful,
- denser applicant management,
- clearer admin/operator views,
- legal/public pages that are easy to share.

Do not copy the mobile bottom tab shell into desktop web. Keep product labels
and domain states consistent, but let layout density differ.

## Component Principles

### Buttons

- Primary action: strong fill using Hypofit green.
- Secondary action: quiet outline/text.
- Destructive action: explicit dangerous tone and confirmation where needed.
- Icon-only buttons need accessibility labels.
- Loading/disabled states must preserve size.

### Inputs

- Label should exist outside placeholder when the field is important.
- Placeholder is a hint, not the only label.
- Text must sit vertically centered in single-line fields across iOS/Android.
- Multiline fields should align text intentionally near the top.
- Keyboard type should match content.

### Badges

Use badges for status, not decoration.

Good badge candidates:

- 신청,
- 선정,
- 반려,
- 완료,
- 불참,
- 모집중,
- 종료.

### Icons

Use familiar system-style icons for:

- back,
- bell,
- send,
- more,
- search,
- filter,
- map/current location,
- user/profile,
- settings rows.

Icons should support recognition. Do not invent custom symbols when a common
icon exists.

## Copy System

Use Korean UI copy that is short and concrete.

Preferred action labels:

- `신청하기`
- `신청`
- `제출하기`
- `저장하기`
- `채팅 보기`
- `상세정보`
- `수정하기`
- `삭제하기`
- `계정 삭제`

Preferred status labels:

- `신청`
- `선정`
- `반려`
- `완료`
- `불참`
- `모집중`
- `종료`

Avoid:

- vague `확인` when the action is specific,
- stiff admin wording,
- long explanatory paragraphs,
- product claims about payment guarantee,
- `최적화`, `인사이트`, `대시보드` unless actually true.

## Accessibility

Minimum expectations:

- touch targets should be at least 44x44 pt/dp where possible,
- important icon-only buttons need labels,
- color must not be the only state indicator,
- contrast must be readable on the app background,
- forms need reachable inputs and buttons with keyboard open,
- reduced motion should not break flow comprehension.

## Safe Area And Keyboard

Required checks:

- dynamic island/notch status bar area,
- home indicator bottom area,
- chat composer with keyboard,
- bottom tab bar and sheet overlap,
- map overlays,
- auth forms on small phones,
- Android navigation/keyboard behavior.

Use shared layout helpers before adding screen-specific offsets.

## Permission And Privacy UI

Permission prompts need product rationale:

- Location: nearby/map discovery.
- Camera/photos: profile image.
- Notifications: chat, application, session, support updates.

Denial states must still let the user use non-dependent parts of the app.

## QA Gate For UI Work

Before calling meaningful UI work done, check:

- screen works on current iPhone simulator/device size,
- Android emulator if the change touches native behavior,
- no accidental page scroll on fixed screens,
- bottom tabs/sheets/composer do not overlap,
- back animation direction feels correct,
- empty/loading/error states are readable,
- legal/support/report/delete paths remain reachable,
- Figma sync status is reported if relevant.

## AI-Assisted Design Gate

If any part of the screen came from AI generation or reference synthesis, check
the additional workflow in `15-ai-assisted-design-workflow.md` before accepting
the design. In particular, verify that the design:

- serves a specific Hypofit user job,
- maps to existing Hypofit primitives,
- covers loading/empty/error/permission/keyboard states,
- does not copy a reference app's distinctive expression,
- does not expose private data to AI tools,
- does not look like a generic AI-generated SaaS screen.
