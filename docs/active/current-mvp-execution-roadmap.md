# Current MVP Execution Roadmap

Status: active

Last updated: 2026-08-11

## Purpose

This document is the execution-order authority for remaining MVP work. Detailed
implementation belongs in the linked domain plans.

## Current Baseline

- [x] The canonical backend is Java 21 Spring Boot in `apps/api`.
- [x] FastAPI source and Alembic migration authority are retired.
- [x] Spring runs as one immutable Docker container on Lightsail behind Nginx
  and TLS at `https://hypofit-api.bukae.co.kr`.
- [x] Supabase remains the durable Postgres and Auth system.
- [x] GitHub Actions verifies, publishes, and deploys immutable API images.
- [x] The final legacy schema is captured as Flyway baseline `B0024`.
- [x] Public readiness, CORS, auth-boundary, provider configuration, email, and
  push-provider health checks pass.
- [x] iOS `1.0.0` is released.
- [ ] Android release and Google Play submission remain open.

## Execution Order

```text
P0 Spring/Flyway repository closure
  -> P1 social-provider release smoke
  -> P2 Android and store submission
  -> P3 store creative and brand verification
  -> P4 desktop web completion
  -> P5 optional AI summaries
```

## P0: Spring And Flyway Closure

- [x] Promote Spring to canonical `apps/api`.
- [x] Remove the executable FastAPI and Alembic trees.
- [x] Convert PostgreSQL integration tests to Flyway-only setup.
- [x] Rename API CI/CD and root commands to canonical paths.
- [x] Remove retired GPU/FastAPI deployment units.
- [x] Move backend transition plans to `docs/completed/`.
- [x] Register the existing empty production schema at Flyway baseline version
  `24`, enable Flyway, then return `baseline-on-migrate` to `false`.
- [x] Run the complete Gradle gate.
- [x] Commit, push, and deploy the canonical image.
- [x] Verify canonical readiness, migration history, restart count, logs, and
  memory after deploying commit `a41743b` as immutable digest
  `sha256:107ec09e277c0b0424c9c9a133639f0353753331981c05eb91d6a39af7958e57`.
- [ ] Verify the authenticated founder/respondent MVP smoke with real social
  sessions.

Exit gate: production boots with Flyway enabled, one healthy Spring runtime,
and no executable FastAPI/Alembic dependency.

## P1: Social Authentication Release Smoke

Follow `cross-platform-social-login-authentication-plan.md`.

- [ ] Verify Apple, Google, Kakao, and Naver dashboard configuration and exact
  production/native redirects.
- [ ] Verify each enabled provider in real web and release mobile flows.
- [ ] Verify identity linking, unlink protection, logout, deletion revocation,
  and clean re-registration.
- [ ] Keep providers hidden when capability or dashboard configuration is not
  ready.

Exit gate: every visible provider completes callback, Supabase session, API
completion, profile synchronization, logout, and repeat login.

## P2: Android And Google Play

- [ ] Run Android release-signed smoke on a real device or production-equivalent
  emulator build.
- [ ] Verify map, location, push permission/delivery/tap routing, social auth,
  account deletion, support, report, block, legal links, and startup recovery.
- [ ] Build the final `.aab`, inspect manifest/SDK/permissions, and upload to
  Play Console internal testing.
- [ ] Complete Data safety, reviewer access, support/privacy/deletion URLs,
  content rating, and store metadata.

Exit gate: internal-track build installs and completes the MVP loop without a
release blocker.

## P3: Store Creative And Brand

Follow `landing-page-and-store-creative-production-plan.md` and
`hypofit-brand-logo-icon-system-migration-plan.md`.

- [ ] Capture approved real product states with reviewer-safe data.
- [ ] Export required App Store/Google Play screenshots and feature graphic.
- [ ] Verify app icon, adaptive icon, notification icon, splash, favicon, and
  store artwork consistency.
- [ ] Sync final approved assets to Figma only when requested.

## P4: Desktop Web

Follow `desktop-web-service-ui-advancement-plan.md`.

- [ ] Complete remaining authenticated desktop workflows and responsive states.
- [ ] Run typecheck, lint/architecture boundaries, tests, coverage, production
  build, bundle budget, and browser smoke.
- [ ] Deploy Vercel only on an explicit web deployment request.

## P5: Optional AI Summaries

Follow `ai-interview-and-applicant-summary-plan.md`.

- [ ] Select and approve a provider, region, retention policy, and cost limit.
- [ ] Implement one Spring-owned asynchronous generation worker and evaluation
  gate.
- [ ] Add source-grounded interview and founder-only applicant summary UI.
- [ ] Update privacy/store declarations before enabling production generation.

AI output remains optional reading assistance and must never rank, score,
select, or reject applicants.

## Closure Rule

Move a domain plan to `docs/completed/` when its code/configuration work is
implemented and automated checks pass. Manual release QA alone does not keep an
implementation plan active; record it in the appropriate release checklist.
