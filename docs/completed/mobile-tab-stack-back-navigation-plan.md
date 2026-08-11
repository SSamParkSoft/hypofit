# Mobile Tab Stack Back Navigation Plan

Status: completed

Last updated: 2026-06-08

## Purpose

Fix mobile back navigation so detail pages return to the correct product
section instead of unexpectedly landing on `홈`.

This document tracks the implementation plan for Expo Router tab/stack
navigation hardening. It should stay active until the current profile,
interview, chat, map, notification, support, notice, and legal detail routes
have predictable back behavior on simulator, TestFlight, and deep-link entry.

## Source Standards

Primary references checked on 2026-06-05:

- Expo Router, common navigation patterns:
  https://docs.expo.dev/router/basics/common-navigation-patterns/
- Expo Router, nesting navigators:
  https://docs.expo.dev/router/advanced/nesting-navigators/
- Apple Human Interface Guidelines, Tab Bars:
  https://developer.apple.com/design/Human-Interface-Guidelines/tab-bars
- Apple Human Interface Guidelines, Navigation Bars:
  https://codershigh.github.io/guidelines/ios/human-interface-guidelines/ui-bars/navigation-bars/index.html
- Material Design, Bottom Navigation:
  https://m1.material.io/components/bottom-navigation.html

Standards distilled for Hypofit:

- Bottom tabs are top-level destinations, not workflow actions.
- Each tab should preserve a stable local hierarchy.
- Detail pages opened from a tab should return to that tab or the explicit
  parent screen that launched them.
- Custom back buttons must behave consistently across the app.
- Android/system back and app-header back should not unexpectedly switch across
  unrelated bottom-tab destinations.
- Shared detail pages can be root-level only if they receive an explicit,
  sanitized return destination.
- Root-level support/legal/notice screens now rely on the root stack and
  `AppScreen`'s `goBackOrReplaceFallback(...)`: normal entry uses reverse
  stack pop animation, while missing-history entry still falls back to the
  sanitized `returnTo`.

## Current Diagnosis

Current bottom tabs:

```text
홈 / 인터뷰 / 지도 / 채팅 / 프로필
```

Current route shape after the nested-stack migration:

```text
app/(tabs)/home/index.tsx
app/(tabs)/home/_layout.tsx

app/(tabs)/interviews/index.tsx
app/(tabs)/interviews/_layout.tsx
app/(tabs)/interviews/[postId].tsx
app/(tabs)/interviews/my-interviews.tsx
app/(tabs)/interviews/new.tsx

app/(tabs)/map/index.tsx
app/(tabs)/map/_layout.tsx

app/(tabs)/chat/index.tsx
app/(tabs)/chat/_layout.tsx
app/(tabs)/chat/[roomId].tsx

app/(tabs)/profile/index.tsx
app/(tabs)/profile/_layout.tsx
app/(tabs)/profile/account.tsx
app/(tabs)/profile/role.tsx
app/(tabs)/profile/notifications.tsx
app/(tabs)/profile/location.tsx
app/(tabs)/profile/delete-account.tsx

app/support/index.tsx
app/support/report.tsx
app/support/feedback.tsx
app/legal/privacy.tsx
app/legal/terms.tsx
app/notice.tsx
app/notifications.tsx
```

Problem:

- Tab-owned detail pages now live inside their local tab stacks.
- `AppScreen` now supports deterministic `backTo` and `onBack` handling.
- Some same-tab owned screens still intentionally keep explicit
  `backTo/returnTo` as an MVP safety layer until simulator and release smoke
  prove native stack back is stable.
- If navigation history is missing, replaced, entered through auth redirect, or
  entered from a notification/deep link, blind `router.back()` can still resolve
  to the wrong parent. This is why shared root routes keep sanitized
  `returnTo`.
- Chat thread already has a safer explicit return rule:
  `router.replace("/(tabs)/chat")`.

Affected surfaces:

- Profile subpages:
  - account info
  - role settings
  - notification settings
  - location settings
  - account deletion
- Profile-linked pages outside `profile`:
  - notice
  - support inquiry
  - support report
  - feedback
  - privacy
  - terms
- Interview detail and secondary flows:
  - interview detail
  - my interviews
  - create interview
- Notification center:
  - opened from home, chat, or other top-level tabs
- Map/interview/chat shared detail links:
  - interview detail can be opened from home, interviews, map, chat, or
    notifications.

## Target Behavior

### Profile

Profile subpages must return to `프로필`.

```text
프로필 -> 계정 정보 -> back -> 프로필
프로필 -> 역할 설정 -> back -> 프로필
프로필 -> 위치 설정 -> back -> 프로필
프로필 -> 개인정보처리방침 -> back -> 프로필
프로필 -> 이용약관 -> back -> 프로필
프로필 -> 문의하기 -> back -> 프로필
프로필 -> 신고하기 -> back -> 프로필
```

### Chat

Chat thread must return to the chat list.

```text
채팅 -> 채팅방 -> back -> 채팅
채팅방 -> 인터뷰 상세정보 -> back -> 채팅방
```

### Interview Discovery

Interview secondary pages must return to the interview tab unless a more
specific parent is provided.

```text
인터뷰 -> 내 인터뷰 -> back -> 인터뷰
인터뷰 -> 모집글 만들기 -> back -> 인터뷰
인터뷰 -> 상세정보 -> back -> 인터뷰
```

### Home And Map Shared Detail

Interview detail opened from home or map must return to its launcher.

```text
홈 -> 인터뷰 상세정보 -> back -> 홈
지도 -> 인터뷰 상세정보 -> back -> 지도
알림 -> 인터뷰 상세정보 -> back -> 알림
```

### Direct Entry And Deep Links

Directly opened detail pages must never strand the user.

Fallback destinations:

- profile-related route: `/(tabs)/profile`
- interview-related route: `/(tabs)/interviews`
- chat thread: `/(tabs)/chat`
- notifications: last supplied `returnTo`, otherwise `/(tabs)/home`
- unknown or unsafe return destination: `/(tabs)/home`

## Implementation Plan

### Phase 1: Explicit Back Contract

Add a shared mobile navigation helper.

Target file:

```text
apps/mobile/src/shared/navigation/backNavigation.ts
```

Responsibilities:

- Accept an explicit fallback route.
- Sanitize optional `returnTo` search params.
- Prevent unsafe external or malformed destinations.
- Prefer deterministic `router.replace(fallback)` for app-header "up"
  buttons when the parent is known.
- Keep `router.back()` only for cases where actual history must be preserved
  and the source is known to be reliable.

Suggested API:

```ts
type ReturnRoute = Href<string>;

export function getSafeReturnTo(value: unknown): ReturnRoute | null;
export function replaceToFallback(fallback: ReturnRoute): void;
export function resolveReturnTo(value: unknown, fallback: ReturnRoute): ReturnRoute;
```

Sanitization rules:

- Accept only string route values that start with `/`.
- Reject full URLs, protocol-like strings, empty strings, and unknown values.
- Prefer an allowlist for known internal route prefixes:
  - `/(tabs)/home`
  - `/(tabs)/interviews`
  - `/(tabs)/map`
  - `/(tabs)/chat`
  - `/(tabs)/profile`
  - `/notifications`
  - `/support`
  - `/legal/`
  - `/notice`

### Phase 2: Harden `AppScreen`

Target file:

```text
apps/mobile/src/shared/ui/AppScreen.tsx
```

Add props:

```ts
backTo?: Href<string>;
onBack?: () => void;
```

Back behavior:

- If `onBack` exists, call it.
- Else if `backTo` exists, call `goBackOrReplaceFallback(backTo)` so normal
  stack history uses reverse pop animation and missing-history entry still has
  a deterministic fallback.
- Else use a safe generic fallback:
  - `router.back()` when `router.canGoBack()` is true.
  - otherwise `router.replace("/(tabs)/home")`.

Reason:

- `AppScreen` is the shared header used by many profile/support/legal pages.
- Putting the contract here prevents each page from reimplementing custom
  fallback logic.

### Phase 3: Profile Return Paths

Update profile-owned screens to pass:

```tsx
backTo="/(tabs)/profile"
```

Target screens:

- `apps/mobile/src/screens/profile/AccountInfoScreen.tsx`
- `apps/mobile/src/screens/profile/RoleSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/LocationSettingsScreen.tsx`
- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx`

Update profile menu links so root-level shared routes include:

```ts
returnTo: "/(tabs)/profile"
```

Target screen:

- `apps/mobile/src/screens/profile/ProfileScreen.tsx`

Shared routes launched from profile:

- `/notice`
- `/support`
- `/support/report`
- `/support/feedback`
- `/legal/privacy`
- `/legal/terms`

### Phase 4: Support, Legal, Notice, Notifications

Status:

- [x] `SupportScreen` reads `returnTo` and lets `AppScreen` use
  `goBackOrReplaceFallback(backTo)` for reverse pop animation plus fallback.
- [x] `SupportForm` reads `returnTo`; root report/feedback forms use
  `goBackOrReplaceFallback(resolvedBackTo)` through `AppScreen`, while embedded
  inquiry edit/write forms keep `onCancel` as the local list return.
- [x] Legal documents and notice read `returnTo` and use
  `goBackOrReplaceFallback(backTo)` through `AppScreen`.
- [ ] Notifications still need simulator smoke because they can be opened from
  multiple top-level tabs and route onward to other surfaces.

Update shared pages to read and respect `returnTo`.

Target screens:

- `apps/mobile/src/screens/support/SupportScreen.tsx`
- `apps/mobile/src/screens/support/SupportFormScreen.tsx`
- `apps/mobile/src/screens/support/ReportScreen.tsx`
- `apps/mobile/src/screens/support/FeedbackScreen.tsx`
- `apps/mobile/src/screens/legal/LegalDocumentScreen.tsx`
- `apps/mobile/src/screens/notice/NoticeScreen.tsx`
- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`

Default fallbacks:

- support/legal/notice default: `/(tabs)/profile`
- notifications default: `/(tabs)/home`

Notification entry behavior:

- Home notification icon should open notifications with
  `returnTo="/(tabs)/home"`.
- Chat notification icon should open notifications with
  `returnTo="/(tabs)/chat"`.
- Other future notification entry points must pass their own return route.

### Phase 5: Interview Return Paths

Update interview flows to use deterministic parent routes.

Targets:

- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`
- `apps/mobile/src/screens/interviews/MyInterviewsScreen.tsx`
- `apps/mobile/src/screens/interviews/CreateInterviewScreen.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`
- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`

Rules:

- `내 인터뷰` and `모집글 만들기` return to `/(tabs)/interviews`.
- Detail links from `홈` pass `returnTo="/(tabs)/home"`.
- Detail links from `인터뷰` pass `returnTo="/(tabs)/interviews"`.
- Detail links from `지도` pass `returnTo="/(tabs)/map"`.
- Detail links from `채팅방` pass `returnTo="/(tabs)/chat/{roomId}"`.
- Detail links from `알림` pass `returnTo="/notifications"` and preserve the
  notification page's own return target if needed.

### Phase 6: Long-Term Route Structure Cleanup

After the immediate bug is fixed, migrate to nested tab stacks where practical.

Preferred future route shape:

```text
app/(tabs)/profile/_layout.tsx
app/(tabs)/profile/index.tsx
app/(tabs)/profile/account.tsx
app/(tabs)/profile/role.tsx
app/(tabs)/profile/notifications.tsx
app/(tabs)/profile/location.tsx
app/(tabs)/profile/delete-account.tsx

app/(tabs)/interviews/_layout.tsx
app/(tabs)/interviews/index.tsx
app/(tabs)/interviews/[postId].tsx
app/(tabs)/interviews/my-interviews.tsx
app/(tabs)/interviews/new.tsx

app/(tabs)/chat/_layout.tsx
app/(tabs)/chat/index.tsx
app/(tabs)/chat/[roomId].tsx

app/(tabs)/map/_layout.tsx
app/(tabs)/map/index.tsx
```

Keep some shared routes root-level if they naturally open from multiple tabs:

- `/notifications`
- `/legal/privacy`
- `/legal/terms`
- `/support`
- `/support/report`
- `/support/feedback`

If a shared route stays root-level, it must keep `returnTo`.

Rationale:

- Expo Router officially supports stacks inside tabs for local screen
  hierarchy.
- Nested stacks make browser/deep-link/native stack behavior easier to reason
  about.
- The immediate `returnTo` fix is faster and safer for MVP, while the nested
  migration is better as a focused follow-up refactor.

## QA Plan

Run targeted validation after implementation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Manual simulator/device smoke:

- Profile:
  - Profile -> each subpage -> back -> Profile
  - Profile -> privacy/terms/support/report/feedback/notice -> back -> Profile
- Chat:
  - Chat -> room -> back -> Chat
  - Chat -> room -> interview detail -> back -> room
- Interviews:
  - Interviews -> detail -> back -> Interviews
  - Interviews -> My Interviews -> back -> Interviews
  - Interviews -> Create -> back -> Interviews
- Home:
  - Home -> interview detail -> back -> Home
- Map:
  - Map -> marker/list detail -> back -> Map
  - Map selection/bottom-sheet state should not be corrupted by route return.
- Notifications:
  - Home -> Notifications -> back -> Home
  - Chat -> Notifications -> back -> Chat
  - Notifications -> interview detail -> back -> Notifications
- Direct entry fallback:
  - Open a root detail route without history and verify it falls back to the
    intended top-level tab rather than a blank stack or unexpected Home.

Regression checks:

- Bottom tab selection remains visually correct after returning from detail.
- No detail page exposes duplicate back buttons.
- Header title and chevron vertical alignment remain consistent with current
  profile/support page UI.
- Android hardware back behavior is observed separately before Google Play
  sign-off.

## Acceptance Criteria

- [x] Shared `AppScreen` supports deterministic back fallback.
- [x] Profile subpages return to `프로필`.
- [x] Support, report, feedback, notice, privacy, and terms pages respect
  `returnTo`.
- [x] Interview detail returns to the launcher tab or chat thread.
- [x] `내 인터뷰` and `모집글 만들기` return to `인터뷰`.
- [x] Notification center returns to the tab that opened it.
- [x] Direct route entry has a safe fallback.
- [x] Mobile typecheck passes.
- [ ] Simulator or real-device smoke confirms no detail page returns to `홈`
  unless `홈` was the launcher or fallback.
- [x] Any remaining nested-stack route migration is either implemented or
  explicitly split into a new active follow-up.

## Implementation Update 2026-06-05

Implemented the MVP deterministic-return layer before the larger nested-stack
route migration.

Changed files:

- `apps/mobile/src/shared/navigation/backNavigation.ts`
  - Added internal return-route sanitization and fallback resolution.
- `apps/mobile/src/shared/ui/AppScreen.tsx`
  - Added `backTo` and `onBack` props.
  - Shared header back now uses deterministic fallback instead of blind
    `router.back()`.
- `apps/mobile/src/shared/ui/NotificationButton.tsx`
  - Added `returnTo` param support.
- Profile screens:
  - Profile subpages now return to `/(tabs)/profile`.
  - Profile-launched notice, support, report, feedback, privacy, and terms pass
    `returnTo="/(tabs)/profile"`.
- Support/legal/notice/notifications:
  - Shared screens now read and respect sanitized `returnTo`.
  - Notification target navigation preserves the notification center return
    path.
- Interview flows:
  - Interview detail reads `returnTo` and falls back to `/(tabs)/interviews`.
  - Home/interview/map/chat links to interview detail now pass the correct
    launcher route.
  - `내 인터뷰` and `모집글 만들기` accept `returnTo` and default to
    `/(tabs)/interviews`.
- Chat flows:
  - Chat list report actions return to chat.
  - Chat thread report/detail actions return to the current thread.

Verification:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Result: passed.

Still open:

- Simulator/real-device manual smoke for every route in the QA matrix.
- Nested tab stack route-folder migration is implemented in
  `docs/completed/mobile-nested-tab-stack-migration-plan.md`; release/simulator
  smoke remains open there.

## Documentation Updates

When implementation is complete:

- Update this document's checklist.
- Update `docs/reference/ui-final-qa-checklist.md` with navigation smoke results.
- If nested tab stacks are implemented, update:
  - `docs/reference/navigation-home-chat-ia-plan.md`
  - `docs/repository-structure.md`
  - this document or move it to `docs/completed/`.

Figma is not required for this task unless the user explicitly asks to sync
navigation/header changes to Figma.
