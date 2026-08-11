# React Web Architecture and Modularization Refactoring Plan

Status: completed

Last updated: 2026-07-16

Scope: `apps/web`

This document is the implementation plan for improving the React web
application's module boundaries, route composition, API and query conventions,
component ownership, accessibility safeguards, test strategy, and bundle
governance. It complements the desktop UI plans; it does not redesign the
approved product experience.

## 0. Current implementation progress

Implementation status on 2026-07-16: **completed and independently audited**.

- Phase 0: real ESLint, architecture-boundary enforcement, independent
  typecheck/test scripts, coverage reporting, browser smoke, and measured bundle
  budgets are installed.
- Phase 1: the shared API transport now preserves backend error code, request
  ID, validation details, retryability, network failures, and abort state in a
  typed `ApiError`. Query-key factories, bounded retry policy, abort signal
  forwarding, stable user cache identity, and protected-cache clearing are
  implemented and tested.
- Phase 2: route registration, lazy screens, access/layout/loading policy, and
  shell metadata are consolidated in `app/routing/routeManifest.ts`.
  `App.tsx` is reduced from 708 to 190 lines and the manifest completeness is
  covered by tests.
- Phase 3: `AuthProvider.tsx` is reduced from 689 to 18 lines. Session
  ownership, lifecycle actions, profile actions, onboarding, profile sync, and
  Supabase bootstrap have focused hooks. `AuthScreenSteps.tsx` is a nine-line
  facade over independently owned login, signup, OTP, role, recovery, and reset
  presentation components.
- Phase 4: account deletion, interviews, chat, map, profile settings, my
  interviews, and admin pages now compose feature-owned controllers, models,
  and presentation. The priority route pages were reduced from a combined
  7,635 lines to 1,209 route-composition lines without changing the approved
  product UI.
- Phase 5: browse/filter/apply, post creation, map selection/search/fallback,
  chat list/thread, profile, account deletion, support, admin, founder, and
  respondent behavior have route-level coverage. The real Chromium smoke
  verifies landing, public support, protected auth entry, and a 390x844
  viewport.

Final integrated verification on 2026-07-16:

- architecture boundaries: 254 source files and 1,079 import sites passed;
- Vitest: 62 files and 265 tests passed;
- coverage: 72.65% statements/lines, 76.40% branches, 69.24% functions;
- production build: passed with 1,939 transformed modules;
- bundle budget: passed; largest JS 507.84 KiB raw / 145.76 KiB gzip,
  largest dynamic chunk 48.18 KiB raw / 11.61 KiB gzip;
- Chromium browser smoke: passed.
- independent completion audit: no remaining refactor blocker found;
- Vercel production deployment `dpl_3vkBTeWzmaqXkecMufbBFArxs3Wu`: `Ready`;
- production alias: <https://hypofit.vercel.app>;
- production route smoke: `/`, `/support`, and `/app` returned HTTP 200 and the
  alias served the new `index-DcwaUK9O.js` entry bundle.

The measurements in Section 2 are the historical pre-refactor baseline, not
the current implementation state.

## 1. Executive Assessment (pre-refactor baseline)

The current web application is a credible production-capable MVP foundation,
but it is not yet at the point where its module boundaries and change safety can
be described as consistently mature across the whole app.

Overall maturity: **7/10**.

The score is not lower because the repository already has meaningful structure:

- React web, Expo mobile, FastAPI, and shared contracts are separated.
- TypeScript strict mode is enabled.
- TanStack Query is used for server state.
- API resource modules and shared contracts already exist.
- route-level lazy loading is implemented.
- reusable web layout and control primitives exist.
- the current web suite passes 162 tests and the production build succeeds.
- production code does not broadly rely on `any`, `ts-ignore`, or TODO-driven
  placeholders.

The score is not higher because changes to routing, authentication, map, chat,
admin, account deletion, and interview browsing require understanding several
large mixed-responsibility modules. The shared API client discards structured
error information, query/cache policy is inconsistent, a shared UI component
depends upward on feature hooks, and the `lint` command does not currently run a
real linter.

The required response is a phased refactor, not a rewrite.

## 2. Audit Baseline

### 2.1 Repository measurements

Measured on 2026-07-16:

- `src` TypeScript/TSX size, including colocated tests: 23,743 lines.
- source files: 128.
- test files: 30.
- tests: 162 passing.
- route chunks are already split with dynamic imports.
- production build succeeds.
- generated main JavaScript chunk: about 499 kB raw and 144 kB gzip.
- generated CSS: about 98 kB raw and 16 kB gzip.

Largest modules:

| Module | Lines | Main responsibilities currently mixed |
| --- | ---: | --- |
| `pages/MapPage.tsx` | 1,681 | map runtime, search, selection, URL state, layout, panels |
| `pages/AdminPage.tsx` | 1,228 | health checks, operational data, actions, page layout |
| `pages/ChatPage.tsx` | 1,222 | room list, thread, polling state, menus, responsive workspace |
| `pages/AccountDeletionPage.tsx` | 1,001 | public/auth flows, OTP state, API orchestration, content |
| `features/auth/AuthScreen.tsx` | 973 | login, signup, OTP, recovery, onboarding presentation |
| `pages/MyInterviewsPage.tsx` | 841 | tabs, applications, posts, derived status, layout |
| `pages/ProfileSubPage.tsx` | 834 | multiple settings routes and forms |
| `pages/InterviewsPage.tsx` | 828 | search, filters, list/detail, application flow, dialog |
| `app/App.tsx` | 708 | bootstrap, routing, history, layout, titles, responsive route choice |
| `features/auth/AuthProvider.tsx` | 689 | session, profile, onboarding, recovery, mutations |

Line count is not an independent failure criterion. It is evidence here because
these modules also own several kinds of state and infrastructure behavior at
once.

### 2.2 Maturity scorecard

| Area | Score | Assessment |
| --- | ---: | --- |
| Repository and platform separation | 8.5/10 | Clear monorepo app boundaries and shared contracts |
| Type safety and domain contracts | 8/10 | Strict TypeScript and useful contract reuse |
| Shared UI foundation | 7.5/10 | Real primitives exist; one upward dependency violates the boundary |
| Route and page composition | 5.5/10 | Central route switch and large route modules raise change amplification |
| API and server-state boundary | 6/10 | Query usage is broad, but error and cache policy are fragmented |
| Accessibility | 7/10 | Good base patterns; filter dialog and loading semantics have gaps |
| Automated testing | 6.5/10 | Solid unit/integration base; core browse/map/chat flows are under-covered |
| Tooling and architectural enforcement | 5/10 | Type checking exists, but real lint/boundary/coverage gates do not |
| Delivery performance | 7/10 | Route splitting is good; common chunk is close to the warning threshold |

## 3. Findings (pre-refactor)

### 3.1 High: `App.tsx` is a routing and application-service bottleneck

Evidence:

- `apps/web/src/app/App.tsx`
- `apps/web/src/shared/navigation/appRoutes.ts`
- `apps/web/src/shared/navigation/appNavigation.ts`
- `apps/web/src/shared/ui/navigation/AppShell.tsx`

`App.tsx` owns lazy imports, authentication gates, browser history handling,
document click interception, route matching, page fallback selection,
responsive profile route selection, shell composition, and title behavior.
Route paths and metadata are then repeated in navigation and shell modules.

Risk:

- adding a route has multiple edit points;
- route access, title, layout, and destination can drift;
- a shell or navigation change has a broad regression surface;
- route tests must understand internal branch order.

Decision:

Create one declarative route manifest and a route renderer while retaining the
current custom history/motion implementation initially. Do not combine this
work with an immediate React Router migration.

### 3.2 High: route pages are not consistently thin composition boundaries

Evidence:

- `MapPage.tsx`, `ChatPage.tsx`, `AdminPage.tsx`
- `AccountDeletionPage.tsx`, `ProfileSubPage.tsx`
- `MyInterviewsPage.tsx`, `InterviewsPage.tsx`

These pages combine data hooks, mutation workflows, browser state, derived read
models, modal/menu state, and large JSX trees. This makes it difficult to test a
workflow without rendering the whole page and difficult to reuse domain logic
without copying it.

Decision:

Pages remain route-level composition modules. Stateful workflow logic moves to
focused feature hooks/controllers, pure derived data moves to feature model
modules, and repeated UI moves to feature-local components. A page is considered
successfully decomposed when its route contract can be understood without
reading native API, cache, or workflow internals. No hard line limit is imposed.

### 3.3 High: the shared API client loses the backend error contract

Evidence:

- `apps/web/src/shared/api/client.ts`
- `apps/web/src/features/auth/AuthProvider.tsx`
- `apps/web/src/features/auth/AuthScreen.tsx`
- direct health `fetch` in `apps/web/src/pages/AdminPage.tsx`

The client currently throws a generic status-based `Error`. Callers then infer
meaning through message matching. This discards backend error code, request ID,
validation details, and recoverability, even though the repository already
documents an error observability contract.

Decision:

Introduce a typed `ApiError`, normalize every FastAPI response through one
transport path, preserve request IDs and machine error codes, and expose stable
classification helpers for auth, validation, conflict, permission, network, and
server failures. Supabase Auth errors remain a separate adapter but must map to
the same user-facing error taxonomy.

### 3.4 Medium-high: dependency direction is not enforceable

Evidence:

- `shared/ui/notification-button.tsx` imports `features/auth/useAuth` and
  `features/notifications/useNotifications`.
- interview-post detail components import application validation from a
  `components` directory.

The intended direction is `app -> pages -> features -> shared`, but the current
tooling neither documents nor checks this mechanically.

Decision:

- keep `shared/ui/notification-button.tsx` presentational and prop-driven;
- move the connected notification control to app-shell or notification feature
  ownership;
- move application validation to `features/applications/model` or `lib`;
- prohibit `shared` imports from `features` or `pages`;
- prohibit feature-to-feature imports except through an explicitly approved
  public API or page-level composition.

### 3.5 Medium: TanStack Query conventions are inconsistent

Evidence:

- query keys use unrelated ad hoc arrays across applications, posts,
  notifications, sessions, and support;
- several queries disable retry locally;
- access tokens appear in some query keys;
- invalidation and optimistic updates scan or rebuild caches differently per
  feature.

TanStack Query treats query keys as the cache identity contract. Variables used
by a query must be represented consistently, while credentials should not be
used as cache identity.

Decision:

- add per-feature query-key factories;
- scope authenticated caches by stable user/session identity, not bearer token;
- clear or partition protected cache on auth transition;
- define one `QueryClient` retry policy that does not retry permission,
  validation, conflict, or auth failures and only retries bounded transient
  network/5xx failures;
- pass TanStack Query's `AbortSignal` to API requests;
- centralize optimistic update helpers only where multiple mutations share the
  same invariant.

### 3.6 Medium: duplicate interview application UI owns duplicate state

Evidence:

- `OpportunityDetailPanel.tsx`
- `OpportunityExpandedDetail.tsx`
- `features/applications/components/applicationValidation.ts`

Both detail surfaces own similar application-form state and validation. The
duplication will cause mobile-width and desktop detail behavior to diverge.

Decision:

Create one feature-owned application form/controller with presentation slots or
small layout variants. Do not create a generic schema-driven form framework.

### 3.7 Medium: accessibility and responsive contracts are only partially shared

Evidence:

- `InterviewsPage.tsx` implements a custom modal-like filter surface without
  complete focus trap, Escape, and focus restoration behavior.
- `LoadingState` does not provide a consistent busy/live-region contract.
- `MapPage`, `ChatPage`, and `ExplorePage` repeat viewport calculations instead
  of relying on shell layout variables.

Decision:

- use the existing Radix dialog foundation for modal filter behavior;
- make route and data loading states semantically announceable without causing
  repeated noisy announcements;
- move workspace height and scroll ownership to shared shell/workspace tokens;
- keep page modules responsible only for choosing a documented page layout
  mode.

### 3.8 Medium: quality tooling does less than its command names imply

Evidence:

- `apps/web/package.json` installs ESLint but `lint` only runs TypeScript.
- no ESLint flat config is present.
- no hooks, accessibility, or import-boundary lint rules are active.
- Vitest has no coverage baseline or threshold.

Decision:

- split `typecheck` and real `lint` commands;
- add ESLint 9 flat config, TypeScript rules, React Hooks rules, accessibility
  rules, and import-boundary restrictions;
- report unused disable directives;
- capture coverage as a baseline before selecting focused thresholds;
- do not chase 100% coverage or test presentational implementation details.

### 3.9 Medium-low: core flow tests and bundle governance need strengthening

The current tests protect navigation, auth bootstrap, support, and shared UI
well. Browse/apply, map selection, chat workspace, interview creation, and
account/profile workflows have less route-level behavioral coverage.

The current common JavaScript chunk is close to Vite's default warning size,
although route splitting is already effective.

Decision:

- add user-centered route integration tests for critical workflows;
- add a small browser smoke suite after route composition stabilizes;
- record the current bundle as the initial budget and fail only meaningful
  regressions;
- inspect common/vendor composition before adding manual chunks.

## 4. Target Module Contract

The refactor keeps the current top-level vocabulary instead of introducing a
large framework-specific architecture.

```text
src/
  app/
    providers/
    routing/
      routeManifest.ts
      RouteRenderer.tsx
    shell/
      ConnectedNotificationButton.tsx
    App.tsx
  pages/
    MapPage.tsx
    ChatPage.tsx
    ... route composition only
  features/
    auth/
      api/
      model/
      ui/
    map/
      model/
      ui/
    chat/
      model/
      ui/
    interview-posts/
      api/
      model/
      ui/
    applications/
      api/
      model/
      ui/
    ...
  shared/
    api/
      client.ts
      ApiError.ts
    config/
    lib/
    navigation/
    ui/
```

Dependency rules:

```text
app -> pages -> features -> shared
                   |          |
                   +------> packages/contracts
```

- `app` wires providers, route policy, and shell-connected components.
- `pages` compose features for one route and coordinate cross-feature behavior.
- `features` own domain-specific API modules, query keys, stateful workflows,
  derived models, and UI.
- `shared` owns product-agnostic transport, browser utilities, layout/control
  primitives, and configuration.
- `packages/contracts` remains the cross-platform API/domain contract source.
- barrel files are optional public APIs, not a requirement for every folder.
- no new global client-state library is introduced without a demonstrated need.

## 5. Implementation Phases

### Phase 0: Freeze behavior and add guardrails

Status: completed on 2026-07-16.

Tasks:

- preserve the current passing test/build baseline;
- add `typecheck`, real `lint`, and `test` as separate scripts;
- add ESLint flat config with hooks, accessibility, unused-disable, and boundary
  checks;
- add a dependency-direction check for `shared`, `features`, `pages`, and `app`;
- capture current bundle output in a repeatable report;
- add characterization tests around route access, auth return paths, and the
  shared API client before changing them.

Acceptance:

- typecheck, lint, tests, and build are independently runnable;
- existing behavior is unchanged;
- the current upward dependency is either temporarily allowlisted with an owner
  or fixed in this phase;
- CI/local commands fail on new boundary violations.

### Phase 1: Normalize API errors and server-state policy

Status: completed on 2026-07-16.

Tasks:

- implement typed `ApiError` parsing and request ID propagation;
- normalize JSON, empty, malformed, network, timeout, and aborted responses;
- route the admin health request through the shared transport;
- map Supabase Auth errors into the documented auth error taxonomy;
- create query-key factories per feature;
- remove bearer tokens from query keys;
- define global retry and retry-delay behavior;
- forward abort signals to fetch;
- standardize invalidation for posts, applications, chat, support, and
  notifications.

Acceptance:

- UI code does not string-match raw HTTP error messages;
- structured backend errors reach Sentry/user copy with request ID preserved;
- auth transitions cannot reuse another user's protected cache;
- cache invalidation tests cover key workflows;
- no user-visible copy changes without corresponding tests.

### Phase 2: Consolidate route metadata and slim `App.tsx`

Status: completed on 2026-07-16.

Tasks:

- define a route manifest containing matcher, lazy screen, access policy,
  shell destination, title, layout mode, and loading behavior;
- derive app destination paths and shell links from the same source;
- extract document click/history synchronization into a focused hook;
- extract route title/focus handling into routing infrastructure;
- render protected/public/admin/profile routes through one renderer;
- preserve the existing navigation-motion tests and browser history semantics.

Acceptance:

- adding a normal route requires one route registration plus its page module;
- `App.tsx` is primarily providers, bootstrap gates, and route rendering;
- route access/title/layout data is not redeclared in three modules;
- forward/back direction, deep links, auth redirects, and refresh behavior pass.

Progress update, 2026-07-16:

- `apps/web/src/shared/navigation/appRoutes.ts` now acts as the incremental
  route manifest for matcher, access, title, and shell-active metadata instead
  of repeating that data across `App.tsx`, shell navigation, and route-title
  helpers.
- `apps/web/src/app/routing/RouteRenderer.tsx` and
  `apps/web/src/app/routing/useNavigationCoordinator.ts` now own route
  rendering and document click/history synchronization while preserving the
  existing custom navigation coordinator, lazy loading, browser history
  semantics, and motion tests.
- `apps/web/src/app/shell/ConnectedAppShell.tsx` now composes unread
  notification state for the shell and pages, and
  `shared/ui/notification-button.tsx` no longer imports auth or notification
  feature hooks directly.
- Targeted route/navigation/shell/button tests passed, along with
  `pnpm exec tsc --noEmit -p tsconfig.json` and
  `pnpm exec tsc --noEmit -p tsconfig.node.json`.

### Phase 3: Split authentication by lifecycle ownership

Status: completed on 2026-07-16.

Tasks:

- isolate the Supabase auth adapter;
- keep `AuthProvider` focused on session lifecycle and context;
- move profile synchronization and role onboarding to focused services/hooks;
- split login, signup account, OTP, role onboarding, and password recovery UI;
- keep password policy in shared contracts;
- retain current observability and startup recovery behavior.

Acceptance:

- session identity has one authoritative owner;
- auth screens do not implement transport/error parsing;
- each auth flow can be tested independently;
- refresh, multi-tab auth events, recovery, signup, and sign-out remain stable.

### Phase 4: Decompose route modules in risk order

Status: completed on 2026-07-16.

Order and target extractions:

1. `AccountDeletionPage`: public/auth identity, OTP controller, deletion status,
   static content.
2. `InterviewsPage` and interview detail surfaces: search/filter controller,
   shared application form, accessible filter dialog, list/detail composition.
3. `ChatPage`: room selection, polling/thread controller, responsive workspace,
   room and message UI.
4. `MapPage`: map adapter, search/geocoding, viewport query, selection model,
   list/detail panels.
5. `ProfileSubPage` and `MyInterviewsPage`: route-specific settings and
   application/post list sections.
6. `AdminPage`: readiness adapter, resource tables, operational actions, and
   result panels.

Progress update on 2026-07-16:

- `pages/AdminPage.tsx` now acts as route-level orchestration for access,
  summary/list refresh, selection state, target-preview loading, and health
  refresh.
- admin console presentation moved into `features/admin/components/*` for
  section navigation, summary strip, support ticket list/detail, account
  deletion list/detail, health, and push panels.
- existing admin API behavior and the account-deletion Auth cleanup retry flow
  were preserved during the split.

Rules:

- refactor one vertical workflow at a time;
- do not change visual behavior and module ownership in the same unreviewed
  patch when avoidable;
- prefer feature-local components over expanding `shared/ui`;
- extract a component because it has an ownership boundary or reuse case, not
  solely because a file is long;
- keep URL state and server state distinct from ephemeral presentation state.

Acceptance per route:

- page module reads as composition;
- data and mutation behavior has focused tests;
- loading, empty, error, and permission states are explicit;
- responsive and accessibility behavior is unchanged or improved;
- no new cross-feature dependency leak is introduced.

### Phase 5: Strengthen workflow tests and performance budgets

Status: completed on 2026-07-16.

Tasks:

- add route integration tests for browse/filter/detail/apply;
- add post creation and editing workflow tests;
- add map search/selection and fallback-state tests;
- add chat room/thread/notification-state tests;
- add profile/account deletion/support workflow tests;
- add a minimal real-browser smoke for public entry, protected redirect, one
  founder flow, and one interviewer flow;
- add bundle-size reporting and an initial regression budget based on the
  measured baseline;
- inspect common chunk composition and split only when measurement supports it.

Acceptance:

- tests continue to use accessible queries and user behavior rather than
  component internals;
- critical workflows fail clearly when route, query, or API contracts regress;
- main and route bundle growth is visible in review;
- performance budgets are calibrated to Hypofit, not copied blindly from a
  generic website.

## 6. Sequencing and Change Strategy

Recommended delivery units:

1. guardrails and dependency inversion;
2. typed API errors and query policy;
3. route manifest and `App.tsx` reduction;
4. authentication split;
5. account deletion and interview/application duplication;
6. chat;
7. map;
8. profile, my interviews, and admin;
9. browser smoke and bundle budget.

Every unit must remain independently releasable. Do not create a long-lived
branch that moves every file before behavior is verified.

## 7. Explicit Non-goals

- no full rewrite;
- no immediate React Router migration solely for convention;
- no Next.js migration;
- no Redux/Zustand introduction for server state already owned by TanStack
  Query;
- no domain-driven folder explosion with empty `entities`, `widgets`, or barrel
  layers;
- no generic form-builder or design-system rewrite;
- no simultaneous UI redesign unless requested by the user;
- no mobile architecture changes as part of this web refactor.

## 8. Verification Matrix

Minimum checks for each phase:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web typecheck
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web lint
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web test
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

Additional completion checks:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web test:coverage
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web bundle:check
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web test:browser
```

Behavioral gates:

- public landing, support, legal, and deletion routes;
- login, signup, OTP, password recovery, protected return path;
- founder and interviewer role access;
- home, interview search/detail/apply, map, chat, profile;
- browser back/forward and refresh on nested routes;
- keyboard focus, Escape, reduced motion, loading announcements;
- 360px phone fallback, compact web, 1280px desktop, and zoomed desktop.

## 9. Risks and Controls

| Risk | Control |
| --- | --- |
| custom navigation behavior regresses | characterize first, keep existing history/motion helpers, migrate declaratively |
| cache changes expose stale user data | remove token keys only with auth cache reset/partition tests |
| page splitting creates prop drilling | use focused feature controllers, not a new global store by default |
| shared UI becomes a dumping ground | require reuse across domains or true product-agnostic behavior |
| file moves create a large unreviewable diff | refactor one workflow at a time and preserve behavior |
| bundle splitting makes requests worse | measure startup and route payloads before manual chunking |
| coverage targets incentivize low-value tests | baseline first, gate critical modules and workflows later |

## 10. Completion Criteria

This plan can move to `docs/completed/` when:

- module dependency direction is documented and enforced;
- the shared API client preserves structured errors and request IDs;
- query keys, retry, cancellation, auth cache, and invalidation follow one
  documented policy;
- route metadata and rendering come from one manifest;
- `App.tsx`, auth lifecycle, and priority route pages have clear ownership
  boundaries;
- duplicate interview application state has one owner;
- modal/loading/workspace accessibility contracts are shared;
- lint is real and distinct from typecheck;
- critical workflows have route-level behavioral coverage;
- bundle regression reporting is repeatable;
- production build and the complete web test suite pass;
- no required real-browser QA or deployment step remains.

## 11. External Standards Used

- React recommends focused custom hooks for reusable stateful logic and keeping
  components focused on intent:
  <https://react.dev/learn/reusing-logic-with-custom-hooks>
- React component and hook purity rules:
  <https://react.dev/learn/keeping-components-pure>
- TanStack Query query-key contract:
  <https://tanstack.com/query/latest/docs/framework/react/guides/query-keys>
- TanStack Query retry configuration:
  <https://tanstack.com/query/v5/docs/framework/react/guides/query-retries>
- ESLint 9 flat configuration:
  <https://eslint.org/docs/latest/use/configure/configuration-files>
- React Hooks lint rules:
  <https://react.dev/reference/eslint-plugin-react-hooks>
- Testing Library user-centered test principles:
  <https://testing-library.com/docs/>
- web.dev guidance on code splitting and measured performance budgets:
  <https://web.dev/articles/reduce-javascript-payloads-with-code-splitting>
  and <https://web.dev/articles/your-first-performance-budget>

## 12. Post-completion Extensions

- 2026-07-17: approved the explicit `profiles -> notifications` feature edge.
  Profile settings consumes the notifications feature public entry point to
  manage the authenticated user's API-backed app notification preferences.
