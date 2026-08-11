# Spring Single-Runtime Lightsail Cutover Plan

Status: completed - historical cutover record

Last updated: 2026-08-11

> Closed on 2026-08-11 after canonical DNS/TLS, immutable image deployment,
> Flyway baseline registration, and Spring-only repository cleanup. Use
> `docs/reference/lightsail-spring-deployment-runbook.md` for current
> operations.

## 1. Objective

Deploy the Spring Boot replacement as the only long-running Hypofit API runtime
on Amazon Lightsail. Supabase remains the durable database and authentication
system. The returned school GPU is not available for rehearsal or rollback.

Target topology:

```text
web/mobile
  -> hypofit-api.bukae.co.kr
  -> Lightsail static IPv4 54.116.198.195
  -> host Nginx on 80/443
  -> one Spring Boot container on 127.0.0.1:8080
  -> Supabase Postgres/Auth
```

The one JVM owns HTTP requests and the database-backed push delivery loop.
There is no FastAPI process, Python push worker, Python AI summary worker,
Redis, local PostgreSQL, load balancer, or second Spring worker on the host.

## 2. Runtime Constraints

- Host: Lightsail Ubuntu 22.04, 1 GiB RAM, 2 vCPU, 40 GB SSD.
- Use one Docker Compose service for Spring and host Nginx for ingress.
- Build the image off-host. Lightsail only pulls a pinned image and starts it.
- Bind Spring to `127.0.0.1:8080`; never publish `8080` publicly.
- Run Spring with `production,push-worker` and
  `PUSH_WORKER_ENABLED=true` in the same JVM.
- Keep AI summary generation and its worker disabled until a Spring-owned
  implementation is separately approved and deployed.
- Use JVM heap `-Xms128m -Xmx320m`, container memory near `700 MiB`, Hikari
  maximum pool size `3`, and graceful shutdown.
- Alembic remains schema authority until the migration plan's Flyway takeover
  gate. Apply only backward-compatible migrations before runtime switch.
- Accept short deployment downtime while there is no meaningful production
  traffic. Do not add blue/green or load-balancer infrastructure yet.

## 3. Provisioned Host State

Completed on 2026-08-11:

- [x] Lightsail instance created with static IPv4 `54.116.198.195`.
- [x] Hostname set to `hypofit-api-prod`; timezone set to `Asia/Seoul`.
- [x] SSH key-only access verified for `ubuntu` and `deploy`; root and password
  authentication disabled.
- [x] UFW enabled with inbound `22`, `80`, and `443` only.
- [x] Docker Engine `29.7.2` and Docker Compose `5.4.0` installed and verified
  through a real container run.
- [x] Docker JSON logs capped at `10m` with three files.
- [x] Nginx installed, enabled, and externally returning HTTP `200` on the
  temporary static IP.
- [x] 1 GiB swap enabled with `vm.swappiness=10`.
- [x] Runtime directories created under `/opt/hypofit`:
  - `releases` and `runtime`: mode `0755`
  - `config`: mode `0750`
  - `secrets`: mode `0700`
  - `config/api.env`: mode `0600`
- [x] Kernel updated to `6.8.0-1061-aws`; SSH, Docker, Nginx, UFW, swap, disk,
  and permissions verified after reboot.

## 4. Deployment Assets To Implement

- [x] Add a production multi-stage Dockerfile for `apps/api` using Java
  21 and a non-root runtime user.
- [x] Add a Lightsail-specific Compose file with:
  - immutable image reference,
  - `127.0.0.1:8080:8080`,
  - env file `/opt/hypofit/config/api.env`,
  - read-only APNs and FCM credential mounts,
  - `production,push-worker` profiles,
  - 700 MiB memory limit,
  - restart policy and health check.
- [x] Add a short-downtime deploy script that pulls, starts, checks readiness,
  and restores the previously pinned image on failure.
- [x] Add a host Nginx configuration for the temporary IP smoke and canonical
  hostname.
- [x] Add a Lightsail operations runbook covering deploy, rollback, logs,
  resource checks, certificate renewal, and disk cleanup.
- [x] Add a GitHub Actions workflow that verifies Spring, publishes a pinned
  `linux/amd64` GHCR image, and deploys it through a dedicated SSH identity
  only when the `LIGHTSAIL_DEPLOY_ENABLED` repository variable is `true`.

Observed on 2026-08-11:

- GitHub Actions run `31463870150` passed the Java 21 Spring verification,
  Python 3.11 Alembic integration environment, regular tests, PostgreSQL
  integration tests, Checkstyle, and `bootJar` gates.
- GHCR published commit `3ee8c3d` as `linux/amd64` with immutable digest
  `sha256:42003763a7462d28dda4cc9d59e7bc9983d86a6dedee55cbe45eadd7d3507c5e`.
- The dedicated Actions SSH key was verified against the pinned Lightsail host
  key and stored as the repository secret `LIGHTSAIL_SSH_PRIVATE_KEY`.
- The initial workflow run observed
  `LIGHTSAIL_DEPLOY_ENABLED=false` and intentionally skipped deployment. After
  the secret and data gates passed, the variable was enabled and run
  `31467947519` deployed the first immutable image successfully.

## 5. Secrets And Data Gates

- [x] Populate `/opt/hypofit/config/api.env` without committing secrets.
- [x] Copy APNs `.p8` and FCM service-account JSON into
  `/opt/hypofit/secrets`, owned by `deploy`, mode `0600`.
- [x] Verify required datasource, Supabase, social-provider, push-provider,
  support-email, account-deletion, observability, and CORS values.
- [x] Verify direct Supabase pooler connectivity from Lightsail. The Spring
  Docker network cannot use the project's IPv6-only direct endpoint, while the
  shared session pooler at port `5432` authenticated successfully.
- [x] Confirm the Spring container does not need the retired EC2 DB tunnel.
- [x] Apply Alembic head once from a controlled deployment environment and
  record the revision before starting Spring.

Observed on 2026-08-11: Supabase advanced from
`0023_apple_sign_in_notifications` to `0024_add_ai_summary_artifacts`. The
runtime connection uses the shared session pooler and the resulting revision
was confirmed as head.

The first immutable Spring image was deployed successfully by GitHub Actions
run `31467947519`. Local Spring health/readiness and the host Nginx-to-Spring
proxy return healthy responses. The Ubuntu and Lightsail firewalls permit ports
80 and 443, and an external request to the static IP returned `200`. The
canonical DNS and TLS sequence is the remaining public cutover gate.

## 6. Cutover Sequence

1. Build and publish the exact committed Spring image off-host.
2. Copy the Compose, deploy script, Nginx config, env, and credential files.
3. Pull the pinned image and start Spring on `127.0.0.1:8080`.
4. Verify `/health` and `/api/v1/health/ready` locally.
5. Configure Nginx against local Spring and verify through the static IP or a
   temporary hostname without changing canonical DNS.
6. Run authenticated smoke for users, interview posts, applications, chat,
   notifications, support/report/block, account lifecycle, and push outbox.
7. Issue the TLS certificate for `hypofit-api.bukae.co.kr` using a controlled
   DNS or temporary-host sequence.
8. Lower DNS TTL if needed and repoint the canonical A record to
   `54.116.198.195`.
9. Verify public health, authenticated traffic, CORS, mobile/web clients,
   provider callbacks, push delivery, memory, swap, and logs.
10. Retain the prior pinned image for application rollback. DNS can be moved
    back only to a known healthy endpoint; the retired GPU is not one.

## 7. Completion Criteria

- [x] One Spring container is the only API and push runtime.
- [x] No FastAPI or Python worker process runs on Lightsail.
- [x] Spring remains below the configured memory limit without sustained swap
  activity or restart loops.
- [ ] Local, pre-DNS, canonical public, and authenticated smoke all pass.
- [x] Supabase migrations and direct/pooler connectivity are recorded.
- [ ] APNs/FCM credential mounts and push delivery are verified.
- [ ] Nginx TLS renewal and deploy rollback commands are documented and tested.
- [x] Canonical DNS points to `54.116.198.195` only after all preceding gates.

Cutover observation on 2026-08-11:

- Canonical DNS now points to `54.116.198.195`.
- Nginx redirects HTTP to HTTPS and proxies canonical readiness successfully.
- The Let's Encrypt certificate expires on 2026-11-09; `certbot.timer` is
  active and `certbot renew --dry-run` completed successfully.
- The first Lightsail image digest is recorded in
  `/opt/hypofit/runtime/DEPLOYED_IMAGE` and is the rollback baseline for the
  next deployment.
