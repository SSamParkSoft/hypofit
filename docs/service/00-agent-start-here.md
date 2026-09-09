# Agent Start Here

Status: service-onboarding

Last updated: 2026-09-09

## What Hypofit Is

Hypofit helps teams, researchers, and organizers recruit participants through
public postings. The core object is a posting; interview is one recruitment
type. One account can recruit and participate without choosing a customer role.
Permissions follow ownership and workflow membership.

Interview is the released baseline. Survey and beta-test contracts and local
client work exist, but their production creation is gated by the active release
plans and server capabilities. Usability, research-experiment, focus-group and
other-type designs are deferred, not available product features. Hypofit is not
a generic marketplace or an AI matching/ranking product.

AI-generated interview and applicant summaries are an approved active design
only as source-grounded reading aids. They must not rank, score, select, or
reject applicants. Read
the MainVault `ai-interview-and-applicant-summary-plan.md` before changing this
boundary or implementing summary generation.

## The Product Loop

```text
owner creates posting
  -> participant takes the type-specific action
  -> review, external participation, chat or scheduling only where required
  -> the corresponding participation workflow reaches its outcome
```

Interview uses application, selection, chat and session completion. Survey
uses its explicit direct/review-required external-form workflow. Beta-test
selection/chat must not expose interview-only session controls. Existing API
names such as founder/respondent may remain for released-client compatibility;
they do not restore role-based customer authorization.

## Where Code Lives

```text
apps/mobile  Expo React Native app for App Store and Google Play
apps/web     React/Vite public web, legal pages, admin/operator web surfaces
apps/api     Java 21 Spring Boot API deployed to Lightsail
packages/contracts  Shared TypeScript contracts and formatting helpers
infra        Nginx, systemd, local compose, deployment scripts
docs         Product, engineering, operations, and release documentation
```

Current mobile tab shell:

```text
홈 / 공고 / 지도 / 채팅 / 프로필
```

If older completed plans mention labels such as `찾기`, `내 신청`, `내 모집`,
or `일정`, treat those as historical unless an active plan explicitly restores
them. The current app shell and service docs win.

## Most Important Rules

- Select and sequence remaining cross-domain MVP work through the MainVault
  `current-mvp-execution-roadmap.md`, then open the linked domain
  plan for implementation detail.
- Do not replace the architecture without an explicit request.
- Backend work uses the canonical Spring implementation in `apps/api` and the
  Lightsail runbook for deployment operations.
- Mobile app-store work uses `apps/mobile`, not a thin WebView wrapper.
- Web/PWA fallback remains in `apps/web`, but it is not the primary mobile
  release strategy.
- The canonical API is one Spring container on Lightsail behind Nginx/TLS.
- Supabase owns durable database/auth state.
- Lightsail must not become the primary database, durable queue, lock service,
  or permanent file store.
- Use migrations for database schema changes.
- Keep business rules on the backend, not only in the frontend.
- Preserve account deletion, report/block, support, legal links, and permission
  rationale paths because stores inspect them.
- Do not commit secrets.

## Before Changing A Feature

1. Identify whether the work is mobile, web, API, data, deployment, compliance,
   or design.
2. Read the matching document in this directory.
3. Read the detailed reference or active implementation document linked from
   `AGENTS.md`.
4. Keep the change narrow and update docs if the product contract changes.

For UI work, also read `14-design-system-and-screen-patterns.md` before editing
screens.

For Spring Boot API, Flyway, Spring Security, or container deployment changes,
read `docs/service/07-api-and-backend-map.md`, `docs/deployment.md`, and the
Lightsail deployment runbook first.

Before materially changing chat workflow, session lifecycle, account deletion,
or recruitment-type write rules, also read
the MainVault `spring-mvc-maintainability-hardening-plan.md`. Keep the current
feature-first MVC shape and extract only observed responsibility hotspots.

For AI-generated interview summaries, founder-only applicant summaries,
provider integration, background summary work, summary persistence, prompt
contracts, or related privacy/store declarations, read
the MainVault `ai-interview-and-applicant-summary-plan.md`. AI output remains
optional enrichment and must never become workflow authority.

For removal of founder/respondent roles, ownership-based customer permissions,
interview/survey/beta-test recruitment types, external-form participation, or
licensed web-template adoption, read
the MainVault `multi-format-participant-recruitment-and-web-template-adoption-plan.md`.
The plan does not authorize a native survey builder, generic task marketplace,
or arbitrary link directory.

For public `/` or `/landing` hero, section rhythm, product-story imagery,
workflow, pricing, CTA, footer, or Brainwave/Figma-inspired visual adaptation,
read the MainVault `brainwave-inspired-landing-visual-reconstruction-plan.md`.
Keep its implementation separate from authenticated `/app` UI and do not copy
the downloaded Figma-to-Vite export into the product codebase.

For responsive web splash, login, signup, or `/app` auth-entry work, read
`docs/completed/responsive-web-auth-entry-experience-plan.md` before changing the
route gate or auth UI.

For Apple, Google, Kakao, or Naver login, social OAuth/OIDC callbacks,
Supabase identity linking, social-only account behavior, provider contact-email
handling, the dedicated account-deletion email OTP confirmation policy, or
provider revocation, read
the MainVault `cross-platform-social-login-authentication-plan.md`. It is the
single current authentication authority. Keep Supabase Auth as the session
issuer, treat provider email as mutable contact data rather than a login key,
and treat account-deletion email OTP as destructive-action confirmation rather
than email/password auth.

For authenticated customer-web visual quality work, including shell branding,
typography, spacing, card reduction, list/detail panes, row density, or
route-level visual QA, read
`docs/completed/authenticated-web-ui-ux-quality-remediation-plan.md` after the
desktop web information-architecture plan.

For web route transitions, browser back/forward behavior, scroll restoration,
landing interactions, or reduced-motion behavior, read
`docs/completed/web-navigation-motion-system-plan.md` before changing navigation
code or motion.

If the UI work uses AI-generated drafts, Figma MCP, generated images, web UI
references, or AI critique, also read `15-ai-assisted-design-workflow.md`.

## Current Release Posture

- iOS `1.0.0` is the reviewed/released baseline.
- Follow-up mobile uploads should use `1.0.1` or later with a new platform
  build number.
- Android/Google Play readiness remains an active release track, and
  Android-specific issues must stay separated from iOS issues.
- Web deployment is manual. Git push is source publication, not automatic Vercel
  release.
- Mobile cloud EAS builds are avoided unless explicitly re-enabled. Prefer
  local mobile builds and explicit uploads.

## How To Report Work

When finishing work, state:

- What changed.
- Which app/API/docs were touched.
- What validation actually ran.
- What was not run and why.
- Whether deployment/build/upload was performed.
