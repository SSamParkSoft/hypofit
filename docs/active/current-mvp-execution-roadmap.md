# Current MVP Execution Roadmap

Status: active

Last updated: 2026-08-31

## Purpose

This document is the execution-order authority for remaining MVP work. Detailed
implementation belongs in the linked domain plans.

## Current Baseline

- [x] The canonical backend is Java 21 Spring Boot in `apps/api`.
- [x] Spring runs as one immutable Docker container on Lightsail behind Nginx
  and TLS at `https://hypofit-api.bukae.co.kr`.
- [x] Supabase remains the durable Postgres and Auth system.
- [x] GitHub Actions verifies, publishes, and deploys immutable API images.
- [x] The final legacy schema is captured as Flyway baseline `B0024`.
- [x] Public readiness, CORS, auth-boundary, provider configuration, email, and
  push-provider health checks pass.
- [x] iOS `1.0.0` is released.
- [ ] Android release and Google Play submission remain open.

### Local Implementation Checkpoint, 2026-08-28

The deployed baseline remains the Spring API and released clients described
above. The following survey work exists only in the current uncommitted local
checkout and is not evidence of a production release:

- Mobile post detail reads the authenticated participant's survey state,
  opens a supported external form in the system browser, and records an
  explicit participant submission declaration.
- The Spring survey-state read returns `204 No Content` for a participant with
  no existing state, so first-time browsing is not presented as an app error.
- Survey list/map actions route to detail rather than exposing an interview
  application flow. Beta-test detail keeps application/chat behavior while
  suppressing interview session controls.
- Targeted Spring survey tests and mobile TypeScript checks pass locally. The
  full Spring check still needs a Docker-capable environment for its
  Testcontainers migration test.

Survey and beta-test creation flags remain disabled. No API, mobile, web, or
store deployment occurred as part of this checkpoint.

## Execution Order

```text
P1 social-provider release smoke
  -> P2 Android and store submission
  -> P3 multi-format participant recruitment and web design adoption
  -> P4 store creative and brand verification
  -> P5 desktop web completion
  -> P6 optional AI summaries
```

## Cross-Cutting: Backend Maintainability Hardening

Follow `spring-mvc-maintainability-hardening-plan.md` before the next material
change to chat workflow, session lifecycle, account deletion, or a new
recruitment type. This is behavior-preserving maintenance, not a release-track
reordering: it must not delay P1/P2 release smoke, and its extractions should
be scheduled alongside the first matching feature change.

## Cross-Cutting: Production Reliability And Posting Creation

Follow `production-reliability-and-posting-create-stabilization-plan.md` before
enabling new recruitment-type writes or relying on mobile posting creation in a
release. Its immediate sequence is:

```text
authenticated deployment smoke
  -> bounded JWKS timeout/error semantics
  -> idempotent post creation
  -> draft/API compatibility and release observability
```

This is not a reason to replace the current Spring modular monolith, Supabase
Auth, or Lightsail runtime. It should run in parallel with P1/P2 where it does
not touch their release surface, and it is a prerequisite for P3 creation
enablement.

## P1: Social Authentication Release Smoke

Follow `cross-platform-social-login-authentication-plan.md`.

- [ ] Verify Apple, Google, Kakao, and Naver dashboard configuration and exact
  production/native redirects.
- [ ] Verify each enabled provider in real web and release mobile flows.
- [ ] Verify the authenticated founder/respondent MVP loop with real social
  sessions.
- [ ] Verify identity linking, unlink protection, logout, deletion revocation,
  and clean re-registration.
- [x] Render the approved platform provider registry immediately and reject an
  unavailable provider at server-owned attempt creation.

Exit gate: every visible provider completes callback, Supabase session, API
completion, profile synchronization, logout, and repeat login.

## P2: Android And Google Play

- [x] Complete the Play Console app-content forms, including reviewer access,
  Data safety, content rating, account creation/deletion declarations, and
  store-listing setup. This is user-confirmed as of 2026-08-12; final answers
  must still be reconciled with the uploaded AAB manifest and SDK inventory.
- [x] Prepare the Google reviewer account and reviewer-only deterministic
  fixture while keeping non-review synthetic posts hidden from public users.
- [ ] Run Android release-signed smoke on a real device or production-equivalent
  emulator build.
- [ ] Verify map, location, push permission/delivery/tap routing, social auth,
  account deletion, support, report, block, legal links, and startup recovery.
- [ ] Build the final `.aab`, inspect manifest/SDK/permissions, and upload to
  Play Console internal testing.
- [ ] Confirm on the Play Console Dashboard whether this developer account is
  subject to the new-personal-account production-access gate.
- [ ] If the gate applies, run a closed test with at least 12 continuously
  opted-in testers for 14 consecutive days, retain real feedback/change notes,
  and apply for production access.

Exit gate: the internal-track build completes the MVP loop without a release
blocker, and any account-specific closed-testing production gate is satisfied.

## P3: Multi-Format Participant Recruitment And Web Design Adoption

Follow `multi-format-participant-recruitment-and-web-template-adoption-plan.md`.
For the public landing implementation slice, also follow
`brainwave-inspired-landing-visual-reconstruction-plan.md`.
For the Expo mobile visual and vocabulary implementation slice, also follow
`mobile-calm-emerald-native-redesign-plan.md`.

- [x] Remove founder/respondent role selection and role-based customer
  authorization while preserving released-client API compatibility.
- [x] Derive post, participation, chat, and session permissions from ownership
  and workflow membership.
- [x] Add separate interview, survey, and beta-test backend contracts with
  type-specific participation lifecycles. Production creation remains disabled
  until the matching clients ship.
- [x] Protect iOS `1.0.0` and other unsupported clients from discovering or
  misinterpreting survey and beta-test posts.
- [ ] Adapt approved, license-audited free web UI blocks without replacing the
  existing React architecture or Hypofit design system.
- [ ] Reconstruct the public landing with Hypofit-owned copy, real product
  evidence, responsive composition, and product-approved pricing data.
- [ ] Update web/mobile UI, legal disclosures, store declarations, and
  moderation boundaries before production enablement.

Implementation checkpoint, 2026-08-21:

- [x] Remove Spring customer role gates from interview-post, application, and
  session workflows while retaining ownership, membership, account-state, and
  released-contract checks.
- [x] Add the `recruitment_type` compatibility discriminator, safe interview
  default, shared contract propagation, and capability-aware list/detail
  protection.
- [x] Make current web/mobile interview-post clients advertise
  `recruitment-types-v1` without adding the header to unrelated API calls.
- [x] Normalize new and synchronized profiles to compatibility role `both`,
  replace role selection with legal consent, and remove role settings and
  role-gated create/manage UI from web and mobile.
- [x] Add type-specific fields, survey participation, beta application/chat
  behavior, and interview-only workflow isolation behind default-off server
  enablement flags.
- [ ] Complete capability-aware web/mobile creation and remaining participation
  UI, then enable survey and beta-test writes independently after release
  validation. Mobile survey consumption is implemented locally only; it is not
  an enablement decision.

Exit gate: one account can create and participate without selecting a role,
ordinary interview regressions pass, supported clients complete survey and
beta-test recruitment flows, and the web uses approved licensed patterns.

## P4: Store Creative And Brand

Follow `landing-page-and-store-creative-production-plan.md` and
`hypofit-brand-logo-icon-system-migration-plan.md`.

- [ ] Capture approved real product states with reviewer-safe data.
- [ ] Export required App Store/Google Play screenshots and feature graphic.
- [ ] Verify app icon, adaptive icon, notification icon, splash, favicon, and
  store artwork consistency.

## P5: Desktop Web

Follow `desktop-web-service-ui-advancement-plan.md`.

- [ ] Complete remaining authenticated desktop workflows and responsive states.
- [ ] Run typecheck, lint/architecture boundaries, tests, coverage, production
  build, bundle budget, and browser smoke.
- [ ] Deploy Vercel only on an explicit web deployment request.

## P6: Optional AI Summaries

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
