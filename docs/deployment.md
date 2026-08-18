# Deployment

## Production Topology

```text
web app / native mobile app
  -> https://hypofit-api.bukae.co.kr
  -> Gabia DNS
  -> Amazon Lightsail 54.116.198.195
  -> host Nginx on 80/443
  -> Spring Boot container on 127.0.0.1:8080
  -> Supabase Postgres/Auth
```

The retired school GPU and FastAPI runtime are not deployment or rollback
targets. Supabase remains the durable system of record.

## API CI/CD

`.github/workflows/deploy-api.yml` is the canonical API pipeline.

1. Run Java 21 `check`, Testcontainers integration tests, and `bootJar`.
2. Build a `linux/amd64` container image.
3. Push immutable image tags to GHCR.
4. When `LIGHTSAIL_DEPLOY_ENABLED=true`, deploy the image digest over the
   pinned Lightsail SSH host key.
5. Wait for `/api/v1/health/ready`; restore the previous digest if readiness
   fails.

Production runtime files:

```text
/opt/hypofit/runtime/compose.yml
/opt/hypofit/runtime/deploy.sh
/opt/hypofit/runtime/image.env
/opt/hypofit/config/api.env
/opt/hypofit/secrets/apns-auth-key.p8
/opt/hypofit/secrets/fcm-service-account.json
```

Environment and credential files use mode `0600`. The container is read-only,
binds only to `127.0.0.1:8080`, and runs behind Nginx. Current resource limits
are approximately 700 MiB container memory, `-Xms128m -Xmx320m`, and Hikari
maximum pool size `3`.

Use `docs/reference/lightsail-spring-deployment-runbook.md` for host setup,
secrets, deploy, rollback, TLS, and smoke commands.

## Database Migrations

Flyway is the only schema migration authority.

- `B0024__alembic_schema_baseline.sql` is the immutable initial baseline.
- New migrations start at `V0025`.
- `FLYWAY_ENABLED=true` in normal environments.
- `FLYWAY_BASELINE_ON_MIGRATE` is a one-time takeover switch only. Keep it
  `false` after an existing schema has been registered at baseline version 24.
- Never edit an applied migration or run manual production DDL without a
  documented recovery path.

## Web Deployment

`apps/web` deploys to the Vercel project `hypofit-web`. Git auto-deploy is
intentionally disabled in `apps/web/vercel.json`; pushing GitHub source does
not release the web app. Deploy only when explicitly requested.

Before deployment:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm --dir apps/web build
```

Canonical public web domain: `https://hypofit.bukae.co.kr`.

Compatibility deployment URL: `https://hypofit-web.vercel.app`.

Browser-exposed `VITE_*` values may include public API, Supabase anon, and
Kakao JavaScript keys. Never put database passwords or service-role keys in
Vercel frontend variables.

## Mobile Distribution

`apps/mobile` is the App Store and Google Play target. Vercel does not deploy
the native app.

- iOS `1.0.0` is the released baseline; subsequent uploads use `1.0.1` or later
  and a new build number.
- Android production artifacts are `.aab` files.
- EAS cloud builds remain disabled until the user explicitly re-enables them.
- Prefer local build scripts and explicit artifact uploads.
- Delete a local IPA/AAB after verified upload unless it is still needed for
  immediate re-upload or crash-symbol matching.

Validation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack \
  corepack pnpm --dir apps/mobile typecheck
bash apps/mobile/scripts/eas-local-ios-build.sh
bash apps/mobile/scripts/eas-local-android-build.sh
```

Use the platform-specific documents under `docs/reference/ios-store-readiness/`
and the Google Play readiness documents before store submission.

## Release Verification

For an API release, verify:

```bash
curl -fsS https://hypofit-api.bukae.co.kr/api/v1/health/ready
ssh deploy@54.116.198.195 \
  'docker compose --env-file /opt/hypofit/runtime/image.env -f /opt/hypofit/runtime/compose.yml ps'
```

Also inspect the deployed digest, container restarts, memory/swap/disk, recent
logs, database readiness, and affected authenticated flows. Do not claim a web,
mobile, or API deployment occurred unless that exact release path was run and
verified.
