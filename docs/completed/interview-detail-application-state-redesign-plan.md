# Interview Detail Application State Redesign Plan

Status: completed

Last updated: 2026-06-15

Moved from `docs/active/` to `docs/completed/` on 2026-06-15 because the
implementation work is complete enough for history/reference use. Remaining
items such as simulator visual QA, future edit-screen work, and Figma sync are
tracked through release QA or future feature-specific plans instead of keeping
this document in the active backlog.

## Purpose

This document tracks the next Expo React Native mobile redesign pass for the
interview detail and my-interviews application flow.

The current implementation already separates lightweight application rows from
the richer interview detail page. However, the detail page still uses too many
rounded card containers, and the user's own application state appears too late
in the information hierarchy. The next pass should make the detail page feel
like a native mobile product surface: status first when the user has already
applied, row-based detail sections, fewer boxed cards, and a clear route to
chat.

This is mobile-first work. The React web app can adopt the product decisions
later, but phone-sized Expo UI is the source of truth for this task.

## Source Of Truth

- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`
- `apps/mobile/src/screens/interviews/MyInterviewsScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/features/applications/useApplications.ts`
- `apps/mobile/src/features/applications/useApplicationMutations.ts`
- `apps/mobile/src/features/chat/useChat.ts`
- `apps/mobile/src/features/sessions/useSessions.ts`
- `apps/mobile/src/features/workflow/readModels.ts`
- `apps/mobile/src/shared/ui/ListSurface.tsx`
- `apps/mobile/src/shared/ui/PrimaryButton.tsx`
- `packages/contracts/src/api/applications.ts`
- `packages/contracts/src/api/chat.ts`
- `packages/contracts/src/api/interview-posts.ts`
- `packages/contracts/src/api/sessions.ts`
- `docs/reference/mobile-list-card-surface-system-plan.md`
- `docs/reference/navigation-home-chat-ia-plan.md`
- `docs/reference/mobile-pwa-responsive-design-trends.md`
- `docs/reference/ui-final-qa-checklist.md`

## External UX References

Use these as direction, not as UI to copy blindly.

- IBM Carbon Design System, Tile:
  https://carbondesignsystem.com/components/tile/usage/
  - Tiles/cards are flexible containers for related information and actions.
  - Cards can become complex when they include hierarchy, multiple actions,
    overflow menus, and selection patterns.
  - Tiles are on the same visual plane as the page background and should not
    gain unnecessary elevation.
- IBM Carbon Design System, Structured List:
  https://carbondesignsystem.com/components/structured-list/usage/
  - Structured lists help users quickly browse and view information within a
    group of data.
  - Row text should remain concise; complex nested content should be avoided in
    rows.
  - Selectable rows can use the full row as the click target.
- Apple Human Interface Guidelines, Lists and tables:
  https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
  - iOS information surfaces commonly rely on direct, scannable rows instead of
    visually heavy containers.
  - Disclosure rows should make navigation predictable and avoid competing
    inner actions.
- Apple Human Interface Guidelines, Buttons:
  https://developer.apple.com/design/human-interface-guidelines/buttons
  - Primary actions should be clear, reachable, and visually distinct from
    supporting information.

## Current State

### What Works

- [x] `내 인터뷰` application rows are tappable and navigate to interview detail.
- [x] Application rows no longer show submitted answer count or available time
  count.
- [x] Application rows use short status labels such as `신청`, `선정`, `반려`,
  `완료`, and `불참`.
- [x] Application rows no longer show schedule text.
- [x] Application rows no longer show profile avatars and keep a simple
  chevron indicator for detail navigation.
- [x] Founder-created post rows in `내 모집글` now stay lightweight and show
  only title, applicant/selection counts, post status, and a chevron indicator
  instead of repeating full post details or action guidance.
- [x] Founder-created post rows now navigate to a dedicated `모집글 관리`
  screen instead of expanding applicant management inline.
- [x] The dedicated founder management screen now places the post lifecycle
  badge in the header action area instead of showing a separate status block in
  the body.
- [x] The dedicated founder management screen now separates `지원자 목록` and
  `모집글 정보` into tabs.
- [x] The dedicated founder management screen exposes a `...` menu for
  management navigation and status changes.
- [x] Mobile API hooks support backend lifecycle actions, but the management UI
  intentionally exposes only close and reopen because archive reads as
  ambiguous deletion in the MVP.
- [x] Interview detail detects an existing application for the current user.
- [x] Interview detail hides `신청 전 확인` after the user has already applied.
- [x] Interview detail can find the related chat room by `application_id`.
- [x] Interview detail exposes a simple `채팅 보기` button after application.
- [x] Interview posts now include `recruit_count`; `0` is displayed as `0명`.
- [x] Interview detail now shows founder summary data through the
  `InterviewPostRead.founder` API field.

### Current Weak Points

- [x] Interview detail still looks too card-heavy.
  - `인터뷰 조건`, `찾는 사람`, `모집자 안내`, and `내 신청 상태` all use similar
    rounded card containers.
  - Repeated cards make the screen feel fragmented instead of native and
    continuous.
- [x] `내 신청 상태` appears after the general interview information.
  - For an already-applied user, their own status should be the first useful
    information.
- [x] The detail page does not yet have a single clear information hierarchy
  for the three major states:
  - not applied
  - applied or selected
  - rejected/completed/no-show/canceled
- [x] The chat CTA is visually correct but its placement should be closer to
  the application status summary.
- [x] The current status block includes rich details, but it still sits inside
  a card that competes with the rest of the page.
- [ ] The screen has not yet been visually QA'd on small and large iPhones after
  the application-state changes.

## Product Principles

### 1. Application State First After Applying

When a user opens a detail page after applying, the screen should answer:

- Did my application go through?
- Was I selected or rejected?
- Is there an agreed schedule?
- Where do I continue the conversation?

For this state, `내 신청 상태` is more important than the original recruitment
pitch. Put it near the top.

### 2. Recruitment Pitch First Before Applying

When the user has not applied yet, the screen should answer:

- What is this interview?
- Who are they looking for?
- How much is the reward?
- Is it online or in person?
- What should I check before applying?

For this state, the detail page can still start with the interview title,
summary, conditions, and `신청 전 확인`.

### 3. Rows For Details, Cards Only For Emphasis

Use cards sparingly.

Good use cases for a card-like container:

- one top status summary
- an application form
- a blocking empty/error state

Poor use cases for cards:

- every section on a long detail page
- simple label/value information
- repeated explanatory blocks that are not interactive

For normal details, prefer:

- section title
- row group
- thin divider
- icon or label
- value

### 4. One Primary Action Per State

Before applying:

- primary action: `신청하기`

After applying:

- primary action: `채팅 보기`

For own post:

- primary action: `내 인터뷰에서 지원자 보기`

Avoid mixing multiple primary actions in the same visual area.

### 5. Keep Chat Wording Simple

Use `채팅 보기`.

Do not use longer labels such as `채팅에서 일정 조율하기` in the main CTA. The
detail copy can explain the next step, but the button should stay short.

## Target Information Architecture

### State A: Not Applied

```text
Header
Interview hero
  - mode/status chips
  - title
  - service summary
  - reward / duration
Interview conditions
  - schedule
  - method
  - location
  - duration
  - reward
Looking for
Founder info
Recruiter note
Pre-apply checklist
Apply CTA / form
```

### State B: Applied Or Selected

```text
Header
My application status
  - current status
  - short status explanation
  - chat CTA
Interview hero
  - title
  - service summary
  - reward / method / duration
Confirmed schedule, if present
Submitted application
  - related experience
  - available times
Interview conditions
Looking for
Founder info
Recruiter note
```

### State C: Rejected, Completed, No-Show, Or Canceled

```text
Header
My application status
  - final status
  - rejection reason or completion/no-show explanation
  - chat CTA if room exists
Interview hero
Submitted application
Interview conditions
Looking for
Founder info
Recruiter note
```

## Detailed UX Plan

### 1. Move `내 신청 상태` To The Top For Applied Users

Implementation target:

- In `InterviewDetailScreen`, calculate:
  - `hasExistingApplication`
  - `isOwnPost`
  - `shouldShowAppliedStateFirst`
  - `shouldShowPreApplyGuidance`
- If `shouldShowAppliedStateFirst` is true, render `ApplicationStatusSummary`
  immediately below the header state/loading block and above the interview hero.
- If the user has not applied, keep the interview hero first.

Acceptance criteria:

- [x] Applied users see `내 신청 상태` before the interview title block.
- [x] Not-applied users still see the interview title and recruiting context
  first.
- [x] Own-post users do not see respondent application state.

### 2. Replace Repeated Cards With Section Surfaces

Create or reuse lightweight section primitives:

- `DetailSectionGroup`
  - no rounded card by default
  - optional top divider
  - section title
  - vertical row stack
- `DetailInfoRow`
  - optional icon
  - label
  - value
  - optional highlighted value
- `DetailTextBlock`
  - title/body copy for non-row content

Recommended visual treatment:

- page background: `bg-hypo-bg`
- row group background: transparent
- divider: `border-hypo-border`
- section vertical padding: 16 to 18
- row vertical padding: 8 to 10
- card radius only for status summary/form: 14 to 16

Acceptance criteria:

- [x] `인터뷰 조건` is no longer a rounded card.
- [x] `찾는 사람` is no longer a rounded card.
- [x] `모집자 안내` is no longer a rounded card.
- [x] Divider spacing feels consistent with Profile and Interview list rows.
- [x] The page reads as one continuous detail page, not a stack of separate
  panels.

### 3. Redesign Application Status Summary

The summary should be compact and high-signal.

Layout:

```text
[status badge]
신청이 접수됐어요
모집자가 신청 내용을 확인하고 있어요.
[채팅 보기]
```

Selected state:

```text
[선정]
인터뷰 대상자로 선정됐어요
확정된 일정이 있으면 아래에서 확인할 수 있어요.
[채팅 보기]
```

Rejected state:

```text
[반려]
신청이 반려됐어요
반려 사유가 있으면 아래에서 확인할 수 있어요.
[채팅 보기]
```

Visual treatment:

- One subtle brand-tinted surface is acceptable.
- Avoid heavy border + card stacking.
- Put `채팅 보기` inside or directly below the summary so the next action is
  immediately visible.

Acceptance criteria:

- [x] The status summary appears above the interview content for applied users.
- [x] The CTA label is always `채팅 보기` when a chat room exists.
- [x] If no chat room is available, disabled text is `채팅방을 준비 중이에요`.
- [x] Status copy is short and Toss-like.

### 4. Move Submitted Application Details Below Status

For applied users, show a section called `내가 제출한 내용`.

Rows:

- `관련 경험`
- `가능 시간`
- `반려 사유`, only when rejected and reason exists

Do not put this above the status summary.

Do not show this on not-applied detail pages.

Acceptance criteria:

- [x] Submitted answer data is visible only after applying.
- [x] Available times are visible only after applying.
- [x] Rejection reason is visible only for rejected applications with a reason.
- [x] Submitted content does not make the top of the page too tall.

### 5. Move Confirmed Schedule Into Its Own Applied-Only Section

For applied users with a session, show `확정된 일정`.

Rows:

- `일정`
- `진행 방식`
- `장소`, if offline and available
- `참여 링크`, if online URL is available

For not-applied users, keep the original `인터뷰 조건` schedule options.

Acceptance criteria:

- [x] `내 인터뷰` rows do not show schedule.
- [x] Applied detail pages show confirmed schedule only when `Session` exists.
- [x] Not-applied detail pages still show recruitment schedule options.
- [x] Schedule and submitted possible times are not confused.

### 6. Keep `신청 전 확인` Only Before Applying

Rules:

- Show `신청 전 확인` only when:
  - user is not the post owner
  - user has not applied
- Hide it when:
  - application exists
  - post owner is viewing own post

Acceptance criteria:

- [x] Applied users do not see `신청 전 확인`.
- [x] Own-post users do not see `신청 전 확인`.
- [x] Not-applied users still see the pre-apply checklist before opening the
  application form.

### 7. Keep Row-Level `내 인터뷰` Lightweight

Application and founder-created post rows should not try to solve detail-page
responsibilities.

Keep:

- title
- reward
- method
- status badge
- chevron

Do not show:

- schedule
- available time count
- answer count
- long status guidance
- duplicated completed/selected status lines
- full target description on founder-created post rows
- reward/method/duration repetition on founder-created post rows

Acceptance criteria:

- [x] `ApplicationRow` remains a fast scanning row.
- [x] `FounderPostRow` remains a fast scanning row.
- [x] Tapping the row opens detail.
- [x] Detail carries the richer context.

### 7-1. Move Founder Applicant Management To A Dedicated Page

Founder-created post management should not replace the list content inline.

Rules:

- `내 모집글` row tap opens a new route.
- The new route owns applicant review and state changes.
- The parent `내 인터뷰` page remains a stable list of applications/posts.
- Header title uses the interview post title after the post loads.
- Back returns to `내 인터뷰`.

Acceptance criteria:

- [x] `내 모집글` row no longer expands inside the same list.
- [x] `/(tabs)/interviews/my-posts/[postId]` route exists.
- [x] The dedicated page verifies login, founder role, and post ownership.
- [x] The dedicated page shows post lifecycle status and applicant list.
- [x] The dedicated page avoids repeating the post title in the body after
  using it as the header title.
- [x] Selecting/rejecting applicants is intentionally handled in the chat
  thread, not duplicated on the management page.

### 7-2. Add Founder Post Management Controls

Rules:

- Do not show applicant counts as the first header-like content inside the
  management page body.
- Show the interview post title in the screen header.
- Place only the current post status badge in the header action area, directly
  before the `...` menu.
- Let founders change only lifecycle states currently supported by the API:
  - `open -> closed`
  - `closed/archived -> open`
- Do not expose archive as a normal founder UI action for now.
- Show recruit count in post creation, respondent-facing detail, map preview,
  home expanded detail, search expanded detail, and founder post info.
- Treat `recruit_count = 0` as `0명` in UI copy.
- Split management into two tabs:
  - `지원자 목록`
  - `모집글 정보`
- Use the `...` menu for secondary management shortcuts, not for primary
  applicant review.
- Keep applicant rows focused on respondent identity, application state, and a
  `채팅 보기` entry point.
- Do not duplicate select/reject buttons here because the chat thread already
  owns those workflow actions.
- `모집글 정보` should expose respondent-facing preview and editing/deletion
  policy separately.
- Current API policy blocks full post edits after any application exists.
- Destructive deletion is not implemented yet. Do not label archive as delete
  or show archive as a default user action until the product policy is clearer.
- Once an applicant has been selected, hide or disable deletion-like actions so
  interview records and chat context remain auditable.

Acceptance criteria:

- [x] Status is visible in the header action area before the `...` menu.
- [x] Status change modal calls the real lifecycle API.
- [x] Unsupported statuses such as hidden/removed do not show invalid founder
  actions.
- [x] Applicant list remains the default tab.
- [x] Applicant rows no longer duplicate select/reject actions.
- [x] Applicant rows provide chat navigation when a room exists.
- [x] Applicant rows no longer expose rejection reasons inline.
- [x] Applicant rows provide a `지원 정보` route for submitted answers and
  available times.
- [x] `/(tabs)/interviews/my-posts/[postId]/applicants/[applicationId]` route
  exists and verifies login, founder role, post ownership, and application
  membership.
- [x] `모집글 정보` provides the post content as read-only rows.
- [x] `모집글 정보` provides a respondent-facing preview entry point.
- [x] `모집글 정보` disables deletion-like actions after an applicant is
  selected.
- [x] `모집글 정보` shows recruit count.
- [ ] Future edit screen and mutation contract are still separate work.

### 8. Preserve Navigation And Return Paths

Rules:

- `내 인터뷰` row -> detail:
  - `returnTo=/(tabs)/interviews/my-interviews`
- detail -> chat:
  - `returnTo` should point back to the current detail page.
- chat back button should return to the detail page when opened from detail.
- detail back button should return to the original list/context.

Acceptance criteria:

- [x] From `내 인터뷰`, row tap opens detail.
- [x] From detail, `채팅 보기` opens the right chat room.
- [ ] From chat, back returns to detail.
- [x] From detail, back returns to `내 인터뷰`.

## Implementation Plan

### Phase 1: Extract Detail UI Primitives

- [x] Add small local helpers inside `InterviewDetailScreen.tsx` first.
- [ ] If duplication grows, move primitives to
  `apps/mobile/src/shared/ui/DetailSurface.tsx`.
- [x] Keep NativeWind className as the primary styling mechanism.
- [x] Avoid new screen-level `StyleSheet.create`.

Candidate components:

- [ ] `DetailSectionGroup`
- [ ] `DetailInfoRow`
- [x] `ApplicationStatusSummary`
- [x] `SubmittedApplicationSection`
- [x] `ConfirmedSessionSection`

### Phase 2: Reorder Applied Detail Page

- [x] Render application status summary before interview hero for applied users.
- [x] Move chat CTA into the status summary.
- [x] Move submitted answers and possible times below the status summary.
- [x] Move confirmed session details into its own applied-only section.

### Phase 3: Convert General Sections To Row-Based Layout

- [x] Convert `인터뷰 조건` from card to section rows.
- [x] Convert `찾는 사람` from card to section text block.
- [x] Convert `모집자 안내` from card to section text block or row.
- [x] Keep the apply form visually contained because form fields need a stable
  surface.

### Phase 4: Tighten Copy

- [x] Replace long explanations with short user-facing sentences.
- [x] Keep button label as `채팅 보기`.
- [x] Avoid system/admin wording such as `application`, `session`, `status`.
- [x] Keep rejected/completed/no-show copy calm and factual.

Recommended copy:

- `신청이 접수됐어요`
- `모집자가 신청 내용을 확인하고 있어요.`
- `인터뷰 대상자로 선정됐어요`
- `확정된 일정이 있으면 아래에서 확인할 수 있어요.`
- `신청이 반려됐어요`
- `반려 사유를 확인해보세요.`
- `인터뷰가 완료됐어요`
- `불참으로 기록됐어요`

### Phase 5: QA And Regression Check

- [x] Run mobile typecheck:
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
- [ ] Simulator visual QA on one small and one large iPhone size.
- [ ] Check states:
  - not logged in
  - not applied
  - own post
  - applied
  - selected with no session
  - selected with session
  - rejected with reason
  - completed
  - no-show
- [ ] Check founder management route:
  - respondent-only user cannot open another founder's page
  - founder can open own post management page
  - empty applicant state is clear
  - applicant rows open the right chat room
  - select/reject actions still work from the chat thread
  - status change actions match the backend-supported state transitions
  - `지원자 목록` and `모집글 정보` tabs both render correctly
- [ ] Check navigation:
  - `내 인터뷰` -> detail -> chat -> back
  - `내 인터뷰` -> `내 모집글` -> `모집글 관리` -> back
  - `인터뷰` search -> detail -> back
  - `홈` recent interview -> detail -> back
  - `지도` selected interview -> detail -> back
- [ ] Confirm Figma sync is deferred unless the user explicitly asks.

## Data And API Notes

No backend schema change is required for the first pass.

Existing data is enough:

- `Application`
  - `status`
  - `answers`
  - `available_times`
  - `rejection_reason`
- `Session`
  - `application_id`
  - `scheduled_at`
  - `meeting_type`
  - `meeting_url`
  - `place`
  - `status`
- `ChatRoom`
  - `application_id`
  - `interview_post_id`
  - `id`
  - `status`

Potential future API improvement:

- Add `chat_room_id` to application read models or add
  `GET /api/v1/chat/rooms/by-application/{application_id}` if list filtering
  becomes inefficient.

Do not add this now unless performance or correctness issues appear.

## Non-Goals

- Do not redesign the whole interview search tab in this task.
- Do not change backend application/session state transitions.
- Do not add payment or reward settlement behavior.
- Do not add a separate schedule tab.
- Do not add Figma sync during active UI iteration unless explicitly requested.
- Do not turn detail into a dashboard with metrics.

## Completion Checklist

- [x] Applied users see `내 신청 상태` at the top of detail.
- [x] Not-applied users still see recruiting information first.
- [x] The detail page uses row/section layout instead of repeated cards.
- [x] `신청 전 확인` appears only before applying.
- [x] `채팅 보기` appears for applied users with an available chat room.
- [x] Application rows stay lightweight and do not show schedule.
- [x] Founder-created post rows stay lightweight and avoid repeating full post
  content or extra guidance copy.
- [x] Founder applicant management opens on a dedicated page instead of inline
  expansion.
- [x] Typecheck passes.
- [ ] Simulator visual QA is completed.
- [ ] Figma sync is either completed by explicit request or intentionally
  deferred in the final report.
