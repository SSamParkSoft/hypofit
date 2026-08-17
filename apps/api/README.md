# Hypofit API

The canonical Hypofit backend is a Java 21 Spring Boot application.

## Runtime

- Spring Boot 4.1.x with Spring MVC and Spring Security Resource Server
- PostgreSQL through Spring Data JPA/JDBC
- Flyway as the only schema migration authority
- Supabase Auth access tokens at the API boundary
- one API container on Amazon Lightsail, including the exclusive push loop

The API preserves the public `/api/v1` contract, standard error envelope,
`X-Request-ID`, ownership checks, and domain state transitions recorded by the
frozen compatibility baseline.

## Source Layout

Product code is grouped by feature. Each feature uses the smallest applicable
set of familiar Spring packages:

```text
feature/
  controller/
  dto/
  service/
  repository/
  entity/
  client/       # only for external providers
```

Services own business rules and transactions. Controllers remain transport
adapters, repositories remain database-focused, and `common` contains only
cross-cutting configuration, security, errors, and observability. Do not add
DDD or hexagonal layers unless a concrete requirement justifies them.

## Local Development

Start PostgreSQL from the repository root, then run the API:

```bash
docker compose -f infra/docker-compose.yml up -d
make dev-api
```

Flyway creates a clean local schema from
`src/main/resources/db/migration/B0024__alembic_schema_baseline.sql` and applies
future `V0025+` migrations in order.

## Validation

```bash
make test-api
make test-api-integration
make lint-api
make build-api
```

The complete release gate is:

```bash
cd apps/api
./gradlew --no-daemon check integrationTest bootJar
```

Contract comparison against the frozen legacy API surface remains available:

```bash
make contract-api OPENAPI_URL=http://127.0.0.1:8080/v3/api-docs
```

## Production

Production runs one immutable GHCR image through `infra/lightsail/compose.yml`.
Configuration is stored outside the repository in
`/opt/hypofit/config/api.env`; APNs and FCM credentials are mounted read-only
from `/opt/hypofit/secrets`.

Never put production secrets in this directory or in browser/mobile public
environment variables.
