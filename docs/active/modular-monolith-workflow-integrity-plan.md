# Modular Monolith Workflow Integrity Plan

Status: active

Last updated: 2026-09-02

## Purpose

Harden the existing Spring feature-first modular monolith for the next MVP
growth stage. This plan addresses the observed integrity risks where a valid UI
or API request can still create an inconsistent workflow:

- concurrent applicant selection exceeding a posting limit;
- state changes valid individually but invalid in sequence;
- notification/push work coupled incorrectly to a domain transaction; and
- feature modules reaching into one another's internal persistence types.

This is not an authorization to introduce microservices, Kafka, Redis, a
generic event bus, a second API runtime, or a wholesale error-envelope rewrite.

## Relationship To Existing Active Plans

- `production-reliability-and-posting-create-stabilization-plan.md` owns
  Supabase JWT/JWKS verification, authenticated deployment smoke,
  posting-create idempotency, mobile/API compatibility, and release metadata.
- `spring-mvc-maintainability-hardening-plan.md` owns behavior-preserving
  responsibility splits within existing Spring features.
- `adaptive-posting-creation-contract-and-flow-plan.md` owns type-aware
  creation fields, capability discovery, canonical drafts, and serialization.
- `multi-format-participant-recruitment-and-web-template-adoption-plan.md`
  owns survey, beta-test, external-form, and chat policy.

When scopes overlap, preserve the existing API and link to the narrower
implementation authority instead of duplicating tasks.

## Verified Runtime Model

```text
Expo / React Web
  -> Supabase Auth issues access token
  -> Nginx
  -> request correlation filter
  -> Spring SecurityFilterChain and JwtDecoder
  -> DispatcherServlet
  -> feature controller
  -> feature service transaction
  -> feature repository
  -> Supabase PostgreSQL
```

Spring Security is an authentication filter, not a router that calls feature
modules. Flyway prepares the database during application startup before
readiness; it is not a posting runtime dependency.

The API remains one Spring Boot runtime and one exclusive in-process push loop
on the current 1 GiB Lightsail host.

## Assessment Of The Modular Monolith Lite Proposal

The proposal is directionally correct and is adopted with the following
repository-specific adjustments.

### Adopt

- one Spring Boot application, one Gradle module, and one PostgreSQL system of
  record;
- feature-first packages and table write ownership;
- synchronous service calls and one transaction for rules that must be decided
  before the HTTP response;
- read-only composite SQL for a real screen when it does not expose mutable
  entities or let another module write the source table; and
- outbox only for external side effects such as push, email, or webhooks.

### Adapt

- Keep the existing top-level names (`interview`, `applicant`, `session`,
  `survey`, `chat`, `notification`) until a concrete collision or feature
  boundary requires a narrow rename. Do not rename `applicant` to
  `interviewapplication` merely for architectural aesthetics.
- Keep the existing feature-local `controller`, `dto`, `service`,
  `repository`, and `entity` packages. Add a small public read/write contract
  only where a real cross-feature call would otherwise import an internal
  repository or entity. Do not pre-create empty `api` and `internal` packages.
- Retain Spring Modulith 2.1 and `ArchitectureBoundaryTest`. It already tests
  module relationships; adding ArchUnit alongside it is not justified unless
  a specific boundary rule cannot be expressed by the existing verifier.
- Treat `creation-capabilities` as a server-owned compatibility and release
  gate while posting types/modes can be enabled independently. It can be
  retired only after that operational need demonstrably disappears.

### Defer

- Gradle multi-module isolation, full CQRS, durable domain-event infrastructure,
  separate read-model services, a separate push-worker process, Redis locking,
  and chat WebSocket/SSE;
- package-wide command/port/adapter/value-object conventions;
- Spring State Machine or a generic workflow engine; and
- broad entity/package renames that do not solve an observed maintenance or
  correctness issue.

### Minimal Boundary Policy

```text
write ownership: source feature service/repository only
cross-feature synchronous rule: named source-feature reader/facade
cross-feature screen read: focused read-only projection/query is allowed
external side effect: durable notification/push outbox
```

No feature may mutate another feature's table directly. A read-only join is
not a write-ownership violation, but it must return a local projection rather
than another module's mutable JPA entity.

### Existing Strengths To Preserve

- Supabase Auth issues user tokens; Spring verifies identity and services
  re-check ownership and workflow permission.
- `HypofitJwtDecoder` validates configured issuer, audience, timestamps,
  allowed algorithms, and UUID subjects. It has bounded JWKS timeouts, cache
  expiry, one transport retry, and a stable 503 verifier failure.
- Posting creation uses `client_submission_id`, normalized request comparison,
  PostgreSQL coordination, and owner-scoped replay/conflict behaviour.
- Notification creation and eligible push enqueue execute in the same Spring
  transaction in `NotificationWriteService`.
- Push delivery uses PostgreSQL `FOR UPDATE SKIP LOCKED`, stale-claim reset,
  bounded retry, and provider I/O outside claim transactions.
- Chat message writes already have client idempotency and monotonic read state.

## Scope And Design Decisions

### P0: Enforce Recruitment Capacity Transactionally

`ApplicationWorkflowService.updateApplicationStatus()` conditionally updates
one application. The selection path does not yet prove a posting-wide capacity
check and reservation in the same transaction. A limited post may therefore
over-select under concurrent founder actions.

Choose one implementation and prove it with PostgreSQL integration tests:

1. lock the posting row, count selected applications, verify capacity, then
   transition the application; or
2. use one posting-local atomic update whose predicate enforces capacity.

Prefer a posting-row lock at current traffic. Do not add a distributed lock or
Redis.

Required invariants:

```text
limited posting: selected applications <= recruit_count
unlimited posting: no capacity reservation
one respondent: one active application per post
selection: only from an explicit prior state
```

The legacy `recruit_count = 0` encoding remains compatibility-only. Mobile's
canonical model may express unlimited explicitly and serialize it safely.

### P0: Make State Transitions Executable

Keep current external state names. Put explicit allowed transition sets and
conditional writes near the service that owns each workflow; do not add a
generic state-machine framework.

Minimum coverage:

```text
application: applied -> selected | rejected | canceled
application: selected -> completed | no_show | canceled where policy allows
session: proposed -> scheduled -> completed | no_show | canceled
survey participation: authorized -> opened -> submitted | expired
```

### P0: Preserve Notification And Push Durability

The current notification/outbox write is transactionally coupled. Preserve and
prove this property:

```text
business state + notification + eligible push deliveries -> one commit
```

Add rollback regression tests. Do not move writes to `AFTER_COMMIT` unless a
durable event record is inserted in the originating transaction. Push remains
at-least-once with stable delivery identity, lease recovery, retry, terminal
failure, and invalid-device handling. Never hold a DB transaction during APNs
or FCM I/O.

### P1: Enforce Feature Boundaries

Extend the existing Spring Modulith `ArchitectureBoundaryTest`, not a second
architecture framework. Require:

- no top-level feature-module cycles;
- no cross-feature repository or JPA entity access except through a named
  source-feature API;
- `common` holds technical infrastructure, never workflow policy;
- controllers do not use entities/repositories directly; and
- repositories do not publish notifications, perform remote I/O, or own
  transaction policy.

Use a read projection only after an actual cross-feature persistence leak is
identified. Do not introduce one merely to avoid a stable query.

Table write ownership is the minimum hard boundary:

| Durable data | Owning feature |
| --- | --- |
| interview posts and creation configuration | `interview` |
| applications | `applicant` |
| sessions, attendance, rewards, reviews | `session` |
| survey participation/action grants | `survey` |
| rooms, messages, read state | `chat` |
| notifications and push deliveries | `notification` / `push` |

This table describes ownership, not a ban on every cross-feature read. A
detail/list projection can join source tables when it does not bypass source
feature authorization or expose entities for mutation.

### P1: Preserve Canonical Creation Meaning

`duration_value + duration_unit` is the canonical user-facing creation value.
`duration_minutes`, where a legacy route or numeric filter requires it, is
derived compatibility data rather than a competing source of truth.

Beta environment and feedback workflow are organizer-authored public content,
not client-controlled feature flags. Server-owned capabilities determine
available types/modes; normal validation and ownership rules protect the
content fields. Do not add speculative slot tables, timezone migrations, or
new required fields outside the creation plan.

### P2: Observability Without Contract Churn

Keep the current error envelope, `X-Request-ID`, stable codes, and field
errors. A full RFC 9457 migration is not part of this plan.

Add only bounded metrics: transition outcome, capacity conflict, push queue
age/retry/terminal failure. Never use user IDs, post IDs, request IDs, bearer
tokens, external URLs, or device tokens as metric labels.

## Execution Plan

### Phase 0: Code-Level Baseline

1. Inventory each application/session/survey mutation and its owning service.
2. Locate selection writes, active-application uniqueness, and capacity data.
3. Record current notification/push transaction boundaries in focused tests.
4. Run existing Modulith verification and list actual violations only.

Exit gate: baseline is documented without API/schema change.

### Phase 1: Capacity-Safe Selection

1. Add a posting-scoped lock/read operation or tested atomic capacity update.
2. Verify capacity and select in one service transaction.
3. Return a stable conflict code when capacity is reached.
4. Add a Testcontainers concurrency test: two selections for a one-seat post
   yield exactly one success and one conflict.
5. Regression-test unlimited posts and stale/repeated selections.

Exit gate: selected count cannot exceed a limited post's capacity.

Implementation checkpoint, 2026-09-02:

- applicant selection now locks the visible application context and its
  posting row before checking capacity;
- `recruitment_limit_mode = unlimited` and legacy `recruit_count <= 0` both
  bypass capacity reservation; all other posts use `recruit_count` as the
  runtime seat cap, so no new migration is required for Phase 1;
- a saturated post returns a stable `application_selection_capacity_reached`
  conflict before chat or notification side effects run; and
- PostgreSQL integration coverage proves that two concurrent selections for a
  one-seat post produce one `selected` application and one capacity conflict.

### Phase 2: Workflow And Outbox Proof

1. Test allowed and rejected transitions touched by selection, scheduling,
   completion, no-show, and survey authorization.
2. Test outer transaction rollback leaves no notification/push rows.
3. Test stale push claims recover without provider I/O inside transactions.
4. Retain direct feature-to-notification calls unless coupling becomes an
   observed maintenance problem requiring durable in-transaction events.

Exit gate: rollback and retry safety are test-proved, not annotation-inferred.

Status update, 2026-09-02:

- [x] Existing feature tests cover the primary application
  `applied -> selected | rejected | canceled` paths, repeated-selection
  rejection, selected withdrawal, and the primary session
  `selected -> scheduled -> completed | no_show | canceled` paths.
- [x] Existing survey tests cover direct opening, `opened -> submitted ->
  confirmed`, withdrawal, invalid prior states, deadline/closed rejection, and
  application-required access denial. The implementation uses `confirmed` and
  `withdrawn` state names rather than the generic `authorized` and `expired`
  labels in the initial planning notation.
- [x] Added focused 2026-09-02 workflow gaps: founder-driven application
  cancellation and survey selection; pending interview withdrawal; duplicate
  session scheduling; stale/non-scheduled session mutation rejection; partial
  attendance confirmation; selected-survey successful opening; and opened,
  submitted, and confirmed survey idempotency branches. The current model keeps
  `confirmed` and `withdrawn` rather than adding a persisted `expired` state.
- [x] `NotificationWriteServicePostgresIntegrationTest` proves an outer
  transaction rollback removes both `notifications` and eligible
  `push_deliveries`.
- [x] `PushOutboxPostgresIntegrationTest` proves stale `sending` deliveries
  below `maxAttempts` return to `pending` and can be claimed again, while
  recent or exhausted deliveries are not reset.
- [x] `PushDispatchServiceTest` continues to prove provider send occurs after
  the claim transaction completes and outcome writes happen in a second
  transaction.

### Phase 3: Boundary Tightening

1. Add only boundary assertions justified by Phase 0 findings.
2. Replace confirmed cross-feature repository/entity leaks with small named
   feature APIs.
3. Preserve routes, DTOs, transaction ownership, and Flyway compatibility.

Exit gate: no cycles or new internal feature access appear in architecture
tests.

Audit checkpoint, 2026-09-02:

- the existing `ArchitectureBoundaryTest` passes with Spring Modulith;
- no direct cross-feature repository or JPA entity import was found in main or
  test source; and
- current cross-feature calls use named service/worker interfaces, so no
  boundary refactor is justified in this checkpoint.

### Phase 4: Operational Follow-through

1. Add bounded capacity-conflict and push-backlog metrics.
2. Complete separately-owned authenticated deployment smoke and JWKS warm-up.
3. Document observed limits only. Do not split the push worker on this host.

Implementation checkpoint, 2026-09-02:

- `hypofit.application.selection{outcome=selected|capacity_reached}` records
  only bounded selection outcomes;
- `hypofit.push.outbox.pending` and
  `hypofit.push.outbox.oldest_pending_age` expose the count and age of enabled,
  dispatchable pending deliveries without user, post, device, or URL labels;
- the checked-in authenticated smoke script correctly requires a token only in
  its invoking process, but deployment automation remains intentionally
  incomplete until a dedicated least-privilege smoke credential has an approved
  issuance, storage, rotation, and revocation policy; and
- no service-role token, user session, or public configuration was added to
  bypass that credential decision gate.

## Explicit Non-Goals

- microservices, Kafka, Redis, service mesh, Kubernetes, or custom auth;
- global command/event frameworks or mandatory DDD layers;
- replacing the current error envelope with RFC 9457;
- a generic scheduling/booking engine;
- stronger Google Forms submission control than the approved-link model; or
- rewriting request parsers that intentionally normalize legacy payloads.

## Required Validation

- focused unit/controller tests for state/error mapping;
- Testcontainers integration tests for capacity concurrency, application
  uniqueness, outbox rollback, and push claims;
- Spring Modulith boundary verification;
- `./gradlew test integrationTest` for API changes;
- mobile typecheck and posting-create fixtures if a wire contract changes; and
- `git diff --check`.

## Completion Criteria

Move this plan to `docs/completed/` only when:

1. limited recruitment cannot over-select concurrently;
2. relevant allowed/rejected transitions have regression tests;
3. notification and eligible push rows roll back with their originating state;
4. push claim/retry remains restart-safe;
5. boundary checks cover observed module rules; and
6. no released API/mobile contract is broken.
