# Active Work Documents

Status: active-index

Last updated: 2026-08-31

`docs/active/` contains only plans that still drive code, schema, deployment,
release assets, or product configuration work. Standards and deferred designs
belong in `docs/reference/`; implemented plans and QA history belong in
`docs/completed/`.

Current active implementation documents: 11.

## Execution Order

- `current-mvp-execution-roadmap.md`: top-level priority, dependency, exit-gate,
  and immediate-next-session authority for the remaining MVP work. It
  orchestrates the domain plans below without replacing their implementation
  details.

## AI-Assisted Product Features

- `ai-interview-and-applicant-summary-plan.md`: source-grounded interview and
  founder-only applicant summaries, asynchronous database-backed generation,
  structured-output contracts, privacy and human-decision boundaries,
  Spring implementation timing, evaluation, rollout, and kill-switch requirements.
  This plan does not authorize AI matching, ranking, scoring, or automatic
  application decisions.

## Authentication

- `cross-platform-social-login-authentication-plan.md`: Apple, Google, Kakao,
  and Naver provider rollout, interactive E2E verification, identity linking,
  unlink/revocation behavior, provider rollback, reviewer/internal-tester
  guidance, and the current distinction between provider contact email and the
  dedicated account-deletion email OTP confirmation flow. This is the single
  current authentication authority.

## Backend Maintainability

- `spring-mvc-maintainability-hardening-plan.md`: focused, behavior-preserving
  extraction of observed session, chat and account-deletion responsibility
  hotspots. It preserves feature-first Spring MVC and explicitly rejects a
  DDD/hexagonal rewrite or line-count-driven splitting.
- `production-reliability-and-posting-create-stabilization-plan.md`: deployment
  authentication smoke, bounded Supabase JWKS verification, idempotent posting
  creation, mobile/API compatibility, release observability, and constrained
  Lightsail capacity hardening. It preserves the current modular monolith.

## Product Model

- `multi-format-participant-recruitment-and-web-template-adoption-plan.md`:
  roleless ownership-based access, interview/survey/beta-test recruitment,
  type-specific workflows, released-client compatibility, and licensed free
  web-template pattern adoption.
- `mobile-calm-emerald-native-redesign-plan.md`: the Expo phone UI migration to
  Calm Emerald Native, including capability-aware survey consumption that is
  implemented locally but not yet deployed or release-smoked.

## Web And Release Assets

- `brainwave-inspired-landing-visual-reconstruction-plan.md`: focused public
  `/` and `/landing` visual reconstruction using the Brainwave Figma/Vite
  source as a licensed composition reference, with Hypofit-owned copy, product
  evidence, brand translation, responsive branches, pricing, and release QA.
- `desktop-web-service-ui-advancement-plan.md`: remaining authenticated desktop
  web implementation, shared controls, phone/compact/desktop responsive
  hardening, state coverage, and release-quality validation under `/app`.
- `landing-page-and-store-creative-production-plan.md`: real product captures,
  App Store and Google Play screenshot exports, feature graphic production,
  and responsive asset QA.
- `hypofit-brand-logo-icon-system-migration-plan.md`: remaining local platform
  build validation, launcher-mask and notification checks, cache/store asset
  verification, and raster review sheets.

## Lifecycle Rule

Move a plan to `docs/completed/` when implementation is finished even if manual
release QA remains. Move it to `docs/reference/` when its remaining value is
guidance or deferred design. Reactivate work by creating or moving a focused
implementation plan back into this directory and updating this index,
`AGENTS.md`, and the relevant service breadcrumb.
