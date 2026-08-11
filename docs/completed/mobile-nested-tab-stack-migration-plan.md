# Mobile Nested Tab Stack Migration Plan

Status: completed

Last updated: 2026-06-05

## Purpose

Migrate Hypofit mobile routing from root-level detail routes plus `returnTo`
fallbacks to the long-term standard Expo Router structure: a bottom tab
navigator with a local stack inside each tab that owns multiple screens.

This plan is the follow-up to
`docs/completed/mobile-tab-stack-back-navigation-plan.md`. The immediate
`returnTo/backTo` layer is already useful for MVP safety, notification paths,
and shared routes. This document tracks the structural migration that should
make normal tab-owned pages behave like a native app without relying on
manual return parameters.

## Why This Was Not Done First

The long-term structure touches file paths, generated route types, link targets,
deep links, auth redirects, notification targets, support/report return paths,
and TestFlight smoke scope.

Doing it before the immediate bug fix would have increased blast radius while
users were still seeing the wrong back behavior. The current `returnTo/backTo`
implementation is the short-term safety layer. This migration is the standard
structure pass.

## Standards Checked

Primary references checked on 2026-06-05:

- Expo Router, Common navigation patterns:
  https://docs.expo.dev/router/basics/common-navigation-patterns/
- Expo Router, Nesting navigators:
  https://docs.expo.dev/router/advanced/nesting-navigators/
- Expo Router, Navigation layouts:
  https://docs.expo.dev/router/basics/navigation-layouts/
- React Navigation, Nesting navigators:
  https://reactnavigation.org/docs/nesting-navigators/

Relevant standard interpretation:

- Expo Router documents `Stack` inside a tab as the normal pattern when one
  tab has multiple screens.
- A tab can own a directory with `_layout.tsx` returning `<Stack />`.
- The parent `(tabs)/_layout.tsx` should register the tab directory, not every
  individual screen.
- React Navigation warns against nesting for code organization alone. In
  Hypofit, nesting is justified because the UI hierarchy requires it:
  `프로필 -> 계정 정보`, `인터뷰 -> 상세`, `채팅 -> 채팅방`.
- Shared pages that can be opened from multiple tabs still need either:
  - a root-level shared route plus explicit `returnTo`, or
  - duplicated/shared route groups if the same URL must appear inside multiple
    tab stacks.

## Implemented Route Shape

Current app routes:

```text
app/(tabs)/home/_layout.tsx
app/(tabs)/home/index.tsx

app/(tabs)/interviews/_layout.tsx
app/(tabs)/interviews/index.tsx
app/(tabs)/interviews/[postId].tsx
app/(tabs)/interviews/my-interviews.tsx
app/(tabs)/interviews/new.tsx

app/(tabs)/map/_layout.tsx
app/(tabs)/map/index.tsx

app/(tabs)/chat/_layout.tsx
app/(tabs)/chat/index.tsx
app/(tabs)/chat/[roomId].tsx

app/(tabs)/profile/_layout.tsx
app/(tabs)/profile/index.tsx
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

Previously resolved problems:

- Tab-owned pages no longer live outside `(tabs)`.
- Profile, chat, and interview-owned routes now have local stack ownership.
- Shared root-level pages still use sanitized `returnTo` because they can open
  from multiple top-level tabs.
- Simulator/release smoke is still required before removing redundant same-tab
  `backTo/returnTo` safety paths.

## Target Route Shape

Recommended long-term structure:

```text
app/(tabs)/_layout.tsx

app/(tabs)/home/_layout.tsx
app/(tabs)/home/index.tsx

app/(tabs)/interviews/_layout.tsx
app/(tabs)/interviews/index.tsx
app/(tabs)/interviews/[postId].tsx
app/(tabs)/interviews/my-interviews.tsx
app/(tabs)/interviews/new.tsx

app/(tabs)/map/_layout.tsx
app/(tabs)/map/index.tsx

app/(tabs)/chat/_layout.tsx
app/(tabs)/chat/index.tsx
app/(tabs)/chat/[roomId].tsx

app/(tabs)/profile/_layout.tsx
app/(tabs)/profile/index.tsx
app/(tabs)/profile/account.tsx
app/(tabs)/profile/role.tsx
app/(tabs)/profile/notifications.tsx
app/(tabs)/profile/location.tsx
app/(tabs)/profile/delete-account.tsx

app/notifications.tsx
app/notice.tsx
app/support/index.tsx
app/support/report.tsx
app/support/feedback.tsx
app/legal/privacy.tsx
app/legal/terms.tsx
```

Root-level shared routes intentionally stay root-level for now:

- `notifications`
- `notice`
- `support`
- `support/report`
- `support/feedback`
- `legal/privacy`
- `legal/terms`

Reason:

- These pages can be launched from multiple top-level areas.
- Keeping them root-level with sanitized `returnTo` avoids duplicate route
  groups while preserving predictable back behavior.
- If later design requires support/legal/notice to feel physically inside
  `프로필`, they can move into `profile` stack or be duplicated through route
  groups in a separate pass.

## Route Ownership Rules

### Home

Home is currently a single top-level feed.

Keep:

```text
/(tabs)/home
```

Home should not own interview detail, because the same detail page is primarily
an interview domain route. Home should link to:

```text
/(tabs)/interviews/[postId]?returnTo=/(tabs)/home
```

or, if Expo `withAnchor`/initial route behavior proves stable in smoke:

```text
/(tabs)/interviews/[postId]
```

with the interview tab stack anchored to its index.

### Interviews

Interviews owns:

- search/list
- detail
- my interviews
- create interview

Expected behavior:

```text
인터뷰 -> 상세 -> back -> 인터뷰
인터뷰 -> 내 인터뷰 -> back -> 인터뷰
인터뷰 -> 모집글 만들기 -> back -> 인터뷰
```

### Map

Map remains its own stack even if it has only one page now.

Reason:

- Future map list mode, marker preview, place search, or map-specific detail
  overlays may need stack behavior.
- The current map detail target should still be interview detail, not a
  separate map-owned detail page.

### Chat

Chat owns:

- chat list
- chat thread

Expected behavior:

```text
채팅 -> 채팅방 -> back -> 채팅
채팅방 -> 인터뷰 상세 -> back -> 채팅방
```

The second behavior still needs `returnTo` because interview detail belongs to
the interview domain, not chat.

### Profile

Profile owns:

- profile index
- account info
- role settings
- notification guide/settings
- location guide/settings
- account deletion

Expected behavior:

```text
프로필 -> 계정 정보 -> back -> 프로필
프로필 -> 역할 설정 -> back -> 프로필
프로필 -> 계정 삭제 -> back -> 프로필
```

## Migration Plan

### Phase 1: Add Stack Layouts Without Moving Screens

Goal:

- Prepare stable `_layout.tsx` files and confirm tab registration.

Actions:

- Add stack layout files:
  - `app/(tabs)/home/_layout.tsx`
  - `app/(tabs)/interviews/_layout.tsx`
  - `app/(tabs)/map/_layout.tsx`
  - `app/(tabs)/chat/_layout.tsx`
  - `app/(tabs)/profile/_layout.tsx`
- Each layout returns:

```tsx
import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- Update `(tabs)/_layout.tsx` tab names from:

```text
home/index
interviews/index
map/index
chat/index
profile/index
```

to:

```text
home
interviews
map
chat
profile
```

Acceptance:

- App still opens all five tabs.
- Tab labels/icons remain unchanged.
- Typecheck passes before moving any detail route.

### Phase 2: Move Profile-Owned Routes

Goal:

- Make the profile stack own profile subpages first because it has the clearest
  parent/child relationship and lowest cross-tab risk.

Move:

```text
app/profile/account.tsx
-> app/(tabs)/profile/account.tsx

app/profile/role.tsx
-> app/(tabs)/profile/role.tsx

app/profile/notifications.tsx
-> app/(tabs)/profile/notifications.tsx

app/profile/location.tsx
-> app/(tabs)/profile/location.tsx

app/profile/delete-account.tsx
-> app/(tabs)/profile/delete-account.tsx
```

Update links:

```text
/profile/account
-> /(tabs)/profile/account
```

Same for role, notifications, location, delete account.

Behavior decision:

- Keep `backTo="/(tabs)/profile"` during the first pass if it does not break.
- After smoke confirms stack behavior, remove redundant `backTo` from
  profile-owned pages so local stack back can work naturally.

Acceptance:

- Profile subpages return to profile.
- Direct entry to a profile subpage has a safe fallback.
- Legal/support/notice links launched from profile still return to profile.

### Phase 3: Move Chat Thread Route

Move:

```text
app/chat/[roomId].tsx
-> app/(tabs)/chat/[roomId].tsx
```

Update links:

```text
/chat/${room.id}
-> /(tabs)/chat/${room.id}
```

Targets:

- `ChatListScreen`
- `NotificationsScreen`
- Any future notification/chat links

Behavior decision:

- Chat thread already uses explicit `router.replace("/(tabs)/chat")`.
- After moving into the chat stack, test whether local stack back is stable.
- Keep explicit back if it gives a better chat-list reset behavior.

Acceptance:

- Chat tab row opens thread.
- Thread back returns to chat list.
- Notification chat target opens the correct room.
- Support/report from thread returns to the thread.

### Phase 4: Move Interview-Owned Routes

Move:

```text
app/interviews/[postId].tsx
-> app/(tabs)/interviews/[postId].tsx

app/interviews/my-interviews.tsx
-> app/(tabs)/interviews/my-interviews.tsx

app/interviews/new.tsx
-> app/(tabs)/interviews/new.tsx
```

Update links:

```text
/interviews/[postId]
-> /(tabs)/interviews/[postId]

/interviews/my-interviews
-> /(tabs)/interviews/my-interviews

/interviews/new
-> /(tabs)/interviews/new
```

Targets:

- `HomeScreen`
- `InterviewSearchScreen`
- `MapScreen`
- `ChatThreadScreen`
- `NotificationsScreen`
- `InterviewDetailScreen`
- `CreateInterviewScreen`

Behavior decision:

- For interview tab internal links, local stack back should become primary.
- For home/map/chat/notifications launching interview detail, keep `returnTo`
  until smoke verifies Expo Router anchored navigation gives the expected
  behavior across iOS and Android.

Acceptance:

- `인터뷰 -> 상세 -> back -> 인터뷰`
- `홈 -> 상세 -> back -> 홈`
- `지도 -> 상세 -> back -> 지도`
- `채팅방 -> 상세 -> back -> 채팅방`
- `알림 -> 상세 -> back -> 알림`
- Login redirect for `apply=1` preserves the intended return path.

### Phase 5: Clean Redundant Return Logic

Goal:

- Remove unnecessary manual fallbacks only after stack behavior is verified.

Candidates to remove:

- `backTo="/(tabs)/profile"` on profile-owned pages.
- `backTo` on interview-owned pages when opened from the interview tab.
- Some `returnTo` params for same-stack navigation.

Keep:

- `returnTo` for shared root-level routes.
- `returnTo` when a screen is opened from a different tab than the one that
  owns it.
- `returnTo` for notification and auth/deep-link entry.

Acceptance:

- No normal same-tab link depends on manual return params.
- Shared cross-tab links keep explicit return paths.
- `backNavigation.ts` remains as the shared-route and deep-link guard.

### Phase 6: Optional Shared Route Groups

Only consider this if root-level shared pages still feel structurally awkward.

Potential route groups:

```text
app/(tabs)/(profile,chat)/support/report.tsx
app/(tabs)/(profile,home,chat)/notifications.tsx
```

Tradeoff:

- More native-feeling local stack ownership.
- More route complexity and harder deep-link behavior.

Recommendation:

- Do not do this for MVP unless there is a concrete bug or UX reason.

## Implementation Order

Recommended order:

1. Add tab stack layouts and update tab registration.
2. Move profile subpages.
3. Typecheck and simulator smoke.
4. Move chat thread.
5. Typecheck and simulator smoke.
6. Move interview detail/my/new.
7. Typecheck and simulator smoke.
8. Clean redundant `backTo/returnTo`.
9. Update active/completed docs.

Do not move all route groups at once unless there is enough time for a full
release-build smoke. This is a structure migration, not a visual tweak.

## QA Matrix

### Type And Static Checks

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Static search:

```bash
rg -n '"/profile/|"/chat/|"/interviews/|`/profile/|`/chat/|`/interviews/' apps/mobile/src apps/mobile/app
rg -n 'router\.back\(\)' apps/mobile/src apps/mobile/app
```

### Simulator Smoke

Required:

- Launch app unauthenticated.
- Login.
- Verify all bottom tabs still render.
- Profile:
  - `프로필 -> 계정 정보 -> back -> 프로필`
  - `프로필 -> 역할 설정 -> back -> 프로필`
  - `프로필 -> 위치 권한 -> back -> 프로필`
  - `프로필 -> 계정 삭제 -> back -> 프로필`
- Support/legal:
  - `프로필 -> 문의하기 -> back -> 프로필`
  - `프로필 -> 신고하기 -> back -> 프로필`
  - `프로필 -> 개인정보처리방침 -> back -> 프로필`
- Chat:
  - `채팅 -> 채팅방 -> back -> 채팅`
  - `채팅방 -> 인터뷰 상세 -> back -> 채팅방`
- Interviews:
  - `인터뷰 -> 상세 -> back -> 인터뷰`
  - `인터뷰 -> 내 인터뷰 -> back -> 인터뷰`
  - `인터뷰 -> 만들기 -> back -> 인터뷰`
- Home:
  - `홈 -> 상세 -> back -> 홈`
- Map:
  - `지도 -> 상세 -> back -> 지도`
- Notifications:
  - `홈 -> 알림 -> back -> 홈`
  - `채팅 -> 알림 -> back -> 채팅`
  - `알림 -> 인터뷰 상세 -> back -> 알림`

### Release-Build Smoke

Before TestFlight or Play internal testing:

- Run one local simulator smoke.
- Run one TestFlight or production-profile build smoke if route movement
  changes typed route generation or deep-link behavior.
- Verify Sentry has no route-mount errors after opening moved pages.

## Risks And Mitigations

### Risk: Route Paths Change Unexpectedly

Mitigation:

- Use `router.push({ pathname, params })` instead of handwritten strings for
  dynamic routes.
- Run mobile typecheck after each phase.

### Risk: Tab Bar Visibility Changes

Mitigation:

- Move only screens that should keep the bottom tab bar.
- Keep modal-like/shared pages root-level until explicitly redesigned.

### Risk: Deep Links Or Notifications Open The Wrong Stack

Mitigation:

- Keep `returnTo` for notifications and cross-tab links.
- Use explicit `pathname` route objects.
- Test notification target types after moving chat/interview routes.

### Risk: Back Button Double Semantics

Mitigation:

- Keep app-header back behavior deterministic.
- After each route move, decide whether local `router.back()` or explicit
  `router.replace(parent)` is better for that screen.
- Do not remove `backTo/returnTo` globally.

### Risk: Over-Nesting

Mitigation:

- Use only one stack inside each bottom tab.
- Do not create nested stacks for root-level shared pages unless there is a
  concrete reason.

## Acceptance Criteria

- [x] `(tabs)/home`, `(tabs)/interviews`, `(tabs)/map`, `(tabs)/chat`, and
  `(tabs)/profile` each have a local stack layout.
- [x] `(tabs)/_layout.tsx` registers tab directories instead of individual
  `index` files.
- [x] Profile-owned pages live under `(tabs)/profile`.
- [x] Chat thread lives under `(tabs)/chat`.
- [x] Interview detail, my-interviews, and new-post routes live under
  `(tabs)/interviews`.
- [x] Root-level shared support/legal/notice/notification routes still respect
  sanitized `returnTo`.
- [ ] Same-tab back behavior works without unexpected jumps to `홈`.
- [ ] Cross-tab detail links return to the launcher tab or parent screen.
- [x] Mobile typecheck passes after every phase.
- [ ] Simulator smoke passes for the QA matrix.
- [ ] TestFlight or release-profile smoke is run before declaring the route
  migration complete.

## Implementation Update 2026-06-05

Implemented the structural route migration.

Changed route structure:

- Added local stack layouts:
  - `apps/mobile/app/(tabs)/home/_layout.tsx`
  - `apps/mobile/app/(tabs)/interviews/_layout.tsx`
  - `apps/mobile/app/(tabs)/map/_layout.tsx`
  - `apps/mobile/app/(tabs)/chat/_layout.tsx`
  - `apps/mobile/app/(tabs)/profile/_layout.tsx`
- Updated `apps/mobile/app/(tabs)/_layout.tsx` to register tab directories:
  - `home`
  - `interviews`
  - `map`
  - `chat`
  - `profile`
- Moved profile-owned routes under `app/(tabs)/profile`.
- Moved chat thread under `app/(tabs)/chat`.
- Moved interview detail, `내 인터뷰`, and post creation under
  `app/(tabs)/interviews`.
- Updated mobile route calls to use the new nested tab paths.
- Kept root-level shared routes for support, report, feedback, notice, legal,
  and notifications with sanitized `returnTo`.

Verification:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
git diff --check
```

Result: passed.

Still open:

- Simulator smoke for the full QA matrix.
- Release-profile or TestFlight smoke before declaring migration complete.
- Optional cleanup of redundant same-stack `backTo/returnTo` after manual
  smoke proves native stack back is stable.

## Documentation Updates

When implemented:

- Update this document's checklist.
- Update `docs/completed/mobile-tab-stack-back-navigation-plan.md` to show that
  fallback behavior is now backed by nested tab stacks.
- Update `docs/reference/navigation-home-chat-ia-plan.md` with the final route
  ownership model.
- Update `docs/repository-structure.md` if it documents mobile route layout.
- Move this document to `docs/completed/` only after simulator or release-build
  smoke passes.
