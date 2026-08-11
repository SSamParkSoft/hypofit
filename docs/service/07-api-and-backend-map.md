# API And Backend Map

Status: service-source-of-truth

Last updated: 2026-08-11

## Backend Shape

The canonical backend is the Java 21 Spring Boot application in `apps/api`.
It runs as one Docker container on Amazon Lightsail and uses Supabase Postgres
and Supabase Auth as durable infrastructure.

Expected flow:

```text
Spring MVC controller
  -> bearer-token and request validation
  -> application service transaction
  -> repository or persistence adapter
  -> Supabase Postgres
```

Controllers stay thin. Application services own business rules and transaction
completion. Repositories do not call external providers or decide commit
policy.

## Main Directories

```text
src/main/java/com/contentruck/hypofit/<domain>/web          HTTP boundary
src/main/java/com/contentruck/hypofit/<domain>/application use cases
src/main/java/com/contentruck/hypofit/<domain>/domain      domain read models
src/main/java/com/contentruck/hypofit/<domain>/persistence database adapters
src/main/java/com/contentruck/hypofit/common               shared config/errors
src/main/resources/db/migration                            Flyway migrations
src/test                                                    unit/integration tests
scripts                                                     contract/Gradle helpers
```

## Route Families

- `health`: liveness/readiness, database and provider configuration.
- `me`: profile read, synchronization, and update.
- `auth/social`: provider capability, attempt, completion, identity inventory,
  reconciliation, and Apple server notification.
- `interview-posts`: search, detail, creation, update, status, and view state.
- `applications`: apply, withdraw, founder selection/rejection, and applicant
  detail including founder-only AI summary.
- `sessions`: schedule, attendance, completion, reward, no-show, and review.
- `chat`: rooms, messages, read state, participant settings, and workflow.
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
from the core interview workflow.

## Error Contract

Preserve the standard error envelope, `X-Request-ID`, validation details, and
safe logging described by `docs/reference/error-observability-contract.md`.
Never expose secrets, access tokens, private chat content, or raw provider
responses in client errors.

## Schema Migrations

Flyway is the only schema migration authority.

- `B0024__alembic_schema_baseline.sql` is the immutable initial Spring baseline
  derived from the final legacy schema.
- New schema work starts at `V0025__...sql` and proceeds monotonically.
- Never edit an applied migration. Add a new versioned migration instead.
- Testcontainers integration tests must prove clean-database migration before
  deployment.
- Breaking changes use expand/deploy/backfill/contract sequencing.

The retired FastAPI source and Alembic tree are no longer executable parts of
the repository. The frozen legacy OpenAPI baseline remains only for contract
regression checks.

## Backend Risk Rules

- Verify Supabase bearer tokens before protected business logic.
- Re-read ownership and role capability on the server.
- Keep account deletion, application/session transitions, and moderation
  actions transactional and audited.
- Use idempotency and database constraints for retry-sensitive writes.
- Keep Supabase as the durable system of record; Lightsail local disk is not
  durable product storage.
