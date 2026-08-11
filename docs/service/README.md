# Hypofit Service Knowledge Base

Status: service-source-of-truth

Last updated: 2026-08-08

This directory is the first place an agent should read to understand what
Hypofit is, where the code lives, what the product is trying to prove, and how
new work should fit into the existing system.

These documents do not replace detailed implementation plans under
`docs/reference/`, `docs/completed/`, or `docs/active/`. They provide the
high-level product and engineering map that helps agents decide which detailed
document to open next.

## Recommended Reading Order

For ordinary coding work:

1. `00-agent-start-here.md`
2. `01-product-philosophy.md`
3. `03-core-workflows.md`
4. `04-feature-map.md`
5. The area-specific document below.

For mobile UI work:

1. `00-agent-start-here.md`
2. `06-app-surfaces.md`
3. `09-design-and-copy-principles.md`
4. `14-design-system-and-screen-patterns.md`
5. `15-ai-assisted-design-workflow.md` when AI, Figma MCP, generated images,
   external references, or AI critique are part of the design work.
6. `docs/reference/mobile-pwa-responsive-design-trends.md`
7. `docs/reference/mobile-safe-area-viewport-hardening-plan.md`
8. `docs/reference/ui-final-qa-checklist.md`

For responsive customer-web or web authentication UI work:

1. `00-agent-start-here.md`
2. `06-app-surfaces.md`
3. `09-design-and-copy-principles.md`
4. `14-design-system-and-screen-patterns.md`
5. `15-ai-assisted-design-workflow.md` when external references, AI critique,
   generated assets, or Figma are involved.
6. `docs/completed/web-navigation-motion-system-plan.md` before changing web
   history, browser back/forward, route transitions, scroll restoration,
   landing interactions, or motion accessibility.
7. `docs/active/desktop-web-service-ui-advancement-plan.md`
8. `docs/completed/authenticated-web-ui-ux-quality-remediation-plan.md` before
   changing authenticated web branding, typography, spacing, surface hierarchy,
   cards, rows, list/detail panes, or route-level visual quality.
9. `docs/completed/responsive-web-auth-entry-experience-plan.md` for landing-to-login,
   web auth bootstrap, splash/loading, login/signup, or protected return paths.

For authentication, identity, or account-deletion policy work:

1. `00-agent-start-here.md`
2. `06-app-surfaces.md`
3. `08-data-state-and-permissions.md`
4. `docs/active/cross-platform-social-login-authentication-plan.md`
5. `docs/completed/public-support-and-authenticated-inquiry-experience-plan.md`
   for the dedicated account-deletion email OTP flow.
6. `docs/completed/email-otp-verification-transition-plan.md` only when
   tracing removed legacy email/password or signup-email-OTP behavior.

For backend/API work:

1. `00-agent-start-here.md`
2. `05-domain-model.md`
3. `07-api-and-backend-map.md`
4. `08-data-state-and-permissions.md`
5. `docs/reference/error-observability-contract.md`
6. `docs/completed/api-operations-readiness-plan.md`
7. `docs/completed/fastapi-to-spring-boot-backend-migration-plan.md` only for
   historical contract and schema-baseline context.
8. `docs/active/ai-interview-and-applicant-summary-plan.md` when changing AI
   interview/applicant summaries, provider calls, summary workers, structured
   output, source minimization, or AI-specific authorization and observability.

For deployment or store-release work:

1. `00-agent-start-here.md`
2. `10-operations-and-release.md`
3. `11-store-review-and-compliance.md`
4. `docs/deployment.md`
5. The relevant platform reference under `docs/reference/`.

## Documents

- `00-agent-start-here.md`: compact onboarding for coding agents.
- `01-product-philosophy.md`: product mission, value, constraints, and taste.
- `02-users-and-jobs.md`: user roles, jobs, and role behavior.
- `03-core-workflows.md`: end-to-end product flows.
- `04-feature-map.md`: current feature inventory by app surface.
- `05-domain-model.md`: core entities, relationships, and status language.
- `06-app-surfaces.md`: mobile, web, shared package, and infra surface map.
- `07-api-and-backend-map.md`: Spring structure, routes, services, workers,
  and Flyway ownership.
- `08-data-state-and-permissions.md`: state transitions, permissions, retention.
- `09-design-and-copy-principles.md`: visual, UX, and Korean copy rules.
- `10-operations-and-release.md`: deployment topology and release rules.
- `11-store-review-and-compliance.md`: review-sensitive product requirements.
- `12-non-goals-and-decision-log.md`: deferred scope and durable decisions.
- `13-glossary.md`: shared vocabulary.
- `14-design-system-and-screen-patterns.md`: detailed UI surface, component,
  motion, copy, safe-area, and QA guidance.
- `15-ai-assisted-design-workflow.md`: how to use AI/Figma/reference research
  for design without losing product fit, originality, accessibility, or
  implementation quality.

## How To Maintain This Directory

- Keep this directory current when the product meaning, core workflow,
  architecture, app surfaces, or compliance posture changes.
- Keep implementation task lists in `docs/active/`, not here.
- Keep detailed runbooks, platform worksheets, and policy references in
  `docs/reference/`.
- Keep finished plans and implementation history in `docs/completed/`.
- Prefer linking to detailed documents instead of duplicating full checklists.
