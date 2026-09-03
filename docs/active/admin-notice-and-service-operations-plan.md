# Admin Notice And Service Operations Plan

Status: active

Last updated: 2026-09-03

## 1. Purpose And Scope

Hypofit needs a small browser-based control surface for the operational work
that is already too risky to perform through ad hoc database edits and host
commands alone:

1. write, revise, publish, and archive notices;
2. schedule and operate a planned full-service maintenance window;
3. expose the correct scheduled-maintenance banner or in-progress maintenance
   screen to released mobile clients;
4. retain the actor and timestamp for consequential maintenance actions.

This plan adds those capabilities to the existing React web Admin and Spring
Boot modular monolith. It does **not** authorize a separate admin product,
feature-flag platform, generalized workflow engine, external status product, or
remote Nginx/deployment control from a browser.

The resulting operating model has two intentionally separate planes:

```text
Application operation plane
  Existing Web Admin -> Spring API -> PostgreSQL
  Notices, scheduled maintenance, app-level FULL blocking, audit trail

Hard infrastructure safety plane
  Operator SSH -> Nginx maintenance flag + static status JSON
  Required when Spring Boot or PostgreSQL itself is unavailable
```

Admin is the convenient control UI. Nginx remains the final full-outage and
migration fallback. Admin must never SSH to the host or mutate Nginx directly.

## 2. Verified Baseline

The implementation starts from the following verified repository state.

### Existing reusable components

| Area | Current state | Plan decision |
| --- | --- | --- |
| Web Admin | `/admin` already exists in `apps/web`, with desktop shell, side navigation, admin API client, support/report/deletion/health/push sections. | Extend this page and its route family. Do not create a second admin app or shell. |
| Admin authorization | Spring `AdminAccessService` verifies a caller server-side, currently using backend configuration. | Replace the runtime identity source with a minimal DB-backed `admin_users` allowlist, using a controlled bootstrap procedure. |
| Audit | `audit_events` and `AuditWriteService` already exist. | Reuse them for maintenance actions. Do not add a competing generic audit system or `maintenance_events` table. |
| Notices | Mobile has a local hardcoded notice list. No canonical Notice API/domain/table exists. | Create the first canonical notice feature and migrate the shipped local notice into Flyway seed data where appropriate. |
| Maintenance P0 | Nginx static status and `maintenance.sh` exist as uncommitted edge-safety work. | Keep the edge fallback. Reconcile its normal-mode routing with dynamic Spring service status before enabling the Admin path. |
| Error envelope | Spring currently returns the repository's structured `error` envelope with stable codes and request IDs. | Preserve this API contract. Do not introduce a second RFC 9457-only response format for Admin. |
| Flyway | Existing local migrations reach `V0031`. | Confirm the committed baseline immediately before implementation; the next new migration must use the next unused version, expected to be `V0032` or later. Never edit `B0024`. |

### Important existing gaps

* A mobile notice screen is not an operational notice system while its data is
  hardcoded in the app bundle.
* A backend config email allowlist is not a durable role model or audit-friendly
  Admin authorization source.
* The current hard-maintenance status file cannot be the normal source of
  scheduled-maintenance information after this plan: normal traffic must reach
  Spring's database-backed public status endpoint.

## 3. Explicit Non-Goals

This plan deliberately excludes:

* a separate Admin backend, service, repository, or deployment;
* multiple Admin roles, permission editors, or user management;
* Redis, Kafka, RabbitMQ, LaunchDarkly, AWS AppConfig, Firebase Remote Config,
  and a generalized feature-flag system;
* read-only and feature-scoped maintenance modes in this delivery;
* automated scheduled state transitions, countdowns, push campaigns, and
  browser-triggered deployments;
* a WYSIWYG editor, analytics dashboard, external status page, or status
  subscriptions;
* App-to-Nginx SSH control;
* treating generic `502`, `504`, network failures, or JWKS verifier failures as
  planned maintenance.

Only `FULL` maintenance is exposed to operators and clients in this plan.

## 4. Canonical Ownership And Data Flow

```text
Notice content and publication state       -> notices
Scheduled/app-level maintenance lifecycle -> service_maintenances
Admin access                               -> admin_users
Operational actor history                  -> audit_events
Hard outage/migration fallback             -> Nginx flag + static JSON
```

`service_maintenances.notice_id` links an operational maintenance record to one
notice. The maintenance record owns the timing, status, and user-facing
maintenance message. The linked notice is the public long-form communication.
Neither system duplicates the other as an independent source of truth.

When a maintenance's time or user-facing message changes, the service updates
the linked maintenance notice in the same transaction using a small, explicit
renderer. This renderer must only own the maintenance metadata block; it must
not become a generic template engine or overwrite operator-authored free text.

## 5. Minimal Admin Authorization

### 5.1 Data model

Add a small table owned by the existing Admin/security boundary:

```text
admin_users
  user_id UUID primary key references app_users(id)
  created_at TIMESTAMPTZ not null
```

One row means `ADMIN`. There is no client-provided role, no email comparison in
browser source, and no `service_role` token anywhere in web code.

### 5.2 Server enforcement

`AdminAccessService` resolves the authenticated Supabase JWT subject to the
current local member and asks an Admin repository whether that `user_id` is in
`admin_users`. Every `/api/v1/admin/**` endpoint performs this server-side
check. The web route guard is only a navigation aid, never the authorization
boundary.

### 5.3 Controlled bootstrap and migration

Flyway cannot safely infer a production administrator from an email-based
environment variable. Before switching enforcement to the new table:

1. identify the intended existing local member UUID from the production-safe
   operator context;
2. insert exactly that UUID through a documented, reviewed bootstrap command;
3. verify `GET /api/v1/admin/me` with the intended account;
4. switch `AdminAccessService` to DB-only authorization;
5. remove the legacy configured email allowlist after production verification.

The bootstrap identity is not hardcoded in source or a Flyway migration. The
operator records the action through the existing audit mechanism or deployment
runbook.

## 6. Notice Domain And Public Contract

### 6.1 Notice schema

Create one canonical `notices` table with a feature-first Spring Notice module:

```text
id UUID primary key
type VARCHAR not null              -- GENERAL, MAINTENANCE, IMPORTANT
title VARCHAR not null
body TEXT not null
status VARCHAR not null            -- DRAFT, PUBLISHED, ARCHIVED
published_at TIMESTAMPTZ null
created_by UUID not null
updated_by UUID not null
created_at TIMESTAMPTZ not null
updated_at TIMESTAMPTZ not null
```

P0 supports manual draft and immediate publication. A nullable future
publication timestamp may be retained for compatibility, but no scheduler or
claimed reservation behavior is implemented until a real operational need
exists.

The migration also moves the currently shipped mobile notice into canonical
data if its contents are still current. The public mobile page must not lose a
published notice merely because the app stops carrying the local fixture.

### 6.2 APIs

Public, unauthenticated read endpoints:

```text
GET /api/v1/notices
GET /api/v1/notices/{id}
```

They return published notices only and never expose draft, actor, or Admin-only
metadata.

Admin endpoints:

```text
GET    /api/v1/admin/notices
POST   /api/v1/admin/notices
GET    /api/v1/admin/notices/{id}
PATCH  /api/v1/admin/notices/{id}
POST   /api/v1/admin/notices/{id}/publish
POST   /api/v1/admin/notices/{id}/archive
```

Published notice archival requires a confirmation in the web UI. No destructive
hard-delete endpoint is needed for P0.

### 6.3 Validation and compatibility

* title and body are required with conservative bounded lengths;
* `MAINTENANCE` notices are allowed both with and without a linked maintenance
  record, but a scheduled maintenance created through Admin always owns its
  linked notice;
* existing mobile clients continue to operate until a compatible version starts
  fetching public notices; a temporary empty/public error state is preferable
  to silently inventing local data;
* list and detail DTOs live in `packages/contracts` so web and mobile consume
  identical field names and timestamp semantics.

## 7. Service Maintenance Domain

### 7.1 Schema

Add `service_maintenances` with the following P0 shape:

```text
id UUID primary key
title VARCHAR not null
message TEXT not null
status VARCHAR not null            -- SCHEDULED, IN_PROGRESS, VERIFYING, COMPLETED, CANCELLED
mode VARCHAR not null              -- FULL only in P0
starts_at TIMESTAMPTZ not null
ends_at TIMESTAMPTZ null
notice_id UUID null references notices(id)
show_banner BOOLEAN not null default false
banner_starts_at TIMESTAMPTZ null
created_by UUID not null
updated_by UUID not null
started_at TIMESTAMPTZ null
completed_at TIMESTAMPTZ null
created_at TIMESTAMPTZ not null
updated_at TIMESTAMPTZ not null
version BIGINT not null default 0
```

Database constraints and service validation must enforce:

* `ends_at` is after `starts_at` when present;
* a banner start is not after maintenance start;
* `FULL` is the only accepted P0 mode;
* there is at most one `IN_PROGRESS` or `VERIFYING` row. Prefer a PostgreSQL
  partial unique index for this active-state invariant;
* timestamps are `TIMESTAMPTZ` in PostgreSQL and `Instant` or
  `OffsetDateTime` at the API boundary.

Multiple future `SCHEDULED` windows are allowed. Their overlap policy is an
operator validation rule: prohibit overlapping visible/full scheduled windows
in the service unless a concrete product need requires otherwise.

### 7.2 State transitions

Only explicit action methods and action endpoints may transition state:

```text
SCHEDULED   -> IN_PROGRESS -> VERIFYING -> COMPLETED
SCHEDULED   -> IN_PROGRESS -> COMPLETED
SCHEDULED   -> CANCELLED
```

All other transitions return the current API error envelope with
`409 maintenance_state_conflict`. A generic `PATCH { status: ... }` endpoint is
not permitted.

Atomic state updates check current state in the write condition. The active
state partial unique index is the final protection against concurrent starts.
The web UI disables the triggering button while the mutation is pending, but
that is only a usability optimization.

### 7.3 APIs

Admin endpoints:

```text
GET   /api/v1/admin/maintenances
POST  /api/v1/admin/maintenances
GET   /api/v1/admin/maintenances/{id}
PATCH /api/v1/admin/maintenances/{id}
POST  /api/v1/admin/maintenances/{id}/start
POST  /api/v1/admin/maintenances/{id}/verify
POST  /api/v1/admin/maintenances/{id}/complete
POST  /api/v1/admin/maintenances/{id}/cancel
```

All require Admin authorization. The patch endpoint changes only title,
message, expected window, and banner visibility while status permits it. It
cannot change mode or state freely.

### 7.4 Audit

Write `AuditWriteService` records in the same transaction as every material
maintenance mutation:

```text
MAINTENANCE_CREATED
MAINTENANCE_UPDATED
MAINTENANCE_STARTED
MAINTENANCE_VERIFYING
MAINTENANCE_COMPLETED
MAINTENANCE_CANCELLED
```

Each event captures `actor_user_id`, target maintenance ID, event time, and
safe before/after operational fields. Do not record secrets, authorization
headers, deployment commands, or hidden infrastructure details.

## 8. Public Service Status And Spring Blocking

### 8.1 Public status API

Add an unauthenticated, `Cache-Control: no-store` endpoint:

```text
GET /api/v1/service-status
```

Normal response:

```json
{ "status": "NORMAL" }
```

During a banner eligibility window, it remains normal and adds a scheduled
maintenance summary:

```json
{
  "status": "NORMAL",
  "scheduledMaintenance": {
    "id": "...",
    "title": "시스템 안정화 점검",
    "startsAt": "2026-09-04T02:00:00+09:00",
    "endsAt": "2026-09-04T04:00:00+09:00",
    "noticeId": "..."
  }
}
```

During `IN_PROGRESS` or `VERIFYING`, it returns public-safe state, title,
message, start/end times, and optional `noticeId`. It never returns actor,
internal work, database, migration, or infrastructure details.

### 8.2 App-level FULL gate

A Spring `MaintenanceFilter` or equivalent centrally applied request policy
consults a `MaintenanceStatusProvider`.

For `FULL + IN_PROGRESS|VERIFYING`, it responds to regular business APIs with:

```text
HTTP 503
code: maintenance_in_progress
```

using the existing structured error envelope and request ID. It must allow:

```text
GET /api/v1/service-status
GET /api/v1/notices and /api/v1/notices/{id}
/api/v1/admin/**
existing health/readiness paths under their existing network policy
```

`401`, `403`, generic `503`, and network failures retain their existing
meanings. The mobile client must never clear a Supabase session because a
maintenance response was received.

### 8.3 Status lookup performance

Do not introduce Redis for one maintenance record. Use a small in-process
status cache with a two-second TTL and explicit invalidation after an Admin
mutation. On process restart it rehydrates from PostgreSQL. The existing edge
hard-maintenance path remains the safe choice when PostgreSQL is unavailable.

## 9. Nginx Hard-Maintenance Reconciliation

The current P0 Nginx flag/static status work remains required, but its routing
must be corrected before database-backed scheduled status is enabled:

```text
hard flag OFF -> /api/v1/service-status proxies to Spring
hard flag ON  -> /api/v1/service-status serves static JSON and business traffic returns 503
```

The static JSON is deliberately operator-owned during an infrastructure-level
operation. Admin state is not expected to remain reachable or control Nginx at
that time. The runbook requires the operator to carry the public title, message,
and expected end time from the Admin maintenance record into the static status
file before enabling the hard flag.

The deployment/runbook verification must prove both routes separately:

1. flag off: dynamic Spring scheduled status reaches clients;
2. flag on: Spring/DB can be unavailable and Nginx still returns exact
   `maintenance_in_progress` and static status JSON.

## 10. Web Admin Experience

### 10.1 Route family and shell

Keep the existing `/admin` shell, auth bootstrap, components, API client, and
desktop operational visual language. Add stable routes through the current
route manifest rather than a new router:

```text
/admin
/admin/notices
/admin/notices/new
/admin/notices/:id
/admin/operations
/admin/maintenances/new
/admin/maintenances/:id
```

The existing support, report, account deletion, health, and push screens remain
available. New navigation groups make operating work discoverable without
removing those shipped tools:

```text
운영
  대시보드
  공지사항
  서비스 운영

기존 운영 도구
  문의, 신고, 계정 삭제, 상태 점검, 알림/푸시
```

Use existing buttons, inputs, modal/confirmation primitives, tables, badges,
and design tokens. No new UI framework is authorized.

### 10.2 Dashboard

The dashboard adds only:

* current service state;
* an active maintenance callout when applicable;
* next scheduled maintenance with detail link;
* a short recent-published-notice list.

It does not add charts, product analytics, or ten-card KPI grids.

### 10.3 Notice admin

The notice list is a dense desktop table with title, type, status, publication
time, and row action. The editor uses a select, input, textarea, and explicit
draft/publish actions. Published archive and cancellation-like actions require
an existing confirmation modal.

### 10.4 Service operations admin

The scheduled maintenance form contains only:

* title;
* user-facing message;
* start and expected end;
* compact opt-in scheduled banner and its start time;
* opt-in creation/linking of one maintenance notice.

The detail page renders status, expected window, banner/notice linkage, and an
audit history summary. Consequential actions use confirmations:

```text
start     -> confirms normal user traffic will be restricted
verify    -> confirms operational verification has begun
complete  -> confirms normal user access will be restored
cancel    -> confirms the scheduled public communication is being cancelled
```

Button geometry is stable during mutations and retryable failures preserve
form values. Destructive red treatment is reserved for archive/cancel; starting
maintenance can use primary emphasis plus clear warning copy.

## 11. Mobile Integration

### 11.1 Canonical notice consumption

Replace the hardcoded notice array with a React Query-backed public notice list
and detail screen using the shared contracts/API client. Maintain the existing
notice route visual language; do not create a new notice design system.

### 11.2 Global service-status behavior

Extend the existing P0 maintenance signal/provider additively:

* cold start checks public status once;
* app foreground checks public status once;
* an exact `503 maintenance_in_progress` from the API client activates the
  global maintenance screen;
* the retry button fetches status immediately;
* while the screen is visible, low-frequency 30-60 second rechecks are allowed;
* normal status clears the global maintenance state without logging out.

The maintenance screen uses only public status fields. If `endsAt` is absent,
it says the end time will be announced after confirmation; it does not show a
false countdown.

### 11.3 Scheduled banner

When `scheduledMaintenance` is present, a compact, dismiss-policy-free P0
banner is rendered in the common mobile application shell where it does not
cover navigation, sticky CTAs, or safe areas. Tapping opens the linked notice.
Once state changes to in-progress, the global maintenance screen supersedes the
banner.

The exact placement must be confirmed against the existing tab/root layout:
it must not be duplicated across nested stacks or shown above dedicated
full-screen creation tasks.

### 11.4 Draft and mutation safety

The global gate never clears posting drafts, application form input, query
cache, or Supabase credentials. It does not automatically replay mutations
after maintenance. Existing `clientSubmissionId` idempotency remains the only
safe retry mechanism for posting creation.

## 12. API Error And Time Contract

All new endpoints preserve the repository error envelope, stable `code`,
`X-Request-ID`, and existing validation conventions:

| Scenario | Status | Code |
| --- | ---: | --- |
| unauthenticated Admin request | 401 | existing authentication code |
| authenticated non-Admin | 403 | `admin_access_required` |
| invalid field combination | 422 | field-level existing validation code |
| invalid lifecycle/concurrent action | 409 | `maintenance_state_conflict` |
| app-level full maintenance | 503 | `maintenance_in_progress` |

Web and mobile always use ISO-8601 offset-bearing timestamps. Admin inputs are
displayed in the operator locale and converted by the client/API contract; no
manual Korean date-string parser is introduced.

## 13. Delivery Sequence

### Phase A: foundation and contracts

1. Reconfirm current migration number, existing Admin component boundaries,
   error envelope, and P0 Nginx change before editing.
2. Add shared notice, maintenance, and service-status contracts.
3. Add Flyway schema for `admin_users`, `notices`, and
   `service_maintenances`, including constraints and audit-event usage.
4. Perform the documented production-safe Admin bootstrap before removing the
   legacy server-only allowlist.

### Phase B: backend operations

5. Implement feature-first Notice public/Admin controllers, services,
   repositories, validation, and published-only reads.
6. Implement Maintenance lifecycle service, action endpoints, active-state
   safety, audit writes, public status provider, and small cache.
7. Add the application-level `FULL` filter and exact 503 behavior.
8. Reconcile Nginx status routing so hard flag off proxies dynamic Spring
   status and hard flag on serves static fallback.

### Phase C: web and mobile consumers

9. Extend existing `/admin` route family and navigation; implement dashboard,
   notice administration, maintenance form/detail/action confirmations.
10. Replace mobile hardcoded notices with public API consumption and routeable
    detail.
11. Wire scheduled banner and global status checks into the existing P0 mobile
    provider/gate without duplicating behavior.

### Phase D: operational proof

12. Run backend transition/authorization/filter tests, web route/form tests,
    mobile focused checks, and configuration syntax checks.
13. Rehearse normal app-level maintenance and the hard Nginx fallback in a
    non-production or controlled maintenance window.
14. Update the deployment runbook, error contract, service knowledge base, and
    active roadmap with actual command/API evidence.

## 14. Test Matrix

### Backend

* non-Admin access to every Admin endpoint returns `403`;
* public notice list/detail never returns draft or archived notices;
* notice create/edit/publish/archive has validation and actor attribution;
* invalid maintenance times and banner ordering return field-level validation;
* valid lifecycle: create, start, verify, complete;
* valid shortcut: create, start, complete;
* cancelled/start-again and duplicate-start return `409`;
* concurrent start attempts leave one active maintenance only;
* active maintenance produces audit records in the same transaction;
* `service-status` remains `200` during app-level maintenance;
* public notice reads and Admin APIs remain available during app-level
  maintenance;
* normal business API gets exact `503 maintenance_in_progress` while active
  and succeeds after completion;
* cache invalidates immediately after lifecycle actions.

### Web

* unauthenticated/non-Admin route handling and server rejection;
* navigation to dashboard, notices, and service operations;
* notice draft/publish/archive confirmation;
* maintenance form field validation and retained values on API failure;
* start/verify/complete/cancel confirmations;
* pending mutation prevents double-click;
* long titles and timestamps remain readable at normal desktop widths.

### Mobile

* normal cold start and foreground status checks;
* public notice list and detail;
* scheduled banner opens its linked notice;
* exact maintenance 503 activates the screen but does not clear session;
* `endsAt: null` copy;
* retry/periodic status check clears the screen only after normal status;
* posting/application draft data remains after a failed mutation caused by
  maintenance;
* banner and screen do not cover tab bars, safe areas, or focused creation
  screens.

### Edge and operations

* Nginx configuration syntax validation;
* flag off: `/api/v1/service-status` reaches Spring dynamic state;
* flag on: public status and business 503 work while upstream is unavailable;
* health/readiness bypass behavior remains consistent with the existing
  runbook;
* no generic error response accidentally activates mobile maintenance mode.

## 15. Operator Procedure After Delivery

### Scheduled, app-level maintenance

1. Sign in to `/admin` with a DB-authorized Admin account.
2. Create the maintenance, message, expected window, optional banner, and
   linked notice.
3. Verify the public notice and scheduled mobile banner before the window.
4. At the start, select **점검 시작** and confirm.
5. Verify the public `service-status` response and one normal business API is
   correctly blocked with 503.
6. Perform work while Admin/public status remain available.
7. Select **정상화 확인**, run authenticated smoke, then select **점검 종료**.
8. Confirm normal business traffic, public status, audit history, and notice
   information.

### Hard infrastructure maintenance

1. Prepare/update the Admin maintenance record and copy public timing/message
   into the host static status JSON.
2. Use the documented SSH `maintenance.sh` command to enable the Nginx flag.
3. Verify static status and exact 503 without relying on Spring/DB.
4. Perform migration/deployment and internal smoke.
5. Disable the Nginx flag.
6. Return to Admin, move to verifying/completed, and run external smoke.

No browser button is allowed to replace steps 2 or 5.

## 16. Completion Criteria

This plan is complete only when:

* existing `/admin` is extended, not duplicated;
* notices have one canonical DB/API source and mobile no longer relies on a
  hardcoded list;
* Admin authorization is server-side and DB-backed without frontend identity
  checks;
* only one app-level active full maintenance can exist;
* maintenance lifecycle actions are explicit, audited, and concurrency-safe;
* public status, mobile banner/screen, and Spring 503 use one compatible
  public contract;
* app-level and hard Nginx maintenance are proven as separate paths;
* maintenance never logs a user out or discards form/draft data;
* no forbidden external control plane, broker, cache, or microservice has been
  added.

## 17. Local Implementation Checkpoint, 2026-09-03

The current checkout contains the first implementation slice only; it is not a
deployment record.

- [x] `admin_users` Flyway schema and server-side membership check replaced the
  configured-email runtime decision.
- [x] A parameterized bootstrap SQL script can register the two approved
  operator accounts by their existing account email without putting either
  address in client code or a migration.
- [x] Canonical `notices` schema, public reads, and protected Admin CRUD/action
  endpoints exist locally.
- [x] Canonical `service_maintenances` schema, explicit lifecycle endpoints,
  audit writes, public status response, and Spring full-maintenance gate exist
  locally.
- [x] Existing web Admin has local notice and service-operation sections; the
  Expo notice screen reads the public API and the tab shell can show a scheduled
  maintenance banner.
- [x] Nginx now routes service status dynamically when the hard flag is off and
  serves its static document only when the hard flag is on.
- [ ] Production migration, Admin bootstrap, authenticated Admin smoke, and
  browser/simulator visual QA remain required before a release claim.
- [ ] Admin route-family expansion, notice-detail deep link, linked
  maintenance-notice creation, and dedicated lifecycle/component tests remain
  follow-up hardening work. They are not represented as complete merely because
  the initial local UI/API path compiles.
