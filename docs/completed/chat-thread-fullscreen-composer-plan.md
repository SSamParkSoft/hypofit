# Chat Thread Fullscreen Composer Plan

Status: completed

Last updated: 2026-06-08

## Purpose

Decide and implement the mobile chat-thread layout where an individual chat
room hides the bottom tab bar and gives the bottom area to the message
composer.

The goal is to make the chat room feel like a focused conversation surface,
not a tab-level browsing screen. The chat list remains a top-level `채팅` tab.
The chat thread becomes a full-screen task surface launched from that tab.

## External Reference Summary

### Apple HIG

Apple describes tab bars as top-level navigation. They should help users switch
between primary sections and preserve each section's navigation state. Apple
also warns that hiding top-level navigation can make the interface feel
unstable unless the current surface is temporary or self-contained.

Hypofit interpretation:

- Keep the tab bar on `채팅` list because it is a top-level destination.
- Hide the tab bar inside a specific chat room because the screen is a focused
  conversation/task surface with its own back affordance.
- The user still knows their location because the header includes a clear back
  button, counterpart identity, and conversation context.

### Material Design

Material bottom navigation is also intended for three to five primary
destinations. Material explicitly says bottom navigation should not be used for
views focused on a single task, such as an email compose screen. It can also be
temporarily covered by task controls such as a keyboard or sheet.

Hypofit interpretation:

- A chat thread is closer to a single task than to a primary destination.
- The composer should own the bottom area and remain reachable above the home
  indicator/keyboard.
- Keeping the tab bar under the composer wastes vertical space and creates two
  competing bottom controls.

### React Navigation / Expo Router

Expo Router uses React Navigation under the hood. In a nested stack inside a
tab, the parent tab bar remains visible unless the route structure or parent
tab options explicitly hide it.

Common implementation approaches:

1. **Dynamic parent tab option**
   - Keep `app/(tabs)/chat/[roomId].tsx` under the chat tab.
   - On chat-thread focus, set parent tab `tabBarStyle` to hidden.
   - Restore the default tab style on blur/unmount.
   - Lower migration cost, preserves current route ownership.

2. **Root-level full-screen route**
   - Move chat thread outside `(tabs)`, for example `app/chat/[roomId].tsx`.
   - `채팅` list remains under `(tabs)/chat/index`.
   - Opening a room pushes a root-level screen where no tab bar exists.
   - Cleaner hierarchy for full-screen task surfaces, but requires route and
     returnTo updates.

For the current MVP, use option 1 first because the nested-tab migration was
recently stabilized and the chat route already lives under `(tabs)/chat`.
If tab-style restoration becomes fragile, move to option 2.

## Product Decision

### Chat List

Keep bottom navigation visible.

Reason:

- `채팅` is a top-level destination.
- Users should be able to switch to `홈`, `인터뷰`, `지도`, and `프로필`.
- The list is a browsing/overview screen, not a single-task surface.

### Chat Thread

Hide bottom navigation and make the composer the only bottom control.

Reason:

- The user is actively composing and reading messages.
- The keyboard and composer need stable bottom positioning.
- The bottom tab bar adds visual noise and compresses message history.
- Back navigation is already available in the thread header.
- This matches common messaging app behavior where the conversation view
  prioritizes the message input over global navigation.

## UX Requirements

### Header

- Keep a clear back button on the left.
- Keep counterpart avatar/name as the primary title.
- Keep interview title as a smaller subtitle when available.
- Keep mute bell and overflow menu as icon-only actions.
- Ensure all icon buttons remain at least 44px touch targets.
- Back action must use the current `goBackOrReplaceFallback("/(tabs)/chat")`
  rule so native back animation works when stack history exists.

### Message List

- Message history should fill the available space between header and composer.
- The list should not be hidden behind the composer.
- When a new message arrives:
  - auto-scroll only when the user is near the bottom,
  - preserve scroll position when the user is reading older messages.
- System messages remain centered chips.
- Current-user messages stay right aligned; counterpart messages stay left
  aligned.

### Composer

- Composer sits at the bottom of the chat-thread screen.
- Composer respects `safe-area-inset-bottom` / React Native safe-area bottom.
- Composer moves above the keyboard on iOS through `KeyboardAvoidingView`.
- Composer does not reserve space for the tab bar.
- Single-line input should be visually centered.
- Multiline input can grow up to the existing max height and then scroll
  internally.
- Send button remains icon-only and disabled when trimmed input is empty.

### Founder Action Strip

- Founder-only action strip (`답변 보기`, `선정`, `반려`) should sit directly
  above the composer.
- It should not look like a tab bar or bottom navigation.
- It should remain reachable when keyboard is closed.
- When keyboard opens, decide after QA whether it stays visible or collapses
  above the keyboard. Default MVP behavior: keep it above the composer unless
  it causes crowding on small phones.

### Keyboard Behavior

- Opening the keyboard should not reveal the bottom tab bar.
- Composer remains visible above the keyboard.
- Header remains stable.
- Message list height recalculates without trapping the last message behind
  the composer.
- On iOS, `KeyboardAvoidingView` should use `behavior="padding"` and a tested
  vertical offset if needed.
- On Android, avoid double-resizing if system `windowSoftInputMode` already
  resizes the view.

### Safe Area

- Top area respects status bar/dynamic island.
- Bottom composer respects home indicator.
- No hardcoded bottom value should assume the tab bar is still present.
- Do not add per-device magic offsets.

## Technical Design

### Current Structure

```text
app/(tabs)/_layout.tsx
  Tabs: home, interviews, map, chat, profile

app/(tabs)/chat/_layout.tsx
  Stack: index, [roomId]

app/(tabs)/chat/index.tsx
  Chat list

app/(tabs)/chat/[roomId].tsx
  Chat thread
```

This means the bottom tab bar comes from the parent `(tabs)/_layout.tsx`.
The chat thread itself cannot remove it by simply changing its own JSX.

### Recommended MVP Implementation

Add a small hook to hide the parent tab bar while the chat-thread route is
focused.

Proposed file:

```text
apps/mobile/src/shared/navigation/useHideTabBarOnFocus.ts
```

Behavior:

- Accept no arguments or an optional restore style.
- Use Expo Router / React Navigation focus lifecycle.
- On focus:
  - call parent tab navigator `setOptions({ tabBarStyle: { display: "none" } })`
    or the equivalent style merge.
- On blur/unmount:
  - restore the original canonical tab bar style.

Important constraint:

- The canonical tab-bar style currently lives inline in
  `apps/mobile/app/(tabs)/_layout.tsx`.
- To avoid restoration drift, extract that style into a shared function before
  hiding/restoring.

Proposed files:

```text
apps/mobile/src/shared/navigation/tabBarStyle.ts
apps/mobile/src/shared/navigation/useHideTabBarOnFocus.ts
```

`tabBarStyle.ts` should export:

```ts
function getBottomTabBarStyle(bottomInset: number): BottomTabBarStyle
function getBottomTabItemStyle(): BottomTabItemStyle
```

Then:

- `(tabs)/_layout.tsx` uses `getBottomTabBarStyle(insets.bottom)`.
- `useHideTabBarOnFocus` restores with the same function.
- `ChatThreadScreen` calls `useHideTabBarOnFocus()`.

If Expo Router parent option access is unreliable, fallback implementation:

- Define hidden tab style at the `Tabs.Screen name="chat"` option level based on
  current route pathname.
- If `pathname` starts with `/(tabs)/chat/` or route resolves to `[roomId]`,
  use `{ display: "none" }`.
- Otherwise use canonical visible style.

### Alternative Longer-Term Implementation

Move the thread to a root-level full-screen route:

```text
app/chat/[roomId].tsx
```

Then:

- `ChatListScreen` opens `/chat/[roomId]?returnTo=/(tabs)/chat`.
- The root stack shows the chat thread without tab bar by structure.
- The chat thread back button still uses `goBackOrReplaceFallback`.

This is architecturally clean but should be done only if the focus-based
tab-hiding approach proves unstable.

## Implementation Steps

### Phase 1: Extract Tab-Bar Style

- Move tab bar style from `app/(tabs)/_layout.tsx` into a shared helper.
- Keep visual output unchanged for all top-level tabs.
- Run mobile typecheck.

Acceptance:

- Home/interviews/map/chat/profile tab bar looks unchanged on list screens.
- No tab height, icon, label, or safe-area regression.

Implementation update 2026-06-08:

- [x] Added `apps/mobile/src/shared/navigation/tabBarStyle.ts`.
- [x] Extracted the canonical bottom tab bar style into
  `getBottomTabBarStyle(bottomInset)`.
- [x] Extracted tab item style into `getBottomTabItemStyle()`.
- [x] Added `getHiddenBottomTabBarStyle()` for full-screen task surfaces.
- [x] `(tabs)/_layout.tsx` now uses the shared helpers instead of duplicating
  tab style inline.

### Phase 2: Hide Tab Bar On Chat Thread

- Add focus-scoped tab-bar hiding.
- Apply it only in `ChatThreadScreen`.
- Ensure the chat list still shows the tab bar.
- Ensure entering/exiting thread restores the tab bar.

Acceptance:

- `채팅` list: bottom tab visible.
- `채팅방`: bottom tab hidden.
- Back from `채팅방`: tab bar visible again on `채팅` list.
- Switching to another tab after returning shows normal tab bar.

Implementation update 2026-06-08:

- [x] Implemented the lower-risk parent-layout path check instead of a
  child-screen focus hook.
- [x] `(tabs)/_layout.tsx` hides the tab bar when `usePathname()` starts with
  `/chat/`.
- [x] `/chat` list keeps the canonical tab bar because it does not match
  `/chat/`.
- [x] This avoids parent option restore drift while preserving the current
  nested chat route ownership.
- [ ] Simulator/TestFlight QA still needs to confirm visual restore after
  opening a room and pressing back.

### Phase 3: Composer Layout Tightening

- Remove any bottom spacing that was compensating for a visible tab bar.
- Ensure composer uses safe-area bottom only.
- Ensure message list has enough bottom padding for the composer height.
- Keep founder action strip above composer.

Acceptance:

- Composer is visually attached to the bottom safe area, not floating above a
  missing tab bar.
- Last message is not hidden behind the composer.
- Empty/short thread still places composer at bottom.

Implementation update 2026-06-08:

- [x] Existing `ChatThreadScreen` composer already uses safe-area bottom padding
  through `Math.max(insets.bottom + 8, 12)`.
- [x] No extra tab-bar reserve was found in the composer container.
- [ ] Visual QA still needs to confirm the composer feels attached to the
  bottom safe area after the parent tab bar is hidden.

### Phase 4: Keyboard QA

- Test iOS simulator and real TestFlight device.
- Test short thread, long thread, and multiline input.
- Test menu/dropdown while keyboard is open.
- Test founder action strip with keyboard open.

Acceptance:

- Keyboard does not cover composer.
- Composer does not jump with double padding.
- The bottom tab bar does not reappear while keyboard is open.
- Multiline composer growth remains controlled.

### Phase 5: Android QA

- Confirm Android bottom navigation is hidden in chat thread.
- Confirm Android keyboard resize does not cover composer.
- Confirm gesture navigation/home indicator spacing is acceptable.
- Confirm TalkBack labels still exist for back, mute, menu, and send.

Acceptance:

- Android chat thread behaves as a full-screen conversation surface.
- No clipped input text or send icon.
- No route/back regression.

## QA Matrix

Minimum devices/surfaces:

- iPhone 17 Pro simulator, iOS 26.x
- iPhone physical TestFlight build
- Android emulator or Play internal test build

Scenarios:

- Open chat list -> open room -> back to list.
- Open room from notification -> back fallback returns to expected place.
- Open room from interview detail -> back returns naturally if stack exists.
- Send one message.
- Receive/poll one counterpart message.
- Type multiline message to max height.
- Open keyboard, then open/close overflow menu.
- Toggle mute.
- Founder room with action strip: select/reject path.
- Blocked/final room: composer disabled state.

## Risks And Mitigations

### Risk: Tab Bar Restore Drift

If the hidden style overwrites the parent tab style and restores incorrectly,
other tabs may lose height, shadow, or safe-area padding.

Mitigation:

- Extract canonical style into one helper.
- Restore from that helper instead of duplicating inline values.

### Risk: Back Navigation Regression

Hiding the tab bar must not replace the back stack.

Mitigation:

- Keep `goBackOrReplaceFallback("/(tabs)/chat")`.
- Do not use `router.replace` as the primary back behavior.

### Risk: Composer Overlaps Keyboard Or Home Indicator

Removing the tab bar changes bottom available space.

Mitigation:

- Base bottom padding on safe-area bottom only.
- Test with keyboard open and closed.
- Avoid hardcoded tab-bar reserve values.

### Risk: Apple HIG Concern About Hidden Tab Bar

Apple generally expects tab bars to remain visible for top-level sections.

Mitigation:

- Hide only the thread, not the chat list.
- Treat the thread as a focused task surface with its own header/back button.
- Preserve location context through title/subtitle and native back behavior.

## Close Criteria

Move this document to `docs/completed/` or merge it into
`chat-thread-ios-ui-hardening-plan.md` when:

- Chat list keeps the bottom tab bar.
- Chat thread hides the bottom tab bar.
- Composer is bottom-safe-area anchored.
- iOS keyboard QA passes for short, long, and multiline threads.
- Returning from chat thread restores the tab bar.
- Mobile typecheck and Expo Doctor pass.
- TestFlight or simulator smoke confirms no route/back regression.
