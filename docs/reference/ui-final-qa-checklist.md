# UI Final QA Checklist

Status: reference

Last updated: 2026-05-29

Related completed documents:

- `docs/completed/tailwind-ui-implementation-plan.md`
- `docs/completed/high-fidelity-uiux-reference-responsive-plan.md`
- `docs/completed/mobile-first-responsive-uiux-plan.md`
- `docs/completed/web-desktop-uiux-enhancement-plan.md`
- `docs/completed/product-design-redesign-plan.md`

## Purpose

This is the active close-out QA checklist for UI work. It should be used
alongside the current reference and store-readiness documents rather than
treated as the only UI document.

Use this checklist with:

- `docs/reference/mobile-pwa-responsive-design-trends.md`
- `docs/reference/mobile-safe-area-viewport-hardening-plan.md`
- `docs/reference/navigation-home-chat-ia-plan.md`
- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`

Use this checklist to finish the current web and Expo mobile quality pass
without reopening large planning documents.

## Scope

Verify the implemented Hypofit web/mobile app as a real product workflow:

```text
founder creates interview post
  -> respondent applies
  -> founder reviews applicant
  -> founder selects or rejects applicant
  -> session is scheduled
  -> session is completed or marked no-show
```

Do not expand this checklist into a new feature plan. If QA discovers product
gaps, log only the smallest follow-up needed to protect the MVP loop.

## Current Gate Status

Pass now:

- Web/PWA responsive smoke, copy, and accessibility baseline already have
  evidence in the QA log below.
- Phone-sized mobile information architecture and the main Expo screen set are
  implemented.

Fail gate:

- Phone-sized Expo UI is not signed off yet.
- Full simulator or real-device smoke is still missing for auth/session,
  map/search, support/report, chat overlays/read state, and full
  founder/respondent session lifecycle flows.

TODO:

- Run the required phone viewport matrix in Expo with seeded founder and
  respondent accounts.
- Record pass/fail for the remaining Expo-specific items below before moving
  this document as a release QA reference.

## Required Viewports

Canonical implementation viewport matrix:

```text
minimum width: 320
small phone: 360 x 740
standard phone: 390 x 844
large phone: 430 x 932
tablet fallback: 768 x 1024
desktop entry: 1280 x 832
desktop standard: 1440 x 900
```

Smoke and stress checks:

```text
small phone stress: 320 x 568
legacy smoke: 375 x 812
Android tall: 412 x 915
wide desktop: 1728 x 1117
```

## Mobile Parity And Store-Readiness Gate

For `apps/mobile`, use the phone-sized web app as the current visual baseline.
Do not compare RN screens to the desktop web layout when judging mobile parity.
This section is the close gate for phone-sized Expo QA.

- [ ] Phone-sized Expo smoke is run at 360 x 740, 390 x 844, 430 x 932, and
  412 x 915.
- [ ] Bottom tabs, headers, search/filter controls, cards, expanded rows,
  bottom sheets, and profile/legal/support routes match the approved phone UI
  in task order and visual hierarchy from the current `docs/reference/*`
  guidance.
- [ ] Safe areas work on notched iPhones, Android status bars, home indicators,
  keyboard-open forms, and gesture-driven bottom sheets.
- [ ] Account deletion, report/block, support contact, legal links, and
  permission rationale screens remain reachable for store review.
- [ ] Auth/login, map/search, chat/thread, and `내 인터뷰` lifecycle routes can
  be completed in Expo without dead ends or layout breakage.
- [ ] Any intentional RN divergence from the phone web UI is documented with
  the product reason.

## Global UI Checks

`[x]` means existing evidence already exists in the current implementation or QA
log. `[ ]` means the phone-sized Expo close-out check is still open.

- [x] Text does not overlap or clip at required viewport sizes.
- [x] Buttons and inputs keep stable height across loading and disabled states.
- [x] Main navigation remains reachable on mobile and desktop.
- [x] Touch targets are comfortable on mobile.
- [x] Desktop layout uses width intentionally and does not feel like a stretched mobile screen.
- [x] Cards are used only for repeated items or framed tools, not nested page sections.
- [x] The app does not read as a generic analytics dashboard.
- [x] Founder and respondent workflows are both visible and understandable.
- [x] Profile images render consistently where user identity matters.
- [x] Empty states explain the next product action without marketing copy.
- [ ] Shared mobile safe-area variables are verified in browser and installed
  PWA mode.
- [ ] Expo mobile safe-area behavior is verified separately from installed-web
  fallback behavior.
- [ ] Home and map have no unintended root-screen scroll or gesture conflicts
  on small phones.
- [ ] Map selected card, list button, and bottom sheet do not collide across
  collapsed, mid, and expanded states.
- [ ] Chat profile/block overlays remain reachable on 320px-wide screens.
- [ ] Support, report, legal, install, and profile subpages keep first and last
  content clear of notches and home indicators.
- [ ] Public account deletion page remains reachable without login at
  `/account-deletion`.
- [ ] Latest Vercel production deployment reaches `Ready` after dependency,
  React type, or workspace alias changes.

## Screen Checks

The checks below are the current baseline pass from code and earlier web/mobile
QA. Final phone-sized Expo sign-off still depends on the open gate items above.

### Explore

- [x] Respondent can quickly compare reward, duration, mode, location, and target condition.
- [x] Interview posts expose enough service context to decide whether to apply.
- [x] Application action is clear and does not require reading unrelated dashboard text.
- [x] Mobile list density is usable without feeling cramped.
- [x] Desktop view supports scanning multiple opportunities efficiently.

### My Interviews

- [x] Application status is visible without opening a detail view.
- [x] Rejected, selected, and applied states are visually distinct.
- [x] Respondent can understand what happens next after applying.
- [x] Empty state guides the user back to interview opportunities.

- [x] Founder can distinguish post status, applicants, and next action quickly.
- [x] Applicant review surfaces respondent name/profile image and fit evidence.
- [x] Select and reject actions require confirmation where appropriate.
- [x] Closed posts do not look actionable.
- [x] Application management and created-post management are grouped under the
  secondary `내 인터뷰` route instead of crowding the discovery/search page.

### Chat

- [x] Chat tab preserves session date, time, mode, and participant context.
- [x] Completion and no-show actions are clearly separated.
- [x] Destructive or trust-impacting actions use confirmation.
- [x] Respondent and founder perspectives both make sense.

### Profile

- [x] Role, name, phone, and profile image states are understandable.
- [x] Profile image upload success/failure states are visible.
- [x] Browser-safe Supabase anon usage is clear from code and no backend secret is exposed.

## Copy Checks

- [x] Use "사례비" consistently unless a specific context needs "보상".
- [x] Do not imply escrow or automated payment before it exists.
- [x] Founder-facing text should focus on customer discovery and interview validation.
- [x] Respondent-facing text should focus on relevant experience, time, distance, and reward.
- [x] Avoid generic SaaS phrases such as "insights", "growth", or "optimize" unless tied to a concrete workflow.

## Accessibility Checks

- [x] Dialogs can be opened and dismissed with keyboard.
- [x] Focus is not trapped incorrectly after closing dialogs.
- [x] Icon-only buttons have accessible names or visible labels.
- [x] Form errors are connected to the fields they describe.
- [x] Color is not the only signal for important statuses.
- [x] Contrast is acceptable for secondary text and badges.

## QA Pass Log

### 2026-05-29 Current Status Snapshot

Confirmed:

- Public API deployment is no longer the UI blocker. `https://hypofit-api.bukae.co.kr`
  is up, and deploy smoke passed separately.
- Expo Go on iOS 26.5 / iPhone 17 Pro simulator launched against the deployed
  API.
- Visual smoke passed without crashes for map, notifications, account deletion,
  support inquiry list, report form, and chat list.
- Chat thread smoke passed without crashes for a real deployed chat room.
- Visual smoke passed without crashes for home, interview search, interview
  detail, my interviews, and create-interview entry.
- Deployed support/report submit smoke passed for normal inquiry and chat-room
  report target metadata.
- Deployed application submit smoke passed, and duplicate application attempts
  return `409`.
- The seeded `both` account shows both respondent-side applications and
  founder-side created posts in `내 인터뷰`.
- Map tab renders nearby posts and markers from deployed data.
- Notification center renders the signed-in API-backed empty state.
- This checklist stays active because full phone-sized Expo simulator/device QA
  is still open.

Still open:

- Application form-level visual submit smoke in Expo.
- Map search selection and create-interview place search smoke in Expo.
- Chat overlay, block action, and unread/read-state smoke in Expo.
- Account-deletion submit smoke in Expo.
- Founder/respondent select -> schedule -> complete/no-show lifecycle smoke in
  Expo.

### 2026-05-20 Public Responsive Smoke

Evidence:

```text
/tmp/hypofit-qa-screenshots/mobile-375-settled.png
/tmp/hypofit-qa-screenshots/mobile-430.png
/tmp/hypofit-qa-screenshots/tablet-768.png
/tmp/hypofit-qa-screenshots/desktop-1440-settled.png
```

Confirmed:

- Public deployed PWA renders at 375 x 812, 430 x 932, 768 x 1024, and 1440 x 900.
- Mobile bottom navigation remains reachable and touch targets are visually large enough.
- Desktop left rail and two-column home layout use available width intentionally.
- Empty interview state is product-specific and gives the next action.
- Product copy now uses "사례비" in user-facing interview/reward surfaces.
- Web lint, test, and build pass after copy and checklist updates.
- Field-level validation errors are connected to inputs with `aria-describedby` and covered by a component test.
- Closed founder posts now show a non-actionable state and disable applicant/session actions.
- Secondary text and badge token contrast pass WCAG AA normal text threshold after color-token adjustment.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

Contrast checks:

```text
text on bg: 14.38
muted on bg: 4.70
soft on bg: 4.61
muted on surface: 5.13
soft on surface: 5.02
brand on brand-soft: 5.52
info on info-soft: 4.75
reward on reward-soft: 4.92
success on success-soft: 4.79
warning on warning-soft: 4.84
danger on danger-soft: 5.91
white on brand: 6.37
white on danger: 6.47
```

Still open:

- Full logged-in workflow screenshots require founder/respondent test accounts with seeded interview posts, applications, and sessions. This is the only remaining close blocker.

### 2026-05-21 Local Auth/Profile UI Validation

Scope:

- Mobile auth screen refinement.
- Splash screen minimum display timing.
- PWA startup background and theme color.
- Supabase Auth session persistence options.
- iOS input zoom prevention.
- Mobile bottom navigation detail adjustment.
- Profile page settings/footer structure.
- UI agent rules for copy tone and iteration workflow.

Confirmed:

- TypeScript accepts the current local UI changes.
- Existing frontend unit/component tests still pass.
- Production web build succeeds after the auth, navigation, profile, and PWA shell changes.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

Still open:

- Visual QA in the iPhone simulator should confirm the 7px mobile navigation label remains readable.
- Terms, privacy policy, and support rows on the profile page need real links or routes.
- Figma sync is intentionally deferred until the current mobile UI direction is approved.
- Full logged-in workflow screenshots still require founder/respondent test accounts with seeded data.

### 2026-05-21 Legal and Support Pages Validation

Scope:

- Profile menu links for terms, privacy policy, and support.
- Public `/legal/terms`, `/legal/privacy`, and `/support` routes.
- MVP terms and privacy policy draft content.
- Vercel SPA fallback config for direct URL refresh.
- Support email environment placeholder.

Confirmed:

- Profile menu rows now link to real pages.
- Legal and support pages render outside the authenticated app shell, so users can read them before login.
- Local dev server returns `200 OK` for `/legal/terms`, `/legal/privacy`, and `/support`.
- Vercel rewrite config is present for direct URL access.
- Frontend typecheck, tests, and production build pass after the legal/support page changes.

Validation:

```text
GET /legal/terms: 200 OK locally
GET /legal/privacy: 200 OK locally
GET /support: 200 OK locally
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

Still open:

- Confirm Play/App Store metadata uses the confirmed support email:
  `ssamso8282@gmail.com`.
- Confirm Play/App Store metadata uses the confirmed service provider name:
  `박종인`.
- Confirm Supabase/Vercel region and international transfer wording before wider launch.
- Legal copy should receive legal review before paid or public-scale operation.

### 2026-05-21 Profile Activity Summary Validation

Scope:

- Replace the abstract profile trust-record placeholder with concrete activity
  counts.
- Show application, founder post, and session counts in the profile page.
- Keep copy short and aligned with the bottom navigation labels.

Confirmed:

- Profile now shows `내 활동` with `신청`, `모집`, and `일정` counts.
- Counts use existing query hooks, so no backend change was needed.
- The removed trust-record concept remains deferred until completion/no-show
  history becomes a real product signal.
- Frontend typecheck, tests, and production build pass after the profile
  activity summary changes.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

### 2026-05-21 Home Navigation Validation

Scope:

- Change the first bottom-navigation destination from `찾기` to `홈`.
- Keep the existing interview opportunity surface as the first screen.
- Adjust home copy toward recent interview posts and immediate application.
- Document the `채팅` direction without replacing session state.

Confirmed:

- The app now initializes on the `home` destination.
- Mobile and desktop navigation show `홈` for the first tab.
- Home copy no longer reads like a narrow search page.
- The chat direction is documented, while explicit session state remains
  preserved.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

### 2026-05-21 Chat Tab Transition Validation

Scope:

- Change the fourth top-level navigation destination from `일정` to `채팅`.
- Rename the internal app destination from `schedule` to `chat`.
- Keep existing session records as the first coordination-room surface.
- Preserve completion and no-show actions until real message storage is added.

Confirmed:

- Mobile and desktop navigation now show `채팅`.
- The app renders the chat coordination page through the `chat` destination.
- Existing session date, meeting type, place/link, completion, and no-show
  controls remain available.
- The transition avoids a new backend dependency, so it can ship before
  persistent messages are implemented.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

### 2026-05-21 Real Chat MVP Implementation Validation

Scope:

- Add real chat room and message domain structures.
- Create a chat room when a respondent applies to an interview post.
- Seed default system guidance messages for the new room.
- Replace the session-list chat placeholder with room list, thread, message
  bubble, and composer UI.
- Keep the mobile Chat tab as a room-list screen first; tapping a room opens
  the thread screen with a back button.
- Make the mobile thread full-screen above the bottom navigation.
- Add lightweight inbox search for name, post title, and latest message.
- Add SaaS inbox filters for `전체`, `조율 중`, `선정됨`, and `종료`.
- Add row-level workflow metadata such as status, reward, and interview mode.
- Replace the generic thread notice with an interview context bar.
- Add a desktop-only interview context side panel.
- Keep confirmed schedule/completion/no-show as a separate session state that
  can later be shown inside the room.
- Merge `신청` and `모집` into one top-level `인터뷰` tab.
- Move application and created-post management into the secondary `내 인터뷰`
  route.
- Keep `모집글 만들기` visible only for `founder` and `both` users inside
  `인터뷰`.
- Keep 신청 and 채팅 available for founder accounts because founders may also
  participate in interviews as target customers.
- Add a `지도` top-level tab for location-based discovery of offline-capable
  interview posts.
- Start with a map-like pin canvas and location list using existing post
  `location` data before choosing a production map SDK.

Expected validation:

```text
api ruff: passed
api tests: passed, 13 passed / 6 skipped
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

Still open:

- Repository scoping tests that need `TEST_DATABASE_URL` were skipped in the
  default local API test run.
- Visual simulator QA should confirm the chat list/thread split feels right on
  installed PWA mobile.

### 2026-05-21 Home Feed Simplification Validation

Scope:

- Remove the profile/account panel from the home screen.
- Remove the `모집글 만들기` CTA from home.
- Keep creation responsibility in the founder-only area inside `인터뷰`.
- Make the home header a concise recent-interview feed entry point.

Confirmed:

- Home no longer repeats the profile card that belongs in the profile tab.
- Home no longer mixes founder creation with respondent discovery.
- The first screen is focused on recent interview opportunities.
- Frontend typecheck, tests, and production build pass after simplification.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

### 2026-05-21 UI Mock Data Validation

Scope:

- Frontend-only mock data was used for UI design iteration.
- As of 2026-05-25, runtime mock data hooks have been removed.
- Local and deployed UI checks should use seeded Supabase/Auth and Spring API data.
- Keep `VITE_USE_MOCK_DATA=false` in local and deployed environments.

Confirmed:

- Mock data is not an API fallback.
- `.env.example` documents `VITE_USE_MOCK_DATA=false` as a deprecated
  compatibility placeholder.
- Local `.env.local` uses `VITE_USE_MOCK_DATA=false`.
- Existing query hooks call real API clients.
- Frontend typecheck, tests, and production build should pass after mock-data
  removal.

Validation:

```text
web lint: passed
web test: passed, 7 files / 20 tests
web build: passed
```

### 2026-05-21 My Interviews Route Validation

Scope:

- Add a secondary `내 인터뷰` route from the `인터뷰` page header.
- Keep `인터뷰` focused on detailed search/discovery.
- Group application status and created-post applicant review in one management
  screen.
- Keep founder-only created-post management hidden from respondent-only users.
- Preserve the bottom navigation while viewing `내 인터뷰`.

Confirmed:

- The `인터뷰` header now shows `내 인터뷰` next to `만들기`.
- `내 인터뷰` shows 신청한 인터뷰, 내가 만든 모집글, and 확정 일정 summary
  counts.
- Respondent-only users see 신청한 인터뷰 only.
- Founder-capable users can review applicants, select/reject, and create
  sessions through the existing founder post cards.
- Frontend typecheck and production build pass after routing and page changes.

Validation:

```text
web lint: passed
web build: passed
```

## Validation Commands

Run before closing this checklist:

```bash
apps/api/.venv/bin/python -m ruff check apps/api/app apps/api/tests
apps/api/.venv/bin/python -m pytest apps/api/tests
make test-api-integration
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web lint
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web test
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

## Close Criteria

This document can move to `docs/completed/` when:

- required viewport QA is done
- critical layout/copy/accessibility issues are fixed or logged
- final validation commands pass
- no large implementation plan remains hidden inside this checklist
