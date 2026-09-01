# Spring MVC Maintainability Hardening Plan

Status: active

Last updated: 2026-08-25

## Purpose

Keep the Spring API as a small feature-first MVC modular monolith while making
the areas that now have real change pressure easier and safer to maintain.

This is not a rewrite, a DDD adoption, or a layer-expansion project. The API
already has the correct broad shape:

```text
feature/
  controller/  HTTP boundary
  dto/         request and response transport models
  service/     use cases, authorization, state transitions, transactions
  repository/  database queries and persistence implementations
  entity/      JPA table mappings
  client/      real external provider clients only
```

The work targets only observed responsibility hotspots:

- `session/service/SessionWorkflowService` (about 1,350 lines)
- `chat/repository/ChatRepositoryAdapter` (about 1,140 lines)
- `chat` dependence on `session.service.SessionReadModels`
- `accountdeletion/service/AccountDeletionService` (about 1,200 lines)
- `interview/service/InterviewPostWriteService` (about 880 lines) as
  multi-format recruitment rules grow

## Implementation Status

- [x] Phase 0 baseline: focused chat tests and Spring Modulith boundary
  verification were run before the first extraction.
- [x] Phase 1: chat now owns its workflow read models and no longer imports
  `session.service.SessionReadModels` in main or chat test sources.
- [x] Phase 2: workflow-query, room, and message persistence responsibilities
  are separated. Chat now keeps its own workflow read models and its message
  adapter owns pagination, idempotent writes, latest-message lookup, and the
  monotonic read cursor.
- [ ] Phase 3: lifecycle ownership is now split into access, scheduling,
  attendance/no-show, reward, review, and notification services.
  `SessionWorkflowService` is reduced to a controller-facing compatibility
  facade and session-list projection. Migrate its remaining controller callers
  before deleting the facade; do not introduce a second permanent orchestration
  layer.
- [ ] Phase 4: administrator request listing and Supabase Auth-cleanup retry
  now belong to `AccountDeletionAdminService`. Public/authenticated OTP request,
  verification, resend, and completion paths remain in `AccountDeletionService`
  until their security regression cases move together. Code generation and
  account-deletion hashing now belong to `AccountDeletionVerificationSecurity`;
  the local debug-code policy remains in the workflow service.
- [ ] Phase 5: conditional recruitment-format validation extraction.

## Current Assessment

### What is already sound

- Product code is organized by feature, not by global technical layer.
- Controllers are thin transport boundaries and do not import JPA entities.
- DTO mapping stays at the HTTP boundary; services do not expose JPA entities
  as API contracts.
- Transaction annotations sit at application-service methods, not controllers
  or repositories.
- Spring Modulith verifies that top-level application modules do not form
  cycles through `ArchitectureBoundaryTest`.
- Flyway, Supabase authentication, error envelopes, request IDs, and the
  existing `/api/v1` contract are established compatibility boundaries.

### Observed maintainability risks

1. `SessionWorkflowService` owns several independent lifecycle areas:
   scheduling, attendance/completion, reward confirmation, reviews,
   cancellation/no-show, audit writes, and notification composition.
2. Chat's workflow projection imports session-owned read models. This makes a
   session internal representation a de facto chat contract.
3. `ChatRepositoryAdapter` combines room/message writes, room list reads,
   participant settings, workflow joins, idempotency and read-marker storage.
4. Account deletion combines public/authenticated OTP handling, rate limiting,
   deletion orchestration, administrator retry and presentation mapping.
5. Recruitment-type rules are accumulating inside one post write service.

These are real code-size and responsibility signals, not hypothetical future
architecture concerns.

## Non-Negotiable Constraints

- Preserve every existing `/api/v1` route, JSON field, HTTP status, error code,
  validation detail, request ID, authorization behavior and OpenAPI contract.
- Preserve Flyway migrations and the current Supabase schema. This plan should
  not need a migration unless a later isolated change proves one is necessary.
- Preserve transaction completion in application services.
- Preserve locking, idempotency, audit, notification, account deletion,
  moderation and state-transition behavior.
- Keep one Spring Boot runtime and one push loop on Lightsail.
- Do not introduce generic base services, base repositories, mapper frameworks,
  command buses, event buses, ports/adapters, aggregate roots, or a global
  shared domain module.
- Do not split a class merely to hit a target line count. A split must create a
  named responsibility with focused tests and a stable call boundary.
- Do not modify unrelated uncommitted work.

## Target Boundary Rules

### Controller

- Extract the authenticated subject, validate request transport, delegate to
  one use-case service, and map a response DTO.
- Never query a repository directly, own a transaction, or decide a workflow
  status transition.

### DTO

- Own HTTP request/response names, Jackson/OpenAPI annotations and transport
  validation where it is purely syntactic.
- Do not contain database queries, authorization, or feature-to-feature calls.
- Keep parsing of intentionally polymorphic recruitment request bodies local to
  the interview DTO package until typed request versions are released.

### Service

- Own authorization, workflow state checks, idempotency decisions and the
  transaction which makes one use case durable.
- Depend on explicit feature-local repositories and intentionally shared
  cross-feature write services such as audit/notification only.
- Return feature-local read models, commands or domain values, never JPA
  entities.

### Repository

- Own JPA/JDBC access, SQL projection and persistence mapping only.
- Do not call remote providers, publish notifications, decide business-state
  transitions or manage Spring transactions.
- Split query and write implementations only when they have distinct callers
  or failure/locking concerns; do not create abstractions around every query.

### Entity

- Map persistence state only. Do not make entities the public API model or a
  cross-feature shared model.

## Implementation Sequence

### Phase 0: Safety Baseline

1. Record current route and schema compatibility from the existing OpenAPI,
   controller, integration and Flyway tests.
2. Run the targeted test suites for each touched feature before changing it.
3. Add or retain a regression test before extracting a non-obvious state
   transition, locking rule or idempotent write.
4. Keep every extraction behavior-preserving; no endpoint, schema or product
   policy change is mixed into this work.

Exit gate:

- Current focused unit/controller/Postgres integration tests pass.
- `ArchitectureBoundaryTest` remains green before and after each phase.

### Phase 1: Decouple Chat From Session Read Models

Scope:

- `chat/service/ChatRepository`
- `chat/service/ChatService`
- `chat/repository/ChatRepositoryAdapter`
- chat unit and Postgres integration tests

Steps:

1. Define feature-local records in `chat/service` for only the workflow data
   chat presents: application status, latest session status, attendance,
   reward and review summary.
2. Change `ChatRepository` to return those chat-owned records instead of
   importing `session.service.SessionReadModels`.
3. Keep the SQL joins in chat because the chat screen owns this read model;
   do not make a new cross-feature query service just to move the dependency.
4. Update `ChatService` workflow rendering against the local records.
5. Preserve every existing workflow action, label, access check, endpoint and
   response JSON field.

Exit gate:

- No `com.contentruck.hypofit.session.service.SessionReadModels` import remains
  under `chat/`.
- Chat workflow service tests and Postgres repository tests cover the same
  session, attendance, reward and review states.

### Phase 2: Split Chat Persistence by Responsibility

Target structure:

```text
chat/repository/
  ChatRoomRepository.java
  ChatRoomRepositoryAdapter.java
  ChatMessageRepository.java
  ChatMessageRepositoryAdapter.java
  ChatWorkflowQueryRepository.java
  ChatWorkflowQueryRepositoryAdapter.java
```

Rules:

- Keep names simple and feature-local; no generic query framework.
- Room visibility and participant-setting operations stay with room storage.
- Message pagination, idempotent user-message creation and read-marker upsert
  stay with message storage.
- Session/application joins used only to render chat workflow stay in the
  workflow query repository.
- `ChatService` may coordinate these three interfaces in one transaction when
  a use case truly writes more than one concern.

Required regression cases:

- retry with the same `(room, sender, client_message_id)` returns one message;
- a stale read timestamp cannot move the read cursor backwards;
- hidden/muted room behavior remains user-scoped;
- closed/rejected/cancelled/selected/scheduled/completed/no-show workflow
  states return their current actions.

Exit gate:

- No resulting repository implementation has unrelated room, message and
  workflow projection responsibilities.
- Chat controller/service/repository tests and architecture verification pass.

### Phase 3: Split Session Lifecycle Services

Target structure:

```text
session/service/
  SessionWorkflowAccessService.java
  SessionSchedulingService.java
  SessionAttendanceService.java
  SessionRewardService.java
  SessionReviewService.java
  SessionLifecycleSupport.java
```

Responsibilities:

- `SessionWorkflowAccessService`: active-account check, application/session
  context loading and participant/owner authorization.
- `SessionSchedulingService`: create, update and cancel scheduled sessions.
- `SessionAttendanceService`: completion, mutual attendance confirmation and
  no-show handling.
- `SessionRewardService`: founder paid, participant received and dispute flow.
- `SessionReviewService`: review creation and listing after completion.
- `SessionLifecycleSupport`: small shared package-private helpers for state
  validation, read-model conversion, audit metadata and counterpart-target
  construction only when duplication remains after extraction.

Transaction policy:

- Each public use-case method remains the transaction boundary.
- Do not call a public `@Transactional` method on the same object expecting a
  Spring proxy to start a new transaction.
- Lock/re-read operations remain inside the service that performs the matching
  state transition.
- Audit and durable in-app notification writes remain in that same workflow
  transaction when they are part of the durable state change.

Migration method:

1. Extract one lifecycle family at a time with its tests.
2. Retain `SessionWorkflowService` as a temporary controller-facing facade only
   while callers are migrated.
3. Delete the facade once controllers and cross-feature callers use focused
   services directly. Do not keep two permanent orchestration layers.

Exit gate:

- Scheduling, attendance/no-show, reward and review have isolated service
  ownership.
- Every state transition still has a focused unit test and a Postgres locking
  or concurrency integration test where it already needs one.
- Controllers remain transport-only.

### Phase 4: Account Deletion Responsibility Cleanup

This is security- and retention-sensitive. Prefer conservative extraction over
large mechanical edits.

Target services:

```text
accountdeletion/service/
  AccountDeletionRequestService.java
  AccountDeletionVerificationService.java
  AccountDeletionCompletionService.java
  AccountDeletionAdminService.java
```

- Request service: public/authenticated request creation and reusable-request
  lookup.
- Verification service: code generation, hash verification, cooldown/window
  enforcement and deletion-authorization issue.
- Completion service: soft deletion, profile-image purge persistence, Supabase
  Auth cleanup result and retry-safe completion state. Reuse the existing
  `AccountDeletionCompletionWriteService` where it already owns writes.
- Admin service: list/retry read and command paths only.

Do not change retention periods, deletion authorization TTL, debug-code policy,
external email delivery or Supabase Auth cleanup behavior in the extraction.

Exit gate:

- Public and authenticated deletion flows, resend cooldown, attempt limits,
  retry cleanup and inactive-account behavior remain covered.
- No security-sensitive validation is silently moved to a controller or client.

### Phase 5: Keep Interview Write Logic Readable as Formats Grow

Do not split this immediately if current tests and additions remain simple.
Trigger this phase only when a new recruitment type or a second external form
provider is actually added.

When triggered:

- extract recruitment-type validation into small package-local validators;
- keep ownership, status transitions, audit and write transaction in
  `InterviewPostWriteService`;
- preserve `InterviewPostRequestParser` as the DTO-side polymorphic parser
  until released clients can use typed request contracts;
- avoid a strategy registry unless there are at least three independently
  evolving type implementations.

## Commenting Standard

Code should explain the *what* through names and small methods. Do not add
JavaDoc to getters, records, ordinary mappings or obvious delegation.

Add a short `// Why:` comment or a focused test name for only these cases:

- `FOR UPDATE`, conditional updates and other locking guarantees;
- idempotency keys and monotonic read-marker updates;
- state-transition restrictions that are not obvious from the method name;
- retention/security reasons in account deletion;
- externally imposed provider constraints such as approved form hosts.

When a rule needs more than a few lines to explain, keep the code short and
link it to the authoritative service or active-plan section instead of placing
a long design essay inside a Java method.

## Validation Matrix

For each completed extraction run the narrowest relevant tests first, then the
full API gate before declaring the plan complete:

```bash
cd apps/api
./gradlew test
./gradlew integrationTest
./gradlew check
./gradlew bootJar
```

Also verify:

- Spring Modulith architecture test;
- OpenAPI contract regression test;
- PostgreSQL/Testcontainers migrations when repository or entity code changes;
- controller tests for unchanged transport/error behavior;
- targeted concurrency tests for lock/idempotency-sensitive operations.

Manual API smoke is supplementary. It never substitutes for focused state and
transaction tests.

## Completion Criteria

Move this file to `docs/completed/` only when:

- Phases 1 through 4 are complete or explicitly proven unnecessary by a
  narrowly documented code simplification;
- no chat source imports session-internal read models;
- session, chat and account-deletion responsibilities are independently
  testable without artificial global layers;
- the existing API and schema contracts are unchanged;
- the full API validation matrix passes.

Phase 5 is conditional and may remain a standing local rule rather than block
completion if no new recruitment type/provider is being added.
