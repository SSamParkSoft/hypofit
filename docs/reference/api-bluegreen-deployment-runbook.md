# API Blue/Green Deployment Runbook

Status: reference

Last updated: 2026-06-15

## Purpose

This runbook documents the Hypofit FastAPI zero-downtime deployment path for
the school GPU server and EC2 reverse-proxy topology.

The current public path is:

```text
client
  -> https://hypofit-api.bukae.co.kr
  -> EC2 Nginx
  -> EC2 localhost reverse-tunnel port
  -> GPU localhost FastAPI port
  -> Supabase
```

Because the GPU server cannot receive public inbound traffic, blue/green must
switch traffic at EC2 Nginx while the GPU server opens one reverse tunnel per
color.

## Port Map

```text
blue  API: GPU 127.0.0.1:8000 -> EC2 127.0.0.1:18000
green API: GPU 127.0.0.1:8001 -> EC2 127.0.0.1:18001
```

The public Nginx upstream includes this file:

```text
/etc/nginx/snippets/hypofit-api-active-upstream.conf
```

That file contains exactly one active server line:

```nginx
server 127.0.0.1:18000; # blue
```

or:

```nginx
server 127.0.0.1:18001; # green
```

## Repository Artifacts

Systemd user units:

```text
infra/systemd/hypofit-api-blue.service
infra/systemd/hypofit-api-green.service
infra/systemd/hypofit-api-tunnel-blue.service
infra/systemd/hypofit-api-tunnel-green.service
```

Nginx template:

```text
infra/nginx/hypofit-api.bukae.co.kr.bluegreen.conf
```

Scripts:

```text
infra/scripts/install-api-bluegreen.sh
infra/scripts/deploy-api-bluegreen.sh
```

## Server State Files

The scripts keep deployment state under:

```text
/home/bukae/hypofit/deploy/api-active-color
/home/bukae/hypofit/deploy/api-active-sha
```

Release snapshots live under:

```text
/home/bukae/hypofit/releases/<git-sha>
```

The active color symlinks are:

```text
/home/bukae/hypofit/current-blue
/home/bukae/hypofit/current-green
```

Each release gets a `.env` symlink pointing back to:

```text
/home/bukae/hypofit/.env
```

Do not source `.env` from shell scripts. Some values can contain spaces, such
as `RESEND_FROM_EMAIL=Hypofit <no-reply@hypofit.bukae.co.kr>`. The scripts
instead let systemd and Pydantic load the environment.

## One-Time Installation

Run this from the GPU server after the latest repo is pulled:

```bash
cd /home/bukae/hypofit
git pull --ff-only
infra/scripts/install-api-bluegreen.sh
```

The installer:

1. Archives the current Git SHA into `/home/bukae/hypofit/releases/<sha>`.
2. Points `current-green` at that release.
3. Installs blue/green systemd user units.
4. Runs Alembic from the green release.
5. Starts `hypofit-api-green.service` on GPU port `8001`.
6. Starts `hypofit-api-tunnel-green.service` to EC2 port `18001`.
7. Installs the blue/green Nginx template on EC2.
8. Writes the active upstream snippet to `127.0.0.1:18001`.
9. Runs `nginx -t` and reloads Nginx.
10. Stops and disables the legacy single API services.

This first migration changes production traffic from the legacy single service
to green. It should be run while watching health and logs.

## Normal Deployment

After the one-time install, deploy API changes from the GPU server with:

```bash
cd /home/bukae/hypofit
infra/scripts/deploy-api-bluegreen.sh
```

The default target is `origin/main`. To deploy a specific ref:

```bash
infra/scripts/deploy-api-bluegreen.sh <git-ref-or-sha>
```

The deploy script:

1. Reads the current active color.
2. Selects the idle color.
3. Fetches `origin/main`.
4. Archives the target SHA into a release directory.
5. Points `current-<idle>` at that release.
6. Runs Alembic from the idle release.
7. Starts the idle API service.
8. Checks local idle health and readiness.
9. Starts the idle reverse tunnel.
10. Checks EC2 idle tunnel health.
11. Updates the Nginx active upstream snippet.
12. Runs `nginx -t` and reloads Nginx.
13. Verifies public health and readiness.
14. Marks the idle color as active.
15. Stops the previous active service after a short drain period.

## Rollback

If deployment fails before Nginx reload, public traffic remains on the previous
active color.

If deployment fails during Nginx reload, the script attempts to restore the
previous upstream snippet and reload Nginx.

Manual rollback:

```bash
ssh bukae-gpu
cat /home/bukae/hypofit/deploy/api-active-color
```

If active is `green`, switch back to blue:

```bash
ssh -i /home/bukae/.ssh/hypofit_ec2_tunnel ubuntu@43.201.144.113 \
  "echo 'server 127.0.0.1:18000;' | sudo tee /etc/nginx/snippets/hypofit-api-active-upstream.conf >/dev/null && sudo nginx -t && sudo systemctl reload nginx"
echo blue > /home/bukae/hypofit/deploy/api-active-color
```

If active is `blue`, switch back to green:

```bash
ssh -i /home/bukae/.ssh/hypofit_ec2_tunnel ubuntu@43.201.144.113 \
  "echo 'server 127.0.0.1:18001;' | sudo tee /etc/nginx/snippets/hypofit-api-active-upstream.conf >/dev/null && sudo nginx -t && sudo systemctl reload nginx"
echo green > /home/bukae/hypofit/deploy/api-active-color
```

Only perform rollback to a color whose API and tunnel services are running.

## Health Checks

GPU local checks:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8001/health
curl -fsS http://127.0.0.1:8000/api/v1/health/ready
curl -fsS http://127.0.0.1:8001/api/v1/health/ready
```

EC2 tunnel checks:

```bash
ssh -i /home/bukae/.ssh/hypofit_ec2_tunnel ubuntu@43.201.144.113 \
  "curl -fsS http://127.0.0.1:18000/health || true; curl -fsS http://127.0.0.1:18001/health || true"
```

Public checks:

```bash
curl -fsS https://hypofit-api.bukae.co.kr/health
curl -fsS https://hypofit-api.bukae.co.kr/api/v1/health/ready
```

## Logs

```bash
journalctl --user -u hypofit-api-blue.service -n 120 --no-pager
journalctl --user -u hypofit-api-green.service -n 120 --no-pager
journalctl --user -u hypofit-api-tunnel-blue.service -n 120 --no-pager
journalctl --user -u hypofit-api-tunnel-green.service -n 120 --no-pager
```

Legacy service logs can still be useful during the first migration:

```bash
journalctl --user -u hypofit-api.service -n 120 --no-pager
journalctl --user -u hypofit-api-reverse-tunnel.service -n 120 --no-pager
```

## Migration Rules

Blue/green only protects process restarts and traffic switching. It does not
make breaking database migrations safe.

Use this migration order:

```text
expand schema
  -> deploy compatible code
  -> backfill if needed
  -> deploy readers/writers using new shape
  -> contract old schema in a later release
```

Allowed during normal blue/green deploy:

- add nullable columns
- add new tables
- add non-breaking indexes
- add new enum/status values only if old code tolerates them
- additive API response fields

Avoid in the same deploy:

- dropping columns used by old active code
- renaming columns without compatibility shims
- changing enum/status semantics in a way old code cannot read
- adding `NOT NULL` constraints before data is backfilled
- large blocking indexes on hot tables without a separate maintenance plan

## Permission Assumptions

Verified on 2026-06-15:

- GPU user `bukae` can write `/home/bukae` and user systemd units.
- GPU user systemd linger is enabled.
- GPU ports `8001` and `8002` were available.
- GPU can SSH to EC2 using `/home/bukae/.ssh/hypofit_ec2_tunnel`.
- EC2 user `ubuntu` has passwordless sudo.
- EC2 ports `18001` and `18002` were available.
- EC2 can run `sudo nginx -t` successfully.

If any of these assumptions change, re-run the permission audit before
deploying.
