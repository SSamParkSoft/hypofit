# Reference Documents

Status: reference

Last updated: 2026-08-08

This directory contains standards, design references, architecture decisions,
and review-readiness background material. These documents guide work, but they
are not the current task backlog.

Use `docs/active/` for work that still needs implementation.
Move documents here when the remaining value is guidance, not execution.

## Current Reference Documents

### `lightsail-spring-deployment-runbook.md`

Current GitHub Actions, GHCR, dedicated SSH key, host-secret, deployment,
readiness, rollback, Nginx/TLS, and disk-operation procedure for the single
Spring runtime on Lightsail.

### `app-store-play-store-review-readiness.md`

Broad native store review reference for Apple App Store and Google Play.

For Android-first launch guidance, use
`docs/reference/google-play-first-launch-readiness-plan.md`.

Use the `ios-store-readiness/` documents when iOS release, TestFlight, App
Store Connect, App Privacy, metadata, screenshots, or local IPA upload work is
requested. They are reference material, not the active implementation backlog.

### `native-store-submission-readiness-plan.md`

iOS App Store and Google Play release checklist for build freeze, real-device
smoke, reviewer access, screenshots, App Privacy/Data safety, store metadata,
and review-week operations. This is reference/release checklist material, not
the active implementation backlog.

### `store-review-readiness-audit-2026-06-22.md`

Current Apple App Store and Google Play review-readiness audit for the shipped
mobile app, public legal pages, account deletion, UGC report/block,
permissions, reviewer account data, privacy labels, Data safety, and final
submission blockers.

### `ios-store-readiness/`

Apple App Store and TestFlight readiness material.

This folder preserves the Apple Developer account, App Store Connect,
TestFlight, App Privacy label, metadata, screenshots, and review-assets plans.
Use these docs for iOS release work, but keep implementation backlog in
`docs/active/` only when code or deployment work remains.
These documents are reference guidance, not the active backlog by themselves.

### `api-operations-readiness-implementation-history.md`

FastAPI endpoint inventory, implementation notes, verification history, and
backend launch-readiness context. The active closeout checklist lives in
`docs/completed/api-operations-readiness-plan.md`.

### `api-bluegreen-deployment-runbook.md`

GPU FastAPI and EC2 Nginx blue/green deployment runbook. Use this before
changing API deployment scripts, systemd API services, reverse SSH tunnel
services, Nginx upstream switching, deployment state files, or DB migration
rules for zero-downtime API releases.

### `code-qa-remediation-plan.md`

Historical 2026-06-15 QA baseline and findings. The active implementation-only
backlog extracted from this QA pass lives in
`docs/completed/code-remediation-implementation-plan.md`.

### `contracts-coverage-inventory.md`

Current inventory of FastAPI schema surfaces covered by shared TypeScript
contracts in `packages/contracts`, plus the remaining client-adoption gap.

### `legal-pages-implementation-history.md`

Terms, privacy policy, support page, and account-deletion copy history. The
active launch closeout checklist lives in
`docs/completed/legal-pages-implementation-plan.md`.

### `error-observability-contract.md`

FastAPI error envelope, request ID propagation, mobile `ApiError` and
`NetworkError` behavior, auth error normalization, and Sentry redaction rules.

### `email-verification-resend-mvp-plan.md`

Supabase/Resend link-confirmation bridge history and fallback reference.
Signup verification is now tracked by
`docs/completed/email-otp-verification-transition-plan.md`.

### `google-play-data-safety-worksheet.md`

Google Play Data safety worksheet and privacy declaration reference. Use this
when data collection, SDKs, permissions, push, location, support/report,
profile image, analytics, crash reporting, or payment behavior changes.

### `google-play-first-launch-readiness-plan.md`

Android-first Google Play launch readiness reference. Use this for Play Console
requirements, reviewer/demo access, Data safety, account deletion, store
listing, AAB/internal testing, and submission sequencing.

### `kakao-native-map-upgrade-plan.md`

Decision record for deferring Kakao Native Map SDK and using the current MVP map
path first.

### `logo-favicon-brand-assets.md`

Brand asset notes for the Hypofit logo, favicon, and app icon direction.

### `location-permission-geocoding-radius-plan.md`

Current location, geocoding, Kakao place search, current-location permission,
stored coordinate, and radius-search behavior reference.

### `mobile-auth-failure-observability-hardening-plan.md`

Mobile auth error classification, preflight, Supabase Auth normalization,
Sentry-safe telemetry, and release-build auth debugging reference.

### `mobile-list-card-surface-system-plan.md`

Mobile list/card surface guidance for deciding when to use rows, cards, forms,
and selected decision panels.

### `mobile-pwa-responsive-design-trends.md`

Mobile app, installed-web fallback, responsive behavior, bottom navigation,
bottom sheet, touch target, and motion reference.

### `mobile-safe-area-viewport-hardening-plan.md`

Safe-area, viewport, fixed overlay, keyboard-safe layout, and canonical viewport
QA reference.

### `mobile-local-build-runbook.md`

Expo/Metro local server, Watchman troubleshooting, Node 20 runtime, local iOS
IPA build, local Android AAB build, TestFlight upload, and artifact cleanup
runbook for `apps/mobile`.

### `navigation-home-chat-ia-plan.md`

Current mobile information architecture reference for home, interview,
map, chat, and profile surfaces.

### `operator-support-moderation-runbook.md`

MVP operator runbook for support tickets, reports, moderation actions, public
account-deletion requests, audit-event inspection, and GPU API log/health
checks.

### `support-report-flow-plan.md`

Support/report implementation history and operations-readiness reference for
inquiry/report flows, account deletion requests, support email, and reviewer
path expectations.

### `ui-final-qa-checklist.md`

Final UI/UX QA checklist reference. Use it before release or UI signoff, but do
not treat it as active implementation backlog.

### `react-web-to-expo-mobile-migration-plan.md`

Decision and migration-history reference for splitting the React web app and
Expo React Native mobile app.
