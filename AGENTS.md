# AGENTS.md

This file defines how coding agents and contributors should work in this repository.

## Practical Sufficiency First

- Do not add speculative handling for edge cases that have not been observed in
  production, testing, logs, or a concrete product requirement.
- Prefer practical sufficiency for the current MVP over endless logical
  completeness. Implement the smallest robust behavior that addresses known
  risks and the requested workflow.
- Add proactive safeguards only when the failure has meaningful impact, is
  reasonably likely, or is required by security, privacy, data integrity, store
  review, or an established platform contract.
- Do not expand a task with hypothetical states, abstractions, fallbacks, or
  policy machinery merely because they could be theoretically useful later.

Hypofit is an MVP-stage React web and Expo React Native mobile product. The
school GPU runtime and FastAPI backend are retired. The canonical Java 21
Spring Boot API runs on Amazon Lightsail and Flyway owns schema changes. Prefer
simple, shippable implementation over premature platform abstractions. When in
doubt, preserve the architecture decisions already documented in `docs/`.

## Read First

Before making non-trivial changes, read these documents:

- `README.md`
- `docs/service/README.md` as the top-level service knowledge base.
- `docs/service/00-agent-start-here.md` before deciding where to make changes.
- `docs/active/current-mvp-execution-roadmap.md` before selecting or reordering
  remaining MVP work. It is the current cross-domain execution-order authority;
  use the linked domain plan for implementation details.
- `docs/completed/fastapi-to-spring-boot-backend-migration-plan.md` when
  historical contract-parity, schema-baseline, or framework-cutover context is
  needed. Do not restore the retired FastAPI runtime or Alembic authority.
- `docs/completed/spring-single-runtime-gpu-to-lightsail-plan.md` for the
  historical cutover record, and
  `docs/reference/lightsail-spring-deployment-runbook.md` before changing
  the Lightsail host, Spring container runtime, API/push process ownership,
  secrets, Nginx/TLS, DNS cutover, resource limits, or rollback procedure.
- `docs/active/ai-interview-and-applicant-summary-plan.md` before adding or
  changing AI-generated interview summaries, founder-only applicant summaries,
  summary prompts or schemas, AI provider calls, summary workers, summary
  persistence, summary feature flags, or AI-related privacy/store disclosures.
  This document authorizes source-grounded summaries only, not AI matching,
  applicant ranking, scoring, selection, or rejection.
- `docs/service/09-design-and-copy-principles.md` and
  `docs/service/14-design-system-and-screen-patterns.md` before meaningful UI,
  copy, navigation, safe-area, map, chat, profile, or responsive changes.
- `docs/service/15-ai-assisted-design-workflow.md` before using AI-generated
  UI, Figma MCP, generated images, external UI references, AI critique, or
  prompt-based design exploration.
- `docs/active/landing-page-and-store-creative-production-plan.md` while
  implementing the public landing page, producing App Store or Google Play
  screenshots, creating the Google Play feature graphic, preparing capture
  data, building the HTML/CSS asset renderer, or syncing approved store assets
  to Figma.
- `docs/active/hypofit-brand-logo-icon-system-migration-plan.md` when changing
  the Hypofit mark or wordmark, web brand assets, favicon/PWA icons, Open Graph
  artwork, Expo app/adaptive/themed/notification icons, native or runtime
  splash assets, store-upload icons, icon caches, or the final Figma brand
  asset section.
- `docs/active/desktop-web-service-ui-advancement-plan.md` while changing the
  authenticated customer web UI under `/app`, the desktop app shell, web
  list-detail layouts, responsive customer pages, web auth entry, map/chat
  workspaces, or shared web operational components. Treat the shipped mobile
  app as the product-flow baseline, not as a layout to stretch onto desktop.
- `docs/completed/react-web-architecture-modularization-refactoring-plan.md`
  before changing `apps/web` module boundaries, route composition, shared API
  errors, TanStack Query keys/cache policy, auth ownership, large page
  decomposition, import-direction rules, web lint/test gates, or bundle
  budgets. Refactor incrementally and preserve the current product behavior.
- `docs/completed/authenticated-web-ui-ux-quality-remediation-plan.md` before
  changing authenticated web branding, duplicate wordmarks, typography,
  spacing, surface hierarchy, card usage, row density, page headers,
  list/detail panes, route-level visual quality, or responsive visual QA. This
  records the implemented remediation baseline. Put new executable web UI work
  in the active desktop-web plan instead of reopening this history implicitly.
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/mvp-scope.md`
- `docs/repository-structure.md`
- `docs/reference/README.md` to distinguish reference documents from active
  implementation work.
- `docs/reference/mobile-pwa-responsive-design-trends.md` when changing mobile UI, responsive behavior, app-like navigation, bottom sheets, map surfaces, PWA standalone behavior, safe-area handling, touch targets, motion, or desktop-vs-mobile layout strategy.
- `docs/reference/mobile-safe-area-viewport-hardening-plan.md` when changing app shell layout, mobile viewport height, safe-area padding, bottom navigation reserve, map sheets, fixed overlays, auth screen positioning, or keyboard-sensitive mobile screens.
- `docs/completed/responsive-web-auth-entry-experience-plan.md` when changing the
  web landing-to-login transition, `/app` auth bootstrap, web splash/loading
  behavior, responsive web login/signup UI, protected-route return paths,
  password-manager semantics, or web auth recovery states.
- `docs/active/cross-platform-social-login-authentication-plan.md` when adding
  or changing Apple, Google, Kakao, or Naver login, OAuth/OIDC callbacks,
  native identity tokens, Supabase social providers, account identity linking,
  provider revocation, social-login onboarding, provider feature flags,
  contact-email continuation, or legacy email/password cleanup. This is the
  single authentication authority for the current product.
- `docs/completed/public-support-and-authenticated-inquiry-experience-plan.md`
  when changing the public `/support` route, login-recovery contact paths,
  App Store or Google Play support URLs, authenticated inquiry lists/details,
  web support ticket forms, support-reply deep links, the dedicated account-
  deletion email OTP confirmation flow, or the boundary between inquiry,
  report, feedback, and account-deletion flows. Treat that OTP as destructive-
  action confirmation, not login/signup auth.
- `docs/completed/web-navigation-motion-system-plan.md` when changing web route
  navigation, browser back/forward behavior, history state, scroll restoration,
  landing interactions, route transitions, View Transitions API usage, focus
  handoff, or reduced-motion behavior.
- `docs/reference/google-play-first-launch-readiness-plan.md` when changing Android packaging, Expo/EAS build behavior, Play Console requirements, public account deletion, privacy policy, Data safety, reviewer access, location/photo permissions, UGC/report/blocking, notification claims, or store listing scope.
- `docs/reference/google-play-data-safety-worksheet.md` when adding, removing, or changing data collection, SDKs, permissions, storage, support/report data, profile images, location use, chat, analytics, crash reporting, push, or payment behavior.
- `docs/reference/ios-store-readiness/apple-developer-account-operations-plan.md` when Apple Developer account setup, organization/individual enrollment, D-U-N-S, App Store Connect roles, Account Holder/Admin ownership, App Store Connect API keys, seller/legal identity, public support contact, or review-response ownership is involved.
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md` when Apple App Store work is explicitly requested, or when changing iOS packaging, TestFlight/App Store Connect preparation, App Privacy labels, iOS build requirements, reviewer notes, account deletion, UGC moderation, location/photo permission copy, support/report/block flows, or iOS submission screenshots.
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md` when adding, removing, or changing iOS data collection, App Privacy labels, tracking behavior, SDKs, permissions, location/photo/profile-image handling, chat, support/report data, diagnostics, analytics, push, or payment behavior.
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md` when preparing or changing App Store screenshots, app name/subtitle/description, category, keywords, review notes, review contact details, demo accounts, public URL checklist, or screenshot capture workflow.
- `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md` when changing Expo/EAS iOS build profiles, iOS credentials, App Store Connect API key usage, TestFlight upload flow, iOS production env vars, version/build number policy, or release-build smoke.
- `docs/reference/app-store-play-store-review-readiness.md` when changing broader app-store readiness, app-like navigation, authentication, account/profile settings, legal/privacy surfaces, chat, user-generated content, reporting/blocking, deletion, PWA install behavior, or future iOS packaging.
- `docs/reference/native-store-submission-readiness-plan.md` when preparing
  release-build smoke, store screenshots, reviewer access, App Privacy/Data
  safety, App Store Connect or Play Console metadata, or review-week operations.
- `docs/reference/react-web-to-expo-mobile-migration-plan.md` when changing the React web versus Expo React Native mobile split, shared contracts, mobile app scaffolding, native app capabilities, or web re-scoping.
- `docs/completed/api-operations-readiness-plan.md` when changing API operations, account deletion, soft deletion, support/report handling, user blocking, moderation, notification APIs, audit events, readiness health, reviewer demo access, location/privacy retention, or App Store/Google Play review-sensitive backend behavior.
- `docs/reference/operator-support-moderation-runbook.md` when changing support tickets, reports, moderation actions, account-deletion operations, audit-event investigation, operator workflows, or review/escalation procedures.
- `docs/reference/error-observability-contract.md` when changing API exception
  handling, API error response shapes, request IDs, mobile API client errors,
  Supabase Auth error handling, Sentry diagnostics, or release-build crash/error
  triage behavior.
- `docs/reference/lightsail-spring-deployment-runbook.md` when changing Spring
  image deployment, Lightsail Docker Compose, Nginx/TLS, runtime files,
  rollback, or Flyway deployment behavior.
- `docs/reference/lightsail-spring-deployment-runbook.md` when changing the
  Spring Dockerfile, GHCR image publication, GitHub Actions deployment,
  Lightsail Compose/runtime files, deploy SSH identity, pinned host key,
  readiness rollback, Nginx/TLS setup, or Lightsail disk operations.
- `docs/reference/mobile-auth-failure-observability-hardening-plan.md` when
  changing mobile login/signup, Supabase Auth error normalization, auth
  preflight checks, signup retry/recovery behavior, TestFlight auth diagnostics,
  or auth-related Sentry telemetry.
- `docs/completed/email-otp-verification-transition-plan.md` when tracing or
  removing legacy email/password or signup-email-OTP behavior, compatibility
  routes, Supabase Auth resend behavior, or historical MVP account-verification
  copy. Do not treat it as the current public auth policy. Use
  `docs/reference/email-verification-resend-mvp-plan.md` only as historical
  link/deep-link confirmation fallback context.

If your change affects architecture, deployment, authentication, database schema, or MVP scope, update the relevant document in the same change.
If your change affects user-facing UI, interaction flows, or responsive behavior, update the relevant active work document when one exists, or explicitly note that reference-only guidance did not need a backlog update.

## Documentation Hierarchy

- `docs/active/` is for current implementation plans only. A document should
  stay active only while it drives code, schema, API, deployment, or content
  work that still needs execution.
- `docs/reference/` is for standards, design guidance, architecture decisions,
  policy background, QA checklists, launch-readiness guidance, migration
  history, and other material agents should read before working but should not
  treat as the active backlog.
- `docs/completed/` is for finished plans, implemented work, and historical
  implementation notes.
- `docs/service/` is the product and engineering orientation layer. It explains
  what Hypofit is, how the major app/API surfaces fit together, which product
  decisions are current, and which detailed document to open next. Keep it
  concise enough for a new agent to read first, but current enough to prevent
  incorrect work.
- When a document becomes mainly guidance instead of a live implementation task
  list, move it from `docs/active/` to `docs/reference/` or
  `docs/completed/` and update this file plus the relevant directory README.
- Do not keep reference-only documents in `docs/active/` merely because agents
  need to read them.

## Product Context

Hypofit helps pre-founders and early-stage founders recruit real target customers for paid customer discovery interviews.

The MVP must prioritize this loop:

```text
founder creates interview post
  -> respondent applies
  -> founder reviews and selects applicant
  -> interview session is scheduled
  -> session is completed or marked no-show
```

Do not expand the product into a generic survey platform, marketplace, or AI matching system unless explicitly requested. Native mobile work is in scope for iOS and Android releases, but it must stay focused on the MVP interview workflow.

## Fixed Architecture Decisions

These decisions are currently intentional:

- The repository is a monorepo.
- The React web frontend lives under `apps/web`.
- The Expo React Native mobile app lives under `apps/mobile`.
- The canonical API is the Spring Boot implementation in `apps/api` on
  Lightsail.
- The web app is deployed to Vercel.
- Native store distribution should use the Expo React Native mobile app path,
  not a thin PWA/WebView wrapper.
- iOS `1.0.0` is the reviewed/released baseline. New mobile uploads should use
  `1.0.1` or later with a new platform build number.
- Android/Google Play readiness remains an active release track.
- The school GPU server has been returned and is not an available runtime or
  rollback target.
- Spring Boot is the only current API runtime on the dedicated Lightsail host.
- The current MVP API hostname is `https://hypofit-api.bukae.co.kr`.
- The Lightsail host uses static IPv4 `54.116.198.195`; canonical DNS and TLS
  route `https://hypofit-api.bukae.co.kr` to its Nginx proxy.
- Supabase is used for durable database/auth state.
- Lightsail should reach Supabase through its supported direct or pooler
  endpoint. Do not recreate the retired GPU-to-EC2 tunnel topology.

Do not silently replace these choices with another stack or hosting model.

## Target Repository Structure

Expected structure:

```text
hypofit/
  apps/
    web/
    mobile/
    api/
  packages/
    contracts/
  infra/
  docs/
  AGENTS.md
  README.md
```

Keep frontend and backend code separated. Do not place application source files directly at the repository root.

## Development Commands

The repo is currently being scaffolded. Once the stack is created, add and maintain these root-level commands through a `Makefile`, package scripts, or equivalent:

```bash
make dev-web
make dev-mobile
make dev-api
make test-web
make test-mobile
make test-api
make lint-web
make lint-mobile
make lint-api
make build-web
```

Until those commands exist, use the package-local commands in `apps/web`,
`apps/mobile`, and `apps/api`, and document any new command you introduce.

Agents should prefer targeted validation for changed areas before running full project-wide checks.

## Web Frontend Rules

The web frontend should be a React, Vite, TypeScript app.

Expected conventions:

- Keep frontend code under `apps/web`.
- Use TypeScript for application code.
- Preserve the web dependency direction `app -> pages -> features -> shared`.
  `app` owns providers, routing policy, and shell wiring; `pages` are thin
  route-level compositions; `features` own domain workflows, models, and
  feature UI; `shared` must remain product-agnostic and must not import from
  `features`, `pages`, or `app`.
- Cross-feature imports require an explicit directed edge in
  `apps/web/scripts/check-architecture-boundaries.mjs`. Do not add broad
  allowlists or bypass the boundary check to make a new import pass.
- Use TanStack Query for server-state fetching and mutations.
- Keep API calls behind a shared API client module.
- Preserve backend error codes, request IDs, validation details, and retryable
  status through the shared `ApiError` contract. User-facing modules should use
  the shared error-presentation helper instead of matching raw HTTP messages.
- Build authenticated query keys from stable user identity, never bearer
  tokens, and clear protected cache data when the authenticated user changes or
  signs out.
- Read the API base URL from environment variables.
- Do not hardcode production API URLs in source code.
- Do not put Supabase service role keys or backend-only secrets in browser code.
- Use Supabase anon key only where browser exposure is intended.
- PWA behavior may remain for web install fallback, but it is no longer the
  primary native-store strategy.
- Before declaring an architectural web change complete, run `typecheck`, real
  `lint` including architecture boundaries, the complete test suite, coverage,
  production build, bundle budget check, and the browser smoke when the change
  affects routing, auth entry, or app bootstrap.

## Mobile Frontend Rules

The mobile frontend should be an Expo React Native TypeScript app under
`apps/mobile`.

Expected conventions:

- Treat `apps/mobile` as the App Store and Google Play target.
- Do not implement the mobile app as a thin WebView wrapper around `apps/web`.
- The current phone-sized `apps/web` UI is the first parity baseline for
  `apps/mobile`. Port approved mobile flows, screen order, copy, state
  hierarchy, and CTA placement before redesigning them.
- Do not use the desktop/web rendering of `apps/web` as a reference for
  `apps/mobile`. For RN migration work, inspect the phone-sized web UI and the
  mobile parity docs first.
- Use native navigation, native safe-area handling, native permission flows,
  native keyboard handling, and native map/image/push integrations where needed.
- Share API contracts, domain enums, and pure formatting/read-model helpers
  through `packages/contracts`.
- Do not share DOM/Tailwind UI components directly with React Native.
- Use NativeWind v4 with Tailwind CSS 3.x as the default mobile styling
  system.
- Keep `apps/mobile` on the Expo SDK managed dependency set. Do not upgrade
  `react`, `react-native`, `react-native-reanimated`,
  `react-native-gesture-handler`, `react-native-safe-area-context`,
  `react-native-screens`, Expo packages, or Expo Router to arbitrary latest
  versions outside an explicit Expo SDK upgrade.
- While `apps/mobile` uses NativeWind v4, keep mobile `tailwindcss` on the
  3.4.x line even though `apps/web` uses Tailwind CSS 4.x. Treat this as an
  intentional per-app split, not drift to "fix" with `pnpm update --latest`.
- Do not migrate `apps/mobile` to NativeWind v5, Tailwind CSS 4, Reanimated 4,
  or a newer React Native major/minor unless the active Expo SDK upgrade plan
  explicitly includes that migration.
- Keep React type packages scoped to their apps: React 18 types in `apps/web`,
  React 19 types in `apps/mobile`, and no root-level React type dependency
  unless root TypeScript React code is added.
- Do not add new screen-level `StyleSheet.create` blocks in `apps/mobile`.
- Prefer `className` for static layout, spacing, typography, border, and color
  styling in mobile screens and shared mobile UI components.
- Runtime-calculated native styles remain allowed through `style` props when
  needed for safe-area values, pressed opacity, animated values, gesture-driven
  bottom sheets, map SDK containers, keyboard offsets, or other native runtime
  measurements.
- Keep repeated NativeWind class groups behind `apps/mobile/src/shared/ui`
  components instead of duplicating long class strings across screens.
- Use `EXPO_PUBLIC_*` only for values safe to expose in mobile JavaScript.
- Keep backend secrets, Supabase service role keys, and payment provider secret
  keys out of mobile code and EAS public env.
- Read `docs/reference/react-web-to-expo-mobile-migration-plan.md` before adding
  or changing mobile architecture.
- Before declaring a migrated mobile screen complete, check it against
  `apps/mobile/docs/parity-checklist.md` and
  `docs/reference/ui-final-qa-checklist.md`.
- Mobile screens must preserve App Store and Google Play review-sensitive
  affordances: account deletion, report/block, support contact, legal links,
  permission rationale, and reachable auth/demo flows.
- Until the user explicitly re-enables it, do not run EAS cloud build commands
  such as `eas build --platform ios --profile production` for mobile
  deployment. Prefer local validation and local iOS IPA builds. If the user asks
  to upload a local iOS build, submit only an existing local IPA with an
  explicit `--path`; do not use `eas submit --latest`, because that depends on
  the EAS cloud build artifact history.
- Local mobile build artifacts are temporary delivery files. After an IPA/AAB
  has been uploaded and the upload is verified, delete the local artifact unless
  it is still needed for immediate re-upload or crash-symbol matching. Do not
  keep uploaded `.ipa`, `.aab`, `.xcarchive`, or similar release artifacts in the
  repository as long-term files.

UI implementation rules:

- Before making meaningful UI changes, check `docs/reference/mobile-pwa-responsive-design-trends.md` and follow it as the current design reference unless the user explicitly overrides it.
- Treat `docs/reference/mobile-safe-area-viewport-hardening-plan.md` as the current reference contract for phone viewport, safe-area, bottom navigation reserve, and fixed overlay hardening.
- Build the actual product workflow first, not a marketing landing page.
- Prioritize dense, clear operational screens for founders and respondents.
- Avoid decorative UI that does not help the interview matching workflow.
- Keep responsive layouts usable on mobile, but treat PWA/browser install as a
  fallback. Expo/Android is the primary mobile release path for Google
  Play-first work.
- Treat mobile app-style screens and desktop web screens as separate UI targets, not as one layout stretched across every breakpoint.
- Use shared app-shell layout tokens for mobile navigation height, bottom reserve, and safe-area spacing. Do not introduce new `4rem`, `5rem`, `13dvh`, or similar per-screen magic offsets for bottom navigation, bottom sheets, or fixed controls unless the active plan documents the reason.
- Any fixed header, fixed footer, modal, drawer, bottom sheet, floating map control, or full-screen task surface must account for `env(safe-area-inset-top)` and/or `env(safe-area-inset-bottom)` where it can approach a notch, status bar, rounded corner, or home indicator.
- Prefer `dvh` or shared viewport variables for app-height screens. Avoid plain `100vh` for mobile app surfaces.
- Full-screen mobile surfaces must declare scroll ownership clearly: either the page scrolls, or an internal list/panel scrolls. Do not allow accidental body/page scrolling on fixed app surfaces such as home feed, map, and chat thread.
- Auth and form-heavy screens must be keyboard-safe on small phones. Inputs and submit buttons must remain reachable when the virtual keyboard is open.
- Bottom sheets and map panels must resolve one gesture once. Do not let the same drag also trigger a click that changes sheet state again.
- Use the canonical viewport matrix in `docs/reference/mobile-safe-area-viewport-hardening-plan.md` when declaring responsive UI work complete.
- For mobile-first feature work, optimize for phone-sized Expo app behavior and
  the approved mobile parity baseline first. Do not spend effort on
  iPad/tablet-specific layouts unless the user explicitly asks for tablet
  support.
- Tablet widths may reuse either the mobile or desktop layout as a pragmatic fallback, but they are not the primary design target during mobile UI iteration.
- When the user says a screen is a mobile design task, evaluate it on phone
  viewports, Expo simulator/device behavior, and installed-web fallback where
  relevant. Do not judge it by iPad/tablet breakpoints unless requested.
- Desktop web can use a different information architecture and layout density from mobile. Avoid forcing mobile bottom sheets, mobile navigation patterns, or phone-specific controls into the desktop UI.
- Write Korean UI copy and microcopy in a Toss-like product tone: short, clear, natural, and action-oriented.
- Prefer user-centered sentences over system-centered labels. Explain what the user can do or what will happen next.
- Avoid stiff admin/dashboard wording, excessive nouns, technical implementation terms, and long explanatory paragraphs in the UI.
- Button labels should use concrete actions such as `신청하기`, `모집글 만들기`, `저장하기`, `다음으로` rather than vague labels such as `확인` when the action is specific.
- Error, empty, and loading messages should be calm and helpful. State the situation first, then the next action if needed.
- During active UI iteration, do not update Figma after every small code change.
- Verify web UI work in the running web app, and verify mobile UI work in the
  Expo app, simulator/device, or release build path as appropriate.
- Update the corresponding Figma frames only when the user explicitly asks to sync the approved UI to Figma, or when the UI task is declared final.
- In final reports for UI work, state whether Figma was synced or intentionally deferred.
- During active UI iteration, do not run lint/test/build after every small visual adjustment unless the user asks for verification, the change is behaviorally risky, or the work is about to be committed, deployed, or declared complete.

Current design reference:

- `docs/reference/mobile-pwa-responsive-design-trends.md`: mobile UI and
  installed-web fallback reference for current app patterns,
  desktop-vs-mobile separation, viewport/safe-area rules, bottom navigation,
  bottom sheets, touch targets, and motion.
- `docs/reference/mobile-safe-area-viewport-hardening-plan.md`: implementation guide for shared mobile viewport variables, safe-area handling, fixed overlays, keyboard-safe auth, and canonical viewport QA.
- `docs/reference/ui-final-qa-checklist.md`: current UI QA checklist before declaring UI work complete.
- `apps/web/src/shared/ui/button.tsx` and `docs/completed/button-system-detail-plan.md`: implemented button sizing, hierarchy, variants, and state guidance.
- `docs/reference/location-permission-geocoding-radius-plan.md`: current `지도` tab, Kakao Maps, geocoding, current-location, and radius-search behavior.
- `docs/reference/navigation-home-chat-ia-plan.md`: current top-level mobile information architecture.

## Backend Rules

Spring Boot is the canonical production backend.

Expected conventions:

- Keep backend code under `apps/api`.
- Use Spring MVC controllers for HTTP boundaries.
- Keep business logic and transaction completion in application services.
- Keep database access in repositories or clearly named persistence adapters.
- Use Bean Validation for request validation.
- Use Spring Security Resource Server for Supabase bearer-token verification.
- Use JPA/JDBC for Supabase Postgres access.
- Use Flyway as the only schema migration authority.
- Expose API behavior through Springdoc OpenAPI.
- Do not put meaningful business rules only in the frontend.
- Keep transaction completion at the application-service layer. Controllers
  and repositories must not own commit policy.

Route handlers should stay thin:

```text
controller -> auth/validation -> application service -> repository -> database
```

Avoid putting direct SQL queries, large branching business flows, or cross-entity workflow logic directly inside route handlers.

Spring rules:

- Use Java 21, Spring Boot 4.1.x, Spring MVC, Spring Security Resource Server,
  JPA/JDBC, Actuator, Flyway, and PostgreSQL Testcontainers as specified by the
  active plan.
- Preserve the current `/api/v1` contract, error envelope, validation status,
  `X-Request-ID`, Supabase session boundary, database schema, and domain status
  values before improving internals.
- Keep `B0024__alembic_schema_baseline.sql` immutable and add new schema work as
  `V0025+` migrations.
- Do not run multiple push workers against production concurrently.
- Keep transactions at the Spring application-service boundary. Controllers
  and repositories must not own commit policy.

## Database and Auth Rules

Supabase is the durable system of record.

Rules:

- Store users, profiles, interview posts, applications, sessions, and attendance records in Supabase Postgres.
- Use migrations for schema changes.
- Do not manually patch production schema without documenting the migration path.
- Prefer explicit status fields and clear state transitions for applications and sessions.
- Prefer soft state changes over destructive deletes for application/session/no-show records.
- Treat completion and no-show records as future trust and quality signals.

Authentication:

- If Supabase Auth is used, the web or mobile client obtains a Supabase access
  token.
- The client sends the token to Spring using `Authorization: Bearer <token>`.
- Spring must verify protected requests before executing business logic.
- Prefer Supabase JWKS verification for current Supabase signing keys.
- Do not use the Supabase `service_role` key as a browser key, JWT verification secret, or substitute for user authentication.
- Never trust frontend-provided role or ownership claims without backend verification.

## Deployment Rules

Current deployment topology:

```text
Browser / web app or Expo mobile app
  -> Vercel
  -> Gabia DNS hypofit-api.bukae.co.kr
  -> Lightsail static IPv4 54.116.198.195
  -> host Nginx on 80/443
  -> Spring Boot container on 127.0.0.1:8080
  -> Supabase
```

As of 2026-08-11 this topology is active. Image, secrets, Flyway baseline,
Nginx/TLS, canonical DNS, public readiness, CORS, and auth-boundary smoke pass.
Authenticated product-flow smoke and Spring stabilization remain active work.

Frontend deployment rules:

- The web app/PWA fallback is hosted on Vercel, but Vercel Git auto-deploy is
  intentionally disabled in `apps/web/vercel.json`.
- Treat pushing to GitHub as source-code publication and backup, not as an
  automatic web production deployment.
- For frontend releases, deploy Vercel only when the user explicitly asks for a
  web deployment. Use a manual Vercel redeploy of the intended commit or an
  explicit Vercel CLI deploy.
- Before a requested web deployment, run the relevant web validation, usually
  `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build`.
- After an explicit web deployment, verify the Vercel production deployment
  reaches `Ready` and that the canonical domain `https://hypofit.bukae.co.kr`
  points at the intended deployment. Keep `https://hypofit-web.vercel.app`
  only as a compatibility deployment URL, not as the canonical public URL.
- Vite `VITE_` environment variables are build-time values. If Vercel environment variables change, trigger a new deployment after the env update.
- Browser-exposed values such as `VITE_KAKAO_MAP_APP_KEY` may be present in Vercel frontend env, but backend secrets such as Supabase service role keys must never be added to frontend env.

Lightsail server rules:

- Static IPv4: `54.116.198.195`.
- Administrative user: `ubuntu`; deployment user: `deploy`.
- Runtime root: `/opt/hypofit`.
- Keep configuration in `/opt/hypofit/config` with mode `0750` and secret
  files in `/opt/hypofit/secrets` with mode `0700`. Individual env and
  credential files must use mode `0600`.
- Run one Spring Boot container for the API and push loop. Do not run a second
  API or push worker on this 1 GiB host.
- Bind Spring only to `127.0.0.1:8080`; expose only Nginx ports `80/443`.
- Use JVM heap `-Xms128m -Xmx320m`, a container memory limit near `700 MiB`,
  and a Hikari pool maximum of `3` unless observed production metrics justify
  a change.
- The host has 1 GiB swap with `vm.swappiness=10`; swap is an OOM safety net,
  not normal capacity.
- Docker JSON logs are capped at `10m` with three files. Keep release artifacts
  and logs bounded on the 40 GiB disk.
- Build images off-host and pull a pinned image digest or immutable tag. Do not
  compile the Spring project on the 1 GiB server.
- Short deployment downtime is accepted at the current no-traffic MVP stage.
  Do not add load balancers or blue/green infrastructure until usage requires
  it.
- Supabase remains the durable system of record. Do not run PostgreSQL, Redis,
  a durable queue, or permanent file storage on Lightsail.
- Do not switch canonical DNS until local readiness, temporary-IP HTTP, Nginx,
  TLS, migration, and authenticated smoke all pass.
- The retired GPU and EC2 reverse-tunnel documents are historical rollback
  context only and must not be used as the current deploy procedure.

## Store Readiness Rules

Hypofit uses the Expo React Native app for native iOS and Android releases.
iOS `1.0.0` is the reviewed/released baseline, and follow-up mobile uploads
should use `1.0.1` or later. Android/Google Play readiness remains active.
Keep `docs/reference/google-play-first-launch-readiness-plan.md` and
`docs/reference/google-play-data-safety-worksheet.md` in mind when changing user
flows that Play reviewers, testers, or Data safety declarations will inspect.
For iOS release or App Store Connect changes, start from
`docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
and keep `docs/reference/app-store-play-store-review-readiness.md` as broader
background guidance.

Rules:

- Do not assume a thin WebView wrapper will pass store review. Preserve app-like navigation, loading, offline/error, login, profile, support, and settings experiences.
- Account creation implies account deletion requirements. Do not add or change authentication/profile behavior without considering in-app account deletion and a public data deletion path.
- Interview posts, profile images, applications, and chat are user-generated content surfaces. Changes to these areas must preserve or plan report, block, moderation, and support paths.
- Store privacy labels and Google Play Data safety answers must match actual implementation. Do not add analytics, push, location, camera, storage, or tracking SDK behavior without updating docs and privacy disclosures.
- App Store review readiness depends on backend behavior too. Account deletion, UGC report/block, privacy policy accuracy, location consent, reviewer demo accounts, and payment/reward wording must be treated as API and data-model requirements, not only UI copy.
- Apple App Store submission requires a real iOS build path, TestFlight/App Store Connect setup, accurate App Privacy labels, reviewer demo access, and current Apple SDK requirements. Do not treat an iOS simulator smoke as submission readiness.
- Apple Developer account ownership, seller/legal identity, support contact, App Store Connect roles, and API-key ownership must be explicit before submission. Do not rely on a shared personal Apple ID or undocumented credentials.
- iOS release builds must use EAS/App Store Connect credentials deliberately. Keep App Store Connect API keys, `.p8` files, Apple credentials, and app-specific passwords out of git.
- App Privacy labels must be checked against the final iOS build, SDK list, backend logging behavior, and privacy policy. Do not mark tracking, diagnostics, location, push, analytics, or payment answers final from source-code assumptions alone.
- Android-only requirements such as AAB, target API level, and Play closed testing do not belong in the Apple App Store execution plan. Keep platform-specific blockers separated.
- Do not imply Apple, Google, or Hypofit guarantees or processes 사례비 unless a compliant payment flow is explicitly implemented and documented.
- Google Play release work is in scope when requested. iOS release work should
  preserve the `1.0.0` baseline and use `1.0.1` or later for follow-up uploads.
- Before Google Play submission, confirm the public privacy policy URL, public account deletion URL, reviewer demo account, Android permissions, AAB target API level, and Data safety answers all match the shipped build.

## Security Rules

Never commit secrets.

Forbidden in git:

- `.env` files with real values.
- Supabase service role key.
- Supabase database password.
- JWT secret or signing-key private material.
- Cloudflare tunnel credentials.
- Private SSH keys.
- Production cookies or session dumps.

Environment variables must be documented in `.env.example` with placeholder values.

Frontend environment variables must be safe for browser exposure. Backend-only credentials must remain in server environments only.

## MVP Scope Rules

Prioritize:

- Founder registration/profile.
- Respondent registration/profile.
- Interview post creation.
- Interview post browsing.
- Respondent application.
- Founder applicant review.
- Applicant selection/rejection.
- Interview session scheduling.
- Completion/no-show tracking.

Defer unless explicitly requested:

- Apple App Store release.
- Automated payment/escrow system.
- AI matching.
- AI-generated ranking, scoring, selection, or rejection. Source-grounded
  reading summaries may be implemented only under
  `docs/active/ai-interview-and-applicant-summary-plan.md`.
- Interview recording/transcription.
- Complex admin dashboard.
- GPU-heavy processing.
- Multi-tenant organization features.

If a requested feature conflicts with MVP scope, mention the tradeoff and keep the implementation narrowly scoped.

## Testing and Verification

When code exists, changes should include appropriate checks:

- Web frontend: typecheck, lint, unit/component tests, and Vite/PWA build for affected work.
- Mobile frontend: typecheck and Expo simulator/device or EAS build validation
  for affected work.
- Backend: unit/API tests, Testcontainers migration checks, and Spring startup validation.
- Deployment: local readiness and canonical HTTPS API checks when deployment behavior changes.

Expected health endpoints after API scaffolding:

```text
GET /health
GET /api/v1/health
```

Do not claim verification passed unless the command actually ran successfully. If a command cannot be run, state why.

## Error Observability

Use Sentry as the first-line source of truth for native mobile release-build
errors, TestFlight crashes, auth failures, and production-only React Native
exceptions.

Rules:

- When the user reports a TestFlight/native mobile error, check Sentry before
  guessing from code or rebuilding.
- Sentry event/log lookup commands may be run without asking the user for
  per-command approval when they use an already provided or configured
  read-capable token.
- Never print, commit, or document Sentry auth tokens.
- Prefer querying Sentry for release/build tags, issue id, event id, `phase`,
  `code`, `provider_status`, `provider_code`, breadcrumbs, and sanitized extras.
- Do not expose raw user PII, emails, passwords, access tokens, refresh tokens,
  request bodies, or unsanitized provider messages in final reports.
- If a Sentry token lacks read permission, report the missing scope and ask for a
  read-capable token with `org:read`, `project:read`, and `event:read`.
- Keep Sentry source-map/dSYM upload credentials separate from read/debug
  credentials where possible.

## Git Workflow

- Keep diffs focused.
- Do not mix unrelated refactors with feature work.
- Do not rewrite history unless explicitly requested.
- Do not remove user changes you did not make.
- Do not commit or push unless explicitly asked.
- If generated files are added, document how to regenerate them.

## Documentation Workflow

Update docs when changing:

- Architecture.
- Deployment topology.
- Environment variables.
- API contracts.
- Database schema.
- MVP scope.
- Operational commands.
- User-facing UI or interaction flows, including whether matching Figma frame updates were synced or intentionally deferred.

Keep AGENTS.md high-signal. Add rules when they prevent real mistakes or clarify repo-specific behavior. Do not use it as a general engineering handbook.

## Do Not Do

- Do not create app source at the repository root.
- Do not add another backend framework except the temporary
  `apps/api` replacement explicitly governed by the active migration
  plan.
- Do not replace Supabase with a Lightsail-local database.
- Do not store durable product data on Lightsail local disk.
- Do not hardcode secrets or production URLs.
- Do not add heavy dependencies without a clear need.
- Do not build out-of-scope platform features before the MVP loop works.
