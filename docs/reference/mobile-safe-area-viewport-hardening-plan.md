# Mobile Safe Area And Viewport Hardening Plan

Status: reference

Last updated: 2026-05-29

## Purpose

This plan defines how to harden Hypofit's phone-sized mobile app parity screens
and installed-web fallback screens so they work predictably across different
iPhone and Android screen sizes.

Google Play launch requirements, Android packaging, Play Console declarations,
and Data safety decisions live in
`docs/reference/google-play-first-launch-readiness-plan.md` and
`docs/reference/google-play-data-safety-worksheet.md`. This document only governs
layout, safe-area, viewport, and scroll behavior.

The current UI is directionally correct: it uses `dvh`, Tailwind utilities,
safe-area environment variables, internal scroll regions, and a shared
navigation shell. The remaining risk is that several important screens still
use per-screen height calculations and visual offsets. Those values work on the
currently tested simulator, but they are not a durable layout system.

This work should replace device-by-device visual tuning with shared layout
primitives.

## Scope

In scope:

- Phone-sized mobile app parity layout stability.
- iPhone safe area, Android gesture navigation, and installed-web fallback
  behavior.
- Mobile bottom navigation height and content reserve logic.
- Home feed scroll ownership.
- Map viewport, bottom sheet, selected card, and floating controls.
- Chat full-screen thread safe-area behavior.
- Auth screen keyboard and small-phone behavior.
- Modal and bottom-sheet CTA safe-area padding.
- A reusable Tailwind/CSS-variable approach for app shell dimensions.
- Verification across small, standard, and large phone viewports.

Out of scope:

- iPad-specific design polish.
- Desktop redesign.
- Native store packaging, EAS build, and Play Console submission work.
- Replacing the Kakao Maps SDK.
- Large visual redesign of cards, colors, or typography.
- Figma sync until the code direction is approved.

## Reference Basis

Use these existing project references:

- `docs/reference/mobile-pwa-responsive-design-trends.md`
- `docs/reference/location-permission-geocoding-radius-plan.md`
- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/ui-final-qa-checklist.md`
- `docs/reference/navigation-home-chat-ia-plan.md`
- `docs/completed/legal-pages-implementation-plan.md`
- `docs/reference/support-report-flow-plan.md`
- `docs/completed/location-discovery-map-plan.md`
- `docs/completed/button-system-detail-plan.md`

External standards that matter for this plan:

- Apple Human Interface Guidelines: layout should respect safe areas and
  system-provided margins.
- MDN `env()`: `safe-area-inset-*` values are the web mechanism for notches,
  rounded display corners, and home indicator regions.
- MDN viewport units: modern mobile layouts should prefer `dvh`, `svh`, or
  `lvh` depending on whether the screen should track dynamic browser chrome.
- Material / Android guidance: bottom navigation should remain stable for
  primary destinations, and mobile controls should keep comfortable touch
  targets.
- PWA guidance from web.dev: browser mode and standalone installed mode must be
  tested separately.

## Current Findings

### 1. App shell and bottom navigation are centralized

Current code:

- `apps/web/src/shared/ui/navigation/AppShell.tsx`
- `apps/web/src/styles.css`
- Mobile nav uses `pb-[var(--app-safe-bottom)]`.
- Non-map/home pages reserve `pb-[var(--app-content-bottom-reserve)]`.
- Home and map opt out through `managesOwnMobileViewport`.
- Shared variables include `--app-mobile-nav-height`,
  `--app-mobile-nav-safe-height`, `--app-content-bottom-reserve`, and
  `--app-mobile-content-height`.

Resolved:

- The bottom navigation height is now expressed as a shared token.
- Normal pages and full-screen app pages consume the same reserve/height
  variables.
- Changing `--app-mobile-nav-height` updates AppShell, home, map, and chat list
  layout together.

Remaining:

- Visual QA still needs to verify the shared variables across installed PWA and
  browser mode.

### 2. Home screen has the right scroll intent but height is still manually coupled to nav

Current code:

- `apps/web/src/pages/ExplorePage.tsx`
- Root height is `h-[var(--app-mobile-content-height)]`.
- Page overflow is hidden.
- Recent interview list scrolls internally.

Resolved:

- The hardcoded mobile nav height deduction was removed.
- The page itself remains non-scrollable while the recent interview list owns
  internal scrolling.

Remaining:

- Small-phone stress QA still needs to confirm at least 2 compact rows are
  visible before internal scrolling.

### 3. Map screen has the highest layout risk

Current code:

- `apps/web/src/pages/MapPage.tsx`
- Root height is `h-[var(--app-mobile-content-height)]`.
- Search controls are absolutely positioned with safe-area left/right.
- List button follows `--map-list-button-bottom`.
- Selected floating card uses the collapsed sheet height offset.
- Bottom sheet height uses `window.visualViewport?.height ?? window.innerHeight`
  and subtracts the rendered mobile nav height.
- The bottom sheet handle suppresses click after a drag threshold.

Remaining:

- The header uses top `0.75rem` but does not include
  `env(safe-area-inset-top)`. In installed PWA mode this may be acceptable on
  many devices because the status bar is outside the web viewport, but browser
  and standalone behavior should be verified separately.
- Visual QA still needs to confirm no collision between search controls, list
  button, selected card, and the sheet on small phones.

### 4. Chat thread is the strongest current mobile app pattern

Current code:

- `apps/web/src/pages/ChatPage.tsx`
- Chat room thread uses `fixed inset-0`.
- Header uses `pt-[calc(env(safe-area-inset-top)+0.75rem)]`.
- Composer uses `pb-[calc(env(safe-area-inset-bottom)+0.75rem)]`.
- Message list owns scroll.
- Chat room list uses shared mobile content height and an internal scroll
  region.
- Counterpart profile and block overlays have safe-area-aware padding plus
  max-height/internal-scroll fallback.

Remaining:

- Thread mode intentionally covers bottom navigation, which is correct for a
  chat room, but the pattern should be documented as a "pushed full-screen
  task".
- Add keyboard check: composer must stay visible and no message content should
  be trapped behind the keyboard on iOS Safari and Android Chrome.

### 5. Auth screen still contains visual tuning that may not scale

Current code:

- `apps/web/src/features/auth/AuthScreen.tsx`
- Root is `fixed inset-0 overflow-y-auto`.
- Main grid uses `min-h-dvh` and safe-area-aware top/bottom padding.
- Mobile form section no longer uses `-translate-y-9`.
- Auth card uses a safe-area-aware max height and internal scroll.

Resolved:

- Small-height and keyboard states can scroll instead of clipping.
- Manual translate positioning was removed.

Remaining:

- QA should confirm whether the small `pt-[min(5dvh,2.25rem)]` visual offset is
  still needed after simulator review.

### 6. General pages are acceptable but not fully safe-area explicit

Current code:

- `PageFrame` gives `p-4 sm:p-5 lg:p-7`.
- Profile, profile subpages, my interviews, notifications, detail, and new
  interview pages mostly rely on AppShell bottom padding.
- Legal/support/install are outside AppShell and use `min-h-dvh` with simple
  padding.

Issues:

- AppShell pages are mostly protected from bottom nav overlap.
- Public/full-page routes outside AppShell do not consistently use top/bottom
  safe-area padding.
- Some dialogs and sheets use `fixed inset-0` but do not add safe-area padding
  around bottom actions.

Target:

- Create a safe-area-aware page frame variant:
  - standard scroll page
  - full-screen app page
  - modal/sheet page
- Apply to public legal/support/install routes and profile subpages.
- Make bottom-sheet action rows use
  `pb-[calc(env(safe-area-inset-bottom)+1rem)]`.

## Proposed Layout System

### CSS variables

Add app layout variables near global styles or AppShell root:

```css
:root {
  --app-mobile-nav-height: 64px;
  --app-mobile-nav-safe-height: calc(var(--app-mobile-nav-height) + env(safe-area-inset-bottom));
  --app-page-x: 1rem;
  --app-page-y: 1rem;
}
```

In the AppShell root or `main`, expose:

```css
--app-content-bottom-reserve: var(--app-mobile-nav-safe-height);
--app-mobile-content-height: calc(100dvh - var(--app-mobile-nav-safe-height));
```

For desktop, reset as needed:

```css
@media (min-width: 1024px) {
  --app-content-bottom-reserve: 0px;
  --app-mobile-content-height: auto;
}
```

Tailwind usage should remain utility-first. Use arbitrary values only against
named variables, for example:

```tsx
className="h-[var(--app-mobile-content-height)]"
className="pb-[var(--app-content-bottom-reserve)]"
```

### React layout helpers

Do not build a heavy layout framework. Add only small shared helpers if they
remove duplicated calculations:

- `AppShell` owns mobile nav variables.
- `PageFrame` may accept a `variant`:
  - `scroll`
  - `appViewport`
  - `public`
- If variant props feel too broad, create separate helpers:
  - `PageFrame`
  - `AppViewportFrame`
  - `PublicPageFrame`

Preferred approach for MVP:

```text
shared CSS variables first
small frame components only where duplication remains
no new layout dependency
```

## Implementation Plan

### Phase 1: Centralize shell height and bottom reserve

Files:

- `apps/web/src/styles.css`
- `apps/web/src/shared/ui/navigation/AppShell.tsx`
- `apps/web/src/shared/ui/page.tsx`

Steps:

1. Add global app layout variables.
2. Update mobile bottom nav to use `h-[var(--app-mobile-nav-height)]`.
3. Update non-full-screen pages to use
   `pb-[var(--app-mobile-nav-safe-height)]`.
4. Keep `home` and `map` as full-screen consumers for now, but remove hardcoded
   page-specific `4rem`.
5. Document the distinction:
   - normal pages scroll under AppShell reserve
   - full-screen pages own their viewport and internal scroll
   - pushed task screens can cover nav intentionally

Acceptance criteria:

- No hardcoded `4rem` or `5rem` remains for mobile nav reserve.
- Changing `--app-mobile-nav-height` changes AppShell, home, and map together.

### Phase 2: Harden Home viewport and internal scroll

Files:

- `apps/web/src/pages/ExplorePage.tsx`

Steps:

1. Replace root height with `h-[var(--app-mobile-content-height)]`.
2. Keep `overflow-hidden` on the page root.
3. Keep the recent interview list as the only scrollable area.
4. Ensure header and section do not create page-level overflow.
5. Validate empty, loading, many-row, and expanded-row states.

Acceptance criteria:

- On 320 x 568, the page itself does not scroll.
- The interview list scrolls internally.
- The bottom nav does not overlap list content.
- Expanded row can open and close without shifting the whole app page.

### Phase 3: Harden Map as a true app viewport

Files:

- `apps/web/src/pages/MapPage.tsx`

Steps:

1. Replace root height with shared app content height.
2. Replace `window.innerHeight` sheet calculation with:
   `window.visualViewport?.height ?? window.innerHeight`.
3. Recompute min/mid/max sheet heights from the available map viewport, not
   raw device height.
4. Remove selected card `13dvh` positioning and anchor it to the collapsed
   sheet height plus a small gap.
5. Keep list button anchored to live sheet height.
6. Clamp floating controls so they do not collide with the search stack.
7. Check whether top search needs `safe-area-inset-top`; add it only if visual
   QA shows collision.
8. Ensure map drag remains map drag and sheet drag remains sheet drag.

Acceptance criteria:

- Bottom sheet touches the correct bottom edge with no random gap above nav.
- Collapsed sheet shows only the intended summary.
- Mid/expanded sheet heights are stable on small and large phones.
- Selected card floats directly above the collapsed sheet.
- List button remains visually attached to sheet height.
- No page-level scroll occurs on map.

### Phase 4: Harden Chat list and thread

Files:

- `apps/web/src/pages/ChatPage.tsx`

Steps:

1. Replace chat list height reserve with shared AppShell variables.
2. Keep chat thread as `fixed inset-0` on mobile.
3. Ensure chat thread has safe-area top and bottom padding.
4. Verify action menu overlays do not escape right edge on 320px width.
5. Verify counterpart profile sheet and block dialog have safe-area padding.
6. Give the counterpart profile sheet a max height derived from `100dvh` minus
   safe areas and allow internal scroll.
7. Verify message composer with keyboard open in iOS simulator and Android
   Chrome if available.

Acceptance criteria:

- Chat list does not hide behind bottom nav.
- Chat room header does not collide with status area.
- Composer stays above home indicator and keyboard.
- Message list remains the only scrollable area in a thread.

### Phase 5: Replace auth visual offsets

Files:

- `apps/web/src/features/auth/AuthScreen.tsx`

Steps:

1. Remove `-translate-y-9`.
2. Use safe-area-aware page padding.
3. Allow vertical scrolling or internal card scrolling on small screens.
4. Keep login visually high enough to feel app-like without manual transform.
5. Validate sign-in, sign-up step 1, sign-up step 2, error, and keyboard
   states.

Acceptance criteria:

- No auth content is clipped on 320 x 568.
- Keyboard does not hide the active password/email input.
- Login card does not need per-device transform.
- Splash-to-login transition does not reveal a white gap.

### Phase 6: Make sheets, modals, and public pages safe-area aware

Files:

- `apps/web/src/pages/InterviewsPage.tsx`
- `apps/web/src/pages/SupportPage.tsx`
- `apps/web/src/pages/LegalPage.tsx`
- `apps/web/src/pages/InstallPage.tsx`
- `apps/web/src/pages/ProfileSubPage.tsx`
- `apps/web/src/shared/ui/confirm-action.tsx`
- Any component with `fixed inset-0` and bottom actions.

Steps:

1. Add safe-area bottom padding to mobile bottom sheets.
2. Add safe-area top/bottom padding to public pages outside AppShell.
3. Keep normal AppShell pages relying on shell bottom reserve.
4. Ensure modals remain centered on desktop but bottom-safe on mobile.
5. Avoid introducing nested scroll traps.

Acceptance criteria:

- Filter sheet CTA is not too close to iPhone home indicator.
- Support/report form submit button is reachable on small phones.
- Legal pages can scroll naturally and do not hide first/last content behind
  device UI.
- Dialogs remain dismissible and keyboard usable.

## Verification Plan

Run visual checks in both browser and installed PWA modes when possible.

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

Screens to verify:

- Splash
- Login
- Sign-up account step
- Sign-up role step
- Home
- Home with expanded interview row
- Interviews
- Interviews filter sheet
- Interview detail
- New interview
- My interviews
- Map initial state
- Map with selected marker
- Map sheet collapsed/mid/expanded
- Chat list
- Chat thread
- Chat action menu
- Chat profile sheet
- Profile
- Profile account edit
- Support
- Report
- Legal terms/privacy
- Notifications

Behavior checks:

- No unintended page-level scroll on home.
- No unintended page-level scroll on map.
- Only intended panels/lists scroll internally.
- Bottom nav never covers normal page content.
- Full-screen chat intentionally covers bottom nav.
- Fixed bottom actions respect safe area.
- Keyboard does not hide active inputs.
- Touch targets remain at least visually comfortable near 44px.
- Text does not clip or overlap with large Korean strings.
- Reduced-motion users are not forced through decorative motion.

Validation commands before declaring complete:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

Run lint/test only when the implementation touches behavior, shared components,
or before committing/deploying.

## Risk And Tradeoffs

### Risk: shared variables may alter many pages at once

Mitigation:

- Introduce variables first.
- Convert one screen at a time.
- Visually test after each group: shell/home, map, chat, auth, sheets/public
  pages.

### Risk: dynamic viewport changes may create small jumps

Mitigation:

- Use `dvh` where the app should track visible viewport.
- Use visual viewport for drag sheet math.
- Avoid recalculating sheet position on every tiny resize unless necessary.

### Risk: auth page may become scrollable again

Mitigation:

- Accept controlled scroll on auth when keyboard or small height requires it.
- The stronger requirement is no clipping and no hidden input.

### Risk: map controls and sheet compete for gesture ownership

Mitigation:

- Keep drag capture only on the sheet handle or sheet header area.
- Do not make the full sheet body intercept map gestures unless the sheet is
  expanded and body content is scrolling.

## Definition Of Done

This active document can be moved to completed when:

- Shared mobile layout variables replace hardcoded nav height reserves.
- Home uses a shared viewport height and only its feed list scrolls.
- Map uses shared viewport height, visual viewport sheet math, and no selected
  card magic-number offset.
- Chat list/thread use shared safe-area conventions.
- Auth no longer depends on `-translate-y-*` for mobile positioning.
- Mobile sheets and public pages use safe-area-aware padding.
- Required phone viewport screenshots or simulator checks show no overlap,
  clipping, or unintended page scroll.
- `apps/web` production build passes.
- Figma sync is either completed on user approval or explicitly deferred in the
  final implementation report.
