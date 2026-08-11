# Chat Thread iOS UI Hardening Plan

Status: completed

Last updated: 2026-06-01

## Purpose

Track only the remaining close-out work for the Expo chat thread UI.

The thread direction is already implemented in
`apps/mobile/src/screens/chat/ChatThreadScreen.tsx`. This file should stay
active only while Expo visual QA or small regressions remain.

## Source Of Truth

- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `docs/reference/ui-final-qa-checklist.md`
- `docs/reference/navigation-home-chat-ia-plan.md`

## Confirmed In Code

- [x] The room renders as a full-screen task surface on `bg-hypo-bg` with
  safe-area-aware top padding and a keyboard-avoiding wrapper.
- [x] The chat thread now hides the parent bottom tab bar while `/chat/[roomId]`
  is active, so the composer is the only bottom control in the conversation.
- [x] The always-open interview summary card is gone from the thread header
  area.
- [x] Header chrome is already reduced to back, counterpart profile entry,
  mute bell, and overflow actions.
- [x] Overflow actions open as an anchored dropdown/modal, not a bottom sheet.
- [x] Overflow actions are narrowed to `인터뷰 상세정보`, `인터뷰 취소`,
  and `신고하기`.
- [x] `인터뷰 취소` shows a confirmation alert before mutation.
- [x] Non-cancelable interview states disable the destructive action and show
  helper copy instead of pretending the action is still available.
- [x] Founder-owned applied chat rooms now show a compact composer-adjacent
  action strip for `답변 보기`, `선정`, and `반려`, so applicant decisions stay
  close to the active conversation without turning the thread into a full
  management screen.
- [x] Founder rejection now requires a short reason in a focused modal and
  keeps the typed reason if the mutation fails.
- [x] System messages render as centered chips.
- [x] User messages render as left/right bubbles with clearer sender
  separation, restrained radius, and no card shadow.
- [x] The composer uses an icon-only send action, a muted outer bar, and a pill
  input surface.
- [x] The send icon state follows whether the trimmed input can actually be
  submitted.
- [x] Expo Go smoke on iOS 26.5 opened a real deployed chat room and rendered
  header actions, left/right bubbles, system messages, and the composer without
  a crash.

## Remaining Active Work

- [ ] Expo iOS QA for multiline composer growth and internal scrolling once the
  input reaches the current `max-h-28` limit.
- [ ] Keyboard QA with short and long threads so the composer stays reachable
  and message content does not get trapped behind the keyboard.
- [ ] Safe-area and hit-target QA for the bell/menu cluster, including dropdown
  anchor position and outside-tap dismissal on real Expo runtime surfaces.
- [ ] Device-level contrast check for counterpart bubbles. If they still blend
  into `bg-hypo-bg`, adjust the neutral bubble tone after actual Expo review.

## Regression Watch List

- The overflow menu should continue to read like a compact menu, not a second
  sheet or nested card.
- Cancel success should still close the menu and refresh chat/application state.
- Profile modal, overflow menu, and keyboard-open states should not conflict on
  dismissal order or z-index.
- Founder action strip should appear only when the current user owns the
  interview post and the linked application is still `applied`.
- Selection/rejection mutations should refresh chat-room/application state so
  the action strip disappears after the decision is reflected.

## Close Criteria

Close this doc when the remaining Expo QA passes or is split into a smaller
bug-specific follow-up.

After that, this file should not stay in `docs/active`. If no new chat-thread
work appears, move it to `docs/reference/` as a short implementation note.
