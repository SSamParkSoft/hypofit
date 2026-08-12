# Hypofit Brand Asset Set

Status: implementation-source

Last updated: 2026-08-12

## Identity

The current Hypofit mark is the `Fit Node`:

```text
founder form + real customer signal + respondent form
```

The two aligned forms communicate fit and connection. The amber center point is
the customer signal discovered through an interview. It is a brand accent, not
a payment, warning, success, or application-status color.

## Canonical Source

Production vector source:

```text
apps/web/public/brand/hypofit-mark.svg
```

Related source variants:

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

The generated Desktop PNG is retained only as the approved visual reference:

```text
docs/store-assets/brand/source/hypofit-fit-node-reference.png
```

Do not resize the reference PNG to create production assets. Use the vector
sources and export command.

## Colors

```text
Brand green   #176B5D
Strong green  #0F4F44
Warm white    #F7F5EF
Signal amber  #F5A623
Text          #1D2522
```

The Desktop reference uses a slightly different generated green and soft
shading. Those raster variations are not product tokens.

## Export

From the repository root:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm --dir apps/web brand:export
```

The command regenerates and validates:

- web mark and logo previews,
- favicon and ICO,
- PWA regular and maskable icons,
- Apple touch icon,
- mobile runtime marks,
- iOS/legacy app icon,
- Android adaptive foreground and monochrome icon,
- Android notification icon,
- native splash assets,
- Apple release-reference icon,
- Google Play listing icon,
- Kakao Developers 128 px service logo,
- Open Graph image.
- GitHub repository social preview image.

Validation covers dimensions, alpha expectations, the Google Play icon
file-size ceiling, and the Kakao service-logo 250 KB ceiling.

GitHub repository preview upload asset:

```text
docs/store-assets/brand/export/github/hypofit-repository-social-preview-1280x640.png
```

This image uses the approved Hypofit logo lockup on a `1280 x 640` opaque
canvas. Upload it through `Repository Settings -> General -> Social preview`.
GitHub does not currently expose a supported REST or GraphQL mutation for this
upload, so keeping the file in git and uploading it in repository settings are
two separate steps.

## Usage Rules

- Use `hypofit-mark.svg` on light product surfaces.
- Use `hypofit-mark-inverse.svg` on brand-green or dark surfaces.
- Use the square `icon.svg` only where an app icon container is intended.
- Keep `Hypofit` as live text in product headers when possible.
- Do not add rounded corners to iOS source artwork.
- Do not bake a launcher mask or shadow into Android adaptive foreground.
- Keep Android notification artwork monochrome.
- Do not use amber as a warning or payment state merely because it appears in
  the logo.

## Release Notes

- Native icon and splash changes require a new iOS/Android binary.
- Metro reload and OTA JavaScript updates cannot replace native icon resources.
- PWA icon updates require a service-worker cache version change and can still
  require home-screen reinstall on some devices.
- App Store Connect normally receives the iOS icon from the submitted binary.
- Google Play listing icon is uploaded separately and must match the launcher
  identity.
