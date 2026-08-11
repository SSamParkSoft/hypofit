# High-Fidelity UI/UX Reference And Responsive Plan

Status: completed

Last updated: 2026-05-19

Related documents:

- `docs/completed/tailwind-ui-implementation-plan.md`
- `docs/completed/product-design-redesign-plan.md`
- `docs/completed/mobile-first-responsive-uiux-plan.md`
- `docs/completed/web-desktop-uiux-enhancement-plan.md`
- `docs/mvp-scope.md`
- `docs/architecture.md`
- `docs/repository-structure.md`

Figma target:

```text
File: https://www.figma.com/design/dB1sHJHkY8KUUfJgmxQOZV/
Page: Hypofit
Page node: 4464:398
```

Current implementation reference:

```text
apps/web/package.json
apps/web/src/app/App.tsx
apps/web/src/features/auth/AuthPanel.tsx
apps/web/src/styles.css
apps/web/src/shared/api/types.ts
```

## Purpose

This document defines the next high-fidelity UI/UX plan for Hypofit.

The current Figma and web implementation have enough product structure to show the MVP loop, but the next pass should raise the perceived product quality:

```text
from:
  MVP dashboard-style scaffold

to:
  refined mobile-first interview matching product
  + dense desktop recruiting workspace
  + clear trust, reward, schedule, and status surfaces
```

The goal is not to make the UI decorative. The goal is to make the interface feel intentional, specific to paid customer interviews, and less like a generic AI-generated SaaS mockup.

## Current Frontend Stack Fact

The current web app now uses Tailwind CSS as the primary UI styling layer.

Evidence:

```text
apps/web/package.json
  dependencies:
    @radix-ui/react-dialog
    @supabase/supabase-js
    @tailwindcss/vite
    @tanstack/react-query
    class-variance-authority
    clsx
    lucide-react
    react
    react-dom
    tailwind-merge
    tailwindcss

  devDependencies:
    @vitejs/plugin-react
    eslint
    typescript
    vite
    vitest
```

There is no current dependency for:

```text
shadcn/ui generated components
other Radix primitives such as tabs, popover, select, tooltip
```

Current styling is handled through Tailwind utilities and shared React UI primitives. Global CSS is limited to Tailwind import, font-face declarations, theme tokens, and base document styles:

```text
apps/web/src/styles.css
apps/web/src/shared/ui/*
```

Decision:

```text
Tailwind is the required UI implementation direction for production UI work.
Do not continue building new product screens with large custom page-level CSS.
Keep improving the current componentized Tailwind implementation instead of restarting the UI.
```

## Required UI Implementation Direction

Adopt Tailwind CSS for the production UI pass. Use it as the main styling layer for product UI, responsive layout, and component variants.

Important distinction:

```text
Tailwind does not automatically make the UI beautiful.
Tailwind makes it much easier to keep spacing, colors, breakpoints, states, and component variants consistent.
That consistency is what makes the final UI feel polished.
```

Custom CSS should be limited to:

- Tailwind import.
- Font-face declarations.
- CSS variables/design tokens if needed.
- Browser reset/base styles that Tailwind does not cover.
- Rare one-off technical styles that cannot be expressed cleanly with utilities.

Custom CSS should not be used for:

- Page layouts.
- Cards.
- Buttons.
- Navigation.
- Forms.
- Status badges.
- Responsive screen composition.
- Repeated product components.

Recommended stack:

```text
React
Vite
TypeScript
TanStack Query
Supabase client for auth/storage
Tailwind CSS
lucide-react
Radix UI primitives selectively
shadcn/ui selectively, only where it accelerates accessible primitives
```

Use Tailwind for:

- Responsive layout.
- Spacing.
- Typography scale.
- Color tokens.
- State variants.
- Component composition.
- Reducing large global CSS drift.
- Making mobile and desktop breakpoints explicit in component code.

Use Radix or shadcn/ui for:

- Dialog.
- Sheet or drawer.
- Tabs.
- Popover.
- Select.
- Tooltip.
- Dropdown menu.
- Alert dialog.

Do not use shadcn/ui as a visual shortcut that makes Hypofit look like every other AI-generated dashboard. Generated components should be treated as source code owned by this repository and restyled to Hypofit's product language.

## Product Quality Thesis

Hypofit should feel like:

```text
respondent side:
  paid interview opportunity app

founder side:
  lightweight recruiting and customer-discovery operations tool

shared layer:
  trust, schedule, reward, and attendance status system
```

It should not feel like:

```text
generic admin dashboard
generic card marketplace
survey builder
AI matching demo
native-app clone
analytics product
```

The high-fidelity pass should make the product more specific by exposing the real objects users care about:

- Target customer condition.
- Founder service context.
- Reward.
- Duration.
- Mode: online, offline, or both.
- Location or travel burden.
- Screening questions.
- Applicant fit evidence.
- Availability options.
- Selection status.
- Session status.
- Completion or no-show status.
- Profile image and identity confidence.

## External Reference Analysis

References should guide product patterns, not visual copying.

### Linear

Useful reference:

- Dense workspace navigation.
- Clear workflow states.
- Sidebar and custom views.
- Keyboard and command-oriented efficiency for frequent users.
- Low-decoration interface where status and next action carry the screen.

Hypofit adaptation:

```text
Use Linear-like density for founder review and session management.
Do not make respondent discovery feel like an issue tracker.
```

Apply to:

- Desktop founder workspace.
- Applicant review table.
- Session status list.
- Sidebar or rail structure.
- Quick filters.
- Status views such as `모집중`, `검토 필요`, `선정됨`, `예정`, `완료`, `노쇼`.

Avoid:

- Overly abstract issue-tracker vocabulary.
- Excessive keyboard-first assumptions for early MVP users.
- Too many nested project/team concepts.

### Attio

Useful reference:

- Object-centric data model.
- Lists with table and kanban views.
- Same person can appear in a workflow list with list-specific attributes.
- A record detail pane can preserve the base person data while list columns show context-specific workflow data.

Hypofit adaptation:

```text
Treat applicants like people plus application-specific workflow data.
```

Example:

```text
Person profile:
  name
  profile image
  occupation
  location
  experience tags
  trust signals

Application row:
  target fit
  answer quality
  available times
  status
  selected session
  no-show/completion history later
```

Apply to:

- Founder applicant review.
- Respondent application history.
- Session pipeline.
- Profile detail side panel.

Avoid:

- Turning the MVP into a full CRM.
- Complex custom object configuration.
- Generic sales-pipeline language.

### User Interviews

Useful reference:

- Targeting and screening are first-class.
- Scheduling is part of the moderated research workflow.
- Incentives can be handled by the platform or manually.
- Researcher workflow is built around recruiting, confirming, communicating, and completing sessions.

Hypofit adaptation:

```text
The MVP should visibly connect:
target condition -> screener -> applicant fit -> schedule -> completion/reward.
```

Apply to:

- Post creation form.
- Screener question design.
- Applicant fit summary.
- Schedule confirmation.
- Manual reward guidance.
- Completion confirmation.

Avoid:

- Enterprise research operations language.
- Heavy automation that is not implemented yet.
- Claiming automated incentives before payment infrastructure exists.

### Respondent

Useful reference:

- Paid participant recruitment.
- Quality and verification messaging.
- Screen, invite, schedule, and pay as one workflow.
- Show-up rate and participant quality are treated as trust outcomes.

Hypofit adaptation:

```text
Trust and attendance should be visible early, even if the first implementation is lightweight.
```

Apply to:

- Respondent profile confidence.
- Founder trust cues.
- Applicant answer quality.
- No-show policy explanation.
- Completion/no-show records as future quality signals.

Avoid:

- Overpromising verified participants.
- Showing fake ratings before there is real data.
- Building a full trust score before the data model supports it.

### Material Adaptive Layout

Useful reference:

- Compact, medium, and expanded layouts.
- Navigation changes by screen size.
- Larger screens can reveal more panes.
- Layout should flex between breakpoints, not lock to fixed desktop or mobile frames.

Hypofit adaptation:

```text
Use mobile single-task screens, tablet two-pane previews, and desktop list/detail workspaces.
```

Apply to:

- Mobile bottom navigation.
- Tablet navigation rail or condensed sidebar.
- Desktop sidebar plus list/detail.
- Responsive filters.
- Persistent detail panes only when there is enough width.

Avoid:

- Treating desktop as just a stretched mobile card list.
- Treating mobile as a compressed desktop dashboard.

### Baymard Product List UX

Useful reference:

- Lists should include enough decision information.
- Poor list items force unnecessary detail page visits.
- Sorting and filtering should match the attributes users care about.

Hypofit adaptation:

```text
Interview cards and rows must be decision objects, not title-only teasers.
```

Every opportunity list item should expose:

- Reward.
- Duration.
- Mode.
- Location or online status.
- Target customer fit.
- Schedule window.
- Screener burden.
- Current status.
- Primary next action.

## Less AI-Generated UI Rules

The redesign should remove patterns that make the interface feel generic or machine-made.

Avoid:

- Oversized hero-like headings inside work screens.
- Decorative gradient blobs or generic abstract backgrounds.
- Repeated floating cards with similar shadows.
- Empty metric cards that are not tied to user action.
- Vague AI-style copy such as `검증 인사이트를 빠르게 확보하세요`.
- Same-looking badges everywhere.
- Artificially balanced three-card sections.
- Generic chart placeholders before data exists.
- Too many accent colors with no semantic meaning.
- Cards inside cards.

Prefer:

- Product-specific Korean copy based on the user's current task.
- Real workflow labels: `지원자 검토`, `시간 조율`, `완료 확인`, `노쇼 기록`.
- Data-dense but calm layouts.
- Stable table/list rows.
- Subtle borders and state fills instead of heavy shadows.
- Clear form sections with permanent labels.
- Microcopy that explains consequences, not marketing value.
- Real empty states that create or complete an MVP action.

Example copy direction:

```text
Instead of:
  AI가 적합한 고객을 빠르게 연결해드려요

Use:
  조건에 맞는 지원자를 확인하고 인터뷰 시간을 확정하세요
```

```text
Instead of:
  고객 검증 대시보드

Use:
  모집 중인 인터뷰
  지원자 검토
  확정된 일정
```

## Visual Direction

### Tone

The product should feel:

- Trustworthy.
- Quiet.
- Operational.
- Mobile-native.
- Korean-service-friendly.
- Specific to paid customer interviews.

It should not feel:

- Crypto-like.
- Overly playful.
- Enterprise-heavy.
- Student-project unfinished.
- Template SaaS.

### Color

Use a restrained multi-semantic palette.

Recommended semantic tokens:

```text
surface/base:
  app background
  panel background
  elevated surface
  subtle surface

text:
  primary
  secondary
  muted
  inverse

brand:
  primary green
  primary pressed
  primary soft

semantic:
  info blue for online/session links
  reward amber for money/incentive
  success green for confirmed/completed
  warning amber/orange for pending/no-show risk
  danger red for rejected/no-show/destructive action
  neutral gray for closed/archived
```

Avoid a one-note green theme. The current green can remain the brand anchor, but reward, time, online mode, risk, and completion need semantic colors.

### Typography

Current app uses `Gumi Dotum` from `apps/web/src/styles.css`.

Design concern:

```text
Gumi Dotum can feel friendly and Korean, but may reduce perceived polish in dense operational UI.
```

Recommendation:

Use a more neutral app font for the production UI pass:

```text
Primary Korean UI:
  Pretendard or Noto Sans KR

Latin fallback:
  Inter or system-ui

Numbers:
  tabular-nums utility for reward, duration, counts, and schedule columns
```

Possible use of Gumi Dotum:

- Brand mark only.
- Small identity accent.
- Not as the main dense workspace font unless visual QA proves it remains readable.

### Radius And Border

Recommended:

```text
cards: 8px
buttons: 6px to 8px
inputs: 6px to 8px
chips: 999px only for small metadata pills
tables/lists: 6px row hover or straight row separators
```

Avoid:

- Large 16px to 24px radius cards.
- Pills used for every piece of UI.
- Heavy shadows around every panel.

### Spacing

Use a tighter operational spacing scale.

Recommended:

```text
mobile page gutter: 16px
mobile card internal padding: 14px to 16px
mobile section gap: 16px to 20px

tablet page gutter: 20px to 24px
desktop page gutter: 24px to 32px
desktop dense row height: 52px to 64px
desktop table header height: 40px to 44px
```

### Icons

Use `lucide-react` consistently.

Rules:

- Navigation icons must map to familiar concepts.
- Action buttons should use icons where the meaning is conventional.
- Do not use letter-based icons for core navigation.
- Provide accessible labels for icon-only buttons.
- Use icons to clarify mode, reward, schedule, location, and status.

Recommended icon mapping:

```text
찾기: Search
내 신청: ClipboardList or Send
내 모집: BriefcaseBusiness or Users
일정: CalendarDays
프로필: UserRound

보상: CircleDollarSign or BadgeDollarSign
시간: Clock
온라인: Video
오프라인: MapPin
지원자: UsersRound
노쇼: AlertTriangle
완료: CheckCircle2
```

## Responsive Architecture

Hypofit must be designed as one responsive product, not separate mobile and desktop products.

### Breakpoint Intent

Recommended implementation breakpoints:

```text
xs:
  320-359px
  minimum support, dense content protection

sm:
  360-479px
  common small mobile

md:
  480-767px
  large mobile and narrow foldables

tablet:
  768-1023px
  single column with optional preview panels

lg:
  1024-1279px
  two-pane layouts begin

xl:
  1280-1535px
  full desktop workspace

2xl:
  1536px+
  wider table and persistent inspector
```

Tailwind mapping:

```text
default:
  compact mobile

sm:
  larger mobile refinements

md:
  large phone / tablet-prep refinements

lg:
  split panes and sidebar

xl:
  dense desktop workspace

2xl:
  wider grids, inspector, and table columns
```

### Mobile Layout

Mobile should be task-focused:

```text
top bar:
  page title
  one local action

body:
  one primary list or one form section flow

bottom:
  fixed bottom navigation
  sticky primary action only on detail/form screens
```

Mobile rules:

- Keep bottom navigation visible after login.
- Use safe-area padding.
- Use full-width list cards.
- Use bottom sheets for filters, sort, and secondary actions.
- Use sticky CTA on detail and application screens.
- Avoid side-by-side content.
- Avoid tables.
- Avoid metric grids.
- Keep touch targets at least 44px.
- Ensure Korean labels do not wrap awkwardly inside buttons.

### Tablet Layout

Tablet should bridge mobile and desktop:

```text
portrait:
  mobile-like navigation
  wider cards
  optional contextual side sheet

landscape:
  navigation rail
  list + detail if width allows
```

Tablet rules:

- Do not show a cramped desktop sidebar too early.
- Prefer a rail or compact sidebar at 768px+ only when content remains readable.
- Use two-pane only if each pane keeps a practical minimum width.

Minimum pane widths:

```text
list pane: 360px
detail pane: 420px
inspector pane: 320px
```

### Desktop Layout

Desktop should be a workspace:

```text
left:
  navigation

center:
  list/table/form

right:
  detail, preview, applicant profile, or session inspector
```

Desktop rules:

- Use table or dense list for founder review.
- Use card/list hybrid for respondent discovery.
- Keep filters visible where they drive decisions.
- Keep selected detail visible without full page navigation.
- Put primary action in page header or inspector, not hidden below the fold.
- Use hover states, focus states, and keyboard order intentionally.

## Information Architecture

Use one role-aware navigation model:

```text
찾기
내 신청
내 모집
일정
프로필
```

## Canonical Shell Decision

This section resolves the current disagreement across active design documents.

Canonical decision:

```text
Mobile:
  bottom navigation with five destinations

Tablet:
  bottom navigation in portrait
  compact navigation rail in landscape when width allows

Desktop:
  compact left sidebar or rail
  not a marketing top nav
  not a metrics dashboard sidebar
```

Reason:

- Hypofit is an installed PWA and mobile usage must feel native enough.
- Founder work still needs to be reachable on mobile.
- Desktop users need persistent navigation while comparing lists and details.
- A marketing-style top nav does not fit the logged-in product workflow.
- The problem with the current UI is not the existence of a sidebar; it is that the sidebar and page content currently feel like a generic dashboard.

Desktop shell shape:

```text
left rail:
  brand
  primary destinations
  profile/account action

main content:
  page-specific list, table, form, or agenda

right inspector:
  selected interview, applicant, session, or preview
```

Mobile shell shape:

```text
top bar:
  page title
  one local action

content:
  single task flow

bottom nav:
  찾기
  내 신청
  내 모집
  일정
  프로필
```

Implementation note:

```text
Do not build a separate desktop IA and mobile IA.
Use the same destinations, then adapt layout density and navigation surface by breakpoint.
```

### Role Handling

MVP recommendation:

```text
Show all five destinations after login.
Use contextual empty states when a user has no founder or respondent activity.
Do not hide founder work behind a hard mode switch yet.
```

Rationale:

- Early users may be both founders and respondents.
- A hard role switch can hide important pending actions.
- Empty states teach the product without adding onboarding screens.

Add a light role context control only where it reduces confusion:

```text
Profile:
  내 역할
  응답자 프로필
  창업자 프로필

Home/overview later:
  오늘 할 일
  응답자 할 일
  창업자 할 일
```

## Screen-Level High-Fidelity Plan

### Mobile / Explore

Goal:

```text
Respondent can decide which interview is worth opening in under 5 seconds.
```

Required improvements:

- Replace generic dashboard elements with opportunity feed.
- Show reward, duration, mode, location, and target fit on every card.
- Add filter chips for `온라인`, `오프라인`, `오늘 가능`, `보상 높은 순`, `내 경험과 가까움`.
- Show screening burden: `질문 3개`, `예상 2분`.
- Show founder/service context briefly.
- Use saved/hidden actions as secondary icon buttons.

Card hierarchy:

```text
top:
  domain badge
  mode badge

main:
  interview title
  target customer summary

decision row:
  reward
  duration
  location or online

footer:
  schedule window
  screener count
  apply status or CTA
```

### Mobile / Interview Detail

Goal:

```text
Respondent understands commitment and trust before applying.
```

Required sections:

- Header with title, service domain, and founder profile image/name.
- Reward and duration summary.
- Mode/location block.
- Target fit checklist.
- Screening questions preview.
- Schedule options.
- Participation and reward note.
- Sticky apply CTA.

Trust microcopy:

```text
완료 확인 후 사례비 지급 방식은 모집자가 안내합니다.
인터뷰 전 일정 확정이 필요합니다.
노쇼 기록은 이후 참여 품질 판단에 사용될 수 있습니다.
```

Do not imply automated payout until payment exists.

### Mobile / My Applications

Goal:

```text
Respondent can see what is pending, selected, rejected, scheduled, or completed.
```

Required states:

- `검토 중`
- `선정됨`
- `반려됨`
- `일정 확정`
- `완료 대기`
- `완료`
- `노쇼 기록`

Layout:

- Group by next action.
- Put scheduled sessions above passive history.
- Show exact time and mode.
- Show CTA for `일정 확인`, `완료 확인`, `문의하기 later`.

### Mobile / Founder Posts

Goal:

```text
Founder can manage recruitment from a phone.
```

Required improvements:

- Show recruitment cards with applicant count and next action.
- Separate `검토 필요`, `모집 중`, `일정 예정`, `종료`.
- Add quick action `지원자 보기`.
- Add compact status timeline per post.

Post card hierarchy:

```text
title
target customer
reward/duration/mode
applicant count
next session if scheduled
next action button
```

### Mobile / Applicant Review

Goal:

```text
Founder can make a selection decision without desktop.
```

Required sections:

- Applicant profile image/name.
- Matching evidence.
- Screening answers.
- Availability chips.
- Location/mode fit.
- Previous completion/no-show placeholder if data exists later.
- Actions: `선정`, `보류`, `반려`.

Important:

Avoid fake AI match scores. If a fit indicator is needed, base it on explicit criteria:

```text
필수 조건 4개 중 3개 일치
오프라인 가능
최근 6개월 내 관련 경험 있음
```

### Mobile / Post Creation

Goal:

```text
Founder can publish a clear recruitment post without feeling like they are filling a long admin form.
```

Required flow:

```text
1. 인터뷰 목적
2. 찾는 사람
3. 사례비와 시간
4. 진행 방식과 장소
5. 질문
6. 미리보기
```

Rules:

- Use permanent labels.
- Use examples below fields.
- Save draft state visibly.
- Validate section by section.
- Use sticky next/publish CTA.
- Keep respondent preview accessible at the end on mobile.

### Mobile / Schedule

Goal:

```text
Both roles can understand confirmed and pending sessions.
```

Required layout:

- `오늘/이번 주` priority.
- Pending confirmations first.
- Scheduled sessions second.
- Completed history below.
- Each item shows role context: `내가 응답자`, `내가 모집자`.

Required actions:

- `시간 확정`
- `링크 열기`
- `완료 표시`
- `노쇼 표시`

### Mobile / Profile

Goal:

```text
User identity, role profile, and trust state are understandable.
```

Required improvements:

- Profile image upload surface using `profileimage` bucket.
- Basic account info.
- Respondent profile completeness.
- Founder profile completeness.
- Participation history placeholder.
- Settings and logout.

Avoid:

- Making profile only an auth panel.
- Hiding image upload in a dense form.

### Web / Explore

Goal:

```text
Respondent can compare opportunities efficiently on desktop.
```

Recommended layout:

```text
sidebar or top nav
filter rail
opportunity list
selected opportunity detail panel
```

Required improvements:

- Persistent filters.
- Sorting by reward, schedule proximity, relevance, and newest.
- List rows/cards carry decision data.
- Detail panel includes apply CTA and screener preview.

### Web / Founder Workspace

Goal:

```text
Founder can process applicants and sessions faster than on mobile.
```

Recommended layout:

```text
left nav
post list or status views
main applicant table
right applicant inspector
```

Required table columns:

```text
applicant
target fit
key experience
mode/location fit
available time
answer status
application status
next action
```

Use a detail inspector for:

- Full screening answers.
- Profile image.
- Contact/session state.
- Founder notes later.
- Selection and rejection actions.

### Web / Post Creation

Goal:

```text
Founder can write and refine a post with respondent-facing preview.
```

Recommended layout:

```text
left:
  section navigation

center:
  form

right:
  live preview
```

Required:

- Draft saved status.
- Section validation.
- Respondent card preview.
- Detail page preview.
- Clear publish readiness checklist.

### Web / Schedule

Goal:

```text
Founder and respondent can manage sessions without a complex calendar product.
```

MVP layout:

- Agenda list.
- Status filters.
- Session detail inspector.
- Completion/no-show actions.

Defer:

- Full drag-and-drop calendar.
- Google/Outlook integration.
- Automated reminders.

### Web / Profile

Goal:

```text
Profile is a trust and role configuration surface.
```

Required:

- Profile image uploader.
- Account identity.
- Respondent profile fields.
- Founder profile fields.
- Trust/activity placeholders.
- Storage and privacy notes where needed.

## Component System Plan

Create a small product-specific component system instead of styling every screen ad hoc.

Recommended frontend structure:

```text
apps/web/src/
  app/
    App.tsx
    routes.tsx later
  pages/
    ExplorePage.tsx
    ApplicationPage.tsx
    FounderPostsPage.tsx
    SchedulePage.tsx
    ProfilePage.tsx
  features/
    auth/
    interviews/
    applications/
    sessions/
    profiles/
  shared/
    api/
    supabase/
    ui/
      app-shell/
      buttons/
      forms/
      navigation/
      status/
      data-display/
```

Initial shared UI components:

```text
AppShell
MobileBottomNav
DesktopSidebar
ResponsivePageHeader
RoleContextBadge
OpportunityCard
OpportunityRow
OpportunityDetailPanel
RewardMeta
ModeMeta
TargetFitSummary
ApplicationStatusBadge
SessionStatusBadge
TrustSignal
ApplicantRow
ApplicantInspector
ScheduleAgendaItem
ProfileAvatarUploader
FormSection
StickyActionBar
EmptyState
LoadingState
ErrorState
```

Rules:

- Components should encode product meaning, not just visual containers.
- Avoid generic `Card` everywhere.
- Prefer `OpportunityCard`, `ApplicantRow`, and `SessionAgendaItem` over anonymous layout wrappers.
- Keep API calls outside presentational components.

## Tailwind Migration Plan

### Phase 0. Confirm Design Tokens

Before installing Tailwind, define the token set in Figma and code:

```text
colors
typography
spacing
radius
shadow
status colors
z-index layers
breakpoints
```

### Phase 1. Install Tailwind For Vite

Use the current Tailwind Vite setup pattern:

```text
tailwindcss
@tailwindcss/vite
```

Add Tailwind to `vite.config.ts`, import Tailwind in the main stylesheet, and keep existing CSS only as a temporary compatibility layer during migration.

Do not add new page-level CSS during this migration.

Remove current custom CSS progressively after migrated screens are visually verified.

### Phase 2. Add Utility Helpers

Recommended helpers:

```text
clsx
tailwind-merge
class-variance-authority
```

Use these only where component variants need them:

- Buttons.
- Badges.
- Inputs.
- Status components.
- Navigation items.

### Phase 3. Add Radix/shadcn Selectively

Add primitives only when the screen requires the behavior:

```text
Dialog:
  confirmation, destructive actions

Sheet:
  mobile filters, mobile applicant detail, mobile form preview

Tabs:
  status groups and profile sections

Popover:
  sort, quick filters

Select:
  form option fields

Tooltip:
  icon-only controls
```

Do not bulk-add a large component set.

### Phase 4. Migrate Shell And Navigation

Replace global CSS shell with Tailwind-driven components:

```text
AppShell
MobileBottomNav
DesktopSidebar
PageHeader
```

Acceptance:

- Mobile bottom nav works at 320px, 360px, 390px, and 430px.
- Desktop sidebar does not crush content at 1024px.
- Content has safe-area bottom padding on mobile.
- Focus state is visible.

### Phase 5. Migrate Product Components

Implement:

- Opportunity cards/rows.
- Status badges.
- Reward/mode/time metadata.
- Profile avatar uploader.
- Form sections.
- Sticky actions.

Acceptance:

- No repeated ad hoc status styling.
- Long Korean labels do not overflow.
- Reward and time use consistent number formatting.

### Phase 6. Migrate Screens

Recommended order:

```text
1. Profile
2. Explore
3. Interview Detail
4. My Applications
5. Founder Posts
6. Applicant Review
7. Post Creation
8. Schedule
```

Rationale:

- Profile image work is already active.
- Explore defines the main card/list language.
- Founder and schedule screens can reuse status and person components.
- Post creation benefits from form primitives after the rest is stable.

## Figma Execution Plan

Update Figma before coding the full high-fidelity pass.

### Required Figma Sections

Create or refine sections:

```text
01 Foundations
02 Shared Components
03 Mobile Respondent
04 Mobile Founder
05 Mobile Shared
06 Web Respondent
07 Web Founder
08 Responsive Behavior Notes
```

### Foundation Updates

Add:

- Color tokens.
- Type scale.
- Spacing scale.
- Radius rules.
- Status color definitions.
- Icon mapping.
- Touch target rules.
- Breakpoint notes.

### Component Updates

Build components with variants:

```text
Navigation item:
  mobile active
  mobile inactive
  desktop active
  desktop inactive

Status badge:
  applied
  reviewing
  selected
  rejected
  scheduled
  completed
  no_show

Opportunity card:
  default
  applied
  selected
  closed

Applicant row:
  new
  shortlisted
  selected
  rejected

Button:
  primary
  secondary
  ghost
  danger
  icon
  disabled

Form field:
  default
  focused
  error
  disabled
```

### Frame Updates

Update high-fidelity frames:

```text
Mobile Explore
Mobile Detail
Mobile Applications
Founder Posts
Applicant Review
Mobile Post Creation
Mobile Schedule
Session Result
Mobile Profile

Web Explore
Founder Workspace
Post Creation
Web My Applications
Web Applicant Review
Web Schedule
Web Profile
```

Each frame should include realistic Korean data:

- Long title.
- Short title.
- Online interview.
- Offline interview.
- Mixed mode interview.
- High reward.
- Low reward.
- Pending application.
- Selected application.
- Rejected application.
- No-show risk state.
- Profile image present.
- Profile image fallback.

### Responsive Notes In Figma

Add a small note block near major screens:

```text
Mobile:
  single column
  bottom nav
  sticky CTA

Tablet:
  wider card list
  optional side sheet

Desktop:
  split list/detail
  persistent filters
  inspector panel
```

## UX Acceptance Criteria

### Product Clarity

The user should understand within 5 seconds:

- Whether they are browsing, applying, recruiting, scheduling, or editing profile.
- Whether they are acting as respondent or founder.
- What the primary next action is.
- What reward, time, mode, and status apply.

### Mobile Quality

Required checks:

- 320px width has no broken layout.
- 360px width is comfortable.
- 390px and 430px widths look intentional.
- Bottom navigation does not cover content.
- Sticky CTA does not overlap forms.
- Touch targets are at least 44px.
- Long Korean text wraps cleanly.
- Profile image uploader remains usable.

### Desktop Quality

Required checks:

- 1024px has a usable layout.
- 1280px supports list/detail.
- 1440px supports denser workspace.
- 1536px+ does not stretch content awkwardly.
- Tables have stable columns.
- Detail inspector remains readable.
- Filters and primary actions are visible.

### Accessibility

Required checks:

- Buttons are real buttons.
- Links are real links.
- Form labels are persistent.
- Error text is adjacent to fields.
- Focus states are visible.
- Dialogs/sheets trap focus when open.
- Icon-only buttons have accessible labels.
- Status is not communicated by color alone.
- Tables use table semantics when they are tabular data.

### PWA Fit

Required checks:

- Mobile app-like navigation works in installed PWA.
- Safe-area padding is applied.
- Offline state is clear and not decorative.
- Loading states do not shift layout.
- Auth state and API error states are understandable.

## Implementation Acceptance Criteria

After the implementation pass, run at minimum:

```bash
cd apps/web
pnpm run build
pnpm run lint
pnpm run test
```

Since Tailwind is required for the UI pass, verify:

- Production build includes styles.
- Vite config uses the Tailwind plugin.
- Remaining global CSS is limited to imports, fonts, variables, and base styles.
- Existing global CSS does not override Tailwind unexpectedly.
- Purge/content scanning does not remove dynamic variants.
- Generated shadcn components, if added, are committed as source.

Visual QA target:

```text
desktop:
  1440 x 1000
  1280 x 900
  1024 x 768

mobile:
  430 x 932
  390 x 844
  360 x 800
  320 x 700
```

## Execution Phases

### Phase 1. Reference-Based Figma Refinement

Deliverables:

- Updated foundations.
- Updated shared components.
- Refined mobile frames.
- Refined desktop frames.
- Responsive notes.

Done when:

- The screen no longer reads as a generic dashboard.
- Role context is clear.
- Trust/reward/schedule/no-show surfaces are visible.
- Mobile and desktop have different layout strengths but the same product model.

### Phase 2. Tailwind Foundation

Deliverables:

- Tailwind installed.
- Theme tokens added.
- Global base styles minimized.
- Shared utility helpers added.
- Initial `shared/ui` structure created.

Done when:

- Existing app still builds.
- One migrated shell route renders correctly.
- No secrets or production URLs are hardcoded.

### Phase 3. Responsive Shell

Deliverables:

- Mobile bottom navigation.
- Desktop sidebar or rail.
- Page headers.
- Safe-area layout.
- Role-aware navigation.

Done when:

- Navigation behaves correctly from 320px to desktop.
- Current active destination is clear.
- No content is hidden behind fixed UI.

### Phase 4. Respondent Flow

Deliverables:

- Explore list.
- Interview detail.
- Application flow.
- My applications.

Done when:

- Respondent can find, inspect, apply, and track status.
- Decision data is visible before opening detail.
- Application status is not ambiguous.

### Phase 5. Founder Flow

Deliverables:

- Founder post list.
- Applicant review.
- Post creation.
- Session scheduling.
- Completion/no-show marking.

Done when:

- Founder can create a post and review applicants from mobile.
- Desktop improves review speed through table/list/detail layout.
- No-show and completion states are explicit.

### Phase 6. Profile And Trust

Deliverables:

- Profile image upload polish.
- Profile completeness.
- Founder/respondent profile sections.
- Trust and attendance placeholders grounded in real data.

Done when:

- User identity feels real.
- Profile image upload is visible and understandable.
- The app does not invent fake ratings or fake trust scores.

### Phase 7. QA And Polish

Deliverables:

- Responsive screenshots.
- Build/typecheck/test results.
- Accessibility pass.
- Copy pass.
- Empty/error/loading states.

Done when:

- Layout is stable at target viewport sizes.
- Korean copy feels product-specific.
- No AI-template visual patterns remain in core screens.

## Open Decisions

### Font

Decision needed:

```text
Use Pretendard/Noto Sans KR as main UI font, or keep Gumi Dotum?
```

Recommendation:

Use Pretendard or Noto Sans KR for app UI. Keep Gumi Dotum only if visual QA proves it feels premium enough in dense UI.

### shadcn/ui Scope

Decision needed:

```text
Use shadcn/ui for common primitives, or Radix directly?
```

Recommendation:

Use shadcn/ui selectively for speed, but restyle heavily and avoid default sample composition. Use Radix directly if a component needs custom product behavior.

### Payment Wording

Decision needed:

```text
How exactly should MVP reward/payment responsibility be described?
```

Recommendation:

Until payment is automated, state that the founder provides the reward after completion according to the posted method. Do not imply escrow.

### Role Navigation

Decision needed:

```text
Always show all five tabs, or hide founder tabs for respondent-only users?
```

Recommendation:

Show all five after login in the MVP. Use empty states to teach role expansion.

## Source References

- Linear team pages and workspace navigation: https://linear.app/docs/default-team-pages
- Attio lists, table views, kanban views, and object/list-entry distinction: https://attio.com/help/reference/attio-101/attios-data-model/understanding-lists
- User Interviews moderated research recruiting, targeting, screening, scheduling, and incentives: https://www.userinterviews.com/interviews-moderated-research
- Respondent user interview participant recruiting, screening, scheduling, payment, and attendance quality messaging: https://www.respondent.io/qualitative-research-user-interview
- Material adaptive layout guidance: https://developer.android.com/codelabs/adaptive-material-guidance
- Baymard product list and filtering UX: https://baymard.com/research/ecommerce-product-lists
- Tailwind CSS Vite installation: https://tailwindcss.com/docs/guides/vite
- shadcn/ui Vite installation: https://ui.shadcn.com/docs/installation/vite
- Radix UI Primitives accessibility/customization positioning: https://www.radix-ui.com/primitives/docs
