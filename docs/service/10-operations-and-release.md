# Operations And Release

Status: service-source-of-truth

Last updated: 2026-08-11

## Production Topology

Current production topology:

```text
mobile app / web app
  -> hypofit-api.bukae.co.kr
  -> Gabia DNS
  -> Lightsail static IPv4 54.116.198.195
  -> host Nginx
  -> Spring Boot container on 127.0.0.1:8080
  -> Supabase Postgres/Auth
```

Spring, secrets, the Flyway baseline, Nginx/TLS, and canonical DNS are deployed
on Lightsail. Public readiness, CORS, and auth-boundary smoke pass.
Authenticated deploy smoke is a separate gate from readiness: it must use a
dedicated, revocable user session against `/api/v1/me`, warming the Spring JWKS
cache before traffic. Until that credential's storage and rotation policy is
approved, operators run the authenticated smoke manually and do not place a
long-lived user token or Supabase service-role key in CI.

## Web

`apps/web` deploys to Vercel and hosts public legal/account deletion surfaces.
Git auto-deploy is intentionally disabled. Pushing to GitHub does not equal web
deployment. Deploy web only when explicitly requested.

## Mobile

`apps/mobile` is the native release target.

Current rule:

- avoid EAS cloud builds unless explicitly re-enabled,
- prefer local iOS/Android builds,
- upload explicit local artifacts,
- delete uploaded local IPA/AAB artifacts after upload verification unless
  still needed for immediate debugging.

## API

Deploy the Spring API to Lightsail only through the reviewed GitHub Actions
workflow and Lightsail runbook.

The MVP runtime is one memory-limited Docker container that owns HTTP and push
delivery. Short deployment downtime is accepted until real traffic justifies
blue/green infrastructure.

Lightsail host contract:

```text
admin user       ubuntu
deploy user      deploy
runtime root     /opt/hypofit
Spring binding   127.0.0.1:8080
public ports     80/443 through Nginx
memory           1 GiB RAM + 1 GiB swap
```

Build images off-host and deploy immutable tags or digests. Keep Spring near a
700 MiB container limit with `-Xms128m -Xmx320m` and Hikari maximum pool size
`3` unless observed resource usage supports a change.

## Database

Supabase is the durable database/auth system. Flyway is the only schema
migration authority. Lightsail should use a supported direct or pooler
endpoint.

Do not run local PostgreSQL, Redis, a durable queue, distributed locks, or
permanent file storage on Lightsail.

## Sentry

Use Sentry first for native release-build crashes, TestFlight errors, startup
hangs, and auth failures. Do not expose PII or raw tokens in reports.

## Release Checks

Before claiming a release is complete, state whether these ran:

- Spring tests and production image build,
- Flyway migration and recorded revision,
- local and container health/readiness,
- temporary-IP or temporary-host smoke before DNS,
- Nginx and TLS validation,
- canonical public and authenticated API smoke,
- push delivery and provider callback checks,
- memory, swap, disk, restart-loop, and log inspection,
- web/mobile build or deployment checks affected by the API release.

Expected commands after the deployment assets exist:

```bash
curl -fsS http://127.0.0.1:8080/api/v1/health/ready
docker compose -f /opt/hypofit/runtime/compose.yml ps
docker compose -f /opt/hypofit/runtime/compose.yml logs --tail=200 api
curl -fsS https://hypofit-api.bukae.co.kr/api/v1/health/ready
HYPOFIT_API_SMOKE_ACCESS_TOKEN='<short-lived smoke-user token>' \
  bash infra/lightsail/authenticated-smoke.sh
```

Use `docs/reference/lightsail-spring-deployment-runbook.md` for the current
deploy procedure.
