# Mobile-First Responsive UI/UX Enhancement Plan

Status: completed

Last updated: 2026-05-19

Completion note:

```text
The mobile-first Figma pass is complete enough to guide implementation:
mobile sections are separated, frame titles are cleaned up, bottom navigation
has been refined, and screenshot QA was performed. Remaining implementation
work now lives in the Tailwind UI implementation plan.
```

Related documents:

- `docs/completed/high-fidelity-uiux-reference-responsive-plan.md`
- `docs/completed/product-design-redesign-plan.md`
- `docs/mvp-scope.md`
- `docs/architecture.md`

Figma target:

```text
File: https://www.figma.com/design/dB1sHJHkY8KUUfJgmxQOZV/
Page: Hypofit
Page node: 4464:398
```

Current Figma screen frames:

```text
Components: 4467:4
Mobile Explore: 4467:72
Mobile Detail: 4467:153
Web Explore: 4467:195
Founder Workspace: 4467:304
Post Creation: 4467:378
```

## Purpose

This document defines the next UI/UX enhancement plan for Hypofit.

The earlier redesign direction correctly moved the product away from a generic dashboard and toward an interview matching workflow. The important correction now is:

```text
Both respondents and founders are mobile-first users.
```

Hypofit should not treat mobile as a respondent-only surface and web as the founder-only surface. Early founders will often create posts, check applicants, select people, and confirm schedules from a phone. The product must therefore support both roles well on mobile, then scale up into richer web layouts when screen space is available.

## Design Thesis

Hypofit should behave like a compact role-based work app:

```text
Mobile:
  fast discovery
  fast application
  fast applicant review
  fast schedule confirmation

Desktop:
  broader comparison
  richer list/detail layouts
  more comfortable writing and review
```

The same product workflow should be available across both mobile and web, but the layout should adapt to the device:

```text
Mobile:
  one task at a time
  bottom navigation
  full-width cards
  bottom sheets for filters and secondary actions
  sticky primary actions

Web:
  split list/detail views
  persistent filters
  denser applicant comparison
  side-by-side preview and editing
```

## Reference Principles

The plan is based on these external UI/UX patterns and product references:

- Respondent-style paid research flow: browse project, answer screener, get invited, book time, complete session, receive incentive.
- User research recruiting platforms: make targeting, screening, scheduling, and participant quality visible.
- Mobile product-list UX: cards must contain enough decision-making information so users do not have to open every detail page.
- Mobile form UX: labels should stay visible above inputs; do not rely on inline placeholder labels.
- Responsive Material layout: compact screens show one level of hierarchy, larger screens can show summary and detail together.
- Bottom navigation: mobile should expose three to five top-level destinations.
- Date/time picker guidance: mobile scheduling should use simple pre-defined options or focused picker dialogs, not dense inline calendars.

## Core Product Loop

All UI decisions should support this MVP loop:

```text
founder creates interview post
  -> respondent discovers relevant post
  -> respondent applies with screening answers and availability
  -> founder reviews applicants
  -> founder selects or rejects applicant
  -> session is scheduled
  -> session is completed or marked no-show
```

Any UI that does not support this loop is secondary.

## User Roles

### Respondent

The respondent is trying to decide:

- Is this interview relevant to my actual experience?
- How much can I earn?
- How long does it take?
- Is it online or offline?
- If offline, how far is it?
- What time options exist?
- What do I need to answer before applying?
- What happens after I apply?

Respondent mobile priority:

```text
Find relevant interviews quickly.
Apply with minimum friction.
Track status without confusion.
```

Respondent web priority:

```text
Compare more opportunities at once.
Review details more comfortably.
Manage applications and schedules.
```

### Founder

The founder is trying to decide:

- Can I publish a clear interview post from my phone?
- Did anyone apply?
- Which applicants actually match my target customer?
- Which applicant should I select, reject, or hold?
- What time can we meet?
- Which sessions are complete or no-show?

Founder mobile priority:

```text
Create or edit a post quickly.
Review applicants in short sessions.
Make selection decisions from notification-like contexts.
Confirm schedules.
Mark completion/no-show.
```

Founder web priority:

```text
Write better posts.
Compare multiple applicants.
Manage the whole recruitment pipeline.
Use preview and detail panels.
```

## Information Architecture

Hypofit should use one role-aware navigation model across devices.

Recommended top-level destinations:

```text
찾기
내 신청
내 모집
일정
프로필
```

Reason:

- `찾기` supports respondent discovery.
- `내 신청` supports respondent application tracking.
- `내 모집` supports founder recruitment management.
- `일정` is shared by both roles.
- `프로필` contains account, role, trust, and auth state.

This fits the three-to-five mobile bottom navigation range while keeping founder work accessible on mobile.

### Role Visibility

MVP recommendation:

```text
Show all five destinations after login.
For users without founder activity, show an empty-state CTA in 내 모집.
For users without respondent activity, show an empty-state CTA in 내 신청.
```

Avoid a hard founder/respondent mode switch at this stage. A mode switch adds mental overhead and can hide important tasks. Many early users may be both founder and respondent.

### Mobile Navigation

Use bottom navigation:

```text
[찾기] [내 신청] [내 모집] [일정] [프로필]
```

Mobile nav rules:

- Keep labels short.
- Use icons plus labels.
- Highlight active destination with primary green.
- Reserve top bars for page title and local actions.
- Do not place destructive or high-risk actions in nav.
- Keep bottom nav outside scrollable content.
- Add safe-area padding for installed PWA/mobile browser controls.

### Web Navigation

Use top navigation:

```text
Hypofit
찾기
내 신청
내 모집
일정
프로필/auth
```

Web rules:

- Avoid a heavy dashboard sidebar for the respondent experience.
- Use split layouts for comparison-heavy work.
- Keep auth/profile in the upper-right area.
- Use persistent filters only when there is enough width.

## Responsive Layout Model

### Breakpoints

Use practical implementation breakpoints:

```text
compact mobile: 360-389px
standard mobile: 390-430px
large mobile / small tablet: 431-767px
tablet: 768-1023px
desktop: 1024-1439px
wide desktop: 1440px+
```

### Layout Behavior By Width

Compact and standard mobile:

```text
single column
bottom navigation
one primary task per screen
cards full width
filter/search via chips and bottom sheets
sticky CTA on detail/action screens
```

Large mobile / small tablet:

```text
single column by default
slightly wider cards and forms
optional two-column only for low-risk preview sections
bottom navigation can remain
```

Tablet:

```text
single column or two-column depending on task
avoid full three-column layouts
keep touch targets large
use modal or side sheet for detail when appropriate
```

Desktop:

```text
top navigation
list/detail split
persistent filters
side-by-side creation preview
denser applicant rows
```

Wide desktop:

```text
same desktop structure
constrain content width
do not stretch cards endlessly
increase gutters rather than text line length
```

## Screen Plan

### 1. Mobile Explore

Primary user:

```text
respondent
```

Secondary user:

```text
founder browsing as respondent
```

Purpose:

Help users find interviews where their actual experience is relevant.

Required content:

```text
top app bar
search input
active filter chips
interview feed
bottom nav
```

Recommended hierarchy:

```text
Page title:
  내 경험에 맞는 인터뷰

Search:
  서비스, 경험, 지역 검색

Filter summary:
  전체 / 화상 / 대면 / 1만원+ / 30분 이하 / 가까운 순

Card:
  status
  title
  target fit
  reward
  duration
  mode
  time
  location/distance
  CTA
```

Mobile card example:

```text
모집중 · 내 조건 4개 일치
동네 운동 루틴 관리 앱 검증
퇴근 후 운동 루틴 유지가 어려운 직장인

15,000원 · 30분 · 화상
평일 20시 이후

[상세 보기]
```

UX details:

- Reward should be visually scannable, not hidden in body text.
- Target condition should be more prominent than founder/service description.
- Use two-line clamp for title and target.
- Show one clear CTA.
- Do not use decorative images in list cards.
- Search should be visible because users may look for a specific domain or experience.
- Use a filter bottom sheet for full filtering.

Mobile filter bottom sheet:

```text
인터뷰 방식
  전체 / 화상 / 대면

사례비
  전체 / 1만원 이상 / 2만원 이상

소요 시간
  30분 이하 / 60분 이하

시간대
  평일 저녁 / 주말 오전 / 주말 저녁

위치
  내 주변 / 서울 / 수도권 / 무관

[적용하기] [초기화]
```

### 2. Mobile Detail And Apply

Primary user:

```text
respondent
```

Purpose:

Help the user decide whether to apply and submit a high-quality application.

Required content:

```text
back header
title
summary chips
target fit checklist
reward/mode/time/location details
screening questions
availability selection
sticky apply CTA
```

Recommended hierarchy:

```text
Top:
  back
  인터뷰 상세

Hero summary:
  title
  reward / duration / mode / time

Fit checklist:
  이런 분을 찾고 있어요
  [ ] 퇴근 후 운동 루틴을 시도해본 적 있음
  [ ] 2주 이상 유지하지 못한 경험 있음
  [ ] 운동 앱 또는 기록 앱을 써본 적 있음

Details:
  인터뷰 방식
  사례비 지급 방식
  장소 또는 화상 링크 안내
  노쇼 정책

Application:
  visible labels above inputs
  helper text under labels
  time chips

Sticky CTA:
  신청하기
```

Form rules:

- Labels stay above inputs.
- Placeholder can provide examples, but cannot replace labels.
- Questions should be context-independent.
- Error messages should be specific and close to the field.
- Keep entered values after validation errors.
- Use textareas only when needed.
- Use chips for common availability options.

CTA states:

```text
비로그인: 로그인 후 신청
신청 가능: 신청하기
신청 완료: 신청 완료
마감: 모집 마감
선정됨: 일정 확인하기
```

### 3. Mobile My Applications

Primary user:

```text
respondent
```

Purpose:

Show what happened after applying.

Required content:

```text
application list
status badge
next action
session time when scheduled
reward
```

Status groups:

```text
검토 중
선정됨
일정 확정
완료
거절됨
```

Card example:

```text
선정됨
동네 운동 루틴 관리 앱 검증
15,000원 · 30분 · 화상

다음 단계: 가능한 일정 확인
[일정 선택하기]
```

UX details:

- Do not make users guess whether they were selected.
- Use a compact stepper only inside detail view.
- In list view, use one status badge and one next-action label.

### 4. Mobile Founder Posts

Primary user:

```text
founder
```

Purpose:

Let founders manage recruitment from a phone.

Required content:

```text
my posts list
post status
application count
selected count
scheduled count
next action
create post CTA
```

Recommended layout:

```text
Top:
  내 모집
  [+]

Status tabs:
  모집중 / 검토 필요 / 일정 조율 / 완료

Post cards:
  title
  status
  신청 N명
  선정 N명
  일정 N건
  next action
```

Post card example:

```text
검토 필요
동네 운동 루틴 관리 앱 검증

신청 8명 · 선정 2명 · 일정 1건
다음 단계: 새 신청자 3명 검토

[신청자 보기]
```

UX details:

- Founder mobile should optimize for quick check-ins.
- Show "next action" more prominently than raw metrics.
- Keep analytics out of this screen for MVP.
- Use status tabs or segmented controls instead of a large dashboard.

### 5. Mobile Applicant Review

Primary user:

```text
founder
```

Purpose:

Help founders select or reject applicants from mobile.

Required content:

```text
selected post summary
applicant queue
fit summary
screening answers
availability
select/reject/hold actions
```

Applicant card:

```text
김민지 · 타깃 4/5 일치
퇴근 후 운동 루틴을 3번 시도했지만 2주 이상 유지하지 못함

가능 시간: 평일 20시, 토요일 오전
거리: 화상 선호

[선정] [보류] [거절]
```

UX details:

- Avoid hidden swipe-only actions for selection/rejection.
- Use explicit buttons for important decisions.
- If using swipe later, keep buttons visible as backup.
- Selection should open a confirmation bottom sheet.
- Rejection can be one tap only if reversible or clearly marked.

Selection confirmation:

```text
김민지님을 선정할까요?
선정 후 일정 조율 단계로 이동합니다.

[선정하기] [취소]
```

### 6. Mobile Post Creation

Primary user:

```text
founder
```

Purpose:

Allow founders to publish a usable interview post from mobile.

MVP recommendation:

Use a guided single-column form with sections, not a heavy multi-step wizard. A full wizard can be added later if completion quality is low.

Recommended sections:

```text
1. 검증하려는 가설
2. 찾는 고객 조건
3. 인터뷰 방식과 사례비
4. 일정 후보
5. 신청 질문
6. 미리보기
```

Mobile form structure:

```text
Progress:
  1/6

Section title:
  찾는 고객 조건

Fields:
  label
  helper text
  input

Bottom:
  이전 / 다음
```

Alternative MVP implementation:

```text
single page
collapsible sections
sticky publish CTA
preview card near bottom
```

Recommended first implementation:

```text
single page with grouped sections
```

Reason:

- Faster to implement.
- Easier to debug.
- Avoids saving partial wizard state too early.
- Still mobile-friendly if sections are well spaced.

Field rules:

- Ask for behavior and experience, not generic demographics only.
- Use examples sparingly.
- Keep each section focused.
- Show respondent-facing preview before publish.

Post creation fields:

```text
서비스와 검증 가설
  서비스 이름
  검증하고 싶은 문제

찾는 고객 조건
  반드시 해당해야 하는 경험
  있으면 좋은 경험
  제외할 조건

인터뷰 방식과 사례비
  사례비
  소요 시간
  화상/대면
  대면 장소

일정 후보
  평일 저녁
  주말 오전
  직접 입력

신청 질문
  질문 1
  질문 2
  질문 추가
```

### 7. Mobile Schedule

Primary users:

```text
respondent
founder
```

Purpose:

Make upcoming interviews and next actions clear.

Recommended tabs:

```text
예정
확인 필요
완료
```

Respondent schedule card:

```text
일정 확정
동네 운동 루틴 관리 앱 검증
5월 23일 토요일 10:00
화상 · 30분 · 15,000원

[입장 링크 보기]
```

Founder schedule card:

```text
확인 필요
김민지 · 동네 운동 루틴 관리 앱 검증
후보: 평일 20시 / 토요일 오전

[시간 확정]
```

Completion actions:

```text
[완료 처리]
[노쇼 처리]
```

No-show action should require confirmation.

### 8. Mobile Profile

Primary users:

```text
respondent
founder
```

Purpose:

Account, role, trust, and auth state.

Recommended sections:

```text
profile summary
role status
respondent profile
founder profile
payment/reward info placeholder
trust and attendance history
settings/logout
```

MVP profile content:

```text
이름
이메일
역할: 응답자 / 창업자 / 둘 다
내 경험 태그
내 모집글 수
완료 인터뷰 수
노쇼 기록
```

## Web Screen Plan

### Web Explore

Use list/detail split:

```text
left:
  filters

center:
  interview list

right:
  selected detail and apply CTA
```

Desktop-specific value:

- Compare multiple opportunities.
- Keep selected detail visible while scanning list.
- Show persistent filters.

### Web Founder Workspace

Use two or three panes depending on available width:

```text
left:
  posts

middle:
  applicants for selected post

right:
  applicant detail or schedule action
```

MVP desktop layout can remain two panes:

```text
left:
  post list

right:
  applicant review
```

Enhancement:

- Add applicant detail drawer or right panel.
- Add status tabs.
- Add next-action queue.

### Web Post Creation

Use side-by-side composition:

```text
left:
  grouped post creation form

right:
  respondent preview card
  validation checklist
```

Preview should show:

```text
title
target condition
reward
duration
mode
time
screening question count
```

### Web My Applications And Schedule

Use table-like cards, not a dense enterprise table at MVP.

Recommended structure:

```text
left/top:
  status filters

main:
  application/session rows

right/detail:
  selected item detail when needed
```

## Component System

### AppShell

Variants:

```text
mobile
tablet
desktop
```

Responsibilities:

- Navigation.
- Safe-area handling.
- Main content container.
- Auth/profile entry.

### BottomNav

Items:

```text
찾기
내 신청
내 모집
일정
프로필
```

Rules:

- Fixed height around 64px plus safe-area inset.
- Icon 20-24px.
- Label 11-12px.
- Active state: primary green.
- Inactive state: muted neutral.
- Never obscure sticky CTAs.

### TopNav

Items:

```text
Hypofit
찾기
내 신청
내 모집
일정
profile/auth
```

Rules:

- Keep compact.
- Do not add marketing links.
- Use active pill or underline.

### InterviewCard

Variants:

```text
mobile-feed
web-row
preview
compact-status
```

Required data:

```text
status
title
targetCondition
rewardAmount
durationMinutes
interviewMode
locationSummary
scheduleSummary
fitSummary
ctaLabel
```

### FilterChip

Variants:

```text
default
selected
removable
disabled
```

### StatusBadge

Values:

```text
모집중
마감임박
신청 완료
검토 중
선정됨
거절됨
일정 확정
완료
노쇼
```

### ApplicantCard

Variants:

```text
mobile-card
web-row
selected
rejected
scheduled
```

Required data:

```text
applicantName
fitScore
screeningSummary
availability
distanceOrMode
status
actions
```

### ApplicationStepper

Use in detail screens:

```text
신청 완료
검토 중
선정됨
일정 확정
완료
```

Do not place full steppers in dense list cards.

### ScheduleOptionChip

States:

```text
available
selected
unavailable
confirmed
```

### FormSection

Rules:

- Section title.
- One short description if needed.
- Visible labels.
- Helper text.
- Field-level errors.
- No placeholder-only labels.

## Visual Design Direction

### Product Feel

Hypofit should feel:

```text
trustworthy
fast
practical
local
human
focused
```

Hypofit should not feel:

```text
enterprise analytics dashboard
generic survey builder
decorative landing page
AI matching showcase
heavy admin panel
```

### Color Roles

Use color to encode product meaning:

```text
Primary green:
  brand
  primary CTA
  selected navigation

Amber:
  reward
  incentive

Blue-gray:
  online/video interview

Neutral/indigo:
  offline/location

Red-brown:
  no-show
  destructive confirmation

Warm surface:
  page background
  section background
```

Rules:

- Do not make the whole UI green.
- Reward should be visible but not look like a warning.
- Destructive actions need more than color, such as icon and confirmation text.

### Typography

Recommended type scale:

```text
Mobile page title: 22-24px
Mobile section title: 17-19px
Card title: 15-17px
Metadata: 12-14px
Bottom nav label: 11-12px

Desktop page title: 26-30px
Desktop section title: 18-22px
Desktop row title: 15-17px
```

Rules:

- Do not scale font size using viewport width.
- Korean labels should be short.
- Long target descriptions should clamp.
- Buttons must keep text inside at 360px width.

### Spacing

Use 8px rhythm:

```text
4
8
12
16
24
32
40
```

Mobile:

```text
screen padding: 16px
card padding: 14-16px
card gap: 12px
section gap: 24px
bottom nav reserve: 72-88px including safe area
sticky CTA height: 48px
```

Desktop:

```text
page padding: 24-32px
panel gap: 20-24px
card padding: 16-20px
max content width on wide screens
```

## Interaction Patterns

### Search And Filtering

Mobile:

```text
visible search
horizontal active chips
filter bottom sheet
sort bottom sheet or chip menu
```

Web:

```text
persistent filter panel
selected filter chips above list
sort dropdown
```

Filter rules:

- Active filters must be visible.
- Each active filter must be removable.
- There must be a clear reset action.
- Empty results should explain which filters caused the issue.

### Forms

Mobile rules:

- Labels above fields.
- Inputs full width.
- Helper text below label or field.
- Errors close to fields.
- Keep values after errors.
- Avoid long forms without section breaks.
- Use native input types where appropriate.

Founder post creation form:

- Use grouped sections.
- Show progress through completion indicators.
- Validate required fields before publish.
- Preview respondent-facing card before publish.

### Scheduling

MVP scheduling should not attempt full calendar integration.

Use:

```text
candidate time chips
simple date/time text input if needed
confirmation bottom sheet
status cards
```

Avoid in MVP:

```text
calendar sync
complex recurring availability
multi-host scheduling
payment-linked booking
```

### Confirmation And Risk

Actions requiring confirmation:

```text
select applicant
mark no-show
cancel session
close recruitment
delete draft if destructive deletion exists
```

Actions not requiring heavy confirmation:

```text
save draft
edit post
apply filter
open detail
save profile field
```

## Empty States

Design these explicitly:

```text
no interview posts
no applications
no founder posts
no applicants
no schedule
no filter results
not logged in
```

Examples:

```text
내 모집
아직 만든 모집글이 없습니다.
첫 인터뷰 모집글을 만들고 고객 검증을 시작하세요.
[모집글 만들기]
```

```text
내 신청
아직 신청한 인터뷰가 없습니다.
내 경험에 맞는 인터뷰를 찾아보세요.
[인터뷰 찾기]
```

## Figma Execution Plan

### Step 1: Foundations Cleanup

Update `Components` frame:

```text
color tokens
type scale
spacing samples
buttons
chips
status badges
bottom nav
top nav
interview card
applicant card
form section
schedule chip
```

### Step 2: Mobile Respondent Screens

Create or refine:

```text
Mobile Explore
Mobile Detail
Mobile My Applications
Mobile Schedule
Mobile Profile
```

Focus:

- Feed clarity.
- Fit checklist.
- Apply form.
- Application status.

### Step 3: Mobile Founder Screens

Create:

```text
Mobile Founder Posts
Mobile Applicant Review
Mobile Post Creation
Mobile Schedule Confirmation
```

Focus:

- Founder can do core work from phone.
- Applicant review is explicit and safe.
- Post creation is guided but not heavy.
- Next action is always visible.

### Step 4: Web Screens

Refine:

```text
Web Explore
Founder Workspace
Post Creation
```

Add if needed:

```text
Web My Applications
Web Schedule
```

Focus:

- Split layouts.
- Persistent filters.
- Applicant comparison.
- Live preview.

### Step 5: Prototype Flow

Connect:

```text
찾기
  -> Mobile Detail
  -> 신청 완료
  -> 내 신청

내 모집
  -> 신청자 보기
  -> 선정
  -> 일정 확정

일정
  -> 완료 처리
  -> 노쇼 처리
```

### Step 6: Screenshot QA

Check these viewports:

```text
360 x 740
375 x 667
390 x 844
412 x 915
768 x 1024
1024 x 768
1440 x 900
```

Verify:

- No text overlap.
- No horizontal scroll on mobile.
- Bottom nav does not cover CTA.
- Form labels stay visible.
- Card metadata wraps cleanly.
- Empty states are not visually broken.
- Web split views do not stretch excessively.

## Frontend Implementation Plan

### Phase 1: Responsive App Shell

Goal:

Create shared navigation that supports both roles on mobile and web.

Tasks:

```text
create AppShell
create BottomNav
create TopNav
create route/view state
move auth into Profile or compact shell entry
reserve mobile safe-area space
```

Expected files:

```text
apps/web/src/app/App.tsx
apps/web/src/app/AppShell.tsx
apps/web/src/features/navigation/BottomNav.tsx
apps/web/src/features/navigation/TopNav.tsx
apps/web/src/styles.css
```

### Phase 2: Shared Card And Status Components

Goal:

Build the reusable primitives used by both roles.

Tasks:

```text
InterviewCard
StatusBadge
RewardChip
ModeChip
FilterChip
ScheduleOptionChip
ApplicationStepper
```

Expected files:

```text
apps/web/src/shared/ui/
apps/web/src/features/interview-posts/
```

### Phase 3: Respondent Mobile Flow

Goal:

Make mobile discovery and application credible.

Tasks:

```text
Mobile Explore
Mobile Detail
Apply form
My Applications
Application status detail
```

### Phase 4: Founder Mobile Flow

Goal:

Make founder work possible from the PWA.

Tasks:

```text
Mobile Founder Posts
Applicant Review
Applicant actions
Post Creation mobile form
Schedule confirmation
Completion/no-show actions
```

### Phase 5: Web Adaptive Layouts

Goal:

Scale the same workflows into efficient desktop layouts.

Tasks:

```text
Explore list/detail
Founder workspace list/applicant review
Post creation with preview
Schedule management
```

### Phase 6: QA And PWA Polish

Checks:

```text
pnpm --dir apps/web lint
pnpm --dir apps/web build
mobile viewport smoke tests
PWA manifest check
service worker cache behavior check
```

Manual QA:

```text
install PWA on mobile browser
login
browse posts
apply
review as founder
create post
confirm schedule
```

## Acceptance Criteria

The design pass is acceptable when:

- Respondent can browse, inspect, apply, and track status on mobile.
- Founder can create a post, review applicants, select/reject, and manage schedules on mobile.
- Web layouts provide better comparison without becoming a dashboard.
- Bottom navigation covers both role workflows without hidden mode confusion.
- Each card exposes reward, duration, mode, target fit, and next action.
- Post creation has a respondent-facing preview.
- Applicant review shows fit, answers, availability, and explicit actions.
- No core action is web-only.
- No mobile screen depends on a desktop-only side panel.
- Figma auto-layout or implementation CSS handles 360px width without overlap.

## Open Questions

- Should `내 모집` appear for users who signed up only as respondents, or should it appear after they create founder profile data?
- Should the first version let a user be both respondent and founder by default?
- Should post creation be a single mobile page or a section-based wizard?
- Should applicant rejection be reversible?
- Should offline interviews require exact location before publishing?
- Should reward payout be text-only in MVP or modeled as a structured field from the start?
- Should no-show count be visible to respondents or only founders/admins in MVP?

## Figma Execution Log

2026-05-19 update:

- Target Figma page `Hypofit` was expanded from a dashboard-heavy reference into a mobile-first product screen board.
- Mobile section now uses a 3-column by 3-row frame grid:
  - `Mobile Explore`
  - `Mobile Detail`
  - `Mobile Applications`
  - `Founder Posts`
  - `Applicant Review`
  - `Mobile Post Creation`
  - `Mobile Schedule`
  - `Session Result`
  - `Mobile Profile`
- Core bottom navigation was standardized around five mobile tabs:
  - `찾기`
  - `신청`
  - `모집`
  - `일정`
  - `프로필`
- Components area was expanded so mobile-first component samples no longer overflow the frame.
- Web frames were moved below the mobile section so mobile and web work are visually separated.
- Screenshot QA was performed after the update. The final checked mobile detail was `Mobile Schedule`, including the schedule card button/text overlap fix.

2026-05-19 navigation refinement:

- All 9 mobile frames were updated from dot-placeholder navigation to `Bottom Navigation / Advanced`.
- The refined navigation includes:
  - drawn line-style icons for `찾기`, `신청`, `모집`, `일정`, `프로필`
  - active tab pill and top indicator
  - small count badges for pending application/recruitment/schedule activity
  - floating white bar, subtle border, drop shadow, and safe-area home indicator
- `Mobile Explore` and `Mobile Detail` were corrected separately because those frames use auto-layout; their nav bars are now absolute-positioned to avoid automatic layout pushing them upward.
- Screenshot QA was performed on `Mobile Explore` after the correction to confirm the nav does not directly overlap the initial content.

## Recommended Next Work

Immediate Figma work:

```text
1. Convert repeated card, chip, button, bottom-nav, and form blocks into reusable Figma components.
2. Tighten copy, spacing, and vertical rhythm inside each mobile frame.
3. Add explicit empty/loading/error states for Explore, Applications, Founder Posts, and Schedule.
4. Update Web Explore, Founder Workspace, and Post Creation from the same component system.
5. Review 360px mobile constraints before translating the Figma work into code.
```

Immediate implementation work after Figma approval:

```text
1. Build responsive AppShell with 5 mobile tabs.
2. Replace dashboard-like first screen with Explore.
3. Add role-aware My Applications and My Recruitment views.
4. Move auth into Profile.
5. Add mobile-safe bottom navigation spacing.
```

## Sources

- Respondent participant workflow: https://help.respondent.io/en/articles/5456426-how-does-the-respondent-research-platform-work-how-can-i-earn-money
- Respondent recruiting platform: https://www.respondent.io/
- User Interviews recruiting platform: https://www.userinterviews.com/
- Dscout participant recruitment: https://dscout.com/platform/find-participants
- Baymard mobile product list examples: https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-list/19137-cb2
- Baymard mobile form label placement: https://baymard.com/blog/mobile-form-usability-label-position
- Baymard inline label warning: https://baymard.com/blog/mobile-forms-avoid-inline-labels
- Baymard validation error guidance: https://baymard.com/blog/adaptive-validation-error-messages
- Material responsive layout: https://m1.material.io/layout/responsive-ui.html
- Material bottom navigation: https://www.mdui.org/en/design/1/components/bottom-navigation.html
- Material date/time pickers: https://m1.material.io/components/pickers.html
