# Spring Feature MVC Simplification Plan

Status: completed

Last updated: 2026-08-12

## Goal

Simplify `apps/api` into a feature-first Spring MVC structure that is familiar
to ordinary Spring developers without replacing the modular monolith with a
global layer-by-type layout.

```text
feature/
  controller/  HTTP controllers only
  dto/         HTTP request and response models
  service/     use cases, authorization, business rules, transactions
  repository/  repository contracts and database implementations
  entity/      JPA table mappings
```

Add a feature-local `client/` package only for a real external provider client.
Do not introduce new ports, adapters, gateways, commands, results, events, or
domain abstractions unless an observed requirement needs them.

## Non-Negotiable Compatibility

- Preserve every `/api/v1` route, HTTP method, status code, JSON field, error
  code, request ID, validation detail, OpenAPI contract, and authorization rule.
- Preserve Flyway migrations and the current database schema.
- Preserve state transitions, idempotency, locking, audit, notification, push,
  support, report, block, and account-deletion behavior.
- Preserve all pre-existing uncommitted user changes.
- Do not add generic base controllers, services, repositories, mappers, or
  exception hierarchies.

## Implementation

### 1. Package simplification

- [x] Move HTTP controllers from `web` to `controller`.
- [x] Move HTTP request/response models and parsers from `web` to `dto`.
- [x] Move use-case services, policies, commands, exceptions, repository
      contracts, and internal models from `application`/`domain` to `service`.
- [x] Move persistence implementations and Spring Data repositories from
      `persistence` to `repository`.
- [x] Move JPA mappings from `persistence` to `entity`.
- [x] Rename provider implementation packages from `infrastructure` to
      `client` where applicable.
- [x] Move tests to corresponding packages without changing assertions.

### 2. Boundary cleanup

- [x] Keep controllers limited to authentication extraction, transport
      validation, service delegation, and response mapping.
- [x] Stop new service/repository contracts from returning JPA entities.
- [x] Retain Spring Modulith only as a lightweight boundary verifier and update
      named interfaces to the new package names.
- [x] Keep feature-to-feature calls explicit and avoid a shared domain model.

### 3. Targeted production fixes

- [x] Move account-deletion email delivery outside a database transaction and
      configure bounded HTTP timeouts without adding a broker.
- [x] Avoid reserving one of three Hikari connections for the lifetime of the
      single-process push worker.
- [x] Move session ownership and state checks into transactional services.
- [x] Honor production datasource fail-fast configuration.
- [x] Normalize authenticated subject parsing so malformed subjects do not
      become generic 500 responses.
- [x] Validate the expected Supabase JWT issuer in addition to signature,
      audience, lifetime, and UUID subject validation.
- [x] Bound shared outbound HTTP connection/read time and prevent repeated
      unknown Apple key IDs from forcing an unbounded JWKS refresh loop.
- [x] Enable virtual threads only for production request handling while keeping
      the long-lived push loop on one explicit platform thread.
- [x] Keep public unauthenticated mutation request limits at the Nginx edge
      without applying a blanket limit to authenticated product APIs.

### 4. Verification

- [x] Compile main and test sources with the repository's strict compile and
      Checkstyle gates.
- [x] Pass Spring Modulith architecture verification.
- [x] Pass unit, controller, and security tests.
- [x] Pass PostgreSQL/Testcontainers integration tests.
- [x] Pass OpenAPI contract regression checks.
- [x] Confirm no route or schema diff is introduced.

## Verification Result

- `./scripts/run_gradle_task.sh check --rerun-tasks`: passed, 308 tests.
- `./scripts/run_gradle_task.sh integrationTest --rerun-tasks`: passed, 56
  tests including PostgreSQL/Testcontainers coverage.
- `./scripts/run_gradle_task.sh bootJar --rerun-tasks`: passed.
- `python -m unittest discover -s apps/api/scripts/tests`: passed, 11 tests.
- `nginx -t` against `nginx:1.27-alpine`: passed for the checked-in Lightsail
  HTTP include.
- Source audit: 378 main Java files, no package/path mismatch, and no
  feature-local legacy `application`, `domain`, `persistence`, `web`, or
  `infrastructure` source path remaining. `common/web` remains intentionally as
  shared HTTP infrastructure.

## Completion Rule

Move this document to `docs/completed/` only after package migration, targeted
production fixes, and automated verification pass. Manual device and store QA
are outside this refactor.
