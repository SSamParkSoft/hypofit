# Mobile Navigation Structure Hardening Plan

Status: completed

Last updated: 2026-06-16

Owner: Hypofit mobile

## Implementation Result

Implemented on 2026-06-16.

- Moved `인터뷰 상세` route ownership from the interviews tab stack to the
  root shared stack:
  - removed `apps/mobile/app/(tabs)/interviews/[postId].tsx`
  - added `apps/mobile/app/interviews/_layout.tsx`
  - added `apps/mobile/app/interviews/[postId].tsx`
- Migrated all known detail entry points to `/interviews/[postId]`:
  - home feed
  - map selected card and bottom sheet actions
  - chat thread overflow menu
  - interview search rows
  - my interviews / my post management
  - notifications
  - push notification routing
- Added `/interviews` to the safe `returnTo` whitelist.
- Added `goBackOrReplaceReturnTo` for screens that need native reverse back
  animation first and caller-provided `returnTo` as a no-history fallback.
- Standardized explicit `returnTo` handling for shared root/support screens:
  - interview detail
  - notifications
  - notice
  - legal documents
  - support list/form
- Added `_layout.tsx` files for `auth`, `support`, and `legal` route folders.
- Declared root `auth`, `interviews`, and `support` stack groups explicitly.
- Removed the root `legal` stack declaration because there is no `/legal`
  index route; only `/legal/privacy` and `/legal/terms` exist.
- Preserved bottom-tab root behavior:
  - `인터뷰` tab reselect opens `/(tabs)/interviews`
  - `채팅` tab reselect opens `/(tabs)/chat`
  - `지도` tab reselect keeps the map-specific reselect event behavior
- Preserved chat thread header back behavior as native stack pop first:
  - If the chat thread was opened from the chat list, back returns to the chat
    list with native reverse animation.
  - If it was opened from notifications or push, back returns to the previous
    screen with native reverse animation.
  - If no history exists, it falls back to `/(tabs)/chat`.

## Completion Notes

Implemented on 2026-06-16.

- Moved the shared interview detail route ownership from the interviews tab
  stack to the root shared stack:
  `apps/mobile/app/interviews/[postId].tsx`.
- Removed the old tab-owned detail route:
  `apps/mobile/app/(tabs)/interviews/[postId].tsx`.
- Updated home, map, chat thread, interview search, my interviews,
  notifications, and push notification routing to open `/interviews/[postId]`.
- Kept interview-management routes under `/(tabs)/interviews`, including
  `my-interviews`, `new`, `my-posts`, and applicant detail screens.
- Added root layout files for `auth`, `interviews`, `support`, and `legal`.
- Kept root Stack declarations only for route groups that exist as root stack
  children. `legal` is intentionally not declared in the root stack because it
  has document child routes but no `/legal` index screen.
- Updated safe return path handling to allow root shared interview detail paths.
- Updated shared back behavior on AppScreen-based support, legal, notice, and
  notification screens so the back button uses native stack pop first, then
  falls back to explicit `returnTo` when no history exists.
- Preserved bottom tab reselect behavior so the `채팅` tab opens the chat list
  instead of the last opened chat room.
- Kept chat thread header back separate from bottom tab reselect. The header
  back is a navigation pop with `/(tabs)/chat` fallback, while tapping the
  bottom `채팅` tab is a root reset to the chat list.

Verification:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Result: passed.

Expo simulator reload:

- The previous `No route named "auth" exists`, `No route named "support"
  exists`, and `No route named "legal" exists` warnings no longer appear.
- Remaining warnings are Expo Go environment limitations for notifications and
  New Architecture, not route-structure warnings.

## Context

Recent mobile QA found two navigation symptoms:

- In a chat thread, opening `인터뷰 상세정보` shows an intermediate
  `인터뷰` screen during transition.
- Pressing the bottom `채팅` tab sometimes returned to the last opened chat
  room instead of the chat list.

The chat tab reselect behavior has been patched locally, but the deeper issue is
the current route ownership model: the shared interview detail screen lives only
inside the `interviews` tab stack.

Current route:

```text
app/(tabs)/interviews/[postId].tsx
```

This makes every detail entry from home, map, chat, notifications, and push
activate the interviews tab stack first. That is why the interviews screen can
appear as an intermediate surface even when the user started from chat.

## Product Navigation Principle

Use this ownership rule:

```text
Top-level tab screens:
  Persistent primary destinations the user can return to from the bottom nav.

Tab-local stack screens:
  Screens that are owned by one tab and should preserve that tab's local task
  history.

Root shared stack screens:
  Screens opened from multiple tabs, notifications, push, or deep links and
  expected to return to their caller.
```

For Hypofit MVP:

- `홈`, `인터뷰`, `지도`, `채팅`, `프로필` remain tab roots.
- `채팅방` remains under the chat tab because it is the chat tab's local task.
- `내 인터뷰`, `모집글 만들기`, `내 모집글 관리`, `지원 정보` remain under the
  interviews tab because they are interview-management tasks.
- `인터뷰 상세` should move to a root shared route because it is opened from
  home, map, chat, interviews, notifications, and push.
- `공지사항`, `알림`, `문의/신고`, `약관` remain root shared/support routes.

## Target Route Structure

```text
apps/mobile/app/
  _layout.tsx
  index.tsx

  (auth)/
    _layout.tsx
    splash.tsx
    login.tsx
    sign-up-account.tsx
    email-confirmation.tsx
    sign-up-role.tsx

  auth/
    _layout.tsx
    callback.tsx

  (tabs)/
    _layout.tsx
    home/
      _layout.tsx
      index.tsx
    interviews/
      _layout.tsx
      index.tsx
      my-interviews.tsx
      new.tsx
      my-posts/[postId]/index.tsx
      my-posts/[postId]/applicants/[applicationId].tsx
    map/
      _layout.tsx
      index.tsx
    chat/
      _layout.tsx
      index.tsx
      [roomId].tsx
    profile/
      _layout.tsx
      index.tsx
      account.tsx
      role.tsx
      notifications.tsx
      appearance.tsx
      delete-account.tsx

  interviews/
    _layout.tsx
    [postId].tsx

  notifications.tsx
  notice.tsx

  support/
    _layout.tsx
    index.tsx
    feedback.tsx
    report.tsx

  legal/
    _layout.tsx
    privacy.tsx
    terms.tsx
```

## Implementation Plan

### 1. Move Interview Detail To Root Shared Route

Create:

```text
apps/mobile/app/interviews/_layout.tsx
apps/mobile/app/interviews/[postId].tsx
```

`[postId].tsx` should export the same `InterviewDetailScreen`.

Remove or replace the old tab-owned file:

```text
apps/mobile/app/(tabs)/interviews/[postId].tsx
```

Preferred MVP implementation:

- Remove the old route file after all references are migrated.
- Do not keep both routes unless a temporary compatibility bridge is needed.

Reason:

- Keeping both routes allows the same screen to be opened through two different
  navigation stacks, which can reintroduce inconsistent back behavior.

### 2. Migrate All Interview Detail Navigation Calls

Replace every detail route:

```text
/(tabs)/interviews/[postId]
```

with:

```text
/interviews/[postId]
```

Known call sites to migrate:

- `apps/mobile/src/screens/home/HomeScreen.tsx`
- `apps/mobile/src/screens/map/MapScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`
- `apps/mobile/src/screens/interviews/MyInterviewsScreen.tsx`
- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`
- `apps/mobile/src/screens/notifications/NotificationsScreen.tsx`
- `apps/mobile/src/features/push/notificationRouting.ts`

Also update encoded `returnTo` strings inside login/apply flows that currently
embed the old route.

Examples:

```ts
router.push({
  pathname: "/interviews/[postId]",
  params: { postId, returnTo: "/(tabs)/chat/ROOM_ID" },
});
```

```ts
params: {
  returnTo: `/interviews/${post.id}?apply=1&returnTo=${encodeURIComponent(parentReturnTo)}`,
}
```

### 3. Update Safe Return Path Rules

Update:

```text
apps/mobile/src/shared/navigation/backNavigation.ts
```

Add root shared detail prefix:

```ts
"/interviews"
```

Keep existing safe prefixes for tab roots, support, legal, notice, and
notifications.

Back behavior standard:

```text
Stack can go back:
  router.back()

No history:
  router.replace(returnTo ?? fallback)
```

The helper `goBackOrReplaceReturnTo` should remain the canonical helper for
header back buttons on screens that may be entered from multiple origins.

### 4. Standardize Root Shared Screen Back Handling

Review these screens for explicit `returnTo` behavior:

- `InterviewDetailScreen`
- `NotificationsScreen`
- `NoticeScreen`
- `LegalDocumentScreen`
- `SupportScreen`
- `SupportForm`

Expected behavior:

- If a screen was opened with `returnTo`, the custom back button should still
  prefer native stack pop so iOS/Android back animation reverses the entry
  direction.
- If it was opened directly or from a simple stack push, use normal back.
- If no stack history exists, use explicit `returnTo`, then the screen-specific
  fallback.

Important distinction:

- Do not use `router.replace(returnTo)` for normal header back when the route
  was opened via `router.push`; it looks like a forward/replace transition
  instead of a reverse back transition.
- Do not blindly `replace(fallback)` for screens that should preserve native
  stack back animation.

### 5. Fix Root Layout Route Declarations

Current Expo warning:

```text
No route named "auth" exists
No route named "support" exists
No route named "legal" exists
```

Root cause:

```tsx
<Stack.Screen name="auth" />
<Stack.Screen name="support" />
<Stack.Screen name="legal" />
```

These names are declared in the root stack, but the corresponding route groups
do not currently have `_layout.tsx` files.

Implement:

```text
apps/mobile/app/auth/_layout.tsx
apps/mobile/app/support/_layout.tsx
apps/mobile/app/legal/_layout.tsx
```

Each can return:

```tsx
import { Stack } from "expo-router";

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Then keep the root stack declarations if they map cleanly.

If warnings persist, remove explicit root `Stack.Screen` declarations and let
Expo Router map routes automatically except for routes needing custom options.

### 6. Preserve Top-Level Tab Reselect Behavior

Current desired behavior:

- Tapping `인터뷰` tab opens `/(tabs)/interviews`.
- Tapping `채팅` tab opens `/(tabs)/chat`.
- Tapping `지도` while already on map triggers map reselect behavior.

Keep:

```tsx
router.replace("/(tabs)/interviews")
router.replace("/(tabs)/chat")
emitMapTabReselect()
```

Do not let bottom tab taps restore nested task routes like:

```text
/(tabs)/chat/[roomId]
/(tabs)/interviews/my-posts/[postId]
```

unless the user explicitly requests persistent per-tab task restoration later.

### 7. Keep Chat Thread Local To Chat Tab

Do not move:

```text
app/(tabs)/chat/[roomId].tsx
```

Reason:

- Chat thread is a local child of the chat tab.
- The bottom tab is intentionally hidden inside chat thread.
- It should return to chat list when closed or when the user taps the chat tab.

Known behavior to preserve:

- Chat thread back button returns to `/(tabs)/chat`.
- Notification/push into chat room may open `/(tabs)/chat/[roomId]`, but tapping
  the chat tab afterward must reset to the list.

### 8. Keep Interview Management Local To Interviews Tab

Do not move these as part of this work:

```text
app/(tabs)/interviews/my-interviews.tsx
app/(tabs)/interviews/new.tsx
app/(tabs)/interviews/my-posts/[postId]/index.tsx
app/(tabs)/interviews/my-posts/[postId]/applicants/[applicationId].tsx
```

Reason:

- These are management workflows, not public shared detail surfaces.
- The active tab should remain `인터뷰`.

Review internal links only where they open the public interview detail preview;
those detail links should point to `/interviews/[postId]`.

## QA Scenarios

Run these manually in Expo simulator/device after implementation.

### Chat To Interview Detail

1. Open `채팅`.
2. Enter a chat room.
3. Open `...`.
4. Tap `인터뷰 상세정보`.
5. Confirm no intermediate interviews list flashes during transition.
6. Tap back.
7. Confirm it returns to the same chat room.
8. Tap bottom `채팅`.
9. Confirm it returns to chat list.

### Home To Interview Detail

1. Open `홈`.
2. Tap a recent interview detail.
3. Tap back.
4. Confirm it returns to `홈`.

### Map To Interview Detail

1. Open `지도`.
2. Select a marker or list item.
3. Tap detail.
4. Tap back.
5. Confirm it returns to the map without switching to the interviews tab.

### Interviews Tab To Interview Detail

1. Open `인터뷰`.
2. Tap an interview row.
3. Tap detail if needed.
4. Tap back.
5. Confirm it returns to `인터뷰`.

### Notifications And Push

1. Open `알림`.
2. Tap an interview-post notification.
3. Confirm detail opens as root shared detail.
4. Tap back.
5. Confirm it returns to `알림`.

Push smoke:

- Trigger a test push for an interview post.
- Tap push.
- Confirm detail opens and back returns to notifications fallback or the
  expected previous screen.

### Route Warning Check

Start Expo and confirm these warnings no longer appear:

```text
No route named "auth" exists
No route named "support" exists
No route named "legal" exists
```

## Validation Commands

Targeted checks:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Optional simulator check:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack EXPO_NO_TELEMETRY=1 corepack pnpm --dir apps/mobile exec expo start --localhost --port 8082 --clear
```

Do not run EAS cloud builds for this work unless the user explicitly re-enables
cloud builds.

## Completion Criteria

- `인터뷰 상세` is no longer owned by the interviews tab stack.
- All detail entry points use `/interviews/[postId]`.
- Chat, home, map, interviews, notifications, and push return paths behave
  consistently.
- Bottom tab reselect behavior opens primary tab roots.
- Expo route-name warnings for `auth`, `support`, and `legal` are resolved.
- Mobile typecheck passes.
- Manual Expo simulator smoke confirms the chat-to-detail transition no longer
  shows the interviews list as an intermediate screen.
