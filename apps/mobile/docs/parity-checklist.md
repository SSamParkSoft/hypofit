# Mobile Web To React Native Parity Checklist

Status: draft

This checklist maps the approved mobile web visual language into `apps/mobile`.
Use it before claiming font, icon, or brand parity.

## Known Inputs

- Mobile font source:
  - Desktop font folder: `SpoqaHanSansNeo_all/SpoqaHanSansNeo_TTF_original/`
  - `apps/mobile/assets/fonts/SpoqaHanSansNeo-Regular.ttf`
  - `apps/mobile/assets/fonts/SpoqaHanSansNeo-Medium.ttf`
  - `apps/mobile/assets/fonts/SpoqaHanSansNeo-Bold.ttf`
- Web brand source:
  - `apps/web/public/brand/hypofit-logo.svg`
  - `apps/web/public/brand/hypofit-mark.svg`
  - `apps/web/public/brand/hypofit-mark-inverse.svg`
  - `apps/web/public/brand/hypofit-mark-mono.svg`
  - `apps/web/public/brand/hypofit-app-foreground.svg`
  - `apps/web/public/brand/hypofit-app-monochrome.svg`
  - `apps/web/public/icons/icon.svg`
  - `apps/web/public/icons/icon-maskable.svg`
  - `apps/web/public/icons/favicon.svg`
  - `apps/web/scripts/export-brand-assets.mjs`
- Mobile assets currently present:
  - `apps/mobile/assets/icon.png`
  - `apps/mobile/assets/adaptive-icon.png`
  - `apps/mobile/assets/adaptive-icon-monochrome.png`
  - `apps/mobile/assets/notification-icon.png`
  - `apps/mobile/assets/hypofit-mark.png`
  - `apps/mobile/assets/hypofit-mark-inverse.png`
  - `apps/mobile/assets/splash-static.png`
  - `apps/mobile/assets/splash.png`
- Mobile implementation surface to update:
  - `apps/mobile/app.config.ts`
  - `apps/mobile/tailwind.config.js`
  - `apps/mobile/src/shared/theme/tokens.ts`
  - `apps/mobile/src/shared/ui/AppScreen.tsx`
  - `apps/mobile/src/shared/ui/ScreenPlaceholder.tsx`
- Direct native font/icon packages must be declared in `apps/mobile/package.json`
  when mobile code imports them directly.
- `expo-font` and `@expo/vector-icons` are declared because the current mobile
  implementation loads native fonts and renders Feather icons directly.

## Parity Gate

Do not claim a mobile screen is migrated just because the route renders.

For every migrated screen, compare it against the approved phone-sized web UI,
not against the desktop web UI:

- information architecture: same primary task and same screen order
- copy: same Korean product meaning, with native wording changes only when they
  make the action clearer
- hierarchy: same first-visible content, row density, and CTA priority
- state coverage: loading, empty, error, applied, selected, rejected,
  completed, blocked/reported where applicable
- safe area: status bar, notch, bottom tab bar, home indicator, keyboard, and
  modal/bottom-sheet edges do not collide
- store-readiness: account deletion, report/block, support, legal, and
  permission flows remain reachable
- platform fit: use native navigation, gestures, text input, maps, and
  permissions instead of DOM or WebView assumptions

If a native screen intentionally differs from the phone-sized web UI, record the
reason in the active migration plan before closing the work.

## Parity Checklist

- [x] Load Hypofit Sans natively
  - `expo-font` is declared in `apps/mobile/package.json`.
  - The three Spoqa Han Sans Neo original TTF files are copied into `apps/mobile/assets/fonts/`.
  - Original TTF files are intentional because chat, support, reports, and
    profile text can contain unpredictable user-generated characters.
  - `apps/mobile/app/_layout.tsx` loads `HypofitSansRegular`, `HypofitSansMedium`, and `HypofitSansBold` before rendering the app.
  - `apps/mobile/tailwind.config.js` and `apps/mobile/src/shared/theme/tokens.ts` no longer use `System` as the intended app font family.
  - Follow-up: replace important `font-bold`/`font-black` visual states with explicit mobile font-family usage where NativeWind weight mapping is not enough.

- [ ] Make icon strategy explicit
  - Current native icon path is `@expo/vector-icons` with Feather across tabs,
    search, notification, status, report, mute, send, and menu actions.
  - Keep that as the single default icon system unless a documented mobile plan
    intentionally changes it.
  - Replace the remaining text glyphs such as `‹` and `›` with icon components.
  - Keep icon size and stroke weight consistent across tab bars, headers, buttons, and badges.

- [x] Regenerate brand assets from one source
  - `apps/web/public/brand/hypofit-mark.svg` is the canonical runtime source,
    with supporting SVG variants beside it.
  - `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web brand:export`
    regenerates the mobile brand outputs.
  - The current generated mobile asset family includes:
    - `apps/mobile/assets/icon.png`
    - `apps/mobile/assets/adaptive-icon.png`
    - `apps/mobile/assets/adaptive-icon-monochrome.png`
    - `apps/mobile/assets/notification-icon.png`
    - `apps/mobile/assets/hypofit-mark.png`
    - `apps/mobile/assets/hypofit-mark-inverse.png`
    - `apps/mobile/assets/splash-static.png`
    - `apps/mobile/assets/splash.png`
  - `apps/mobile/app.config.ts` now points at the exported icon, adaptive,
    monochrome, notification, and splash assets.
  - Auth and splash screens render exported Fit Node runtime marks instead of a
    placeholder letter logo.
  - Profile fallback uses a generic avatar icon rather than a placeholder `H`.

- [x] Align mobile colors to the web theme
  - `apps/mobile/tailwind.config.js` and `apps/mobile/src/shared/theme/tokens.ts` are synced to the mobile web theme values from `apps/web/src/styles.css`.
  - Current web values:
    - background `#f7f5ef`
    - surface `#ffffff`
    - surface-muted `#f1eee6`
    - border `#dedbd2`
    - text `#1d2522`
    - text-muted `#66706b`
    - text-soft `#69716c`
    - brand `#176b5d`
    - brand-strong `#0f4f44`
    - brand-soft `#e7f1ee`
    - danger `#b91c1c`
    - danger-soft `#fef2f2`
  - If mobile keeps a different palette, document that as an intentional platform choice in this file.

- [ ] Verify parity on the right screens
  - Splash
  - Login
  - Sign-up account
  - Sign-up role
  - Email confirmation
  - Tabs
  - Profile card
  - Primary and secondary buttons
  - Empty states
  - Status badges

- [ ] Keep future native variants explicit
  - If a screen needs a different font or icon treatment, record the reason here before shipping.
  - Do not let a screen ship with an accidental token mismatch.

## High-Risk Decisions

- Whether mobile should load the exact web font family or a native substitute.
- Whether the remaining back/chevron text glyphs should be normalized into the
  chosen Feather-based icon path before the next broader mobile UI pass.
- Whether mobile brand assets should remain generated PNG exports only or also
  keep mirrored SVG source files under `apps/mobile`.
- Whether the mobile palette should match web exactly or intentionally diverge on any hue.
