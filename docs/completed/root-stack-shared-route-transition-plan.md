# Root Stack Shared Route Transition Plan

Status: completed

Last updated: 2026-06-08

Implementation status:

- [x] Root layout conversion implemented.
- [x] Typecheck passed after conversion.
- [x] `git diff --check` passed after conversion.
- [ ] Simulator QA matrix is still pending.

## Purpose

Fix the inconsistent screen transition animation between profile-owned rows and
profile-launched shared rows.

Current user-visible issue:

- `프로필 -> 계정 정보`
- `프로필 -> 역할 설정`
- `프로필 -> 알림 안내`
- `프로필 -> 위치 권한`
- `프로필 -> 계정 삭제`

These routes animate like normal pushed pages because they live inside the
profile tab stack.

But these rows:

- `프로필 -> 공지사항`
- `프로필 -> 피드백 남기기`
- `프로필 -> 문의하기`
- `프로필 -> 신고하기`
- `프로필 -> 개인정보 처리방침`
- `프로필 -> 이용약관`

are root-level shared routes. They currently do not consistently receive the
same native stack transition because the app root layout renders a `Slot`
instead of a root `Stack`.

The goal is to make shared root screens use standard native screen transitions
while preserving explicit return behavior through `returnTo`.

## External Standards Checked

Checked on 2026-06-08:

- Expo Router navigation layouts:
  https://docs.expo.dev/router/basics/navigation-layouts/
- Expo Router layout and `Slot` behavior:
  https://docs.expo.dev/router/basics/layout/
- Expo Router nesting navigators:
  https://docs.expo.dev/router/advanced/nesting-navigators/
- React Navigation native stack navigator:
  https://reactnavigation.org/docs/native-stack-navigator/
- Apple navigation hierarchy guidance:
  https://codershigh.github.io/guidelines/ios/human-interface-guidelines/ui-bars/navigation-bars/index.html

Standards distilled for Hypofit:

- The root app layout should own the top-level navigator when the app has
  multiple full-screen route families.
- `Slot` is appropriate when a route should be rendered without navigator stack
  semantics.
- `Stack` is appropriate when route transitions, hierarchical push behavior,
  and platform-native screen animations are expected.
- Tabs can contain nested stacks for tab-local hierarchy.
- Shared screens can stay root-level if they receive explicit, sanitized
  `returnTo` values.

## Architecture Snapshot

Previous root layout before this plan:

```tsx
// apps/mobile/app/_layout.tsx
return (
  <AppProviders>
    <StatusBar style="dark" backgroundColor="#F6F7F8" />
    <Slot />
  </AppProviders>
);
```

Current root layout after implementation:

```tsx
// apps/mobile/app/_layout.tsx
return (
  <AppProviders>
    <StatusBar style="dark" backgroundColor="#F6F7F8" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="support" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="notice" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="+not-found" />
    </Stack>
  </AppProviders>
);
```

Current tab/profile layout:

```tsx
// apps/mobile/app/(tabs)/profile/_layout.tsx
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Route inventory:

```text
app/_layout.tsx
app/index.tsx
app/(auth)/...
app/(tabs)/...
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

Profile-local routes:

```text
/(tabs)/profile/account
/(tabs)/profile/role
/(tabs)/profile/notifications
/(tabs)/profile/location
/(tabs)/profile/delete-account
```

Shared root routes launched from profile:

```text
/notice?returnTo=/(tabs)/profile
/support?returnTo=/(tabs)/profile
/support/report?returnTo=/(tabs)/profile
/support/feedback?returnTo=/(tabs)/profile
/legal/privacy?returnTo=/(tabs)/profile
/legal/terms?returnTo=/(tabs)/profile
```

## Diagnosis

The inconsistent animation was expected from the previous structure.

- Profile-local routes are children of `/(tabs)/profile/_layout.tsx`.
- That layout is a `Stack`, so profile-local route pushes get native stack
  transition behavior.
- Shared root routes are outside `/(tabs)/profile`.
- Before this plan, the root layout used `Slot`, so shared root routes were rendered
  without a root stack navigator.
- Because there was no root stack, shared root pages did not behave like profile
  row pushes even though they were launched from profile.

The previous back-navigation fix was correct but incomplete for animation:

- `returnTo` now makes shared routes return to the right parent.
- It does not give root shared routes a platform-native push transition.

## Decision

Use a root `Stack` in `apps/mobile/app/_layout.tsx`.

Keep shared routes root-level:

```text
/support
/support/report
/support/feedback
/legal/privacy
/legal/terms
/notice
/notifications
```

Do not copy them under `/(tabs)/profile`.

Reason:

- Support/report/legal/notice are shared surfaces that can be opened from
  profile, chat, interview detail, map, home, and notifications.
- Duplicating them under profile would make profile animation look right but
  would increase route duplication and state-return complexity.
- A root stack gives shared screens native route transitions while preserving
  shared ownership.

## Target Architecture

Target root layout:

```tsx
import { Stack } from "expo-router";

return (
  <AppProviders>
    <StatusBar style="dark" backgroundColor="#F6F7F8" />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="support" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="notice" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="+not-found" />
    </Stack>
  </AppProviders>
);
```

Expected behavior:

- `프로필 -> 계정 정보`: profile nested stack push animation.
- `프로필 -> 신고하기`: root stack push animation.
- `프로필 -> 개인정보 처리방침`: root stack push animation.
- `채팅방 -> 신고하기`: root stack push animation.
- `인터뷰 상세 -> 신고하기`: root stack push animation.
- Header back on shared screens uses stack `back()` first for reverse pop
  animation, then falls back to supplied `returnTo` only when no reliable stack
  history exists.

## Implementation Plan

### Phase 1: Root Layout Conversion

Status: implemented.

Target file:

```text
apps/mobile/app/_layout.tsx
```

Change:

- Replace `Slot` import with `Stack`.
- Keep current side effects:
  - `react-native-url-polyfill/auto`
  - `react-native-gesture-handler`
  - `../global.css`
  - `enableScreens(false)`
  - Sentry breadcrumbs
  - default font installation
  - font loading
  - `AppProviders`
  - `StatusBar`
- Render a root `Stack` with `headerShown: false`.

Screen list:

- `index`
- `(auth)`
- `(tabs)`
- `support`
- `legal`
- `notice`
- `notifications`
- `+not-found`

Decision:

- Start with default `card` presentation.
- Do not set custom animation initially. Let platform defaults drive the
  transition.
- Do not use modal presentation for support/legal/notice because these are
  normal hierarchical pages, not transient dialogs.

### Phase 2: Confirm Shared Route Back Contract

Status: implemented for support, report, feedback, legal documents, and notice.
Notifications still need manual route QA.

Already implemented or recently hardened:

- `SupportScreen` resolves `returnTo` and lets `AppScreen` use
  `goBackOrReplaceFallback(backTo)`.
- `SupportForm` resolves `returnTo` and lets `AppScreen` use
  `goBackOrReplaceFallback(resolvedBackTo)` unless embedded in inquiry
  write/edit mode, where local `onCancel` closes the form state.
- `LegalDocumentScreen` resolves `returnTo` and lets `AppScreen` use
  `goBackOrReplaceFallback(backTo)`.
- `NoticeScreen` resolves `returnTo` and lets `AppScreen` use
  `goBackOrReplaceFallback(backTo)`.

Need review after root `Stack` conversion:

- `NotificationsScreen` can be opened from multiple top-level tabs and can route
  to interview/chat targets. It should preserve the correct parent return route.
- `InterviewDetailScreen` report links should keep `returnTo` pointing back to
  the detail page when the user opened report from detail.
- `ChatThreadScreen` report links should keep `returnTo` pointing back to the
  chat room.
- `ChatListScreen` report links should keep `returnTo` pointing back to chat
  list.

### Phase 3: Profile Launch Route Review

Status: reviewed. Profile shared rows keep root shared routes with
`returnTo="/(tabs)/profile"`.

Target file:

```text
apps/mobile/src/screens/profile/ProfileScreen.tsx
```

Keep:

```ts
router.push({ pathname: "/notice", params: { returnTo: "/(tabs)/profile" } })
router.push({ pathname: "/support/feedback", params: { returnTo: "/(tabs)/profile" } })
router.push({ pathname: "/support", params: { returnTo: "/(tabs)/profile" } })
router.push({ pathname: "/support/report", params: { returnTo: "/(tabs)/profile" } })
router.push({ pathname: "/legal/privacy", params: { returnTo: "/(tabs)/profile" } })
router.push({ pathname: "/legal/terms", params: { returnTo: "/(tabs)/profile" } })
```

Do not convert these to profile-local routes.

### Phase 4: Verification Commands

Status: typecheck and `git diff --check` passed.

Run after implementation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
git diff --check
```

Optional if root layout change causes routing warnings:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile expo-doctor
```

Do not run EAS cloud builds. This repo currently uses local validation/local
iOS build only unless explicitly requested.

## Manual QA Matrix

Use iPhone simulator first, then TestFlight/device if the simulator behavior is
clean.

### Auth And App Entry

- App launch -> splash -> login when logged out.
- Login -> tabs.
- Existing session -> tabs without auth route flicker.
- Sign out from profile -> login.

### Profile Local Rows

- `프로필 -> 계정 정보 -> 뒤로가기 -> 프로필`
- `프로필 -> 역할 설정 -> 뒤로가기 -> 프로필`
- `프로필 -> 알림 안내 -> 뒤로가기 -> 프로필`
- `프로필 -> 위치 권한 -> 뒤로가기 -> 프로필`
- `프로필 -> 계정 삭제 -> 뒤로가기 -> 프로필`

Expected:

- Same profile-stack style transition as before.
- Bottom tab remains appropriate where expected.
- No unexpected home fallback.

### Profile Shared Rows

- `프로필 -> 공지사항 -> 뒤로가기 -> 프로필`
- `프로필 -> 피드백 남기기 -> 뒤로가기 -> 프로필`
- `프로필 -> 문의하기 -> 뒤로가기 -> 프로필`
- `프로필 -> 신고하기 -> 뒤로가기 -> 프로필`
- `프로필 -> 개인정보 처리방침 -> 뒤로가기 -> 프로필`
- `프로필 -> 이용약관 -> 뒤로가기 -> 프로필`

Expected:

- Forward navigation has a native pushed-page animation.
- Header back returns to profile.
- The screen does not silently jump to home.

### Support Embedded States

- `프로필 -> 문의하기 -> + -> 문의 작성 -> 목록으로 돌아가기`
- `프로필 -> 문의하기 -> 문의 row ... -> 수정 -> 목록으로 돌아가기`
- `프로필 -> 문의하기 -> 문의 row ... -> 삭제`

Expected:

- Embedded inquiry write/edit stays inside support screen state.
- Header back from inquiry write/edit should invoke local cancel when available.
- Header back from support list returns to profile.

### Cross-Tab Shared Report Links

- `채팅 -> 채팅방 -> 신고하기 -> 뒤로가기 -> 채팅방`
- `채팅 -> 채팅 목록 row ... -> 신고하기 -> 뒤로가기 -> 채팅`
- `인터뷰 -> 상세 -> 신고하기 -> 뒤로가기 -> 인터뷰 상세`
- `지도 -> 인터뷰 상세 -> 신고하기 -> 뒤로가기 -> 지도/상세 return target`

Expected:

- Shared report screen opens with root stack animation.
- Header back uses reverse stack pop when possible and honors the supplied
  `returnTo` as fallback.

### Notifications

- `홈 -> 알림 -> 뒤로가기 -> 홈`
- `채팅 -> 알림 -> 뒤로가기 -> 채팅`
- `알림 -> 인터뷰 상세 -> 뒤로가기 -> 알림`
- `알림 -> 채팅방 -> 뒤로가기 -> 알림 or 채팅` depending on current notification
  contract.

Expected:

- No unexpected home fallback unless home is the declared fallback.
- If behavior differs, update `NotificationsScreen` return handling rather than
  weakening root stack behavior.

## Risks And Tradeoffs

### Risk: Root Stack Changes App Entry Behavior

Changing root layout from `Slot` to `Stack` can affect how `index`, `(auth)`,
and `(tabs)` are mounted.

Mitigation:

- Keep `index` route explicit in root stack.
- Keep auth redirect behavior inside existing auth/tabs layouts.
- Run login/session QA immediately after conversion.

### Risk: Back Gesture Versus Header Back Divergence

Header back now uses stack pop first so it can animate in the reverse direction.
Native iOS edge-swipe also pops stack history. If a shared route was opened with
unexpected history, both can return to the wrong screen before fallback logic is
used.

Mitigation options:

- First observe real behavior after root `Stack` conversion and the
  back-first/fallback-return behavior.
- If edge-swipe returns to the wrong screen, set `gestureEnabled: false` only
  for shared return-sensitive screens or use stack replacement on entry for
  specific flows.
- Do not disable gestures globally unless the issue is broad and reproducible.

### Risk: Hidden Tab Bar Screens

Chat thread currently hides the bottom tab bar using pathname-based tab bar
style. Root stack conversion must not break that logic.

Mitigation:

- QA `채팅 -> 채팅방` before and after conversion.
- Confirm `pathname.startsWith("/chat/")` still reflects tab-local chat thread
  paths.

### Risk: Existing `enableScreens(false)`

The app currently calls `enableScreens(false)` due prior release-build crash
hardening. Root `Stack` may still work, but transition/performance behavior can
be less native than a fully enabled native-screen setup.

Mitigation:

- Do not change `enableScreens(false)` in this task.
- Treat re-enabling screens as a separate release-build crash investigation.
- If animations remain limited because screens are disabled, document that as a
  follow-up rather than mixing it into this change.

## Non-Goals

- Do not redesign profile UI.
- Do not move support/legal/notice under `/(tabs)/profile`.
- Do not remove `returnTo`.
- Do not rewrite all routing to nested stacks in this task.
- Do not change auth logic, Sentry logic, or EAS build settings.
- Do not run EAS cloud build.

## Rollback Plan

If root `Stack` causes auth/session/routing regressions:

1. Revert only the root layout conversion.
2. Keep explicit `returnTo` hardening in support/legal/notice if it remains
   valid.
3. Re-open the plan with a narrower route-by-route nested stack migration.

## Close Criteria

- [x] Root `app/_layout.tsx` uses `Stack` instead of `Slot`.
- [ ] Shared profile-launched routes animate as pushed pages in simulator or
  device QA.
- [ ] Header back from shared profile-launched routes returns to profile in
  simulator or device QA.
- [ ] Cross-tab report/support/legal behavior still honors `returnTo` in
  simulator or device QA.
- [x] `apps/mobile` typecheck passes.
- [x] `git diff --check` passes.
- [ ] Simulator QA for the profile matrix is complete or explicitly deferred.
