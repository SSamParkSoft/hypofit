# Hypofit Brand Asset Notes

Status: reference

Last updated: 2026-07-29

## Brand Meaning

The current Hypofit mark is the `Fit Node`.

```text
founder form + real customer signal + respondent form
```

The two mirrored side forms represent the founder and the target customer. The
center amber node represents the real customer signal discovered through an
interview. The silhouette also reads as a restrained `H`, but the primary
meaning is connection and fit, not a lettermark for its own sake.

Do not reinterpret the amber node as a payment, warning, success, or
application-status color. In product use, it stays a brand accent.

## Canonical Sources

Runtime source of truth:

```text
apps/web/public/brand/hypofit-mark.svg
```

Derived vector sources:

```text
apps/web/public/brand/hypofit-logo.svg
apps/web/public/brand/hypofit-mark-small.svg
apps/web/public/brand/hypofit-mark-inverse.svg
apps/web/public/brand/hypofit-mark-mono.svg
apps/web/public/brand/hypofit-app-foreground.svg
apps/web/public/brand/hypofit-app-monochrome.svg
apps/web/public/icons/icon.svg
apps/web/public/icons/icon-maskable.svg
apps/web/public/icons/favicon.svg
```

Approved raster reference only:

```text
docs/store-assets/brand/source/hypofit-fit-node-reference.png
```

Do not resize the approved PNG to create production assets. Exports should come
from the SVG sources above.

## Canonical Colors

```text
Brand green   #176B5D
Strong green  #0F4F44
Warm white    #F7F5EF
Signal amber  #F5A623
Text          #1D2522
```

The image-model reference used a slightly different teal and soft shading. The
implemented product tokens remain the values above.

## Export Command

From the repository root:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm --dir apps/web brand:export
```

Source:

```text
apps/web/scripts/export-brand-assets.mjs
```

The export script regenerates and validates:

- mark and logo previews,
- favicon PNGs and ICO,
- regular and maskable PWA icons,
- Apple touch icon,
- native mobile icon assets,
- Android adaptive foreground and monochrome assets,
- Android notification icon,
- native splash assets,
- App Store icon export,
- Google Play icon export,
- Open Graph image.

Validation currently checks dimensions, alpha expectations, and the Google Play
listing icon file-size ceiling.

## Current Web Asset Set

Public brand vectors:

```text
apps/web/public/brand/hypofit-mark.svg
apps/web/public/brand/hypofit-logo.svg
apps/web/public/brand/hypofit-mark-small.svg
apps/web/public/brand/hypofit-mark-inverse.svg
apps/web/public/brand/hypofit-mark-mono.svg
apps/web/public/brand/hypofit-app-foreground.svg
apps/web/public/brand/hypofit-app-monochrome.svg
```

Generated web/public outputs:

```text
apps/web/public/brand/hypofit-mark-preview.png
apps/web/public/brand/hypofit-logo-preview.png
apps/web/public/brand/hypofit-social-1200x630.png
apps/web/public/icons/favicon.svg
apps/web/public/icons/favicon-16.png
apps/web/public/icons/favicon-32.png
apps/web/public/icons/favicon.ico
apps/web/public/icons/apple-touch-icon.png
apps/web/public/icons/icon.svg
apps/web/public/icons/icon-192.png
apps/web/public/icons/icon-512.png
apps/web/public/icons/icon-maskable.svg
apps/web/public/icons/icon-maskable-192.png
apps/web/public/icons/icon-maskable-512.png
```

## Current Mobile Asset Set

Generated native assets:

```text
apps/mobile/assets/icon.png
apps/mobile/assets/adaptive-icon.png
apps/mobile/assets/adaptive-icon-monochrome.png
apps/mobile/assets/notification-icon.png
apps/mobile/assets/hypofit-mark.png
apps/mobile/assets/hypofit-mark-inverse.png
apps/mobile/assets/splash-static.png
apps/mobile/assets/splash.png
```

Mobile config integration:

- `apps/mobile/app.config.ts`
  - top-level `icon` -> `./assets/icon.png`
  - `android.adaptiveIcon.foregroundImage` ->
    `./assets/adaptive-icon.png`
  - `android.adaptiveIcon.monochromeImage` ->
    `./assets/adaptive-icon-monochrome.png`
  - `expo-notifications` icon -> `./assets/notification-icon.png`
  - `expo-splash-screen` image -> `./assets/splash-static.png`
  - splash background -> `#176B5D`

Notes:

- `adaptive-icon-monochrome.png` is the Android themed-icon layer.
- `notification-icon.png` is the Android status-bar / notification alpha glyph.
- `splash-static.png` is the native splash plugin source.
- `hypofit-mark.png` and `hypofit-mark-inverse.png` are runtime screen assets
  used by the RN UI.

## Store Export Outputs

Current generated store exports:

```text
docs/store-assets/brand/export/apple/hypofit-app-icon-1024.png
docs/store-assets/brand/export/google-play/hypofit-play-icon-512.png
docs/store-assets/brand/export/social/hypofit-social-1200x630.png
```

These files are export artifacts, not the canonical source.

## Web Integration Notes

- `apps/web/index.html` now points at:
  - `/icons/favicon.ico`
  - `/icons/favicon.svg`
  - `/icons/apple-touch-icon.png`
  - `/manifest.webmanifest`
- Open Graph uses:
  - `https://hypofit.bukae.co.kr/brand/hypofit-social-1200x630.png`
- `apps/web/public/manifest.webmanifest` separates regular icons and maskable
  icons.
- `apps/web/public/service-worker.js` is on cache namespace
  `hypofit-shell-v2` and precaches the new shell brand assets:
  - `/icons/favicon.ico`
  - `/icons/apple-touch-icon.png`
  - `/icons/icon.svg`
  - `/icons/icon-512.png`
  - `/brand/hypofit-mark.svg`
  - `/brand/hypofit-mark-inverse.svg`

## Cache And Release Notes

- PWA icon changes can still remain cached by browsers or OS home-screen
  launchers even after the service-worker namespace changes.
- Native icon and splash changes require a new iOS/Android binary.
- Metro reload or OTA JavaScript updates do not replace native launcher icons
  or native splash resources.
- App Store Connect usually reflects the iOS app icon from the uploaded binary.
- Google Play listing icon is a separate upload and should match the launcher
  identity.

## Remaining Validation

The implemented asset system exists in source and generated outputs. These
checks are still tracked in the active migration plan:

- local native build and real-device verification,
- Android launcher-mask and real notification QA,
- installed PWA update-behavior QA,
- store-binary comparison,
- final Figma sync.
