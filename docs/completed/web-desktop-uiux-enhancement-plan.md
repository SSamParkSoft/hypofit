# Web/Desktop UI/UX Enhancement Plan

Status: completed

Last updated: 2026-05-19

Completion note:

```text
The desktop Figma enhancement pass is complete enough to guide implementation:
web explore, founder workspace, applicant review, schedule, profile, and
component samples were created and screenshot-checked. Remaining implementation
work now lives in the Tailwind UI implementation plan.
```

Related documents:

- `docs/completed/high-fidelity-uiux-reference-responsive-plan.md`
- `docs/completed/product-design-redesign-plan.md`
- `docs/completed/mobile-first-responsive-uiux-plan.md`
- `docs/mvp-scope.md`
- `docs/architecture.md`
- `docs/repository-structure.md`

Figma target:

```text
File: https://www.figma.com/design/dB1sHJHkY8KUUfJgmxQOZV/
Page: Hypofit
Page node: 4464:398
```

Current Figma web frames:

```text
Web Explore: 4467:195
Founder Workspace: 4467:304
Post Creation: 4467:378
```

Current implementation reference:

```text
apps/web/src/app/App.tsx
apps/web/src/styles.css
apps/web/src/shared/api/types.ts
```

## Purpose

This document defines the desktop/web UI/UX enhancement plan for Hypofit.

The mobile pass now covers the core MVP loop with mobile-first screens. The next design problem is not to make the web page look like a larger mobile app. Desktop should use the extra space to make the interview matching workflow more powerful:

```text
Mobile:
  one task at a time
  fast action
  bottom navigation
  compact cards

Desktop:
  compare more items
  keep list and detail visible together
  review applicants faster
  write clearer posts with preview
  manage schedules and status without losing context
```

The web experience should feel like a focused operations workspace for customer discovery, not a marketing page and not a generic dashboard.

## Current State

The current web app is a useful scaffold, but the layout still reads as a general dashboard:

```text
left sidebar
  -> topbar
  -> four metric cards
  -> recruitment post list
  -> workflow side panel
```

Current strengths:

- It already uses React, TypeScript, Vite, TanStack Query, Supabase auth, and lucide icons.
- It already has a persistent sidebar and web-friendly grid structure.
- It already exposes the first core data object, `InterviewPost`.
- It already avoids a marketing landing page.

Current gaps:

- The first screen does not yet behave like an interview marketplace or research recruiting workspace.
- Desktop does not yet use split views for list/detail comparison.
- Founder and respondent jobs are mixed in a way that feels like an admin dashboard.
- Application review, applicant comparison, scheduling, and no-show tracking are not visible enough.
- Post creation is not yet a full writing workflow with respondent-facing preview.
- The web layout has not yet been separated into reusable product components.
- The mobile 5-tab IA is not yet mapped cleanly to desktop navigation.

## Design Thesis

Desktop Hypofit should be a comparison-first workspace.

The web experience should answer these questions quickly:

For respondents:

```text
Which interviews fit me?
What is the reward?
How much time will it take?
Is the mode online, offline, or both?
Why am I eligible?
What do I need to answer?
What is my application status?
```

For founders:

```text
Which posts need attention?
Who applied?
Who matches my target customer best?
What answers prove fit?
What time options work?
Which sessions are waiting for completion or no-show marking?
```

Desktop should therefore prioritize:

- Persistent navigation.
- Persistent filters.
- List and detail views on one screen.
- Applicant comparison.
- Inline decision actions.
- Side-by-side form writing and preview.
- Status visibility.
- Keyboard and pointer efficiency.

## External Reference Principles

The web redesign should use these reference principles.

### Desktop Lists Must Carry Decision Information

Baymard desktop UX research highlights that users struggle when list items do not provide enough useful information, because they must repeatedly move between list and detail pages. Hypofit should treat interview list rows like decision objects, not simple title rows.

For Hypofit this means every desktop list row should show:

```text
title
target customer condition
reward
duration
mode
location or online marker
schedule window
screening burden
application/recruitment status
next action
```

### Desktop Should Reveal More Structure

Material responsive guidance describes how larger screens can reveal hidden UI, transform navigation, and divide side navigation, list content, and detail content into one view. Hypofit should use this directly:

```text
mobile detail page
  -> desktop right detail panel

mobile filter sheet
  -> desktop persistent filter rail

mobile single list
  -> desktop list + selected detail

mobile post form page
  -> desktop form + live respondent preview
```

### Research Recruiting Needs Screening, Profile Fit, And Scheduling

Research recruiting platforms emphasize screening, participant profile data, qualification, scheduling, reminders, and participation management. Hypofit MVP should not copy enterprise research suites, but it should expose the minimum visible signals:

```text
screening answer quality
experience fit
availability match
mode fit
distance or online fit
selection status
session status
completion/no-show status
```

### Forms Need Persistent Labels And Clear Recovery

Baymard form research warns against relying on inline labels for anything complex. Hypofit post creation and application forms are not simple one-field forms, so labels must stay visible.

Rules:

- Every field gets a permanent label.
- Placeholder text is only an example or hint.
- Validation error text appears near the field.
- Long forms are grouped into sections.
- Draft save state is always visible.
- Preview updates should not hide the form.

### Accessibility Is Part Of The Web Design

Desktop screens will use lists, tables, tabs, dialogs, menus, and possibly grid-like applicant comparison. WAI-ARIA APG patterns should shape implementation where native HTML is not enough.

Rules:

- Use native buttons, links, forms, labels, fieldsets, and tables where possible.
- Tables are for real tabular comparison, not layout.
- Interactive tables must have keyboard strategy before implementation.
- Tabs need correct tablist/tab/tabpanel semantics when used.
- Menus, dialogs, disclosures, and tooltips should follow accessible patterns.
- Focus states must be visible.

## Product Information Architecture

The desktop IA should mirror the mobile top-level destinations so users do not learn two products.

Recommended top-level destinations:

```text
찾기
내 신청
내 모집
일정
프로필
```

Desktop navigation mapping:

```text
Mobile bottom nav
  -> Desktop left sidebar or top-left rail

Mobile top page actions
  -> Desktop page header actions

Mobile bottom sheets
  -> Desktop side panels or inline popovers

Mobile detail screen
  -> Desktop right-side detail pane
```

Do not add a separate `대시보드` primary destination in the MVP. A dashboard can be useful later, but right now it risks hiding the actual workflow.

## Desktop Layout System

### Breakpoints

Use these design breakpoints as Figma and CSS targets:

```text
360px:
  minimum mobile check

390px:
  default mobile frame

768px:
  tablet portrait / compact web

1024px:
  tablet landscape / narrow laptop

1280px:
  standard desktop

1440px:
  primary Figma desktop frame

1728px:
  wide desktop stress test
```

### Desktop Shell

Primary desktop shell:

```text
left navigation rail: 232-260px
content area: fluid
right contextual panel: 360-440px when useful
page gutters: 24-32px
section gap: 16-24px
card radius: 8px
```

Recommended 1440px layout:

```text
1440
  left nav: 248
  content gutter: 28
  main content: 700-760
  detail panel: 360-420
  right gutter: 28
```

Wide desktop should not stretch cards endlessly. Add max widths per panel and use extra space for comparison/detail, not for oversized typography.

### Desktop Density

Hypofit is an operational product. The desktop UI should be compact but not cramped.

Recommended density:

```text
page title: 28-32px
section title: 18-22px
card title: 15-17px
body: 13-15px
metadata: 12-13px
buttons: 36-42px height
table rows: 56-76px
cards: 8px radius
```

Avoid:

- oversized hero blocks
- marketing-style feature sections
- decorative illustrations
- nested cards inside cards
- very large metric cards above the workflow
- one-note green-only palette

## Web Screen Map

The web experience should expand the 9 mobile frames into fewer but richer desktop workspaces.

Recommended web frames:

```text
Web Explore
Web Interview Detail
Web My Applications
Web Founder Workspace
Web Applicant Review
Web Post Creation
Web Schedule
Web Profile
```

Existing Figma web frames should be updated:

```text
Web Explore
  -> rebuild as respondent discovery split view

Founder Workspace
  -> rebuild as founder recruitment management workspace

Post Creation
  -> rebuild as form + live preview composer
```

New Figma web frames should be added:

```text
Web My Applications
Web Applicant Review
Web Schedule
Web Profile
```

## Screen 1: Web Explore

### Goal

Help respondents compare interview opportunities and choose one without excessive page switching.

### Layout

Use a three-zone desktop layout:

```text
left filter rail
center interview list
right selected interview detail
```

At 1440px:

```text
left filter rail: 240px
center list: minmax(460px, 1fr)
right detail: 420px
```

At 1024-1279px:

```text
left filter rail collapses into top filter bar
center list remains
right detail remains if width allows
```

Below 900px:

```text
use mobile layout
```

### Left Filter Rail

Filter groups:

```text
Keyword
Mode
Reward
Duration
Location
Time
Experience fit
Status
```

Detailed filter controls:

```text
keyword search:
  service, experience, region search

mode:
  all
  online
  offline
  both

reward:
  all
  10,000+
  15,000+
  20,000+

duration:
  under 30 minutes
  30-45 minutes
  over 45 minutes

location:
  online only
  near me
  Seoul / 수도권
  custom location

time:
  weekday evening
  weekend morning
  weekend evening

fit:
  profile match
  new to me
  previously applied hidden
```

Filter rail behavior:

- Show selected filter count.
- Provide clear reset action.
- Keep controls compact.
- Use checkboxes/toggles/chips for explicit filter logic.
- Avoid hidden advanced filters in MVP.

### Center Interview List

List row data:

```text
status badge
mode badge
reward
duration
schedule window
title
service summary
target condition
fit reason
screening question count
location/mode note
CTA
```

Recommended row hierarchy:

```text
top row:
  status + mode + reward

main:
  title
  target condition

metadata:
  duration
  time window
  location
  question count

bottom:
  fit reason
  detail/apply action
```

Selection behavior:

- Clicking a row selects it and updates the right detail panel.
- `상세 보기` opens full detail route only when needed.
- Primary CTA in list is `신청 준비` or `신청하기` depending on state.
- Previously applied posts show `신청 완료` and link to `내 신청`.

States:

```text
loading:
  skeleton rows

empty:
  no matching interviews
  show filter reset and profile completion CTA

error:
  inline retry
  do not replace entire app shell
```

### Right Detail Panel

Detail panel sections:

```text
selected post summary
target customer condition
why this may fit you
reward/time/mode
screening questions preview
available schedule options
founder/team trust hints
primary action
```

The detail panel should avoid duplicating the full mobile detail page. It should support fast decision-making:

```text
Can I do this?
Is it worth my time?
What will I need to answer?
```

Sticky behavior:

- Keep primary action visible within the panel.
- Panel content scrolls independently when needed.
- Avoid page-level horizontal scroll.

## Screen 2: Web Interview Detail And Application

### Goal

Let respondents review the full opportunity and apply without losing context.

### Layout

Use two columns:

```text
main detail: 680-760px
application panel: 360-420px
```

Main detail:

```text
title
service summary
problem hypothesis
target condition
interview mode
reward
duration
location or meeting style
schedule options
screening question preview
participation expectations
```

Application panel:

```text
profile fit summary
screening answers
availability selection
consent/confirmation
submit button
```

Form rules:

- Labels are always visible.
- Question helper text explains what a good answer includes.
- Availability input should use predefined chips first.
- Long free text should have a clear expected length.
- Submit button remains visible inside the right panel.

Validation:

```text
missing answer
  -> field-level error

no availability selected
  -> availability group error

already applied
  -> show existing status instead of form

not logged in
  -> show login prompt in application panel
```

## Screen 3: Web My Applications

### Goal

Let respondents track application and session status.

### Layout

Use a list/detail layout:

```text
left or center: application list
right: selected application status detail
```

Application list row:

```text
post title
status
reward
mode
submitted date
next action
```

Status groups:

```text
검토 중
선정됨
일정 확정
완료
거절/취소
```

Right detail panel:

```text
application status stepper
submitted answers
selected schedule
founder message placeholder
session detail
completion/no-show status
```

Actions:

```text
select schedule
view meeting info
cancel application
confirm completion
contact support placeholder
```

MVP note:

Do not add complex messaging. A simple session detail and status trail is enough.

## Screen 4: Web Founder Workspace

### Goal

Let founders manage recruitment without jumping between many pages.

### Layout

Use a founder workbench:

```text
left: my recruitment posts
center: selected post pipeline
right: urgent actions / selected applicant summary
```

Recommended 1440px layout:

```text
post list: 320px
pipeline/applicant list: minmax(520px, 1fr)
detail/actions: 360px
```

### Left Post List

Each post row:

```text
title
status
applicant count
selected count
scheduled count
needs attention marker
last updated
```

Post status groups:

```text
draft
open
reviewing
scheduling
completed
closed
```

CTA:

```text
모집글 만들기
```

### Center Pipeline

Pipeline can be either grouped rows or simple columns.

MVP recommendation:

Use grouped rows, not drag-and-drop Kanban.

Reason:

- Drag-and-drop adds implementation complexity.
- Status changes require explicit business rules.
- Applicant review needs reading, not just moving cards.

Groups:

```text
신규 신청
검토 중
선정됨
일정 조율
완료/노쇼
```

Applicant row:

```text
name
experience fit
answer summary
available time match
mode/location fit
status
quick actions
```

Quick actions:

```text
선정
보류
거절
일정 제안
```

### Right Action Panel

Shows one of:

```text
selected applicant detail
selected post summary
next operational actions
empty state when nothing selected
```

Applicant detail:

```text
profile summary
screening answers
availability
mode preference
distance/location
trust/no-show placeholder
decision buttons
```

Founder should be able to decide without opening a new full page in most cases.

## Screen 5: Web Applicant Review

### Goal

Support deeper founder comparison when there are many applicants.

### Layout

Use table/list hybrid:

```text
top: post summary and filters
main: applicant comparison table
right: selected applicant detail drawer/panel
```

Applicant comparison columns:

```text
Applicant
Fit reason
Screening answer summary
Availability
Mode
Location/distance
Status
Actions
```

Table rules:

- Use real `table` semantics if it is mostly read-only comparison.
- Use buttons inside cells only for essential row actions.
- Keep row actions visible.
- Do not rely only on colored status.
- Provide text status labels.
- Make sorting explicit.

Filters:

```text
all
recommended
time matched
online possible
offline nearby
unreviewed
selected
rejected
```

Bulk actions are out of scope for MVP unless applicant volume proves high.

## Screen 6: Web Post Creation

### Goal

Help founders write a clear interview recruitment post and see how respondents will evaluate it.

### Layout

Use a two-column composer:

```text
left: structured form
right: live respondent preview
bottom or top: save/publish status
```

Recommended widths:

```text
form column: 680-760px
preview column: 380-440px
```

### Form Sections

Section 1: Service And Hypothesis

```text
service name
short service summary
problem hypothesis
what needs to be validated
```

Section 2: Target Customer

```text
must-have experience
nice-to-have experience
excluded respondents
location/domain constraints
```

Section 3: Interview Offer

```text
reward amount
duration
mode
offline location if needed
schedule options
```

Section 4: Screening Questions

```text
question 1
question 2
question 3 optional
expected answer guidance
```

Section 5: Publishing Review

```text
respondent-facing card preview
founder checklist
missing required fields
draft/open status
```

### Right Preview Panel

Preview should show:

```text
respondent card
detail page summary
screening question preview
reward/time/mode badges
target condition
```

Preview rules:

- Update as the founder types.
- Highlight missing information.
- Keep preview scroll independent.
- Show exactly what the respondent sees, not internal founder notes.

### Validation Rules

Required before publish:

```text
title
service summary
target condition
reward
duration
mode
at least one schedule option
at least one screening question
```

Validation style:

- Inline field error.
- Section-level missing count.
- Publish button disabled only when errors are clear.
- Draft save allowed even when publish requirements are incomplete.

## Screen 7: Web Schedule

### Goal

Manage confirmed sessions and scheduling tasks for both roles.

### Layout

Use schedule workbench:

```text
left: status/date filter
center: session list or timeline
right: selected session detail
```

Session groups:

```text
needs schedule
scheduled today
upcoming
waiting completion
completed
no-show
canceled
```

Session row:

```text
post title
participant/founder
scheduled time
mode
meeting link/place
status
next action
```

Detail panel:

```text
session summary
participant/founder info
available time options
meeting info
completion/no-show actions
status history
```

MVP scheduling principle:

Use simple proposed slots first. Do not build a full calendar integration in the MVP.

## Screen 8: Web Profile

### Goal

Manage account, role, experience tags, founder profile, respondent profile, and trust signals.

### Layout

Use settings-style sections:

```text
account summary
role profile
respondent experience
founder information
availability
trust and attendance
auth/session
```

Respondent section:

```text
occupation
location
experience tags
available modes
available times
interests
```

Founder section:

```text
team name
service domain
startup stage
university optional
```

Trust section:

```text
completed sessions
no-show count
profile verification placeholder
```

## Component System

The web Figma pass should create or refine these reusable components.

### AppShell

Desktop:

```text
left navigation
top page header
content region
optional right detail panel
```

Mobile:

```text
top page header
content region
bottom navigation
```

### Navigation

Components:

```text
DesktopNavItem
DesktopNavSection
MobileBottomNav
RoleBadge
NotificationBadge
```

Rules:

- Use the same labels across mobile and desktop.
- Keep active state strong but not oversized.
- Show counts only when actionable.

### PageHeader

Variants:

```text
default
with primary action
with tabs
with search
with status summary
```

### FilterPanel

Variants:

```text
persistent desktop rail
top compact filter bar
mobile bottom sheet later
```

### InterviewPostRow

Desktop row should be denser than mobile card.

Elements:

```text
status badge
mode badge
title
target description
reward
duration
schedule
location
fit reason
primary action
```

### InterviewDetailPanel

Reusable right panel for:

```text
selected interview detail
selected application detail
selected applicant detail
selected session detail
```

### ApplicantRow

Elements:

```text
name
fit score label, not numeric-only
experience summary
answer excerpt
availability
mode/location
status
actions
```

### StatusBadge

Status groups:

```text
draft
open
applied
reviewing
selected
rejected
scheduled
completed
no_show
closed
```

Rules:

- Color plus text.
- Do not use color alone.
- Keep status terms consistent across frontend and backend.

### FormSection

Elements:

```text
section title
description
required marker
field group
error summary
completion state
```

### EmptyState

Empty states should be specific:

```text
No matching interviews
No applications yet
No recruitment posts yet
No applicants yet
No scheduled sessions
```

Each empty state should include one useful next action.

## Visual Direction

The current palette is usable but can become too green if overused.

Recommended palette role:

```text
primary green:
  key actions, active states

warm surface:
  page background and quiet panels

white:
  cards, lists, forms

amber:
  reward and incentive

blue:
  online/interview mode

red:
  destructive, no-show, error

gray:
  metadata and disabled states
```

Do not make the web UI a dark dashboard. Keep it work-focused, light, and readable.

## Interaction Rules

### Selection

Desktop lists should support selected rows.

Rules:

- Selected row has border/background highlight.
- Detail panel updates immediately.
- URL state can be added later, but not required for first MVP implementation.

### Actions

Primary action per context:

```text
Explore:
  apply or prepare application

My Applications:
  select schedule or view status

Founder Workspace:
  review applicants or create post

Applicant Review:
  select / hold / reject

Post Creation:
  save draft / publish

Schedule:
  confirm time / mark complete / mark no-show
```

Avoid multiple equally strong primary buttons in one panel.

### Feedback

Use:

```text
inline loading
button pending state
field validation
small toast for save success
status badge updates
empty/error panels
```

Do not use blocking modals for normal status changes unless the action is destructive or irreversible.

### Keyboard

Minimum keyboard behavior:

- Sidebar nav links are reachable.
- Search input is reachable.
- Filter controls are reachable.
- List rows with actions expose real buttons/links.
- Tables have logical tab order.
- Dialogs trap focus only when modal.
- Escape closes popovers/dialogs.

## Responsive Behavior

### 1440px And Up

Use full desktop workspace:

```text
sidebar + content + detail panel
```

### 1280px

Keep list/detail, reduce side panel width:

```text
sidebar 232
content list
detail 360
```

### 1024px

Use compact desktop:

```text
sidebar remains if space allows
filters move to top bar
detail panel can become drawer or below-list panel
```

### 768px

Use tablet layout:

```text
top navigation or compact sidebar
single content column
detail opens as full panel
```

### Below 640px

Use mobile design from `mobile-first-responsive-uiux-plan.md`.

## Figma Execution Plan

### Phase 1: Desktop Foundations

Tasks:

```text
1. Add/clean desktop layout grid notes in Components.
2. Define desktop spacing and type samples.
3. Create advanced desktop navigation sample.
4. Create right detail panel sample.
5. Create dense row/card samples.
```

Output:

```text
Components
  Desktop AppShell
  Desktop Nav Item
  Desktop Page Header
  Desktop Filter Panel
  Desktop Detail Panel
  Desktop List Row
  Applicant Row
  Form Section
```

### Phase 2: Rebuild Existing Web Explore

Current `Web Explore` should be rebuilt as:

```text
left filters
center interview list
right selected interview detail/application preview
```

Required visual checks:

- It should not start with metric cards.
- It should show enough row information to compare posts.
- It should have a visible selected state.
- It should have a clear apply path.
- It should still feel related to mobile Explore.

### Phase 3: Rebuild Founder Workspace

Current `Founder Workspace` should be rebuilt as:

```text
left recruitment post list
center applicant pipeline/list
right selected applicant/action panel
```

Required visual checks:

- Founder can see which post needs attention.
- Applicant rows expose answer/availability fit.
- Decision actions are visible but not overwhelming.
- Scheduling status is visible.

### Phase 4: Rebuild Post Creation

Current `Post Creation` should be rebuilt as:

```text
left structured form
right respondent-facing live preview
sticky save/publish action area
```

Required visual checks:

- Each form field has a visible label.
- Required/missing fields are clear.
- Preview resembles respondent Explore/Detail cards.
- Draft and publish states are visually distinct.

### Phase 5: Add Missing Web Frames

Add:

```text
Web My Applications
Web Applicant Review
Web Schedule
Web Profile
```

Each frame should be 1440px wide and use the same desktop shell.

### Phase 6: Screenshot QA

Capture:

```text
entire Figma page
Web Explore only
Founder Workspace only
Post Creation only
one dense detail panel
```

Check:

- No text overlap.
- No card-in-card clutter.
- No oversized dashboard metrics.
- Left/sidebar nav alignment is consistent.
- Right detail panels do not exceed frame height unexpectedly.
- Buttons fit Korean text.
- Status colors are distinguishable.

## Implementation Plan After Figma Approval

### Phase 1: App Structure

Current app has one large `App.tsx`. Split implementation into:

```text
apps/web/src/app/App.tsx
apps/web/src/app/AppShell.tsx
apps/web/src/pages/ExplorePage.tsx
apps/web/src/pages/MyApplicationsPage.tsx
apps/web/src/pages/FounderWorkspacePage.tsx
apps/web/src/pages/SchedulePage.tsx
apps/web/src/pages/ProfilePage.tsx
apps/web/src/shared/ui/
apps/web/src/features/interview-posts/
apps/web/src/features/applications/
apps/web/src/features/sessions/
```

MVP can use simple local route state first. Add React Router only when URL-based navigation becomes necessary.

### Phase 2: Shared UI

Create:

```text
Button
Badge
StatusBadge
AppShell
DesktopNav
MobileBottomNav
PageHeader
FilterPanel
DetailPanel
EmptyState
LoadingRows
FormSection
```

Do not over-abstract before there are real repeated screens. Start with local components, then move stable ones into `shared/ui`.

### Phase 3: Data Model Usage

Use existing types:

```text
InterviewPost
Application
Session
```

Add UI adapter helpers:

```text
formatReward
formatDuration
formatInterviewMode
formatPostStatus
formatApplicationStatus
formatSessionStatus
```

Do not put business rule decisions only in UI helpers. Backend must remain the source of truth for protected transitions.

### Phase 4: Desktop Screens

Implementation order:

```text
1. AppShell and desktop nav
2. Explore list/detail
3. Post creation form/preview
4. Founder workspace applicant review
5. My applications
6. Schedule
7. Profile
```

Reason:

- Explore and post creation validate the marketplace loop.
- Founder workspace validates founder payment/usefulness.
- Applications and schedule close the MVP loop.
- Profile supports targeting and trust after the main flow is visible.

### Phase 5: Responsive Integration

CSS rules:

```text
desktop >= 1024:
  sidebar + split panels

tablet 768-1023:
  compact nav + one or two columns

mobile <= 767:
  bottom nav + one column
```

Use CSS variables for:

```text
color
spacing
radius
shadow
layout widths
z-index
```

## Acceptance Criteria

The web enhancement is acceptable when:

- Desktop no longer feels like a generic dashboard.
- Web Explore supports filtering, list scanning, and selected detail together.
- Founder Workspace supports post selection, applicant review, and decision actions without page jumping.
- Post Creation supports structured writing plus live respondent preview.
- My Applications and Schedule make status transitions understandable.
- The same IA works across mobile and desktop.
- Desktop uses additional space for comparison and detail, not decoration.
- Forms use visible labels and field-level validation.
- Status is represented by text and color, not color alone.
- No core MVP action is mobile-only or desktop-only.
- 1024px, 1280px, 1440px, and 1728px layouts do not overlap.
- 390px mobile remains consistent with the mobile plan.

## Open Questions

- Should desktop `찾기` show only open posts, or also draft/closed examples for founders testing their own posts?
- Should `내 모집` and `내 신청` both be visible for every logged-in user, or should the sidebar visually group them by role?
- Should founder applicant review use a table first or card rows first?
- Should respondent application be submitted from the Explore detail panel or always require a dedicated detail page?
- Should scheduling use only proposed chips in MVP, or include a lightweight calendar view?
- Should no-show history be visible in founder applicant review during MVP?
- Should web support multiple selected applicants at once, or defer bulk selection?

## Recommended Next Work

Immediate Figma work:

```text
1. Rebuild Web Explore as filter + list + detail.
2. Rebuild Founder Workspace as post list + applicant pipeline + action panel.
3. Rebuild Post Creation as structured form + live preview.
4. Add Web My Applications, Web Schedule, Web Profile.
5. Add desktop component samples to Components.
6. Capture screenshots and correct overlap/density issues.
```

Immediate implementation work after Figma approval:

```text
1. Split App.tsx into shell, pages, feature components, and shared UI.
2. Implement desktop AppShell and responsive navigation.
3. Implement Explore list/detail against current InterviewPost data.
4. Implement Post Creation preview flow.
5. Implement Founder Workspace with application/session placeholders until APIs are complete.
```

## Figma Execution Log

2026-05-19:

- Rebuilt the existing web frames as comparison-first desktop workspaces:
  - `Web Explore` (`4467:195`)
  - `Founder Workspace` (`4467:304`)
  - `Post Creation` (`4467:378`)
- Added the missing web frames from this plan:
  - `Web My Applications` (`4501:369`)
  - `Web Applicant Review` (`4501:468`)
  - `Web Schedule` (`4501:570`)
  - `Web Profile` (`4501:680`)
- Expanded the web canvas section and added dark canvas backdrops for the new frames.
- Updated the `Components` frame with desktop workflow pattern samples:
  - persistent filter panel
  - decision-rich list row
  - selected detail/action panel
- Verified representative captures for `Web Explore`, `Web Applicant Review`, and `Components`.
- Fixed compact metric currency labels that wrapped in narrow detail cards.

## Sources

- Baymard desktop UX trends and product-list guidance: https://baymard.com/blog/desktop-ux-ecommerce
- Baymard form label guidance: https://baymard.com/blog/mobile-forms-avoid-inline-labels
- Material responsive layout guidance: https://m1.material.io/layout/responsive-ui.html
- User Interviews recruitment workflow reference: https://www.userinterviews.com/recruit
- User Interviews research hub reference: https://www.userinterviews.com/research-hub
- WAI-ARIA Authoring Practices patterns: https://www.w3.org/WAI/ARIA/apg/patterns/
- Nielsen Norman Group accessible web design report: https://s3.amazonaws.com/nngroup-staging/media/reports/free/Usability_Guidelines_for_Accessible_Web_Design.pdf
