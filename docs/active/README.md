# Active Work Documents

Status: active-index

Last updated: 2026-09-03

`docs/active/` contains only plans that still drive code, schema, deployment,
release assets, or product configuration work. Standards and deferred designs
belong in `docs/reference/`; implemented plans and QA history belong in
`docs/completed/`.

Current active implementation documents: 19.

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
- `modular-monolith-workflow-integrity-plan.md`: capacity-safe applicant
  selection, executable workflow transitions, transactional notification/push
  durability, and enforceable feature-module boundaries. It extends rather
  than replaces the reliability and Spring MVC maintainability plans.
- `adaptive-posting-creation-contract-and-flow-plan.md`: the type-aware mobile
  create-flow contract, data-loss prevention, server-owned creation capability,
  field-level validation, draft v2 migration, and type-by-type enablement.
- `posting-detail-decision-experience-plan.md`: the mobile decision-first
  detail hierarchy, state-aware participation context, organizer trust rules,
  summary/data boundaries, responsive detail QA, and deferred media/map/share
  capability gates.

## Product Model

- `multi-format-participant-recruitment-and-web-template-adoption-plan.md`:
  roleless ownership-based access, interview/survey/beta-test recruitment,
  type-specific workflows, released-client compatibility, and licensed free
  web-template pattern adoption.
- `mobile-calm-emerald-native-redesign-plan.md`: the Expo phone UI migration to
  Calm Emerald Native, including capability-aware survey consumption that is
  implemented locally but not yet deployed or release-smoked.
- `mobile-map-search-correctness-and-scalability-plan.md`: evidence-led Expo
  map search verification and bounded hardening. It preserves the current
  explicit-area-search UX and center-plus-radius MVP query until measured scale
  justifies a compatible bbox follow-up.
- `chat-tab-unread-badge-plan.md`: existing-chat-state-backed mobile bottom-tab
  unread-room badge, accessibility, cache refresh, and focused QA. It excludes
  launcher icon badges and changes to chat delivery semantics.
- `service-maintenance-and-degraded-operation-plan.md`: edge-owned full
  maintenance safety, public status contract, Expo maintenance recovery, and
  the deferred Spring read-only/feature maintenance path. It keeps ordinary
  deployments and generic outage handling separate from maintenance.
- `admin-notice-and-service-operations-plan.md`: minimum DB-backed Admin
  authorization, canonical notices, scheduled full-maintenance lifecycle,
  public operation status, mobile notices/banner/gate integration, audit usage,
  and the explicit Nginx hard-maintenance fallback boundary. It implements the
  application-operation layer without making Admin an infrastructure control
  plane.

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
