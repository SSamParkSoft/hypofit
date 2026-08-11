# Notification Settings UI Plan

Status: completed

Last updated: 2026-06-09

## Purpose

Redesign the Expo mobile notification settings page so it feels like a native
settings surface and clearly separates:

- system notification permission state,
- Hypofit app-level push preferences,
- in-app notification center behavior,
- unavailable or disabled states.

This implementation plan is complete. Keep it in `docs/completed/` as the
record for the notification settings UI redesign.

## Source Of Truth

- `apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx`
- `apps/mobile/src/features/push/pushNotifications.ts`
- `apps/mobile/src/shared/api/push.ts`
- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/ui-final-qa-checklist.md`

## External Standards Checked

Checked on 2026-06-09:

- Apple Human Interface Guidelines, Settings:
  https://developer.apple.com/design/human-interface-guidelines/settings
- Apple Human Interface Guidelines, Managing notifications:
  https://developer.apple.com/design/human-interface-guidelines/managing-notifications
- Apple UserNotifications permission API:
  https://developer.apple.com/documentation/UserNotifications/asking-permission-to-use-notifications
- Android notification runtime permission:
  https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Android app permissions best practices:
  https://developer.android.com/training/permissions/usage-notes
- Android Settings design guidelines:
  https://source.android.com/docs/core/settings/settings-guidelines
- Material settings pattern:
  https://developer.android.com/design/ui/mobile/guides/patterns/settings

## Standard Conclusions

- Do not replicate OS notification display controls such as banners, sounds,
  lock-screen display, badges, and notification-center display. Link to system
  settings when the OS permission or display behavior needs user action.
- The app should control app-specific notification categories: chat,
  application state, session schedule, support reply, and later announcements.
- Use a clear top-level state summary so the user can immediately understand
  whether notifications can arrive.
- Frequently used or globally disabling controls belong near the top.
- Use switches for boolean settings. Do not use radio buttons for on/off
  preferences.
- Group related settings with section headings and dividers. Avoid card-heavy
  settings screens when the rest of the profile settings uses row groups.
- If a child setting depends on a parent switch or system permission, explain
  the disabled state close to the setting.
- Android 13+ notification permission is off by default for new installs until
  the app asks and the user grants it. The app should handle denied and
  not-requested states gracefully.
- Permission prompts should be tied to an understandable user moment. Hypofit
  already asks after authenticated entry, and the settings page should support
  a manual retry/connect action.

## Pre-implementation Screen Problems

The previous `NotificationSettingsScreen` worked functionally, but its visual and
information architecture still feels like a generic admin card screen:

- Uses `SectionCard`, while the redesigned profile area uses row groups and
  full-width dividers.
- Header description repeats the page purpose too heavily.
- The `기기 알림` card mixes provider technical labels such as APNs/FCM with
  user-facing copy.
- The primary button is large compared with the rest of profile settings.
- Preference rows are technically correct but visually heavy because every row
  includes helper text and card containment.
- The system permission disabled state and app-level preference disabled state
  are not visually distinct enough.

## Product Scope

Keep MVP categories small:

```text
전체 푸시 알림
채팅 메시지
신청 상태
인터뷰 일정
문의 답변
```

Do not add marketing/event push controls yet. Hypofit should not claim or imply
marketing push delivery while the current product policy says marketing push is
not sent.

## Target IA

```text
알림 설정

상태 요약
  알림이 켜져 있어요 / 알림이 꺼져 있어요 / 알림을 켤 수 있어요
  현재 기기에서 푸시를 받을 수 있는지 설명
  기기 푸시 받기      Switch

푸시 알림
  전체 푸시 알림      Switch
  채팅 메시지         Switch
  신청 상태           Switch
  인터뷰 일정         Switch
  문의 답변           Switch
```

## UI Direction

Use the same visual language as the current profile redesign:

- page background: `bg-hypo-bg`,
- no nested cards for normal settings rows,
- section title above rows,
- full-width separators between major sections,
- no row-level divider inside a compact group unless readability requires it,
- row height around `56-68px`,
- left text column and right switch,
- icons only if they improve scanning; avoid noisy icon use for every row if
  the switch row is already clear,
- Korean copy in a short Toss-like tone.

## Copy Draft

### Permission Summary

Granted:

```text
알림이 켜져 있어요
채팅과 신청 상태를 바로 받을 수 있어요.
```

Denied:

```text
기기 알림이 꺼져 있어요
시스템 설정에서 알림을 켜야 푸시가 도착해요.
```

Not requested:

```text
알림을 켤 수 있어요
선정 결과와 새 메시지를 놓치지 않게 알려드릴게요.
```

Unknown/error:

```text
알림 상태를 확인해 주세요
기기 설정을 다시 확인한 뒤 시도해 주세요.
```

### Device Notification Switch

```text
기기 푸시 받기
스위치를 켜면 알림 권한을 요청할게요.
스위치를 켜면 시스템 설정으로 이동해요.
끄려면 기기 설정에서 변경할 수 있어요.
```

### Preference Rows

```text
전체 푸시 알림
앱 밖에서도 중요한 소식을 받을 수 있어요.

채팅 메시지
새 메시지가 오면 알려드려요.

신청 상태
신청, 선정, 반려 상태를 알려드려요.

인터뷰 일정
일정 변경과 취소를 알려드려요.

문의 답변
남긴 문의에 답변이 오면 알려드려요.
```

## Data/API Impact

Current API preference fields:

```text
push_enabled
chat_push_enabled
application_push_enabled
session_push_enabled
support_push_enabled
marketing_push_enabled
```

MVP recommendation:

- Implement the UI redesign with the existing 5 controllable rows first.
- Do not show non-controllable 안내 rows in this screen unless they solve a
  current user action.
- Do not reuse `marketing_push_enabled` for another category; the meaning
  conflicts with current product policy.

## Implementation Tasks

### 1. Replace Card Layout With Profile-Style Sections

- Remove `SectionCard` from `NotificationSettingsScreen`.
- Use plain section groups with headings and full-width top dividers.
- Keep `AppScreen` for native back handling and safe-area behavior.
- Remove the long `description` from `AppScreen` unless visual QA proves it is
  needed.

### 2. Add Permission Summary Section

- Derive a user-facing status model from `PushPermissionSummary`.
- Show status title, short body, status pill, and a device notification switch.
- Hide technical `APNs/FCM` copy from normal user-facing text.
- Keep provider/platform details out of the primary surface unless needed for
  diagnostics.

### 3. Add System Settings Handoff

- If permission is denied, turning the device notification switch on opens app
  notification settings.
- Use `Linking.openSettings()` as the MVP cross-platform fallback.
- Keep `requestAndRegisterPush(...)` for not-requested or reconnect states when
  the switch is turned on.
- If permission is already granted and the user turns the device switch off,
  explain that OS notification permission must be changed in system settings.
- If `Linking.openSettings()` fails, show:
  `기기 설정에서 Hypofit 알림을 켜 주세요.`

### 4. Redesign Preference Rows

- Keep existing preference update logic.
- Convert rows to full-width list rows.
- Make disabled child rows visibly muted when:
  - no access token,
  - parent `push_enabled=false`,
  - another preference mutation is pending.
- Keep one-row loading spinners only where a switch is updating.
- Use compact helper text only where needed.

### 5. Add In-App Notification Explanation

- Add a separate section explaining that the notification center remains
  available even when OS push is off.
- Link or mention `알림 탭` only if the route is stable enough for a direct
  action.

### 6. Keep Store/Privacy Consistency

- Do not add a marketing push toggle.
- Do not imply guaranteed delivery.
- Do not claim announcements are pushed unless backend delivery is implemented.
- If a new preference category is added later, update:
  - `docs/reference/google-play-data-safety-worksheet.md`,
  - `docs/reference/google-play-first-launch-readiness-plan.md`,
  - `docs/completed/native-push-notification-apns-fcm-plan.md`,
  - privacy/legal copy if collection or usage changes.

## Verification Plan

Code checks before reporting done:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
git diff --check -- apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx
```

Manual mobile QA:

- iOS granted state.
- iOS denied state and system-settings switch handoff.
- iOS not-requested state and permission request switch handoff.
- Android granted state.
- Android denied/not-requested state.
- Parent `전체 푸시 알림` off disables child rows clearly.
- Child preference save updates only the intended row.
- Loading/error message does not create page jump.
- Back button returns to `프로필`.

Figma:

- Do not sync immediately during active UI iteration.
- Sync Figma only after the user approves the implemented mobile screen.

## Acceptance Criteria

- [x] The screen no longer uses card containers for normal settings groups.
- [x] System permission state is visible at the top.
- [x] Denied permission state gives a clear route to system settings.
- [x] Existing preference toggles still read/write the API correctly.
- [x] Disabled dependent toggles are visually understandable.
- [x] The UI does not expose APNs/FCM jargon to normal users.
- [x] Typecheck passes.
- [x] Figma sync is deferred unless the user explicitly asks for it.

## Implementation Result

Completed on 2026-06-09:

- Replaced the `SectionCard` notification settings layout with profile-style
  section groups and row settings.
- Added a user-facing system permission summary.
- Replaced the previous permission CTA with a device notification switch.
- Added denied-permission and granted-off switch handoffs to system settings
  through `Linking.openSettings()`.
- Kept existing preference API wiring for the current push categories.
- Removed non-controllable notice/footer rows so the screen stays focused on
  settings the user can actually change.
- Verified with:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
git diff --check -- apps/mobile/src/screens/profile/NotificationSettingsScreen.tsx docs/completed/notification-settings-ui-plan.md docs/active/README.md docs/completed/README.md
```

## Confusion Reduction Update

Completed on 2026-06-09:

- Removed the user-facing split between `기기 알림` and `푸시 알림`.
- Renamed the main switch to `알림 받기` so the page starts from the user's
  actual question: whether Hypofit can notify them.
- Renamed the category section to `받을 소식`.
- Kept OS permission behavior internally:
  - if permission is not granted, turning on `알림 받기` requests permission or
    opens app settings,
  - if permission is granted, turning on/off updates `push_enabled`.
- Disabled category switches when either OS permission or app-level
  `push_enabled` is off.
- Kept APNs/FCM and other provider terms out of normal user-facing copy.
- Verified with:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
git diff --check
```
