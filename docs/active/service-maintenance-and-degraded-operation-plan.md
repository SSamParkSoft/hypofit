# Hypofit Service Maintenance And Degraded Operation Plan

Status: active

Last updated: 2026-09-02

## Purpose

Give operators a truthful, bounded way to announce and execute service
maintenance without treating every outage as maintenance or relying on a
notice page as access control.

This plan establishes three separate responsibilities:

```text
Advance notice       notice content, optional in-app banner, optional push
Runtime enforcement  Nginx or Spring returns a structured 503 where required
In-app experience    Expo presents a maintenance surface and keeps local work
```

The first executable outcome is safe **full-service maintenance** during work
that can make Spring or Postgres unavailable. Read-only and feature-specific
maintenance are deliberately a later slice; they must not delay the whole-app
path or turn into a feature-flag platform.

## Product Boundary

Hypofit remains a focused customer-discovery interview product. Maintenance
work supports the existing loop rather than creating an operator product:

```text
create post -> apply -> select -> chat -> session -> completion
```

In scope:

- scheduled notice data and user-facing maintenance copy;
- full-service Nginx maintenance gate and static public status response;
- one stable API error code and `Retry-After` semantics;
- Expo global maintenance state, full-screen UI, retry, foreground refresh,
  and preservation of local drafts;
- operator scripts, runbook steps, smoke checks, rollback, and focused tests;
- an explicitly deferred design for `READ_ONLY` and feature maintenance.

Out of scope:

- a separate status SaaS, maintenance microservice, Redis flag, AWS AppConfig,
  WebSocket status stream, or operator dashboard;
- showing a made-up maintenance screen for generic 502/504/network failures;
- changing Supabase authentication, normal deploy behavior, push semantics,
  the public notice product, or the mobile navigation visual system;
- auto-replaying arbitrary mutations after maintenance ends.

## Verified Baseline

The checked-in deployment and client boundaries are currently:

```text
Expo API client (20 s timeout, ApiError envelope parsing)
  -> Nginx on the Lightsail host
  -> one Spring Boot API + push-worker container on 127.0.0.1:8080
  -> Supabase Postgres and Auth
```

Relevant existing behavior:

- `infra/lightsail/nginx-http.conf` already owns public proxying, narrow
  unauthenticated mutation rate limiting, JSON `429` responses, a 15-second
  upstream read budget, and `Cache-Control: no-store` for its generated error.
- `infra/lightsail/deploy.sh` is serialized and uses
  `GET /api/v1/health/ready` only as an infrastructure gate. It restores the
  previous image after failed readiness.
- Spring readiness can return `503` when dependencies are unhealthy, but it is
  not a maintenance signal. It must keep that meaning.
- Spring errors use the documented `{ "error": { ... } }` envelope and the
  mobile `apiRequest` boundary turns it into `ApiError` with a stable code,
  status, request ID, and user-safe message.
- Mobile posting drafts are local and posting creation has an idempotent
  `client_submission_id`; neither is to be cleared because a maintenance
  response was received.
- The mobile root has one `AppProviders` composition point and React Native app
  focus hooks. It has no global maintenance provider or full-screen route yet.

These facts mean the initial solution can be narrow: an edge-owned full gate,
one public status document, and one mobile transport-to-UI bridge.

## User-Visible State Model

Maintenance lifecycle is intentionally small:

| Status | Meaning | User-facing use |
| --- | --- | --- |
| `NORMAL` | No operator-declared maintenance | No maintenance UI |
| `SCHEDULED` | Planned work has not started | Notice/banner only |
| `IN_PROGRESS` | Access is currently restricted | Full screen or local restriction |
| `VERIFYING` | Work is complete but operator checks remain | Full screen remains until released |
| `COMPLETED` | Historical notice state only | Notice history only |

`CANCELLED` and `EXTENDED` are not separate runtime values in the first
implementation. A cancelled notice becomes ordinary content; an extended job
keeps `IN_PROGRESS` and updates its optional end time and message.

Maintenance modes are distinct from status:

| Mode | P0/P1 | Meaning |
| --- | --- | --- |
| `NONE` | P0 | Normal operation |
| `FULL` | P0 | New product requests are blocked at Nginx |
| `READ_ONLY` | P1 | Reads continue; protected mutation methods are blocked in Spring |
| `FEATURE` | P1 | Named feature routes are blocked in Spring |

The client must never infer maintenance from elapsed time, an unavailable
network, a generic 5xx response, or an HTTP status without the stable
maintenance code.

## Canonical Status Contract

### Public status endpoint

`GET /api/v1/service-status` is unauthenticated and must remain reachable while
full maintenance is active. It carries only public operational information:

```json
{
  "status": "IN_PROGRESS",
  "mode": "FULL",
  "title": "서비스 점검 중이에요",
  "message": "안정적인 서비스 제공을 위해 시스템을 점검하고 있어요.",
  "starts_at": "2026-09-03T02:00:00+09:00",
  "ends_at": "2026-09-03T04:00:00+09:00",
  "affected_features": ["POSTING", "APPLICATION", "CHAT"],
  "notice_id": "maintenance-20260903"
}
```

Normal operation returns:

```json
{ "status": "NORMAL", "mode": "NONE" }
```

Rules:

- keys are snake_case to match the existing API envelope and mobile mapper
  conventions;
- `ends_at` is nullable; absent ETA must not become a client countdown;
- `affected_features` is explanatory in P0, not a client authorization rule;
- no operator, incident, internal migration, database, host, token, or trace
  information is exposed;
- responses use `Cache-Control: no-store` so a previous normal document cannot
  persist through a maintenance start.

### Maintenance rejection response

When `FULL` is active, every public product route except the explicit status
document and health checks returns:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Cache-Control: no-store
Retry-After: 300
```

```json
{
  "error": {
    "code": "maintenance_in_progress",
    "message": "서비스 점검 중이에요. 잠시 후 다시 확인해 주세요.",
    "status": 503
  }
}
```

The first Nginx gate intentionally returns only the stable code and concise
copy. The app fetches `/api/v1/service-status` for title, ETA, and feature
context. This keeps Nginx static and usable even when Spring and Postgres are
unavailable. `Retry-After` is an operator-set short retry hint, not a promise
that work ends at that exact time.

`503 auth_verifier_unavailable`, generic `503`, `502`, `504`, timeout, and
offline failures remain distinct. They must not activate the maintenance UI.

### Exempt paths

P0 uses an allowlist, not a broad bypass:

```text
GET /api/v1/service-status
GET /health
GET /api/v1/health
GET /api/v1/health/ready
```

Actuator, Swagger, internal deployment routes, and future operator endpoints
are not public mobile bypasses. Deployment and host-only access remain governed
by the existing Nginx and SSH policy.

## Edge Architecture: P0 Full Maintenance

### Status files and ownership

The Lightsail host owns a small runtime-only directory outside the repository:

```text
/opt/hypofit/status/
  service-status.json
  maintenance.flag
```

The directory is created with `deploy` ownership and restrictive permissions.
The status JSON is always present and atomically replaced with `mv` from a
temporary file. The flag exists only during `FULL` or `VERIFYING` enforcement.
Neither file contains credentials.

`service-status.json` is the Nginx-served public source during P0. An operator
script writes a `NORMAL` document before and after maintenance, so the status
route has one stable static source even while Spring is down.

### Nginx behavior

The checked-in Nginx include will gain, in this order:

1. an exact `location = /api/v1/service-status` serving the static JSON with
   `application/json` and `Cache-Control: no-store`;
2. exact health locations that retain current deployment/readiness behavior;
3. a maintenance check in the shared product proxy location that returns the
   established `503 maintenance_in_progress` envelope while `maintenance.flag`
   exists;
4. the existing proxy and rate-limit behavior only when the flag is absent.

The implementation must use an Nginx pattern that is valid for file existence
checks and does not accidentally evaluate a client-controlled path. It must be
validated with `nginx -t` on the host before reload. The maintenance 503 is
generated before proxying, so a stopped Spring container cannot turn an
operator-declared maintenance period into a raw `502`.

The status response and generated 503 must include `always` headers so they
survive the non-2xx status path. Nginx configuration remains one host include;
this plan does not create a second proxy or change TLS ownership.

### Operator scripts

Add one checked-in executable, for example
`infra/lightsail/maintenance.sh`, copied to `/opt/hypofit/runtime/` with the
other runtime assets. It owns no deployment or DB migration logic; it only
writes validated public status and toggles the flag.

Required commands:

```text
maintenance.sh scheduled --starts-at <RFC3339 offset time> --ends-at <...>
maintenance.sh start --starts-at <...> [--ends-at <...>] [--notice-id <id>]
maintenance.sh verifying [--ends-at <...>]
maintenance.sh complete
maintenance.sh status
```

Script rules:

- reject unknown state/mode values and malformed timestamps;
- write `service-status.json.tmp`, validate its JSON, then atomically rename;
- enable the flag only after a valid `IN_PROGRESS` document exists;
- retain the flag throughout `VERIFYING`;
- remove the flag only after writing `NORMAL` on `complete`;
- never reload Nginx just to change status content;
- print status and file paths, never env files or secrets;
- require an explicit `sudo nginx -t && sudo systemctl reload nginx` only when
  the Nginx configuration itself is first installed or updated.

The script does not stop the API, pause the push worker, or run Flyway. The
operator runbook determines those steps for the specific maintenance change.

## Spring Architecture: P1 Degraded Modes

P1 starts only after P0 has an operator rehearsal and a mobile full-screen
smoke. It does not replace the Nginx full gate.

### Persistent configuration

For `READ_ONLY` and `FEATURE`, Spring owns a single operational state record
in Postgres because it must apply business-route classification consistently
across API instances if scale later changes.

Proposed migration-owned table:

```text
service_operation_status
  id                 boolean primary key check (id)
  status             varchar not null
  mode               varchar not null
  starts_at          timestamptz null
  ends_at            timestamptz null
  title              varchar(120) null
  message            varchar(500) null
  affected_features  jsonb not null default '[]'
  notice_id          varchar(100) null
  updated_at         timestamptz not null
```

Only one row is allowed. Flyway owns the table. This is not needed for P0
full maintenance because the edge must function with Postgres unavailable.

### Filter behavior

A `MaintenanceFilter` runs after correlation ID setup and before controllers.
It uses an internal service-owned snapshot, never client headers, to decide:

```text
NORMAL      -> continue
READ_ONLY   -> permit safe reads; reject protected mutations with 503
FEATURE     -> reject only listed route families with 503
FULL        -> defensive Spring 503 if reached, while Nginx remains primary
```

The filter must:

- preserve `X-Request-ID` and use the standard `ErrorResponse` shape;
- return `maintenance_in_progress`, never 401/403, when it blocks a route;
- explicitly exempt the service-status and health paths;
- classify routes by server-owned route groups, not URL substrings supplied by
  an operator or the client;
- leave authentication state intact and not call token refresh or logout code.

Feature identifiers are a closed backend enum such as `POSTING`,
`APPLICATION`, `CHAT`, and `SESSION`. The UI may display only known labels;
unknown identifiers remain generic copy rather than a crash.

### Read-only classification

P1 has an explicit route matrix before code is written. Initial default:

| Route behavior | During `READ_ONLY` |
| --- | --- |
| ordinary GET/HEAD/OPTIONS reads | permit |
| public status and health | permit |
| post create/update/archive/reopen | reject |
| apply, withdraw, select, reject | reject |
| session change, chat send, notification mutation | reject |
| external participation open/record | reject unless explicitly verified safe |

Do not use a method-only rule without this matrix: some `GET` routes can record
side effects, and some future POST routes may be safe. The first implementation
may use a small explicit mutation allowlist/denylist matching existing
controllers, then add a route only with a test.

## Expo Mobile Architecture

### Global state boundary

Create a focused `maintenance` feature under `apps/mobile/src/features/`:

```text
maintenance/
  serviceStatus.ts       API type/parser and status fetch
  MaintenanceProvider.tsx global state and app lifecycle refresh
  MaintenanceScreen.tsx  full maintenance UI
  maintenanceErrors.ts   stable ApiError classifier
```

`AppProviders` mounts the provider above the authenticated app content. The
root layout renders the normal stack only while the state is `NORMAL`; an
active `FULL` or `VERIFYING` state renders the dedicated full-screen surface.
This is a gate, not another tab or a redirect, so it preserves the navigation
stack and signed-in session for recovery.

### Activation and refresh

The provider activates only when the shared `apiRequest` boundary observes:

```text
status === 503 && code === "maintenance_in_progress"
```

On activation it fetches the public status endpoint without an access token and
stores only public maintenance data in memory. It must not clear Supabase
session storage, cancel drafts, or rewrite route history.

The provider refreshes status at:

- application bootstrap after the existing auth/bootstrap sequence is stable;
- app foreground through the existing React Native `AppState` integration;
- explicit `다시 확인` press;
- a bounded, jittered retry while the full screen is visible.

The retry loop is paused in background, cleans itself up on unmount, and does
not synchronously retry failed POST requests. If normal status is observed,
the provider clears only maintenance UI state and lets ordinary React Query
refetch logic resume.

### Maintenance screen

The P0 screen uses the existing Calm Emerald Native language:

```text
Hypofit mark

서비스 점검 중이에요
안정적인 서비스 제공을 위해 시스템을 점검하고 있어요.

예상 점검 시간
9월 3일 오전 2:00-4:00 종료 예정

[ 다시 확인 ]
점검 안내 보기
```

Rules:

- show time only when `ends_at` exists; never invent a countdown;
- `VERIFYING` uses "정상 동작을 확인하고 있어요" while access remains blocked;
- retain safe-area and Dynamic Type support; no decorative illustration,
  gradient, glass effect, or animated countdown;
- `다시 확인` has loading and retryable-error feedback without logging out;
- `점검 안내 보기` is shown only when an existing notice route and `notice_id`
  can truthfully resolve; no placeholder link is rendered;
- generic connectivity errors retain their existing error UI and do not use
  maintenance copy.

### Partial-mode UI, deferred to P1

`READ_ONLY` and `FEATURE` do not use a global full-screen gate. They expose a
small shared status banner and make each affected action show nearby, specific
copy after a confirmed server rejection. Examples:

```text
공고를 수정할 수 없어요. 점검이 끝난 뒤 다시 시도해 주세요.
현재 채팅 기능을 점검하고 있어요. 점검이 끝난 뒤 메시지를 보낼 수 있어요.
```

The server remains authoritative. No screen enables a mutation merely because
the last fetched status said normal.

## Notice And Communication

The existing notice surface is for advance information and history, not
runtime enforcement.

Maintenance notices need additive structured presentation fields only when the
current notice API can persist them safely:

```text
maintenance status
scheduled starts/ends
affected features
completion or extension message
```

Until that API is extended, the P0 operator script/status endpoint is the
runtime truth and ordinary notices use clear authored Korean text. Do not parse
human notice copy to decide whether the app is in maintenance.

P1 can add a scheduled-maintenance banner when there is verified notice/status
data. Push reminders are optional and must use existing push/outbox semantics;
they are never a prerequisite for a safe maintenance gate.

## Draft, Auth, And Mutation Safety

| Situation | Required behavior |
| --- | --- |
| Create-post receives maintenance 503 | Keep draft and `client_submission_id`; do not auto-submit later |
| Application form receives maintenance 503 | Keep unsent local form state where the screen already owns it; show retry guidance |
| Selection/chat/session mutation receives maintenance 503 | Keep screen state; no automatic replay |
| Maintenance active while app starts | Preserve Supabase session; render maintenance surface |
| User token expires during maintenance | Avoid refresh loops; recover via ordinary auth handling after normal status |
| Generic API/network error | Preserve current non-maintenance behavior |

Idempotent creation permits an intentional user retry after recovery with the
same submission ID. It does not authorize background replay of every mutation.

## Operations Runbook

### Planned full maintenance

```text
T-24h or earlier
  1. Publish an accurate notice: purpose, start, ETA, affected functions.
  2. Verify the Nginx status asset and operator script on the host.

Start
  3. Write IN_PROGRESS status with maintenance.sh start.
  4. Verify /api/v1/service-status externally returns no-store JSON.
  5. Verify a normal product route receives 503 maintenance_in_progress.
  6. Allow in-flight requests the existing bounded proxy/request time.
  7. Stop or pause only workers required by the specific change.

Work
  8. Back up or verify the migration plan as required.
  9. Deploy/migrate/change the target system.
 10. Use maintenance.sh verifying before product verification begins.

Verify
 11. Check local readiness.
 12. Run the existing interactive authenticated smoke policy.
 13. Verify the affected product workflow(s), push outbox status, and errors.

Release
 14. Write NORMAL and remove the flag with maintenance.sh complete.
 15. Verify one public and one authenticated normal API request.
 16. Update the notice with completed/extended outcome.
```

### Extension

Update the status JSON atomically with a new ETA or a no-ETA message while
keeping the flag active. Do not temporarily switch to `NORMAL` merely to edit
the text.

### Emergency rollback

If a change fails, keep maintenance active, restore the known-good image using
the existing deploy rollback procedure, verify readiness plus authenticated
smoke, then complete maintenance. A raw `502` is not an acceptable completion
state.

### Normal deployment

Ordinary immutable-image deployment remains:

```text
deploy -> readiness -> interactive authenticated smoke -> normal traffic
```

Do not turn maintenance on for every deployment. Use it only where writes or
availability cannot be safely maintained.

## Security, Caching, And Observability

- Status documents, generated 503s, and maintenance UI diagnostics contain no
  bearer token, user ID, email, DB host, migration name, or raw request body.
- The API client records the stable maintenance code and request ID through the
  existing sanitized diagnostic path; it does not capture status payloads as
  raw bodies.
- Never use a mobile bypass header, service-role key, or stored social session
  to evade maintenance. Internal smoke remains operator-controlled through the
  existing social-only policy after verification begins.
- Request IDs remain correlation only. They do not bypass the gate and are not
  idempotency keys.
- Add bounded metrics: maintenance rejections by `mode`, status refresh
  success/failure, and operator flag state only if the collection point does
  not require client/user identifiers. Do not add post IDs or user IDs as tags.
- The status endpoint is `no-store`; it may be polled only at the bounded
  cadence defined by the provider, not on every render.

## Test Plan

### Nginx and scripts

- `nginx -t` passes with the maintenance locations configured.
- `maintenance.sh` rejects invalid status, mode, and timestamp input.
- status writes are atomic and produce valid JSON.
- normal mode proxies product API unchanged.
- `IN_PROGRESS` returns service-status JSON, 503 envelope, `Retry-After`, and
  `Cache-Control: no-store` without reaching Spring.
- health and exact status paths obey the documented exemption policy.
- `complete` restores normal proxy behavior.

### Spring P1

- `READ_ONLY` rejects each matrix mutation and permits verified reads.
- `FEATURE CHAT` blocks chat send but not post browse.
- blocked response preserves the standard envelope and request ID.
- no maintenance state is mistaken for auth failure.

### Expo

- maintenance 503 activates the global surface exactly once.
- ordinary 503/auth verifier 503/timeout/502 does not activate it.
- `다시 확인` returns to the preserved route when status becomes normal.
- foreground refresh updates ETA/message and pauses in background.
- session remains intact; no logout or refresh loop occurs.
- create-post draft remains after a 503 and can be intentionally retried.
- small screen, Dynamic Type, VoiceOver, offline status refresh, and reduced
  motion all remain usable.

### Operator rehearsal

Before relying on the mechanism in production, run one scheduled rehearsal on
the host without destructive migration work:

```text
normal -> IN_PROGRESS -> external 503/status verification -> VERIFYING
-> authenticated smoke -> NORMAL -> public/authenticated verification
```

Record only timestamps, result codes, request IDs, and any corrective action.
Never paste a social bearer token into the runbook or source control.

## Delivery Sequence

### P0: Full Maintenance Safety

#### Local implementation checkpoint, 2026-09-02

- [x] `infra/lightsail/maintenance.sh` writes the public status document
  atomically, validates command/timestamp/notice inputs, preserves prior start
  and notice values during `VERIFYING`, and removes the flag only after it
  writes `NORMAL`.
- [x] The checked-in Nginx include serves `/api/v1/service-status` from the
  host status directory, bypasses the maintenance gate for health routes, and
  maps only the local flag branch to the `503 maintenance_in_progress` JSON
  envelope. It does not reinterpret upstream JWKS or generic 503 responses.
- [x] Expo now has one shared maintenance signal, public status parser,
  provider, foreground refresh, bounded retry, and full-screen recovery UI.
  It activates only for `503 maintenance_in_progress`, preserves normal route
  state and session, and does not clear drafts or auto-replay a mutation.
- [x] The API deployment workflow synchronizes `maintenance.sh`; the existing
  runbook and error contract describe the stable public behavior.
- [x] Local validation passed mobile TypeScript typecheck, shell syntax,
  normal/start/verifying/complete script transitions, invalid-input rejection,
  and whitespace checking.
- [ ] The host Nginx include has not been installed or validated with
  `nginx -t`; no public maintenance rehearsal, API deployment, or mobile
  simulator/device maintenance smoke has occurred.

- [x] Add the static status asset contract and `maintenance.sh` with tests.
- [x] Add minimal Nginx static-status/flag gating and host-install instructions.
- [x] Extend the mobile API error boundary with maintenance classification.
- [x] Add `MaintenanceProvider` and full-screen retry UI.
- [ ] Add focused provider/transport tests and complete simulator/device draft
      preservation QA.
- [x] Extend the Lightsail runbook and error contract with the final stable
      status/503 semantics.
- [ ] Perform an operator rehearsal; record the verified result separately from
      local tests.

P0 exit gate: an operator can safely make the public API return a truthful
maintenance 503 while Spring is unavailable, and a signed-in Expo user sees a
retryable maintenance screen without losing session or draft data.

### P1: Degraded Operation

- [ ] Add Flyway-backed single operational state and Spring filter.
- [ ] Define and test every read-only route classification.
- [ ] Add feature-mode route groups and nearby action-level copy.
- [ ] Add structured notice fields or an intentional defer decision.
- [ ] Add a scheduled-maintenance banner only after status/notice data is
      truthful and testable.

P1 exit gate: a verified affected feature can be restricted while unrelated
workflows remain usable, and server enforcement always wins over stale client
state.

## Files Expected To Change

P0 likely touches only:

```text
infra/lightsail/nginx-http.conf
infra/lightsail/maintenance.sh
infra/lightsail/deploy.sh                 (runtime asset copy only if needed)
apps/mobile/src/shared/api/client.ts
apps/mobile/src/features/maintenance/*
apps/mobile/src/providers/AppProviders.tsx
apps/mobile/app/_layout.tsx
docs/reference/lightsail-spring-deployment-runbook.md
docs/reference/error-observability-contract.md
docs/active/current-mvp-execution-roadmap.md
```

P1 may additionally touch Spring common web/config packages, one Flyway
migration, the related test packages, mobile feature-specific mutation UI, and
the notice contract if additive data is approved.

## Acceptance Criteria

1. A notice page never acts as the only maintenance control.
2. Full maintenance functions when Spring and/or Postgres are unavailable.
3. The edge returns `503 maintenance_in_progress`, never a misleading auth or
   generic success response.
4. The public status endpoint remains available and non-cacheable.
5. Expo enters maintenance mode only from the stable maintenance error code or
   verified status, not a generic outage.
6. A maintenance response never logs out a user or clears a local draft.
7. Existing normal deployment/readiness and social-only smoke policies remain
   intact.
8. Read-only/feature maintenance is not exposed until server route rules and
   UI behavior are tested.
9. Operators can start, extend, verify, complete, and roll back maintenance
   with documented commands and externally observable checks.
10. No new backend service, queue, cache, dashboard, or client bypass secret is
    introduced merely for maintenance.
