# Lightsail Spring Deployment Runbook

Status: reference

Last updated: 2026-08-11

## 1. Scope

This runbook operates the single Spring Boot API and push-worker container on
the 1 GiB Lightsail host at `54.116.198.195`. It does not cover the retired GPU
runtime, FastAPI deployment, web Vercel deployment, or mobile store builds.

The implementation assets are:

- `.github/workflows/deploy-api.yml`
- `apps/api/Dockerfile`
- `infra/lightsail/compose.yml`
- `infra/lightsail/deploy.sh`
- `infra/lightsail/api.env.example`
- `infra/lightsail/nginx-http.conf`
- `infra/lightsail/known_hosts`

## 2. CI/CD Contract

Pull requests that change Spring or Lightsail deployment files run the Spring
verification suite. A matching push to `main`, or an explicit workflow
dispatch, performs these stages:

1. Prepare Java 21, then run `check`, `integrationTest`, and `bootJar`.
2. Build one `linux/amd64` image off-host.
3. Publish the image to
   `ghcr.io/ssamparksoft/hypofit-api` with commit and `main` tags.
4. Pass the immutable image digest to the deploy job.
5. If `LIGHTSAIL_DEPLOY_ENABLED=true`, connect as `deploy`, synchronize only
   the Compose and deploy script, pull the digest, start the container, and
   wait for `/api/v1/health/ready`.
6. Restore the previously pinned digest if startup or readiness fails.

All third-party workflow actions are pinned to full commit SHAs. Deployment is
serialized per ref and never compiles source on Lightsail.

## 3. GitHub Repository Configuration

Create one repository secret:

```text
LIGHTSAIL_SSH_PRIVATE_KEY=<dedicated deploy-only private key>
```

Create one repository variable:

```text
LIGHTSAIL_DEPLOY_ENABLED=false
```

Keep the variable `false` until the host env, APNs key, FCM service account,
Supabase connectivity, and pre-DNS smoke prerequisites are ready. Changing the
variable to `true` enables deployment for subsequent workflow runs; it does not
retroactively deploy an older run.

Do not store `api.env`, APNs, FCM, Supabase service-role, provider secrets, or
account-deletion peppers as workflow files or repository variables. Those
secrets live only under `/opt/hypofit` on Lightsail.

The workflow uses the short-lived `GITHUB_TOKEN` to publish and pull GHCR. The
package must remain linked to `SSamParkSoft/hypofit` with Actions package access.

## 4. Dedicated SSH Identity

Generate a key dedicated to GitHub Actions. Do not reuse a personal developer
key:

```bash
ssh-keygen -t ed25519 -C hypofit-github-actions -f /tmp/hypofit-lightsail-actions -N ''
```

Append only its public key to `/home/deploy/.ssh/authorized_keys`, verify login,
then store the private key as `LIGHTSAIL_SSH_PRIVATE_KEY`. Delete the temporary
local private/public files after GitHub confirms the secret was saved.

The server host key is pinned in `infra/lightsail/known_hosts`. If Lightsail is
rebuilt or the host key intentionally changes, verify the new fingerprint over
a trusted path before updating that file.

## 5. Host Secrets

Create the runtime env from `infra/lightsail/api.env.example` without copying
placeholder values blindly:

```bash
install -m 0600 /dev/null /opt/hypofit/config/api.env
```

Required credential files:

```text
/opt/hypofit/secrets/apns-auth-key.p8
/opt/hypofit/secrets/fcm-service-account.json
```

Both files and `api.env` must be owned by `deploy` and have mode `0600`.
The deploy script refuses to proceed when they are absent, empty, or have the
wrong mode.

Normal production uses `FLYWAY_ENABLED=true` and
`FLYWAY_BASELINE_ON_MIGRATE=false`. The baseline-on-migrate switch may be true
only for the one-time registration of an existing schema at version 24. AI
summary flags remain disabled. The one JVM uses
`production,push-worker` and owns the database-backed push loop.

## 6. First Deployment

Before enabling deployment:

1. Confirm `/opt/hypofit/config/api.env` contains real production values.
2. Confirm both push credential files and permissions.
3. Confirm the Lightsail host can reach the Supabase pooler.
4. Confirm Flyway schema history is at the expected version and clean-database
   migration passed in CI.
5. Confirm Nginx still serves the temporary host and port `8080` is not public.
6. Set `LIGHTSAIL_DEPLOY_ENABLED=true`.
7. Run `Spring API CI/CD` with `workflow_dispatch`, or push a reviewed Spring
   deployment change to `main`.

Do not change canonical DNS during the first container deployment. Validate
through localhost and the temporary IP/hostname first.

## 7. Verification And Operations

On Lightsail:

```bash
cd /opt/hypofit/runtime
docker compose --env-file image.env -f compose.yml ps
docker compose --env-file image.env -f compose.yml logs --tail=200 api
curl --fail --silent --show-error http://127.0.0.1:8080/health
curl --fail --silent --show-error http://127.0.0.1:8080/api/v1/health/ready
cat DEPLOYED_IMAGE
cat DEPLOYED_AT
docker stats --no-stream hypofit-api
free -h
df -h /
```

Readiness returns HTTP `503` when a required production dependency is
degraded. A `200` response is therefore a deploy gate, not only a process-alive
check.

## 8. Rollback

The deploy script automatically restores the previous digest when the new
container fails startup or readiness. For a manual rollback, select a known
good GHCR digest and run:

```bash
/opt/hypofit/runtime/deploy.sh \
  'ghcr.io/ssamparksoft/hypofit-api@sha256:<64-hex-digest>'
```

Rollback is application-image rollback only. Database migrations must remain
backward-compatible because the script does not reverse schema changes.

## 9. Nginx And TLS

Install `infra/lightsail/nginx-http.conf` only after reviewing the active host
configuration. Validate before reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Issue and verify TLS for `hypofit-api.bukae.co.kr` before changing canonical
traffic. Keep only ports `22`, `80`, and `443` open. Verify certificate renewal
after issuance with the certificate client's dry-run command.

## 10. Disk Cleanup

The host stores only current/rollback images and bounded Docker logs. Inspect
before cleanup:

```bash
docker system df
```

Remove unused images only after confirming the current and intended rollback
digests. Do not schedule aggressive pruning during the MVP launch period.
