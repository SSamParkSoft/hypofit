# API And Backend Map

Status: service-source-of-truth

Last updated: 2026-08-25

## Backend Shape

The canonical backend is the Java 21 Spring Boot application in `apps/api`.
It runs as one Docker container on Amazon Lightsail and uses Supabase Postgres
and Supabase Auth as durable infrastructure.

Expected flow:

```text
Spring MVC controller
  -> bearer-token and request validation
  -> service transaction
  -> repository
  -> Supabase Postgres
```

Controllers stay thin. Services own business rules and transaction completion.
Repositories do not call external providers or decide commit policy.

## Main Directories

```text
src/main/java/com/contentruck/hypofit/<feature>/controller HTTP boundary
src/main/java/com/contentruck/hypofit/<feature>/dto        request/response models
src/main/java/com/contentruck/hypofit/<feature>/service    use cases and transactions
src/main/java/com/contentruck/hypofit/<feature>/repository database access
src/main/java/com/contentruck/hypofit/<feature>/entity     JPA mappings
src/main/java/com/contentruck/hypofit/<feature>/client     external clients when needed
src/main/java/com/contentruck/hypofit/common               shared config/errors
src/main/resources/db/migration                            Flyway migrations
src/test                                                   unit/integration tests
scripts                                                    contract/Gradle helpers
```

The API is a feature-first modular monolith using ordinary Spring MVC roles.
It deliberately avoids a mandatory DDD or hexagonal package set for every
feature. Spring Modulith remains a lightweight dependency verifier, not a
reason to create extra architectural layers.

For the active, behavior-preserving extraction of observed session/chat/account
deletion hotspots, read
`docs/active/spring-mvc-maintainability-hardening-plan.md`. That plan is the
authority for MVC responsibility splits; do not split classes only to reduce
line counts or introduce generic layers.

## Route Families

- `health`: liveness/readiness, database and provider configuration.
- `me`: profile read, synchronization, and update.
- `auth/social`: provider capability, attempt, completion, identity inventory,
  reconciliation, and Apple server notification.
- `interview-posts`: search, detail including nullable interview summary,
  creation, update, status, and view state.
- `applications`: apply, withdraw, founder selection/rejection, and applicant
  detail including founder-only AI summary.
- `sessions`: schedule, attendance, completion, reward, no-show, and review.
- `chat`: rooms, messages, read state, participant settings, and workflow.
  Room visibility is determined only by post ownership or application
  membership, not by the legacy profile role. Message writes use a per-sender
  `client_message_id` for idempotency, and read markers only advance.
  Chat owns the small workflow projection models it renders rather than
  importing session service internals.
- `places`: backend-proxied Kakao place search.
- `notifications` and `push`: durable in-app state, device registration,
  preferences, outbox, and delivery.
- `support`, `reports`, and `blocks`: user safety and support workflows.
- `account-deletion-requests`: verification and destructive account cleanup.
- `admin`: support, moderation, operational summary, and test notification.

## Workers

The production container owns the HTTP runtime and one exclusive push loop.
The push worker claims durable rows with PostgreSQL concurrency controls and is
safe to restart. Do not run a second push worker against production.

AI summaries are source-grounded reading aids only. They must never rank,
score, select, or reject users. Their generation switches remain independent
from the core interview workflow. When enabled, one in-process AI loop claims
`ai_summary_artifacts` rows in bounded batches with PostgreSQL `SKIP LOCKED`.
The claim transaction completes before Gemini I/O, and completion is guarded by
source hash, prompt version, and work version. Stale processing rows are reset
or failed under the bounded-attempt policy. All AI switches default to off.

## Error Contract

Preserve the standard error envelope, `X-Request-ID`, validation details, and
safe logging described by `docs/reference/error-observability-contract.md`.
Never expose secrets, access tokens, private chat content, or raw provider
responses in client errors.

## Schema Migrations

Flyway is the only schema migration authority.

- `B0024__alembic_schema_baseline.sql` is the immutable initial Spring baseline
  derived from the final legacy schema.
- `V0026` adds the recruitment-type discriminator and `V0027` adds
  survey/beta-test conditional fields plus survey participation state.
- New schema work starts at `V0025__...sql` and proceeds monotonically.
- Never edit an applied migration. Add a new versioned migration instead.
- Testcontainers integration tests must prove clean-database migration before
  deployment.
- Breaking changes use expand/deploy/backfill/contract sequencing.

The frozen compatibility OpenAPI baseline remains only for contract regression
checks.

## API Documentation

- Swagger UI: `/swagger-ui/index.html`
- OpenAPI JSON: `/v3/api-docs`
- Swagger groups routes by product domain and uses concise operation names.
- Keep request/response schema generation in DTOs and verify changes with the
  OpenAPI contract integration tests.

## Backend Risk Rules

- Verify Supabase bearer tokens before protected business logic.
- Re-read ownership and role capability on the server.
- Keep account deletion, application/session transitions, and moderation
  actions transactional and audited.
- Use idempotency and database constraints for retry-sensitive writes.
- Keep Supabase as the durable system of record; Lightsail local disk is not
  durable product storage.
