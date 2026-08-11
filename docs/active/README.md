# Active Work Documents

Status: active-index

Last updated: 2026-08-11

`docs/active/` contains only plans that still drive code, schema, deployment,
release assets, or product configuration work. Standards and deferred designs
belong in `docs/reference/`; implemented plans and QA history belong in
`docs/completed/`.

Current active implementation documents: 6.

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

## Web And Release Assets

- `desktop-web-service-ui-advancement-plan.md`: remaining authenticated desktop
  web implementation, shared controls, responsive behavior, state coverage, and
  release-quality validation under `/app`.
- `landing-page-and-store-creative-production-plan.md`: real product captures,
  App Store and Google Play screenshot exports, feature graphic production,
  responsive asset QA, and approved Figma review sync.
- `hypofit-brand-logo-icon-system-migration-plan.md`: remaining local platform
  build validation, launcher-mask and notification checks, cache/store asset
  verification, raster review sheets, and final Figma brand sync.

## Moved On 2026-08-08

Moved to `docs/completed/` because implementation is complete and only
historical or manual QA value remains:

- `authenticated-web-ui-ux-quality-remediation-plan.md`
- `public-support-and-authenticated-inquiry-experience-plan.md`
- `responsive-web-auth-entry-experience-plan.md`
- `web-navigation-motion-system-plan.md`

Removed from current docs on 2026-08-08 because social-login-only policy no
longer keeps a separate phone-auth or SENS backlog document.

## Moved On 2026-08-11

Moved to `docs/completed/` after Spring became the canonical `apps/api`, the
Lightsail cutover completed, and FastAPI/Alembic were retired:

- `fastapi-to-spring-boot-backend-migration-plan.md`
- `spring-single-runtime-gpu-to-lightsail-plan.md`

## Lifecycle Rule

Move a plan to `docs/completed/` when implementation is finished even if manual
release QA remains. Move it to `docs/reference/` when its remaining value is
guidance or deferred design. Reactivate work by creating or moving a focused
implementation plan back into this directory and updating this index,
`AGENTS.md`, and the relevant service breadcrumb.
