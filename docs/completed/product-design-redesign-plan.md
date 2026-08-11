# Product Design Redesign Plan

Status: completed

Last updated: 2026-05-19

Completion note:

```text
This plan established the first Hypofit product design direction and initial
Figma frame set. The work has been superseded by the mobile, web, high-fidelity,
and Tailwind implementation plans.
```

Related plans:

```text
docs/completed/tailwind-ui-implementation-plan.md
docs/completed/high-fidelity-uiux-reference-responsive-plan.md
docs/completed/mobile-first-responsive-uiux-plan.md
docs/completed/web-desktop-uiux-enhancement-plan.md
```

Figma target:

```text
File: https://www.figma.com/design/dB1sHJHkY8KUUfJgmxQOZV/
Page: Hypofit
Page node: 4464:398
```

Created Figma frames:

```text
00 Foundations + Components: 4467:4
01 Mobile / Respondent Explore: 4467:72
02 Mobile / Interview Detail + Apply: 4467:153
03 Web / Explore List Detail: 4467:195
04 Web / Founder Workspace: 4467:304
05 Web / Post Creation: 4467:378
```

## Purpose

This document defines the active product design direction for Hypofit before the next major UI implementation pass.

The current PWA is functional but visually and structurally feels like an internal dashboard. Hypofit should instead feel like a focused interview matching product:

- Respondents discover relevant paid interview opportunities.
- Founders create interview posts, screen applicants, and schedule interviews.
- Both sides understand status, reward, mode, time, and next action quickly.

The redesign should move the product from a generic metrics dashboard toward a role-based interview workflow.

## Current Problem

The current screen uses a layout pattern similar to a SaaS operations dashboard:

```text
sidebar
  -> metrics cards
  -> content panel
  -> workflow panel
```

This creates several mismatches:

- The first screen emphasizes validation metrics instead of the user's immediate job.
- Respondents need a browsable opportunity feed, not an operations dashboard.
- Founders need recruiting workflow control, not broad analytics yet.
- Mobile feels like a compressed web dashboard instead of a mobile-first PWA.
- The auth panel is functionally useful, but it is not yet integrated into a polished app shell.

The MVP should prioritize usable matching and interview workflow over reporting.

## Product Design Principle

Hypofit should feel like:

```text
Respondent side:
  opportunity discovery app

Founder side:
  lightweight recruiting operations tool

Shared layer:
  clear interview workflow status
```

It should not feel like:

```text
generic admin dashboard
survey builder
analytics platform
AI matching platform
native mobile clone
```

## Target Users

### Respondent

The respondent wants to answer:

- Is this interview relevant to my experience?
- How much is the reward?
- Is it online or offline?
- How long will it take?
- Where is it, if offline?
- What time options are available?
- What do I need to answer to apply?
- What is the current status after I apply?

Primary respondent actions:

- Browse interview posts.
- Filter by reward, mode, location, time, and domain.
- Open interview detail.
- Apply with screening answers and availability.
- Track application and session status.

### Founder

The founder wants to answer:

- Can I describe my target customer clearly?
- How many people applied?
- Which applicants match the target?
- Who should I select or reject?
- Which session is scheduled?
- Which sessions were completed or no-show?

Primary founder actions:

- Create interview post.
- Review applicants.
- Select or reject applicants.
- Confirm schedule.
- Mark completion or no-show.

## Reference Product Direction

Use references for interaction patterns, not for copying visual identity.

### Respondent / User Interviews

Useful patterns:

- Research project cards.
- Reward and duration visibility.
- Audience targeting language.
- Screening and scheduling as one workflow.

Hypofit adaptation:

- Show reward, interview mode, duration, and target condition directly on each card.
- Make target fit the main decision point.
- Avoid enterprise-heavy research ops language.

### Calendly

Useful patterns:

- Availability selection.
- Simple time-slot flows.
- Clear confirmation states.

Hypofit adaptation:

- Use schedule option chips at MVP stage.
- Later replace with real calendar integration if needed.
- Keep "available times" lightweight and fast to submit.

### Marketplace / Local Service Apps

Useful patterns:

- Mobile-first list cards.
- Location and distance context.
- Primary CTA per item.

Hypofit adaptation:

- Offline interviews need location and travel context.
- Online interviews need platform/link expectations.
- Respondent browsing should feel like finding a relevant opportunity.

### Linear-like Workflow UI

Useful patterns:

- Dense but clean lists.
- Split list/detail layouts.
- Status labels and workflow movement.

Hypofit adaptation:

- Use this mostly for founder applicant review and session management.
- Do not make the respondent first screen look like an issue tracker.

## Information Architecture

The redesigned PWA should separate role-based workflows while keeping one product shell.

Recommended top-level structure:

```text
Explore
My Applications
Founder Workspace
Schedule
Profile
```

Korean labels can be:

```text
찾기
내 신청
내 모집
일정
프로필
```

### Mobile Navigation

Mobile should use a bottom tab bar:

```text
[찾기] [내 신청] [일정] [프로필]
```

Founder mode can appear as:

- a tab when the user role includes founder, or
- a segmented switch inside profile/top area:

```text
응답자 모드 | 창업자 모드
```

Recommended MVP choice:

```text
Bottom tabs:
  찾기
  내 신청
  내 모집
  프로필
```

Reason:

- It keeps founder work visible without adding a complex role switch.
- It works for users whose role is `both`.
- It is easy to implement without routing complexity.

### Web Navigation

Web should avoid a heavy left dashboard sidebar for the public/respondent experience.

Recommended web shell:

```text
top navigation
  Hypofit
  찾기
  내 신청
  내 모집
  일정
  프로필/auth

main content
  role-specific list/detail layout
```

For founder workspace, a denser two-column layout is appropriate:

```text
left/content:
  recruitment posts or applicants list

right:
  selected post/applicant/session detail
```

## Core Screens

Design and implement these screens first.

### 1. Mobile Respondent Explore

Purpose:

Help respondents find interview opportunities quickly.

Frame:

```text
390 x 844
```

Layout:

```text
Top app bar
  Hypofit
  login/profile affordance

Search
  placeholder: "내 경험에 맞는 인터뷰 검색"

Filter chips
  전체
  화상
  대면
  1만원+
  30분 이하
  가까운 순

Opportunity feed
  InterviewCard[]

Bottom navigation
```

Interview card content:

```text
status badge
title
target condition
reward
duration
mode
location or online
schedule hint
primary CTA
```

Example:

```text
모집중
동네 운동 루틴 관리 앱 검증
퇴근 후 운동 루틴 유지가 어려운 직장인

15,000원 · 30분 · 화상
평일 20시 이후

[상세 보기]
```

Design notes:

- The card should not be decorative.
- Reward and duration must be scannable.
- The target condition should be visually more important than the service summary.
- Long text should clamp to two lines.
- CTA should be reachable with thumb.

### 2. Mobile Interview Detail And Application

Purpose:

Help respondents decide whether to apply and submit screening answers.

Layout:

```text
Sticky top bar
  back
  title

Primary summary
  reward
  duration
  mode
  location

Target condition
Service summary
Schedule options
Screening questions
Apply CTA
```

Application form MVP:

```text
질문 1: 이 문제를 겪은 경험이 있나요?
질문 2: 관련 경험을 간단히 적어주세요.
가능한 시간대 선택
```

CTA states:

```text
비로그인: 로그인 후 신청
로그인: 신청하기
신청 완료: 신청 완료
마감: 모집 마감
```

Design notes:

- This screen should feel like a decision page, not a form dump.
- Important metadata should be sticky or immediately visible.
- On mobile, avoid split panels.

### 3. Web Respondent Explore

Purpose:

Provide a more efficient browsing layout on desktop.

Frame:

```text
1440 x 900
```

Layout:

```text
Top nav

Main:
  Left rail / filter column
    mode
    reward
    duration
    location
    domain

  Center list
    InterviewCard compact list

  Right detail panel
    selected interview detail
    apply CTA
```

Design notes:

- Use a split list/detail pattern.
- Do not show metrics cards on this first screen.
- Keep the list dense enough for comparison.

### 4. Web Founder Recruitment Workspace

Purpose:

Help founders manage interview recruitment.

Layout:

```text
Top nav

Workspace header
  title: 내 모집
  primary CTA: 모집글 만들기

Post list
  title
  status
  applicant count
  selected count
  scheduled count
  reward

Selected post detail
  target condition
  applicants
  next actions
```

Applicant row:

```text
name or email
fit summary
available times
status
actions: 선정 / 거절
```

Design notes:

- This is where operational density is appropriate.
- Status must be explicit.
- Avoid analytics until there is real usage data.

### 5. Web/Mobile Post Creation

Purpose:

Let founders create a clear interview post quickly.

Recommended structure:

```text
Step 1: 서비스와 검증 가설
Step 2: 찾는 고객 조건
Step 3: 인터뷰 방식과 보상
Step 4: 일정 후보와 screening 질문
Step 5: 미리보기
```

MVP can implement this as one page with grouped sections instead of a full wizard.

Field groups:

```text
기본 정보
  제목
  서비스 요약

타깃 고객
  타깃 설명
  경험 조건

인터뷰 조건
  사례비
  소요 시간
  대면/화상
  장소

일정
  가능 시간 후보

신청 질문
  질문 목록
```

Design notes:

- The form should guide founders to describe real target customers, not generic demographics.
- Add helper placeholders, not long instructional text.
- Preview card should show exactly what respondents will see.

### 6. Application And Session Status

Purpose:

Make both sides understand what happens next.

Status model:

```text
applied
selected
rejected
scheduled
completed
no_show
canceled
```

Respondent status UI:

```text
신청 완료
검토 중
선정됨
일정 확정
완료
```

Founder status UI:

```text
신청자 도착
선별 필요
선정 완료
일정 조율
인터뷰 완료/노쇼 기록
```

Use a compact stepper on detail screens, not on every list row.

## Component Plan

### AppShell

Responsibilities:

- Responsive layout.
- Top navigation on web.
- Bottom navigation on mobile.
- Auth entry/profile area.

Variants:

```text
web
mobile
```

### InterviewCard

Used in:

- Explore feed.
- Related opportunities.
- Founder post preview.

Props:

```text
title
targetDescription
rewardAmount
durationMinutes
interviewMode
location
scheduleOptions
status
ctaLabel
```

Variants:

```text
mobile-card
web-list-row
preview
```

### RewardChip

Purpose:

Make compensation visible and consistent.

Format:

```text
15,000원
```

### ModeChip

Values:

```text
대면
화상
대면/화상
```

### StatusBadge

Values:

```text
작성중
모집중
마감
완료
신청 완료
선정됨
거절됨
일정 확정
노쇼
```

### ScheduleOptionPicker

MVP behavior:

- Display schedule options as selectable chips.
- Allow multiple selections when applying.

Future behavior:

- Calendar integration.
- Time-slot availability.

### ApplicationStatusStepper

Use on:

- Application detail.
- Session detail.

Do not use on:

- Every feed card.
- Dense list rows.

### AuthPanel

Current role:

- Login.
- Signup.
- Logout.
- Display synced app user.

Redesign role:

- On desktop, place in top nav/right area.
- On mobile, move to profile screen or a compact top profile button.

## Visual Direction

### Tone

The UI should feel:

- trustworthy
- practical
- focused
- lightweight
- local-service friendly

It should not feel:

- enterprise analytics-heavy
- decorative landing-page-like
- generic admin template
- crypto/AI dashboard-like

### Color

Current green can remain as a brand anchor, but the interface should not become a one-hue green UI.

Recommended palette:

```text
Primary:
  deep green for CTA and active state

Neutrals:
  warm off-white background
  white cards
  dark text
  gray borders

Functional accents:
  reward: muted amber or green
  online mode: blue-gray
  offline mode: slate/neutral
  selected status: green
  warning/no-show: red-brown
```

Avoid:

- large gradients
- decorative blobs
- dark dashboard theme
- oversized hero typography

### Typography

Use existing system font stack for now.

Hierarchy:

```text
Mobile screen title: 22-24px
Web page title: 26-30px
Card title: 15-17px
Metadata: 12-14px
Button text: 14-15px
```

Rules:

- Do not scale font size with viewport width.
- Clamp card descriptions.
- Keep Korean labels short and scannable.

### Spacing

Use an 8px-based rhythm:

```text
4
8
12
16
24
32
```

Cards:

```text
border-radius: 8px
padding mobile: 14-16px
padding web: 14-18px
```

Buttons:

```text
mobile height: 44px
web height: 40px
icon + text gap: 8px
```

## Responsive Layout Rules

### Mobile

Breakpoint:

```text
<= 767px
```

Rules:

- Single-column layout only.
- Bottom navigation.
- No sidebar.
- No metrics grid on first screen.
- Cards full width.
- Primary CTA near bottom of detail/action areas.
- Auth should not take over the whole first screen unless user explicitly opens profile/login.

### Tablet

Breakpoint:

```text
768px - 1023px
```

Rules:

- Single or two-column depending on content.
- Bottom nav can remain if installed PWA usage is expected.
- Avoid dense three-column layouts.

### Desktop

Breakpoint:

```text
>= 1024px
```

Rules:

- Top navigation.
- List/detail split for explore and founder workspace.
- Keep analytics secondary.
- Do not use nested cards.

## Figma Plan

### Do We Need A Figma URL?

Not necessarily.

If we are creating the Hypofit design from scratch, a Figma URL is not required first. We can use Figma MCP to create a new file.

Use a Figma URL only if:

- there is already an existing Figma file to continue from,
- there is a Figma design system/library to reuse,
- the user wants the new screens placed into a specific team/project file,
- a designer is already working in an existing file.

If no URL is provided, create a new Figma file:

```text
Hypofit MVP Product Screens
```

### Figma File Structure

Recommended pages:

```text
00 Foundations
01 Mobile Respondent
02 Mobile Founder
03 Web Respondent
04 Web Founder
05 Components
06 Notes
```

### Frames

Create these frames first:

```text
Mobile / Explore
Mobile / Interview Detail
Mobile / My Applications
Mobile / Profile Auth

Web / Explore List Detail
Web / Founder Workspace
Web / Post Creation
Web / Session Status
```

Frame sizes:

```text
Mobile: 390 x 844
Desktop: 1440 x 900
```

### Auto Layout Rules

Use Auto Layout for:

- app shell
- navigation
- tab bars
- filter chips
- cards
- metadata rows
- forms
- status steppers
- list rows
- detail panels

Avoid:

- absolute positioning except for fixed mobile bottom nav prototypes,
- decorative floating cards,
- nested card-in-card compositions,
- text boxes that do not resize.

Auto Layout settings:

```text
Direction:
  vertical for screen content
  horizontal for metadata rows and nav

Gap:
  8 / 12 / 16 / 24

Padding:
  mobile screen: 16
  web page: 24-32
  card: 14-18

Width:
  mobile content: fill container
  web content: fill container with max-width where needed

Height:
  hug contents for cards
  fixed for nav/button controls
```

### Components To Create In Figma

```text
InterviewCard
InterviewListRow
RewardChip
ModeChip
StatusBadge
FilterChip
PrimaryButton
SecondaryButton
BottomNav
TopNav
AuthCompact
ApplicationStatusStepper
ScheduleOptionChip
ApplicantRow
PostCreationSection
```

### Figma MCP Workflow

Recommended sequence:

1. Create a new Figma design file if no URL exists.
2. Search for any available design system components or libraries.
3. Define foundations:
   - colors
   - typography
   - spacing
   - radii
4. Build reusable components.
5. Create mobile respondent screens.
6. Create web respondent screens.
7. Create founder workspace screens.
8. Review screenshots for mobile fit and text overflow.
9. Translate approved layout into React components.

## Implementation Plan

### Phase 1: UI Structure Refactor

Goal:

Replace dashboard-first UI with role-based app shell.

Tasks:

- Create `AppShell`.
- Add responsive `TopNav` and `BottomNav`.
- Move auth UI out of the main hero/topbar and into shell/profile area.
- Create screen state for:
  - explore
  - applications
  - founder workspace
  - profile

Expected files:

```text
apps/web/src/app/App.tsx
apps/web/src/app/AppShell.tsx
apps/web/src/features/navigation/
apps/web/src/features/auth/
apps/web/src/styles.css
```

Validation:

```text
pnpm --dir apps/web lint
pnpm --dir apps/web build
```

### Phase 2: Respondent Explore

Goal:

Make the first screen a usable interview feed.

Tasks:

- Create `InterviewCard`.
- Create filter chip row.
- Create mobile-first explore screen.
- Add web list/detail layout.
- Keep fallback posts until real data exists.

Expected files:

```text
apps/web/src/features/interview-posts/InterviewCard.tsx
apps/web/src/features/interview-posts/ExploreScreen.tsx
apps/web/src/features/interview-posts/PostDetailPanel.tsx
```

### Phase 3: Application Flow

Goal:

Let logged-in respondents apply to a post.

Tasks:

- Add application API client.
- Add application form section.
- Collect screening answers.
- Collect available time chips.
- Submit with access token.
- Show applied state.

Backend dependencies:

- Confirm current application route shape.
- Ensure respondent id is derived from JWT subject.

### Phase 4: Founder Workspace

Goal:

Give founders a focused workflow for posts and applicants.

Tasks:

- Create founder workspace screen.
- Show founder posts.
- Show applicant counts.
- Show applicant rows.
- Add select/reject actions.
- Add schedule creation entry point.

### Phase 5: Post Creation

Goal:

Make founder post creation clear and guided.

Tasks:

- Build grouped post creation form.
- Add respondent preview card.
- Submit protected create request with bearer token.
- Show draft/open status choice.

### Phase 6: Mobile QA And PWA Polish

Goal:

Ensure mobile installation and viewport behavior are credible.

Checks:

```text
375 x 667
390 x 844
412 x 915
1440 x 900
```

Verify:

- no horizontal scroll,
- auth UI fits,
- card text clamps correctly,
- bottom nav does not cover CTAs,
- installable PWA manifest still works,
- service worker does not cache stale API responses.

## Acceptance Criteria

The redesign is ready for implementation when:

- Figma has the four core screens:
  - mobile explore
  - mobile detail/apply
  - web explore list/detail
  - web founder workspace
- Key components exist as reusable Figma components.
- Mobile auto layout works at 390 x 844 and 375 x 667.
- Web layout works at 1440 x 900.
- The first PWA screen is not a dashboard.
- Respondent can understand reward, duration, mode, location, and target fit from each card.
- Founder can see posts, applicants, and next actions without analytics-first framing.

## Open Questions

- Should the default role after signup be founder, respondent, or both?
- Should respondents browse without login and only log in at application time?
- Should founder post creation be available immediately after founder signup, or require profile completion first?
- Should offline interviews require a precise location before publishing?
- Should rewards be cash-only in MVP, or allow gift cards/vouchers as text?
- Should no-show tracking be visible to respondents immediately, or only used internally at first?

## Recommended Next Step

Use Figma MCP to create a new file named:

```text
Hypofit MVP Product Screens
```

Start with:

```text
Mobile / Explore
Mobile / Interview Detail
Web / Explore List Detail
Web / Founder Workspace
```

No Figma URL is required unless there is an existing file or design system to continue from.
