# Mobile App Responsive Design Trends

Status: reference

Last updated: 2026-05-29

This document summarizes current mobile app, installed-web fallback, and
responsive UI guidance that should inform Hypofit's mobile-first product
screens. It is a working design reference, not a backlog by itself.

Google Play launch requirements, Android packaging, Play Console declarations,
and Data safety decisions live in
`docs/reference/google-play-first-launch-readiness-plan.md` and
`docs/reference/google-play-data-safety-worksheet.md`. If those documents conflict
with this UI reference, the Google Play readiness documents are the source of
truth for store submission.

## Scope

Hypofit currently treats phone-sized mobile app screens, installed-web fallback
screens, and desktop web screens as separate UI targets.

Design priorities:

- Optimize mobile screens for phone-sized Expo app parity first.
- Keep installed PWA/browser usage usable as a secondary fallback.
- Keep desktop web free to use a different layout and information density.
- Do not prioritize iPad/tablet-specific layouts unless explicitly requested.
- Let tablet widths reuse the closest acceptable mobile or desktop fallback.
- Use Tailwind CSS for implementation and keep reusable UI patterns in shared
  components when they repeat.

## Source Notes

Primary references checked:

- Apple Human Interface Guidelines, Tab Bars:
  https://developer.apple.com/design/human-interface-guidelines/tab-bars
- web.dev, PWA App Design:
  https://web.dev/learn/pwa/app-design
- Material Design, Bottom Navigation:
  https://m1.material.io/components/bottom-navigation.html
- Material Design, Bottom Sheets:
  https://m1.material.io/components/bottom-sheets.html
- Android Accessibility Help, Touch Target Size:
  https://support.google.com/accessibility/android/answer/7101858
- W3C WCAG 2.1 Understanding SC 2.5.5 Target Size:
  https://w3c.github.io/wcag21/understanding/target-size.html
- Baymard Mobile App UX Research overview:
  https://baymard.com/research/mobile-app
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play Data safety:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- MDN viewport and modern viewport units:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Viewport
- MDN `env()`:
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env

Use trend articles only as supporting inspiration. Product rules should come
from platform guidelines, accessibility guidance, and actual Hypofit workflow
needs.

## Current Direction

The strongest current pattern for Hypofit is not a marketing mobile website.
It is an app-like operational product surface:

- persistent bottom navigation for top-level destinations
- compact home feed and interview discovery lists
- bottom sheets for map/list context
- full-screen pushed pages for creation, detail, legal, profile, and chat
- minimal cards with clear hierarchy, not decorative dashboard widgets
- short Korean product copy that explains the next useful action

This fits Hypofit's main use case: users repeatedly scan interview
opportunities, check reward/location/time, apply, and coordinate through chat.

## Mobile Navigation Rules

Bottom navigation should be used only for top-level destinations that users
need from anywhere.

Hypofit mobile bottom navigation target:

- `홈`
- `인터뷰`
- `지도`
- `채팅`
- `프로필`

Rules:

- Keep bottom navigation stable across primary app screens.
- Do not hide or reorder primary destinations contextually.
- Use 3 to 5 top-level items. More destinations should move into profile,
  settings, secondary menus, or page-level actions.
- Do not put one-off actions such as `모집글 만들기` directly in bottom
  navigation.
- Use single-word labels where possible.
- Keep icon and label close enough to read as one control.
- Maintain a minimum touch target near 44 CSS px / 48 dp even when the visual
  icon is smaller.
- Desktop should use side navigation or another desktop-specific structure
  instead of forcing mobile bottom navigation into wide layouts.

## Bottom Sheet Rules

Bottom sheets are appropriate for mobile map and contextual discovery screens.
They should not become a generic replacement for every page.

Use bottom sheets for:

- map context and nearby interview lists
- compact filter controls when they support the current screen
- lightweight contextual selection where the background remains useful

Prefer pushed pages or full-screen flows for:

- interview creation
- application forms
- legal content
- profile editing
- chat rooms
- long interview details

For the `지도` tab:

- Treat the map list as a persistent bottom sheet, not a modal dialog.
- Keep a collapsed state that clearly hints more content exists.
- Keep a mid state for quick scan of nearby rows.
- Keep an expanded state that nearly fills the screen and scrolls internally.
- When a marker is selected, collapse the list sheet and show one focused
  selected-interview card.
- Keep list and floating controls visually attached to the active sheet
  height.
- Avoid page-level scrolling on the map screen. The map view should feel fixed;
  only the sheet content should scroll when expanded.

## Installed-Web Fallback Rules

Installed PWAs behave differently from normal browser tabs. Design and QA must
check both when touching the web fallback. These rules do not replace the Expo
mobile app verification path for Google Play work.

Implementation rules:

- Use `dvh` or equivalent modern viewport handling for app-height screens.
- Consider `svh` for views that should avoid jumping when browser chrome
  changes, and `dvh` for app surfaces that should track the currently visible
  viewport.
- Use `env(safe-area-inset-*)` for content near notches, home indicators, and
  rounded corners.
- Keep critical controls out of unsafe areas.
- Ensure theme color and background color are deliberate because they affect
  status bars, splash/loading moments, and installed-app feel.
- Avoid accidental pull-to-refresh on fixed app surfaces such as map screens
  when drag gestures are used.
- Check browser mode and standalone mode separately.
- Use `@media (display-mode: standalone)` where installed-app behavior needs
  different spacing, install prompts, or back/navigation affordances.
- Respect `prefers-reduced-motion` for non-essential transitions.

## Responsive Strategy

Hypofit should not chase every breakpoint equally.

Primary targets:

- small phone: 360 x 740 class
- standard iPhone: 390 x 844 class
- large phone: 430 x 932 class
- desktop web: 1280 px and wider

Secondary fallback:

- 768 to 1023 px widths may reuse mobile or desktop fallback depending on the
  screen. Do not spend design polish here unless requested.

Rules:

- Mobile phone and desktop web may have different information architecture.
- Do not judge mobile task quality by iPad/tablet screenshots.
- Do not scale font size directly with viewport width.
- Use stable dimensions for navigation, sheets, map controls, markers, and
  fixed action areas.
- Use internal scroll areas for sheets and panels instead of allowing the whole
  app page to scroll unexpectedly.
- Prefer content density that supports fast scanning over oversized hero/card
  layouts.

## Touch And Accessibility Rules

Touch targets:

- Aim for 44 x 44 CSS px minimum on mobile controls.
- Android guidance commonly uses 48 x 48 dp.
- If the visual element is smaller, expand the clickable area with padding.
- Keep enough spacing between neighboring controls to avoid accidental taps.

Text and hierarchy:

- Use short labels and line-clamp long titles where needed.
- Put reward, distance, mode, and time in predictable positions.
- Avoid repeating the same idea inside and outside cards.
- Empty/loading/error states should state the situation first, then the next
  action if useful.

Motion:

- Use motion to explain state changes, not as decoration.
- Bottom sheet transitions should feel physically connected to drag/tap.
- Avoid long animations in repeated workflows.
- Provide reduced-motion fallback for larger transitions.

Input mode:

- Use `pointer: coarse/fine` and `hover: hover/none` when density or hover
  treatment genuinely depends on input type.
- Do not infer touch behavior from device names such as iPhone, iPad, or Mac.

## Visual Style Direction

Current 2025-2026 app UI direction is restrained rather than ornamental:

- calm neutral surfaces
- one clear brand accent
- subtle borders and shadows
- compact cards and rows
- less gradient-heavy decoration
- stateful controls with clear pressed/selected feedback
- practical micro-interactions
- high trust surfaces for profile, legal, report, and support

For Hypofit:

- Keep the product feeling like a trustworthy interview coordination app.
- Avoid overly playful marketplace styling.
- Avoid admin-dashboard density on mobile.
- Use rows where users compare many interviews.
- Use cards only when a single item needs richer context or actions.
- Preserve generous but efficient vertical rhythm.

## Trust And Store Readiness

Hypofit now uses the Expo mobile app as the native-store path. Web/PWA behavior
remains a fallback surface, and UI decisions should not make Google Play review,
Data safety, account deletion, permission, or moderation work harder.

Rules:

- Keep privacy policy, terms, support, and account deletion reachable from
  inside the app.
- Do not describe data usage differently in the app, privacy policy, store
  listing, or consent screens.
- If location permission is used, explain the user benefit before requesting it.
- If chat/report/no-show features exist, provide report and support paths that
  are easy to find.
- Keep account deletion and data deletion flows aligned with the Expo mobile
  app and public web deletion page.
- Avoid dark patterns around notification, location, or profile-image consent.

## Hypofit Screen Guidance

### Home

Home should quickly answer:

- What interviews are newly available?
- Is there anything I need to continue?
- Where should I go next?

Avoid duplicating notification content unless it directly improves the home
workflow.

### Interviews

The interview screen is for detailed search and comparison.

Rules:

- Keep filters compact.
- Keep rows lower than rich detail cards.
- Expand rows inline for preview details.
- Push to a detail page for full content and application actions.
- Keep `내 인터뷰` and `만들기` as page-level actions, not bottom navigation.

### Map

The map screen is for location-based discovery.

Rules:

- The map canvas should remain the primary background.
- Search, location, marker, list, and sheet controls should not fight for the
  same space.
- Bottom sheet states should be visually and spatially consistent.
- Marker selection should create one focused selected-interview card.
- The expanded sheet should cover nearly the full screen but keep the rounded
  top visible.

### Chat

Chat should feel like real messaging, not a status dashboard.

Rules:

- Main chat tab shows a minimal conversation list.
- Room view uses left/right message bubbles.
- Interview summary is collapsible.
- Interview detail can open from the room context.
- Status, report, and no-show handling should be available without dominating
  the conversation.

### Profile

Profile should focus on account, role, activity, trust, and support.

Rules:

- Keep profile identity and role clear.
- Include legal/support links.
- Keep logout at the bottom.
- Avoid abstract trust labels until backed by real records.

## QA Checklist

Before calling a mobile screen complete, check:

- iPhone SE-class viewport does not produce unintended page scroll.
- 390 x 844 viewport has no bottom nav, sheet, or card overlap.
- 430 x 932 viewport does not look overly sparse.
- Installed PWA standalone mode has correct safe-area handling.
- Browser mode remains usable.
- Android Chrome browser mode remains usable.
- Android installed PWA mode remains usable.
- Desktop browser and desktop installed PWA windows remain usable for desktop
  screens.
- One tablet-like width regression pass does not reveal catastrophic overlap,
  but tablet polish is not a primary target unless requested.
- Top-level navigation remains stable.
- Touch targets are large enough.
- Long Korean labels truncate or wrap intentionally.
- Bottom sheets and fixed controls do not cover primary actions.
- Reduced-motion users are not forced through unnecessary large motion.

## Decisions For Current Map Work

The current map work should follow these decisions:

- Do not optimize for iPad-specific UI.
- Keep the current task mobile-only unless the user asks for desktop map UI.
- Use a mobile persistent bottom sheet with three states.
- Use a separate selected marker card instead of a dimmed modal.
- Keep the map page itself fixed-height.
- Let the expanded sheet own its internal scroll.
- Keep the list button aligned to the current sheet state.
- Kakao Maps is now wired. Revisit marker clustering and label collision after
  production data density is high enough to reveal real overlap patterns.
