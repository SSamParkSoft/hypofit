# FastAPI to Spring Boot Backend Migration Plan

Status: completed - historical migration record

Last updated: 2026-08-11

Owner: contentruck

> Closed on 2026-08-11. Spring is now the canonical `apps/api`, Flyway is the
> schema authority, and the FastAPI/Alembic working tree has been removed.
> Paths and runtime observations below are retained as historical evidence.

## 1. Decision Summary

Hypofit is replacing FastAPI with Spring Boot through a parallel replacement,
not an in-place rewrite. The canonical domain now reaches Spring on Lightsail;
the migration remains active for authenticated smoke, stabilization, migration
authority takeover, and repository cleanup.

The historical transition repository shape was:

```text
apps/api/          FastAPI contract and migration reference
apps/api-spring/   Spring Boot candidate during stabilization
```

The Spring implementation has passed contract, build, data-connectivity,
deployment, public readiness, CORS, and authentication-boundary gates. During
the remaining stabilization period:

- the Spring candidate served `https://hypofit-api.bukae.co.kr` from Lightsail.
- FastAPI remained a contract and Alembic reference, not a live rollback
  runtime.
- Supabase remains the durable database and authentication system.
- Alembic remains the only database migration authority.
- The public API paths, response bodies, status codes, and error contract do
  not change.
- The web and mobile clients do not need a migration-specific API version.

After the stabilization and closure period:

1. Flyway becomes the only migration authority through a controlled baseline.
2. `apps/api` is renamed to `apps/api`.
3. FastAPI source is removed from the working tree but remains available in Git
   history.

Creating a permanent second backend is not the goal. `apps/api` is a
temporary migration boundary.

## 2. Why A New Directory Is Required

Replacing `apps/api` in place would remove the known-good implementation before
the replacement can prove compatibility. It would also mix:

- Python and Java build systems.
- Alembic and Flyway migration state.
- Uvicorn and JVM runtime configuration.
- Existing and replacement systemd services.
- Existing and replacement test failures.
- Production rollback artifacts.

A separate directory provides:

- A stable FastAPI reference during implementation.
- Side-by-side contract comparison.
- Independent build and test commands.
- Separate deployment units and ports.
- A fast rollback path after cutover.
- A clear final cleanup step instead of an indefinitely mixed codebase.

## 3. Migration Principles

### 3.1 Preserve Behavior Before Improving Internals

The first Spring release is a framework replacement, not an API redesign.
Preserve:

- `/health`, `/api/v1/health`, and `/api/v1/health/ready`.
- All `/api/v1` endpoint paths and HTTP methods.
- Request and response field names.
- Existing enum and workflow status values.
- Existing pagination and list response shapes.
- Existing authorization and ownership rules.
- Existing validation behavior and status codes.
- Existing database tables, columns, constraints, and indexes.
- Existing account deletion and retention behavior.
- Existing push, support, report, block, audit, and social-auth behavior.

Internal improvements are allowed only when they do not change observable
behavior and are covered by tests.

### 3.2 One Production Implementation At A Time

The two applications may run side by side for validation, but normal public
traffic must have one authoritative implementation.

Do not split state-changing production routes between FastAPI and Spring during
the MVP migration. A path-by-path write split would create:

- Different transaction behavior for related resources.
- Ambiguous worker ownership.
- Hard-to-debug cache and stale-state behavior.
- More complicated rollback.
- Duplicate notification or external-provider side effects.

Implement by domain slices, validate in a candidate environment, then perform
one whole-API ingress cutover.

### 3.3 One Schema Migration Authority At A Time

Alembic and Flyway must never both be allowed to mutate the shared schema.

Migration ownership:

| Stage | Schema authority | Spring Flyway behavior |
| --- | --- | --- |
| Parallel implementation | Alembic | Disabled |
| Candidate validation | Alembic | Validation/read-only preparation |
| Cutover preparation | Frozen Alembic head | Controlled Flyway baseline |
| Spring production | Flyway | Enabled and authoritative |
| FastAPI retirement | Flyway | Alembic archived with FastAPI |

### 3.4 Practical Sufficiency

Do not use the migration to introduce microservices, Kafka, Redis as a critical
store, reactive programming, a new identity system, a new public API version,
or a database redesign. Add safeguards for observed concurrency, security,
privacy, data-integrity, and store-review risks. Do not create abstractions for
hypothetical future products.

## 4. Current Backend Baseline

The current FastAPI application has:

- 71 normalized OpenAPI paths and 82 HTTP operations including health routes.
- 24 Alembic migrations from `0001` through `0024`.
- 30 backend test modules.
- A route, service, repository, schema, and model separation.
- A database-backed push delivery worker.
- Supabase Auth bearer-token verification.
- A stable structured error envelope and request-ID contract.

Current route modules:

```text
health
me
interview_posts
interview_post_views
applications
chat
sessions
notifications
push
support
admin_support
admin_operations
admin_account_deletion
account_deletion
social_auth
places
blocks
moderation
```

Current high-risk domains:

1. Supabase JWT verification and social identity completion.
2. Application selection and rejection state transitions.
3. Chat-room ownership, unread state, and message idempotency.
4. Session completion, attendance, reward confirmation, and reviews.
5. Account deletion, retained data, redaction, and clean re-registration.
6. Push outbox claiming and duplicate-delivery prevention.
7. Support, report, block, moderation, and operator audit behavior.

### 4.1 Spring Candidate Status On 2026-08-08

The parallel Spring candidate currently has:

- the same 71 OpenAPI paths and 82 HTTP operations as the FastAPI baseline,
  with no missing or extra path/method pairs
- typed request DTOs for the previously broad JSON request bodies and explicit
  OpenAPI parameter types for the verified high-value mismatches
- FastAPI-parity Kakao place responses including `source = "kakao"`, plus
  interview discovery validation for query length, non-negative reward bounds,
  and latitude/longitude ranges
- notification writes and push-outbox creation wired into application, chat,
  session, support-reply, and admin test-notification workflows
- application lifecycle side effects now routed through the public
  `chat.application` boundary, with chat-room SQL owned by chat persistence
- FastAPI-parity audit writes for interview updates/status changes,
  application withdrawal, session/reward/review transitions, and the account
  deletion request, verification, profile-image purge, and auth-cleanup
  lifecycle
- account deletion now commits anonymization before calling Supabase Storage
  or Auth, then records each external cleanup result in a separate transaction
- idempotent delivery creation through
  `on conflict (notification_id, push_device_id) do nothing`
- passing Spring Modulith package-boundary verification with the intended
  `common.web`, `notification.application`, and `notification.domain` APIs
  exposed as named interfaces
- 294 passing tests across 79 suites in the Docker-independent regular Gradle
  gate, plus 48 passing integration tests across 22 suites in the Docker-backed
  gate. The latter applies Alembic head to PostgreSQL 16 and covers application,
  chat, push outbox, exclusive worker leasing, session/reward/review, social
  identity, account-deletion concurrency, and Flyway schema parity. Checkstyle,
  strict compilation, and the Gradle production build also pass.

The semantic OpenAPI comparison now reports zero unapproved differences across
request bodies, responses, and parameters.
The normalizer now resolves path-reachable component references, removes only
FastAPI-generated `HTTPValidationError` 422 responses, normalizes wildcard JSON
media types and numeric representation, and treats response-only
`required`/nullable generator differences as runtime serialization noise.
Equivalent request nullable-union encodings now share a canonical form while
nullability itself remains strict. Request constraints, enums, formats, status
codes, security, fields, and concrete response types remain strict. Equal route
coverage and semantic OpenAPI parity complete the static API contract gate, but
do not by themselves approve production cutover.
JSON Schema `type` unions are now sorted before comparison because union member
order has no runtime meaning. This removed 66 false-positive request-body
differences while retaining nullability, member types, and every other request
constraint as strict comparison inputs.

The candidate OpenAPI document now resolves every component-schema reference.
The previously customized nullable chat-read body referenced a missing
`ChatRoomReadUpdate` component; the request DTO now publishes that exact schema
name and the integration regression test verifies both the reference and its
target. The bounded chat request/query pass also aligns message-create, read,
participant-settings, cursor, and page-limit metadata while preserving runtime
blank-message and range validation. The subsequent response pass aligns chat
message types and workflow step/action/tone/default metadata without changing
the serialized response or workflow logic. The final chat response pass aligns
room, interview-post summary, founder-review summary, and message-body type
metadata. No unapproved chat-path contract difference remains.
The subsequent interview response pass aligns the interview-post summary,
founder-review summary, and interview-post-view response constraints, enums,
defaults, and numeric metadata without changing serialized values or business
behavior. No unapproved interview-post or interview-post-view response
difference remains. The following request/query pass aligns write-schema
numeric metadata and optional list-filter nullability while preserving the
existing parsers and validation. No unapproved interview-post request, query,
or response difference remains.
The admin-support response now includes the FastAPI-compatible `replies` array
alongside operator events. FastAPI currently emits that inherited field as an
empty array, so Spring preserves the same observable payload while leaving
reply-projection improvements for post-migration product work.
The final response-metadata pass aligns admin role/support-summary defaults,
push-dispatch numeric metadata, admin target enums, and place coordinate/source
metadata without changing serialization or service behavior. No unapproved
response contract difference remains.
The final request/parameter pass aligns `/me` sync/update constraints,
application status-update metadata, push-device defaults and required fields,
admin/support filters, and place-search nullability and bounds. Focused OpenAPI
regression tests now pin these generator-sensitive schemas. No unapproved
request-body or parameter difference remains.

Captured non-secret environment-variable inventory:

```text
ACCOUNT_DELETION_HASH_PEPPER
ADMIN_EMAILS
APPLE_SIGN_IN_APP_ID
APPLE_SIGN_IN_JWKS_CACHE_SECONDS
APPLE_SIGN_IN_JWKS_URL
CORS_ORIGINS
DATABASE_URL
ENV
JWT_AUDIENCE
KAKAO_REST_API_KEY
LOCAL_TMP_DIR
PUBLIC_WEB_BASE_URL
PUSH_*
RESEND_API_KEY
RESEND_FROM_EMAIL
SOCIAL_AUTH_*
SUPABASE_JWKS_CACHE_SECONDS
SUPABASE_JWKS_URL
SUPABASE_JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
SUPPORT_EMAIL
```

The inventory records names and feature groups only. Secret values must not be
written to source control. The normalized FastAPI OpenAPI baseline and empty
explicit compatibility allowlist live under `apps/api/contracts/`.

## 5. Target Technology Baseline

### 5.1 Runtime

- Java 21 LTS.
- Spring Boot 4.1.x.
- Spring Framework 7.x through the Spring Boot dependency platform.
- Gradle Wrapper.
- Gradle Kotlin DSL for build configuration.
- Java for application source.
- Embedded Tomcat with Spring MVC.
- Executable JAR deployment.

Spring Boot 4.1.0 is the current official release at the time of this plan. It
requires Java 17 or later and supports Gradle 8.14+ or Gradle 9.x. Java 21 is
selected as the conservative LTS production baseline.

Do not use:

- Kotlin application code in the first migration.
- WebFlux or R2DBC.
- GraalVM native-image work.
- WAR deployment.
- A Spring Cloud microservice stack.

The existing workflows are relational, transactional, and mostly request/DB
bound. Spring MVC, JDBC, and imperative transactions are the simpler fit.

### 5.2 Core Dependencies

Initial dependency set:

```text
org.springframework.boot:spring-boot-starter-web
org.springframework.boot:spring-boot-starter-validation
org.springframework.boot:spring-boot-starter-security
org.springframework.boot:spring-boot-starter-oauth2-resource-server
org.springframework.boot:spring-boot-starter-data-jpa
org.springframework.boot:spring-boot-starter-jdbc
org.springframework.boot:spring-boot-starter-actuator
org.postgresql:postgresql
org.flywaydb:flyway-core
org.flywaydb:flyway-database-postgresql
org.springdoc:springdoc-openapi-starter-webmvc-ui:3.x
io.micrometer:micrometer-registry-prometheus
org.springframework.modulith:spring-modulith-starter-core
org.springframework.boot:spring-boot-starter-test
org.springframework.security:spring-security-test
org.testcontainers:postgresql
org.testcontainers:junit-jupiter
org.springframework.modulith:spring-modulith-starter-test
```

Add Sentry Java and an HTTP test stub such as WireMock only when the matching
foundation phase is implemented.

Avoid Lombok and MapStruct initially. Prefer Java records for transport DTOs
and explicit mappers where conversion is non-trivial. This keeps generated
behavior out of the first parity migration.

### 5.3 Version Policy

- Pin the Spring Boot plugin to one reviewed `4.1.x` patch.
- Use the Spring Boot dependency-management platform for Spring libraries.
- Commit the Gradle wrapper.
- Use Java toolchains to require Java 21.
- Do not combine the framework migration with a Java or Spring major upgrade.
- Run dependency and security checks before each production candidate.

## 6. Target Directory And Package Structure

Transitional repository layout:

```text
apps/api/
  README.md
  build.gradle.kts
  settings.gradle.kts
  gradle.properties
  gradlew
  gradlew.bat
  gradle/
    wrapper/
  src/
    main/
      java/com/contentruck/hypofit/
        HypofitApplication.java
        common/
          config/
          error/
          observability/
          security/
          web/
        user/
        interview/
        application/
        chat/
        session/
        support/
        moderation/
        notification/
        socialauth/
        accountdeletion/
        place/
      resources/
        application.yml
        application-local.yml
        application-test.yml
        db/migration/
    test/
      java/com/contentruck/hypofit/
```

Use package-by-feature. Within a feature, use only the layers it needs:

```text
interview/
  web/
    InterviewPostController.java
    InterviewPostRequest.java
    InterviewPostResponse.java
  application/
    InterviewPostService.java
  domain/
    InterviewPost.java
    InterviewPostStatus.java
  persistence/
    InterviewPostEntity.java
    InterviewPostRepository.java
    InterviewPostPersistenceAdapter.java
```

Rules:

- `web` handles HTTP input/output only.
- `application` owns transactions and use-case orchestration.
- `domain` owns workflow rules and state transitions.
- `persistence` owns JPA/JDBC mapping and database queries.
- `common` contains cross-cutting infrastructure, not product workflows.
- Controllers do not return JPA entities.
- Feature packages do not read another feature's persistence package directly.
- Cross-feature operations call an application-facing service or explicit port.
- Do not force every small feature to have empty layer packages.

Spring Modulith is used only to verify package boundaries and module
dependencies. Do not introduce event-driven complexity solely to satisfy the
library.

## 7. API Compatibility Contract

### 7.1 Public Boundary

The canonical API remains:

```text
https://hypofit-api.bukae.co.kr
```

The client-visible version remains:

```text
/api/v1
```

No web or mobile base-URL change is required for the final cutover.

### 7.2 JSON Compatibility

Spring Jackson configuration must preserve:

- `snake_case` JSON field names.
- Existing enum strings and capitalization.
- Existing `null` inclusion behavior.
- Existing date and time serialization.
- UTC storage and ISO-8601 transport behavior.
- UUID string behavior.
- Existing decimal and integer representation.
- Unknown-field behavior where clients currently depend on it.

Do not expose Hibernate entities, lazy proxies, or internal identifiers.

### 7.3 Validation Compatibility

Spring normally returns different validation status and payload shapes from
FastAPI. Add an explicit global validation mapper so the client still receives
the current Hypofit contract.

Preserve:

- HTTP `422` for request validation failures where FastAPI currently uses 422.
- Field paths and readable per-field messages.
- Domain conflict errors as `409`.
- Missing authentication as `401`.
- Forbidden ownership or role actions as `403`.
- Not found behavior as `404`.

### 7.4 Error Envelope

All application errors must keep this shape:

```json
{
  "error": {
    "code": "stable_machine_code",
    "message": "safe user-facing message",
    "status": 422,
    "request_id": "req_example",
    "debug_message": null,
    "field_errors": null
  }
}
```

Use `@RestControllerAdvice` and typed domain exceptions. Do not expose Spring
`ProblemDetail`, stack traces, SQL messages, JWT details, or provider secrets
to clients.

### 7.5 Request ID

A highest-precedence servlet filter must:

1. Accept a syntactically safe incoming `X-Request-ID`.
2. Generate one when missing or invalid.
3. place it in MDC for structured logs.
4. Return it on every response, including errors.
5. Include it in the error envelope.
6. Remove it from MDC after the request.

### 7.6 OpenAPI

Spring OpenAPI output is not required to have identical document ordering, but
it must describe the same public contract. Store:

- A normalized FastAPI OpenAPI baseline.
- A normalized Spring OpenAPI candidate.
- A machine-readable compatibility diff.
- Explicit approved differences.

Boot 4 requires the springdoc 3.x line. Pin that version through the build.

## 8. Authentication And Authorization

### 8.1 Session Ownership

Supabase Auth remains the only session issuer. Spring does not issue a second
Hypofit JWT.

Client flow remains:

```text
Apple / Google / Kakao / Naver authorization
  -> Supabase Auth session
  -> Authorization: Bearer <Supabase access token>
  -> Spring verifies token
  -> Spring applies Hypofit account and ownership policy
```

### 8.2 Resource Server

Use Spring Security OAuth2 Resource Server and JOSE support:

- Configure the Supabase issuer.
- Configure the Supabase JWK Set URI explicitly when required.
- Validate signature, `exp`, `nbf`, issuer, and `aud=authenticated`.
- Map the `sub` claim to the acting Supabase user UUID.
- Preserve current clock-skew behavior.
- Preserve observed ES256/RS256 support.
- Keep HS256 fallback only if current issued tokens or a concrete migration
  requirement still need it.

Spring Security supports issuer, JWK Set, audience validation, key rotation, and
mapping the principal name to `sub`; custom validators and converters should
only add Hypofit-specific requirements.

### 8.3 Authorization

- Route rules define public versus authenticated endpoints.
- Method or application-layer checks enforce admin capability.
- Services validate ownership from authenticated user identity.
- Repositories use authenticated IDs supplied by trusted services.
- Never accept frontend role or owner fields as authority.
- CORS must preserve the canonical web and compatibility origins.
- CSRF remains disabled for bearer-token stateless API routes.

### 8.4 Social Identity Completion

The Spring implementation must preserve:

- Provider capability discovery.
- Social-auth attempt state and expiry.
- Provider subject uniqueness.
- Supabase identity re-read with server authority.
- Missing-email behavior.
- Identity-link/unlink policy.
- Apple server notification handling.
- Account-deletion revocation and cleanup behavior.
- Existing stable error codes.

## 9. Persistence And Transactions

### 9.1 Database

Supabase PostgreSQL remains the system of record. The Spring application uses:

- HikariCP.
- PostgreSQL JDBC driver.
- JPA for ordinary aggregate persistence.
- `JdbcClient` or native SQL for PostgreSQL-specific and lock-sensitive paths.
- Explicit DTO projections for complex list queries where appropriate.

Spring reuses the GPU DB tunnel endpoint when direct database egress is blocked:

```text
Spring Boot
  -> 127.0.0.1:15432
  -> EC2 SSH local forward
  -> Supabase pooler
```

### 9.2 Transaction Ownership

Use `@Transactional` at public application-service methods.

Rules:

- Controllers do not start or complete transactions.
- Repositories do not commit.
- Core state changes complete in one service transaction when practical.
- External HTTP delivery is not held inside a long database transaction.
- Post-commit provider work uses the existing durable outbox/job model.
- Read-only services use `@Transactional(readOnly = true)` when useful.
- Do not rely on self-invocation of `@Transactional` methods.

### 9.3 Concurrency Contracts

Preserve and test:

- One active application per user/post where currently constrained.
- Conditional selection and rejection transitions.
- One chat room for the intended participant/post relationship.
- Client-generated chat-message idempotency.
- Session transition conflicts returning `409`.
- One attendance/reward/review record per existing uniqueness policy.
- Push delivery claim and deduplication.
- Social identity uniqueness.
- Account deletion resend/attempt limits.

Use database unique constraints, conditional updates, and row locking where the
FastAPI implementation currently depends on them. Do not replace database
guarantees with JVM-only locks.

### 9.4 Entity Mapping Rules

- Preserve existing table and column names.
- Preserve UUID types.
- Preserve PostgreSQL enum/text semantics exactly.
- Preserve timezone-aware timestamps.
- Preserve soft-delete and retained-data fields.
- Set Hibernate schema generation to validation only.
- Disable `open-in-view`.
- Avoid unrestricted cascades.
- Avoid automatic orphan deletion until explicitly proven equivalent.
- Make N+1 behavior visible through tests and metrics for primary list routes.

## 10. Alembic To Flyway Transition

### 10.1 Parallel Phase

While FastAPI is production:

- Alembic remains enabled and authoritative.
- Spring uses the schema but does not migrate it.
- Spring config sets Flyway migration execution off for shared environments.
- Hibernate uses `ddl-auto=validate` or equivalent validation.
- Any necessary schema change is implemented in Alembic first and documented
  for later Flyway baseline inclusion.

### 10.2 Schema Freeze

Before takeover:

1. Record the exact Alembic head, currently `0024_add_ai_summary_artifacts`.
2. Freeze non-critical schema changes.
3. Export the effective production schema.
4. Compare it with a clean database built from all Alembic migrations.
5. Resolve drift before creating the Flyway baseline.

### 10.3 Flyway Baseline

Create a deterministic Flyway baseline for the exact schema represented by the
final frozen Alembic head. The checked-in `B0023` plus schema-neutral `V0024`
were valid preparation artifacts before the AI-summary migration, but they are
not the final takeover baseline now that Alembic head is `0024`.

Recommended files:

```text
src/main/resources/db/migration/
  B0024__alembic_schema_baseline.sql
```

For a clean test database, the baseline must create the current schema. For the
existing production database, perform an explicit controlled Flyway baseline at
version `24` after the regenerated baseline matches production.

Do not enable automatic `baselineOnMigrate=true` in production. Automatic
baseline can hide an incorrect or unexpected schema.

Future Spring-owned migrations start at:

```text
V0025__descriptive_change.sql
```

### 10.4 Takeover Gate

Flyway becomes authoritative only when:

- The FastAPI deployment no longer needs to apply new migrations.
- Spring has passed full contract and data tests.
- The production schema matches the baseline.
- Flyway validation passes.
- The baseline operation has a backup and rollback procedure.
- The first post-baseline migration has been tested from both a clean database
  and a production-like schema snapshot.

Flyway validates migration names, checksums, and applied state. Treat validation
failure as a deployment blocker.

### 10.5 Backup And Rollback Procedure

The production takeover is an explicit maintenance operation, not an automatic
application-startup side effect:

1. Keep FastAPI serving and stop schema-changing releases.
2. Confirm `alembic_version` is exactly the final frozen revision, currently
   `0024_add_ai_summary_artifacts`, and compare the effective production schema
   with a regenerated `B0024` snapshot.
3. Create a timestamped, encrypted PostgreSQL custom-format backup and record
   its location, checksum, database identity, Alembic head, and operator. Verify
   that `pg_restore --list` can read the artifact before continuing.
4. Disable application writes for the short takeover window and perform an
   explicit Flyway baseline at version `24`. Never enable
   `baselineOnMigrate=true` against production.
5. Run `flyway validate`, apply the first post-baseline migration beginning at
   `V0025`, validate again, and compare the effective schema. The existing
   schema-neutral `V0024` preparation marker must be replaced as part of the
   baseline regeneration rather than reused as the final takeover history.
6. Resume writes only after the Spring candidate and FastAPI rollback path both
   pass their read-only health checks.

If baseline, validation, or schema comparison fails before a schema-changing
Flyway migration runs, stop and keep FastAPI authoritative; do not edit or
delete migration-history rows to force success. If a later Spring-owned
migration changes the schema and rollback requires the old schema, stop both
workers and application writes, restore the verified backup into a replacement
database, point FastAPI at that restored database, run smoke checks, and only
then resume traffic. Every future schema-changing Flyway migration must provide
its own forward-fix or restore decision in the deployment record.

## 11. External Integrations

Create typed configuration and bounded clients for:

- Supabase Auth Admin.
- Supabase JWKS.
- Kakao Local/places.
- Resend email.
- APNs.
- FCM.
- Apple sign-in server notifications.

Use Spring `RestClient` or an HTTP Interface for imperative calls. Each client
must define:

- Base URL.
- Connect timeout.
- Read timeout.
- Authentication headers.
- Request and response DTOs.
- Provider error mapping.
- Safe structured logging.
- Metrics.

Retry only idempotent operations or operations protected by an idempotency
contract. Do not add a generic automatic retry around mutations.

Secrets remain server-side environment variables. Validate required production
settings at startup without logging secret values.

## 12. Push Delivery Worker

The normal production target keeps the worker as a separate process even if it
shares the Spring application artifact. The pre-operation school-GPU rehearsal
is a documented temporary exception: one Spring JVM may expose HTTP and own the
push loop through `production,push-worker` because only one runtime is active
and traffic is not yet live. That exception is defined and rolled back through
`spring-single-runtime-gpu-to-lightsail-plan.md`; it must not start the separate
Spring worker service at the same time.

Possible runtime modes:

```text
SPRING_PROFILES_ACTIVE=api
SPRING_PROFILES_ACTIVE=push-worker
```

Worker rules:

- The API process does not run the worker scheduler.
- The worker process does not expose public API traffic.
- Claim deliveries with PostgreSQL locking such as `FOR UPDATE SKIP LOCKED`.
- Preserve retry counters, terminal status, provider response metadata, and
  deduplication.
- Only one backend implementation's worker is active against production at a
  time.
- During cutover, stop the FastAPI worker before starting the Spring worker.
- Rollback reverses that sequence.

Do not add Redis or a durable queue solely for this migration.

## 13. Health, Observability, And Operations

### 13.1 Health Contracts

Keep public compatibility routes:

```text
GET /health
GET /api/v1/health
GET /api/v1/health/ready
```

Use Actuator internally:

```text
/actuator/health/liveness
/actuator/health/readiness
/actuator/prometheus
```

Liveness must not fail because Supabase or an external provider is temporarily
unavailable. Readiness may include required database connectivity. Provider
health should normally be reported separately rather than removing the process
from service.

### 13.2 Logs

Structured logs must include:

- timestamp
- level
- service name
- environment
- request ID
- route template
- HTTP method
- status
- duration
- authenticated user ID only where operationally necessary
- stable error code

Never log access tokens, OTPs, provider secrets, full request bodies, chat
contents, support contents, or unnecessary personal data.

### 13.3 Metrics And Tracing

Use Actuator and Micrometer for:

- request rate, latency, and status
- database pool saturation
- JVM heap and GC
- external-provider latency and failures
- push outbox depth and delivery outcomes
- authentication failures by stable code
- readiness state

Use Micrometer Observation as the instrumentation boundary. Preserve Sentry for
actionable exceptions and release diagnostics if it remains part of the
production mobile/API triage workflow.

### 13.4 Shutdown

Enable graceful shutdown. On stop:

1. Mark readiness unavailable.
2. Stop accepting new work.
3. Allow in-flight requests a bounded completion period.
4. Release database connections.
5. Terminate the process before systemd timeout.

## 14. Test Strategy

### 14.1 Test Layers

| Layer | Tool | Purpose |
| --- | --- | --- |
| Domain | JUnit 5 | State rules and pure logic |
| Controller | MockMvc | HTTP mapping, validation, auth, errors |
| Persistence | Testcontainers PostgreSQL | Real constraints, SQL, locks |
| Application | Spring Boot integration test | Transactions and workflows |
| Security | spring-security-test | JWT and authorization |
| External clients | WireMock or equivalent | Provider contracts/timeouts |
| Module boundaries | Spring Modulith test | Package dependency rules |
| Black box | Shared contract harness | FastAPI/Spring parity |

Testcontainers is required for persistence behavior. H2 must not be used as the
primary repository test database because it does not reproduce PostgreSQL
constraints, SQL, lock behavior, or types.

### 14.2 Golden Contract Harness

Before porting routes:

1. Generate the current FastAPI OpenAPI document.
2. Create fixtures for successful and failed requests.
3. Normalize volatile fields such as IDs, timestamps, and request IDs.
4. Run fixtures against FastAPI.
5. Run the same fixtures against Spring.
6. Diff status, headers, JSON shape, enums, and error codes.

Do not compare only happy paths.

Minimum negative cases:

- missing/invalid/expired token
- missing role or ownership
- malformed UUID
- validation errors
- duplicate application
- stale state transition
- blocked-user interaction
- deleted or inactive account
- unavailable provider
- database conflict

### 14.3 Concurrency Tests

Run real PostgreSQL concurrent tests for:

- two simultaneous applications to one post
- simultaneous selection/rejection
- duplicate client message IDs
- simultaneous session completion
- duplicate reward confirmation
- duplicate review submission
- concurrent push worker claims
- concurrent social identity linking
- repeated account deletion verification

### 14.4 Performance Baseline

Measure the current FastAPI API before setting Spring thresholds:

- startup and readiness time
- p50/p95/p99 latency for representative primary reads
- memory at idle and under representative load
- database connection use
- throughput for interview search and other read-heavy endpoints
- worker throughput

Use `apps/api/scripts/load_baseline.py` as the tracked representative
read-load harness for conservative FastAPI versus Spring comparison. The
harness is intentionally stdlib-only, read-only, and low-volume so it can run
on the GPU host against localhost services without introducing new operational
dependencies.

Default tracked representative targets:

- `GET /health`
- `GET /api/v1/interview-posts/?limit=20`

Default conservative load shape:

- warmup: 2 requests per target and implementation
- measured: 24 requests per target and implementation
- concurrency: 4
- timeout: 3 seconds

Default acceptance thresholds:

- each implementation error rate must remain `0.0`
- Spring mean latency must stay within `max(FastAPI * 1.35, FastAPI + 30ms)`
- Spring p95 latency must stay within `max(FastAPI * 1.5, FastAPI + 50ms)`
- Spring p99 latency must stay within `max(FastAPI * 1.75, FastAPI + 75ms)`

The JSON report must avoid secrets. Sanitize base URLs before persistence and
do not write request headers, bearer tokens, or response bodies into the load
artifact.

This harness does not replace memory and connection-pool observation. Record
idle and under-load JVM/Python memory, connection usage, and worker throughput
separately during candidate validation.

The first Spring candidate should not be accepted if it materially degrades the
MVP under the same environment without an understood tradeoff.

## 15. Deployment Topology During Migration

### 15.1 Current Production

```text
canonical API domain
  -> EC2 Nginx
  -> FastAPI active upstream
  -> EC2 18000 or 18001
  -> reverse SSH
  -> GPU 8000 or 8001
```

### 15.2 Spring Candidate

Reserve a separate port family:

```text
Spring blue  GPU 8100 -> EC2 18100
Spring green GPU 8101 -> EC2 18101
```

These are plan defaults and must be checked for conflicts before installation.

Use:

- Dedicated Spring systemd API units.
- Dedicated Spring reverse-tunnel units.
- A dedicated candidate Nginx upstream.
- A protected staging hostname or operator-only access path.
- A separate Spring active-color and active-SHA state file.
- The existing DB tunnel.

Do not point the canonical API hostname to Spring until all cutover gates pass.

### 15.3 JVM Runtime Starting Point

Initial measured starting point, not a permanent guarantee:

```text
-Xms128m
-Xmx512m
-XX:MaxRAMPercentage=65
```

Configure systemd memory and CPU limits after observing the GPU host. Blue/green
deployment temporarily runs two JVMs, so validate combined peak memory before
enabling production switching.

### 15.4 Artifact

Build a versioned executable JAR:

```text
hypofit-api-<git-sha>.jar
```

The deploy script should:

1. Verify a clean intended commit.
2. Build or receive the exact JAR for that commit.
3. Install it into a release directory.
4. Start the inactive Spring color.
5. Poll compatibility readiness.
6. Run internal smoke tests.
7. Switch only the Spring candidate upstream.
8. For final cutover, switch the canonical upstream.
9. Drain the previous process.
10. Record active implementation, color, and SHA.

## 16. Cutover And Rollback

### 16.1 Cutover Preconditions

All must be true:

- Every public route has a Spring implementation or is explicitly removed from
  both clients and API contract.
- OpenAPI compatibility diff is approved.
- Golden black-box tests pass.
- PostgreSQL integration and concurrency tests pass.
- Auth and social-auth tests pass.
- Account deletion and store-review-sensitive flows pass.
- Push worker parity passes.
- Candidate deployment has stable logs and metrics.
- Schema is frozen and Flyway takeover is prepared.
- No high-severity unresolved Spring errors remain.
- Rollback commands have been rehearsed.

### 16.2 Cutover Sequence

1. Announce the deployment window.
2. Confirm backups and schema head.
3. Pause non-essential schema changes.
4. Deploy Spring candidate blue/green.
5. Run production-read-only smoke against candidate.
6. Stop the FastAPI push worker.
7. Start the Spring push worker and confirm exclusive claiming.
8. Switch the canonical Nginx upstream to Spring.
9. Run authenticated read/write smoke.
10. Monitor errors, latency, DB pool, worker depth, and JVM memory.
11. Keep FastAPI processes and artifacts ready for rollback.

### 16.3 Immediate Rollback Triggers

Rollback without extended diagnosis when:

- authentication is broadly failing
- account or ownership data is exposed incorrectly
- state transitions create duplicate or invalid data
- error rate materially exceeds baseline
- database connections saturate
- push deliveries duplicate or stop processing
- account deletion or report/block paths regress
- process restarts or memory growth are uncontrolled

### 16.4 Rollback Sequence

1. Stop or fence the Spring push worker.
2. Switch canonical Nginx upstream back to FastAPI.
3. Restore the FastAPI push worker.
4. Verify health and authenticated smoke.
5. Preserve Spring logs and release metadata.
6. Reconcile any writes performed during the Spring window.

Schema changes must remain backward compatible throughout the rollback window.
Use expand/deploy/backfill/contract for any migration needed during the
transition.

### 16.5 Stabilization

Keep FastAPI rollback-ready for at least seven calendar days after cutover and
until:

- no critical parity issue is open
- normal traffic has exercised the core workflow
- one worker retry cycle has completed
- support, deletion, and social-auth paths have been exercised
- operational owners accept JVM resource behavior

## 17. Implementation Phases

### Phase 0: Baseline And Freeze Rules

- [x] Record route count and route inventory.
- [x] Export normalized FastAPI OpenAPI.
- [x] Record Alembic head and migration inventory.
- [x] Capture current environment-variable inventory without secret values.
- [x] Capture FastAPI read-load baseline with `load_baseline.py` and record
  memory observations separately.
- [x] Define allowed compatibility differences.
- [x] Add migration-specific doc and architecture rules.

Exit gate:

- The current production contract is reproducible and diffable.

### Phase 1: Spring Scaffold

- [x] Create `apps/api`.
- [x] Add Java 21 toolchain and Gradle wrapper.
- [x] Pin Spring Boot 4.1.x.
- [x] Add package-by-feature skeleton.
- [x] Add local/test/production profile configuration.
- [x] Add formatting, static analysis, and dependency checks. Gradle `check`
  now enforces Checkstyle source hygiene, treats actionable Java compiler
  warnings as errors, and rejects dynamic, changing, ranged, and other
  non-reproducible dependency resolution.
- [x] Add root `make` commands for Spring development and tests.
- [x] Add architecture-boundary test.

Exit gate:

- A clean checkout builds and runs the empty Spring service.

### Phase 2: Foundation Compatibility

- [x] Add request-ID filter and MDC.
- [x] Add error envelope and exception mapping.
- [x] Add validation 422 mapping.
- [x] Add JSON compatibility settings.
- [x] Add CORS.
- [x] Add public health compatibility routes.
- [x] Add Actuator liveness/readiness.
- [x] Add datasource and production schema validation.
- [x] Add Supabase JWT resource-server verification.
- [x] Add structured JSON logs and Sentry policy. The production profile emits
  Spring Boot ECS JSON with request-ID MDC context and bounded stack traces;
  unexpected 5xx failures are logged with safe correlation fields. Actuator,
  Prometheus metrics, and the no-PII backend Sentry policy are documented. A
  backend Sentry SDK remains an explicit operational integration after Spring
  Boot 4 compatibility and a server-side DSN are verified.

Exit gate:

- Health, auth failure, validation, error, and request-ID parity tests pass.

### Phase 3: User And Read-Heavy Interview Paths

- [x] Port `me` and profile sync/read paths.
- [x] Port interview-post listing and detail.
- [x] Port interview-post view/read-state behavior.
- [x] Port place search proxy.
- [x] Add repository Testcontainers tests. Spring integration tests now start
  PostgreSQL 16 with Testcontainers, apply the canonical FastAPI Alembic chain
  through `0023_apple_sign_in_notifications`, and validate the Spring mappings
  against that schema. The regular unit gate remains Docker-independent;
  `integrationTest` owns real PostgreSQL execution.

Exit gate:

- Web/mobile primary home and interview discovery reads work against Spring.

### Phase 4: Interview Writes And Applications

- [x] Port the current FastAPI interview create, update, close, archive, and
  reopen behavior. FastAPI does not currently expose a delete route.
- [x] Port application create/list/detail/state transitions, including
  notification, chat-room lifecycle, and withdrawal audit side effects.
- [x] Preserve recruitment-count and ownership behavior in the implemented
  application transitions.
- [x] Add uniqueness and stale-state concurrency tests. Real PostgreSQL tests
  race duplicate application inserts and competing `applied` status updates,
  proving one-row uniqueness and conditional stale-writer rejection.

Exit gate:

- Founder creation and respondent application workflows pass end to end.

### Phase 5: Chat

- [x] Port chat room list/detail.
- [x] Port the role-sensitive chat workflow endpoint.
- [x] Port message creation and idempotency.
- [x] Port unread counts and participant settings.
- [x] Port block/report interaction behavior. User block/list/unblock,
  active-block send prevention, and report tickets are implemented.
- [x] Add concurrent message and room-creation tests. Real PostgreSQL tests
  prove one room/system message/two participant settings per application and
  atomic `client_message_id` reuse. Message creation now uses `ON CONFLICT`
  and only the winning insert can trigger notification work.
- [x] Align all chat request, query, and response OpenAPI differences with the
  FastAPI baseline while preserving runtime validation and serialized payloads.

Exit gate:

- Chat behavior and ordering match current clients.

### Phase 6: Sessions, Completion, Reward, And Reviews

- [x] Port scheduling/session state.
- [x] Port attendance and issue/no-show behavior.
- [x] Port completion confirmation.
- [x] Port reward confirmation.
- [x] Port review submission and founder summary.
- [x] Add focused conditional-update and duplicate-action service tests.
  Real concurrent PostgreSQL execution remains part of the Phase 12
  concurrency suite.

Exit gate:

- The complete Hypofit MVP loop passes against Spring.

### Phase 7: Support, Safety, Admin, And Deletion

- [x] Port inquiries and replies.
- [x] Port reports, blocks, and moderation.
- [x] Port operator/admin HTTP endpoints, including account-deletion retry and
  push dispatch.
- [x] Port remaining audit-event parity. Core interview, application, session,
  reward, review, support, moderation, admin, block, social-auth, account
  deletion, profile-image purge, and auth-cleanup events are implemented.
- [x] Port account deletion, verification, redaction, retention, cleanup, and
  re-registration behavior. Profile-image Storage cleanup and Supabase Auth
  cleanup run after the anonymization commit and persist their outcomes in
  separate transactions.
- [ ] Verify account deletion and clean re-registration against the candidate
  PostgreSQL/Supabase environment.
- [ ] Preserve store-review demo behavior where still required.

Exit gate:

- All store-review-sensitive backend workflows pass.

### Phase 8: Social Auth And Provider Integrations

- [x] Port capability discovery.
- [x] Port completion and identity inventory.
- [x] Port link/reconciliation rules used by the current API.
- [x] Port provider-event storage.
- [x] Port Apple server notification handling.
- [ ] Verify all enabled providers in local/candidate environments.

Exit gate:

- Supabase remains the session issuer and provider flows preserve stable API
  behavior.

### Phase 9: Notifications And Push Worker

- [x] Port notification center list/read/read-all APIs.
- [x] Port device registration and preferences.
- [x] Port push outbox creation, including producer wiring, preference/provider
  gating, and idempotent delivery insertion.
- [x] Port APNs and FCM clients.
- [x] Port delivery claim/retry/terminal behavior behind bounded dispatch.
- [x] Prove outbox enqueue deduplication and competing `SKIP LOCKED` claims
  against real PostgreSQL. Concurrent enqueue creates one delivery per
  notification/device, and two claimers partition pending rows without overlap.
- [x] Prove exclusive worker operation and deduplication. The Spring worker
  holds a PostgreSQL session advisory lock for process ownership, releases it
  on shutdown or DB failure, and a real PostgreSQL test proves a second worker
  cannot dispatch until the first owner stops. Existing outbox uniqueness and
  `SKIP LOCKED` tests continue to prove delivery-level deduplication.

Exit gate:

- Notification APIs and push delivery pass candidate smoke without duplicates.

### Phase 10: Flyway Preparation

- [ ] Freeze production Alembic head. The repository baseline is pinned to
  `0024_add_ai_summary_artifacts`; the operational production freeze still
  belongs to the cutover window.
- [ ] Regenerate and compare the final effective Alembic/Flyway schemas in
  PostgreSQL 16 after the production freeze.
- [ ] Replace the historical `B0023`/schema-neutral `V0024` preparation assets
  with a deterministic `B0024` baseline and a `V0025+` ownership sequence.
- [ ] Retest clean database creation and controlled baseline of the existing
  schema without mutation.
- [x] Document migration backup, validation stop conditions, and restore-based
  rollback. Live execution remains part of the production cutover window.

Exit gate:

- Flyway can safely take ownership without modifying the effective schema.

### Phase 11: Candidate Infrastructure

- [x] Add isolated Spring blue/green systemd units on GPU ports `8100/8101`.
- [x] Add isolated Spring reverse-tunnel units on EC2 ports `18100/18101`.
- [x] Add Spring candidate deploy, rollback, and state handling without touching
  the canonical FastAPI services or upstream. The rollback path now restarts
  and health-checks the previously drained candidate API and tunnel before
  switching the candidate upstream; a non-destructive shell regression test
  covers this ordering and state restoration.
- [x] Add localhost-only candidate Nginx upstream/access control on EC2 port
  `18180`.
- [x] Configure JVM production profile and graceful shutdown.
- [x] Run candidate deployment and rollback rehearsal. On 2026-08-05, SHA
  `189b1ec6312100fd67296a65079c346d4d20e304` was installed on isolated green,
  switched to isolated blue, and rolled back to green through EC2 candidate
  port `18180`. GPU and EC2 health checks passed at each successful stage,
  while the canonical FastAPI health endpoint remained unchanged. The Spring
  push-worker service stayed stopped and API processes reported
  `worker_enabled=false`.

Exit gate:

- Spring can deploy independently without affecting FastAPI production.

### Phase 12: Full Verification

- [x] Run all currently implemented Spring unit and integration tests.
- [x] Run normalized OpenAPI diff.
- [x] Run full golden contract suite. A tracked representative fixture harness
  now supports backward-compatible single requests plus independent stateful
  FastAPI/Spring scenarios with response capture and environment interpolation.
  Its 30 offline tests pass, and all five tracked public/auth-negative fixtures
  pass against production FastAPI and the isolated Spring candidate. A separate
  authenticated founder/respondent scenario now covers post creation,
  application selection, chat, session completion, reward confirmation, and
  mutual reviews without persisting authorization headers in reports. On
  2026-08-07 the complete authenticated scenario passed against FastAPI green
  `8001` and Spring candidate blue `8100`; scenario-created domain data plus
  the review accounts' notification and audit records were removed by the
  isolated cleanup. The live run exposed
  and verified fixes for deterministic room capture, interview `jsonb`
  persistence, duplicate structured-log request IDs, mutation-response
  hydration, and session snake_case runtime binding.
- [x] Run the current concurrency suite. Application uniqueness/stale-state,
  chat room/message deduplication, push enqueue/competing claims,
  session completion, reward transition, review creation, social identity
  linking, and account-deletion verification/confirmation races pass against
  PostgreSQL 16 with the canonical Alembic schema.
- [x] Run JWT, route authorization, stable auth-error, request-ID, production
  detail-suppression, and allowed/disallowed CORS security tests.
- [x] Run representative read-load tests with `load_baseline.py` against
  GPU-localhost FastAPI and Spring candidate targets and record the result in
  the migration notes.
- [x] Run authenticated web smoke. On 2026-08-07 a temporary same-origin Vite
  proxy targeted isolated Spring blue `8100`, a dedicated review account
  session was injected into an ephemeral Chrome profile, and `/app`,
  `/interviews`, `/chat`, and `/profile` rendered their authenticated states
  without auth fallback or API errors. The reusable harness lives at
  `apps/web/scripts/authenticated-browser-smoke.mjs` and does not log or retain
  credentials or tokens.
- [x] Run authenticated iOS and Android smoke.
  - On 2026-08-07 the current Metro bundle rendered authenticated home,
    interviews, map, chat, and profile routes on an iOS 26.5 simulator without
    runtime errors; the temporary simulator session was removed afterward.
  - On Android API 36, a preview APK built locally from the current source
    completed the official `hypofit://auth/social-callback` session restore and
    rendered home, interviews, map with location permission, chat, and profile.
    The smoke exposed and verified a fix that prevents auth callback effects
    from restarting when `AuthProvider` publishes the restored session. No
    fatal `logcat`, React Native fatal, auth callback, or startup timeout entry
    was recorded. The temporary review session and APK were removed afterward.
- [x] Run operator and worker smoke. On 2026-08-07 a temporary Supabase
  magic-link session for the configured operator verified Spring candidate
  `/admin/me`, `/admin/summary`, the support-ticket list, and the public
  account-deletion request list without mutating operator data. Worker role
  isolation and candidate rollback regression scripts passed, the FastAPI push
  worker remained active, and the Spring candidate continued to report
  `push.worker_enabled=false` with its worker service inactive.

Exit gate:

- No blocking parity, integrity, security, or operational issue remains.

### Phase 13: Production Cutover

- [ ] Execute the cutover runbook.
- [ ] Switch canonical traffic.
- [ ] Switch worker ownership.
- [ ] Confirm production smoke.
- [ ] Monitor agreed stabilization metrics.
- [ ] Exercise rollback only if a trigger is met.

Exit gate:

- Spring is the stable canonical API for the stabilization period.

### Phase 14: Cleanup

- [ ] Make Flyway the sole migration authority.
- [ ] Remove FastAPI production services and tunnels.
- [ ] Remove FastAPI-specific deployment scripts after rollback window.
- [ ] Rename `apps/api` to `apps/api`.
- [ ] Update root commands and CI.
- [ ] Update architecture, deployment, repository, service, and agent docs.
- [ ] Move this document to `docs/completed`.

Exit gate:

- The repository has one backend implementation and one migration system.

### Current Candidate Snapshot (2026-08-10)

- Spring OpenAPI: 71 paths, 82 operations.
- FastAPI baseline: 71 paths, 82 operations.
- Path/method coverage: all 71 paths and 82 operations match the FastAPI
  baseline; no FastAPI operation is missing and Spring exposes no extra public
  operation. The semantic OpenAPI diff was rerun against deployed candidate
  `236b3e1` after runtime session-binding fixes and passed with zero differences.
- Spring regular gate: 302 tests passing across 80 suites without requiring
  Docker.
- Spring Docker-backed integration gate: 56 tests across 25 suites, including
  PostgreSQL concurrency, exclusive worker leasing, and Alembic-to-Flyway
  preparation-schema parity, current Alembic `0024` validation, interview
  `schedule_options` JSONB round trips, AI summary JSONB snake_case reads, and
  actual MVC snake_case session request/response binding.
- Executable `bootJar`: builds successfully.
- Candidate-only blue/green units, reverse tunnels, deployment scripts, and
  localhost-only EC2 Nginx entry are implemented and live-rehearsed. The first
  rehearsal exposed a missing GPU Java runtime, shared `.env` worker-role
  override, and Supabase session-pool exhaustion during overlap. The candidate
  now provisions checksum-verified Temurin 21 in the GPU user home, forces the
  API and worker roles at process launch, applies bounded Hikari pools, and has
  completed green install, blue switch, and green rollback successfully.
- The latest `236b3e1` candidate is deployed to isolated Spring blue on GPU
  port `8100`; canonical FastAPI remains green on GPU port `8001`, the canonical
  health endpoint stays healthy, and the Spring push worker remains inactive.
  The five public/auth-negative fixtures and the complete authenticated MVP
  workflow pass against this exact candidate revision.
- The conservative GPU-localhost read-load run completed with zero errors and
  passed both tracked targets. For `GET /health`, FastAPI/Spring mean latency
  was `4.840ms`/`8.264ms`, p95 was `7.163ms`/`11.158ms`, and p99 was
  `7.557ms`/`12.015ms`. For `GET /api/v1/interview-posts/?limit=20`, mean was
  `316.940ms`/`178.695ms`, p95 was `523.833ms`/`233.361ms`, and p99 was
  `598.079ms`/`275.257ms`. The result is a low-volume migration baseline, not a
  production capacity claim.
- Observed process memory before the run was approximately `80.5MiB` for
  FastAPI and `506.6MiB` for Spring; after the run it was approximately
  `80.5MiB` and `510.9MiB`. Spring's materially higher idle footprint is an
  explicit operational tradeoff to retain for cutover sizing.
- Semantic OpenAPI harness: runs successfully and currently reports zero
  unapproved differences across request bodies, responses, and parameters. The
  bounded passes
  aligned interview-list query
  constraints, the close-status constant, push registration and preference
  schemas, support-ticket nullable request fields, and account-deletion request,
  response, admin-filter metadata, all 43 social-auth metadata differences, and
  all session/reward/review contract differences, and the nine chat
  message/read/settings/cursor request and query differences, plus the 15 chat
  message-type and workflow response metadata differences. The final bounded
  chat pass removed the remaining 71 room/list/detail and message-body
  differences; no unapproved chat-path contract difference remains. The
  interview response pass then removed 214 path-level differences by aligning
  shared interview-post, founder-review, and interview-post-view schema
  metadata; no unapproved interview-post or interview-post-view response
  difference remains. Canonical ordering of JSON Schema `type` unions then
  removed 66 request-body false positives without relaxing nullable or type
  semantics. The subsequent interview write/query pass removed the remaining
  27 interview-post differences without changing runtime validation; no
  unapproved interview-post contract difference remains. The admin-support
  payload pass removed the remaining three response-shape differences by
  restoring the inherited FastAPI-compatible `replies` field. The final
  metadata-only response pass aligned admin defaults, push counts, target
  enums, and place coordinates, completing response contract parity. The final
  request/parameter pass aligned `/me`, application-status, push-device,
  admin/support-filter, and place-search schemas. Path/method and semantic
  OpenAPI parity and authenticated golden verification are complete. Client
  smoke gates remain and production cutover is not approved.
- Contract tooling: 30 offline tests pass across the semantic OpenAPI, golden
  HTTP, and read-only load-baseline harnesses. All five tracked public and
  auth-negative fixtures pass against production FastAPI and the isolated Spring
  candidate. The harness now includes a tracked authenticated MVP workflow
  scenario with per-target captured IDs, deterministic chat-room selection, and
  failure reports that omit request authorization data. Its live authenticated
  run passes with cleanup on both implementations.
- FastAPI remains the only production API. An isolated localhost-only Spring
  candidate is deployed for verification, but no canonical traffic switch,
  Flyway takeover, or worker ownership change has occurred.

## 18. Required Root Commands

During transition, add explicit commands without redefining existing FastAPI
commands:

```text
make dev-api-spring
make test-api-spring
make test-api-spring-integration
make lint-api-spring
make build-api-spring
make contract-api-spring
```

After cleanup, rename the Spring commands to the canonical `make dev-api`,
`make test-api`, and related names.

## 19. Environment Configuration Mapping

Spring `@ConfigurationProperties` groups should cover:

```text
hypofit.database
hypofit.supabase
hypofit.auth
hypofit.cors
hypofit.public-web
hypofit.kakao
hypofit.resend
hypofit.push.apns
hypofit.push.fcm
hypofit.push.worker
hypofit.apple-notifications
hypofit.account-deletion
hypofit.observability
```

Map current environment variable names where practical so the production secret
store does not need an all-at-once rename. Validate required settings by active
profile and feature flag.

Production rules:

- No secret defaults.
- No logged secret values.
- Browser/mobile public variables stay separate.
- Production startup fails for missing settings required by enabled features.
- Disabled optional integrations do not block unrelated API startup.

## 20. Documentation Updates During Implementation

Each phase that changes code or operations must update the corresponding
document:

- `README.md`
- `AGENTS.md`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/repository-structure.md`
- `docs/service/00-agent-start-here.md`
- `docs/service/07-api-and-backend-map.md`
- `docs/service/10-operations-and-release.md`
- `docs/reference/error-observability-contract.md`
- `docs/reference/api-bluegreen-deployment-runbook.md`
- API/privacy/store documents when observable behavior changes

Do not rewrite current-state documentation to say Spring is production before
the cutover is verified.

## 21. Non-Goals

- No public API v2.
- No frontend redesign.
- No Supabase replacement.
- No custom authorization server.
- No microservice split.
- No Kafka or critical Redis dependency.
- No WebFlux/R2DBC migration.
- No Docker requirement on the GPU server.
- No table or status redesign merely to fit JPA preferences.
- No generic framework abstractions without a second concrete use.
- No speculative fallback paths unsupported by observed requirements.

## 22. Definition Of Done

The migration is complete only when:

- Spring serves the canonical API domain.
- The full mobile/web contract is preserved.
- Authentication and authorization parity is verified.
- All core workflow, concurrency, and store-sensitive tests pass.
- Spring owns push delivery without duplication.
- Flyway is the only schema migration authority.
- FastAPI can be removed without losing an operational capability.
- Production observability and rollback procedures are documented and tested.
- `apps/api` has become the canonical `apps/api`.
- Current-state documentation no longer describes FastAPI as active.

## 23. Research Basis

Primary references used for this plan:

- Spring Boot project and current release:
  <https://spring.io/projects/spring-boot/>
- Spring Boot system requirements:
  <https://docs.spring.io/spring-boot/system-requirements.html>
- Spring Security JWT resource server:
  <https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html>
- Spring declarative transactions:
  <https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative.html>
- Spring Boot Testcontainers:
  <https://docs.spring.io/spring-boot/reference/testing/testcontainers.html>
- Spring Boot observability:
  <https://docs.spring.io/spring-boot/reference/actuator/observability.html>
- Spring Boot metrics:
  <https://docs.spring.io/spring-boot/reference/actuator/metrics.html>
- Spring Modulith verification:
  <https://docs.spring.io/spring-modulith/reference/verification.html>
- Flyway validate:
  <https://documentation.red-gate.com/flyway/reference/commands/validate>
- Flyway schema history:
  <https://documentation.red-gate.com/flyway/flyway-concepts/migrations/flyway-schema-history-table>
- springdoc FAQ and Boot compatibility:
  <https://springdoc.org/faq.html>
