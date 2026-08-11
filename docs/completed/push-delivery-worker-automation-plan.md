# Push Delivery Worker Automation Plan

Status: completed - worker implemented, deployed, and running on GPU

Last updated: 2026-06-09

## Purpose

Make Hypofit OS push notifications send automatically when workflow events
create push delivery rows.

Previous state:

```text
workflow event
  -> notifications row is created
  -> push_deliveries rows are enqueued
  -> admin/manual dispatch must be triggered
```

Implemented state:

```text
workflow event
  -> notifications row is created in the same DB transaction
  -> push_deliveries rows are enqueued in the same DB transaction
  -> a small worker loop claims pending deliveries
  -> APNs/FCM send is attempted
  -> delivery status is persisted
  -> transient failures are retried
  -> invalid tokens are disabled
```

The goal is not to add a heavy queue system. The MVP should use the existing
Postgres-backed push outbox and a supervised worker process.

## References Checked

Checked on 2026-06-09:

- Apple APNs provider responses:
  https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns
- Firebase Cloud Messaging HTTP v1:
  https://firebase.google.com/docs/cloud-messaging/send/v1-api
- Transactional outbox pattern:
  https://microservices.io/patterns/data/transactional-outbox
- AWS transactional outbox guidance:
  https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- FastAPI background tasks:
  https://fastapi.tiangolo.com/tutorial/background-tasks/

Reference conclusions:

- Push send requests belong in a trusted server environment. FCM HTTP v1 uses a
  server-side service account or ADC-style credential flow, not mobile/client
  secrets.
- APNs returns per-request provider responses. Some token/topic/payload errors
  should not be retried.
- A workflow event and an external notification send are a classic dual-write
  problem. The reliable pattern is to write the outbox row in the same DB
  transaction, then let a separate relay/worker publish it.
- Outbox relays can send duplicates after a crash, so status transitions and
  provider-message persistence must be idempotent enough for retries.
- FastAPI `BackgroundTasks` is acceptable for small in-process work after a
  response, but it is not the best primary mechanism for durable push delivery
  because GPU server restarts and process crashes are expected. Hypofit already
  has a durable outbox, so a supervised worker loop is the better MVP path.

## Current Repository State

Already implemented:

- `notifications` table stores in-app notification records.
- `push_devices` stores APNs/FCM native tokens.
- `notification_preferences` controls push eligibility.
- `push_deliveries` is the durable push outbox.
- Workflow services call `notification_service.create_notification(...)`.
- `create_notification(...)` calls `push_service.enqueue_for_notification(...)`.
- `enqueue_for_notification(...)` creates `push_deliveries` rows for eligible
  devices.
- `dispatch_pending_deliveries(...)` sends pending rows to APNs/FCM and updates
  delivery status.
- Admin endpoint exists:

```text
POST /api/v1/admin/push-deliveries/dispatch
```

Currently connected workflow events:

```text
chat_message
application_created
application_selected
application_rejected
session_rescheduled
session_canceled
no_show_marked
support_replied
```

Events that currently create in-app notifications but do not send OS push:

```text
application_canceled
application_withdrawn
session_completed
```

Reason:

- They are not in `PUSH_ELIGIBLE_TYPES`.
- This is acceptable if product policy intentionally treats them as lower
  urgency. If not intentional, add them explicitly with safe copy and route
  policy.

Worker deployment state:

- `hypofit-push-worker.service` is installed as a GPU systemd user service.
- The worker runs from `/home/bukae/hypofit/apps/api`.
- Runtime configuration is loaded from `/home/bukae/hypofit/.env`.
- `PUSH_WORKER_ENABLED=true` is enabled on the GPU server.
- `PUSH_WORKER_IDLE_SLEEP_SECONDS=30` is used to keep idle DB polling
  conservative for the Supabase free plan.
- The worker starts and stays active.
- Health/readiness exposes push worker configuration.

Remaining push closeout work is tracked in
`docs/completed/native-push-notification-apns-fcm-plan.md`, not in this completed
worker implementation note.

## Decision

Use the existing Postgres outbox plus a small long-running worker.

Recommended MVP:

```text
systemd user service on GPU server
  -> python -m app.workers.push_delivery_worker
  -> loop every 2-5 seconds when work exists
  -> back off to 15-30 seconds when idle
  -> call dispatch_pending_deliveries(limit=N)
```

Do not use these for the first implementation:

- Redis queue
- Celery/RQ
- Kafka
- SQS
- direct APNs/FCM call inside the user request path
- FastAPI `BackgroundTasks` as the only delivery mechanism

Reason:

- Redis/queue infra would add operational complexity.
- GPU server is not a durable coordination store.
- Direct send in the request path creates latency and dual-write problems.
- FastAPI in-process background tasks can disappear on process crash/restart.
- The existing DB outbox already gives durable retry state with minimal new
  infrastructure.

## Worker Behavior

### Loop

Target module:

```text
apps/api/app/workers/push_delivery_worker.py
```

Behavior:

```text
start
  -> load settings
  -> if PUSH_ENABLED is false, log and sleep
  -> if PUSH_WORKER_ENABLED is false, log and exit or idle
  -> open DB session
  -> dispatch_pending_deliveries(limit=PUSH_WORKER_BATCH_SIZE)
  -> commit handled by service
  -> sleep short interval if processed > 0
  -> sleep idle interval if processed == 0
  -> handle SIGTERM/SIGINT gracefully
```

Suggested environment variables:

```text
PUSH_WORKER_ENABLED=true
PUSH_WORKER_BATCH_SIZE=20
PUSH_WORKER_IDLE_SLEEP_SECONDS=30
PUSH_WORKER_ACTIVE_SLEEP_SECONDS=2
PUSH_WORKER_ERROR_SLEEP_SECONDS=30
```

Existing variables to keep:

```text
PUSH_ENABLED
PUSH_BATCH_SIZE
PUSH_MAX_ATTEMPTS
PUSH_APNS_ENABLED
PUSH_APNS_*
PUSH_FCM_ENABLED
PUSH_FCM_*
```

Implementation note:

- Reuse `dispatch_pending_deliveries`.
- Do not duplicate APNs/FCM send logic in the worker.
- Add worker-specific logs around batch start/result/error.

### Claiming Pending Deliveries

Current dispatch can select pending rows. For a single MVP worker, this is
enough.

Before running multiple workers, add one of these protections:

```text
SELECT ... FOR UPDATE SKIP LOCKED
```

or a claim transition:

```text
pending -> sending
```

with an atomic update filter.

MVP recommendation:

- Start with one worker process.
- Keep batch size small.
- Add `FOR UPDATE SKIP LOCKED` before scaling beyond one process.

### Retry Policy

Keep current retry policy:

```text
pending -> sending -> sent
pending -> sending -> pending with next_attempt_at
pending -> sending -> failed after max attempts
pending -> sending -> invalid and disable token
pending -> sending -> skipped
```

Provider handling:

- APNs invalid-token class errors should disable the device token.
- FCM unregistered/invalid-token class errors should disable the device token.
- Transient HTTP/network errors should retry with backoff.
- Provider responses must not leak raw device tokens in logs.

### Delivery Semantics

Expected guarantee:

```text
at least once attempt
best-effort user delivery
no duplicate DB delivery rows for the same notification/device
idempotent provider-result handling
```

Do not promise:

```text
exactly once OS notification delivery
guaranteed lock-screen display
instant delivery under all network/provider conditions
```

## API Request Path Policy

Do not send APNs/FCM inside the same request that changes product state.

Correct request path:

```text
POST /chat/rooms/{id}/messages
  -> insert chat message
  -> insert notification
  -> insert push delivery
  -> commit
  -> return response
  -> worker dispatches pending delivery soon after
```

Reason:

- User-facing mutation latency stays stable.
- If APNs/FCM is slow or down, the business mutation still succeeds.
- Retry state is durable.
- A GPU server restart does not lose the notification.

## Dispatch Frequency

MVP target:

```text
active sleep: 2 seconds
idle sleep: 15 seconds
error sleep: 30 seconds
batch size: 20
```

Expected user experience:

- Chat/application/session/support push usually arrives within a few seconds.
- If there is no work, the worker produces little load.

Future optimization:

- PostgreSQL `LISTEN/NOTIFY` or a lightweight wake-up endpoint can reduce idle
  latency, but it is not needed for MVP.

## Health and Observability

Add worker observability without exposing secrets.

Worker logs:

```text
push_worker_started
push_worker_batch_result
push_worker_error
push_worker_stopped
```

Batch result fields:

```text
processed
sent
failed
invalid
skipped
duration_ms
```

Readiness data to expose or log:

```text
push_enabled
push_worker_enabled
apns_configured
fcm_configured
pending_delivery_count
oldest_pending_delivery_age_seconds
recent_failed_delivery_count
```

Do not log:

- raw push token
- APNs private key
- FCM service-account JSON
- user email
- chat message body
- support body

Sentry:

- Capture unexpected worker exceptions with phase:

```text
push_worker_loop
push_worker_batch
push_dispatch_provider_exception
```

## GPU Deployment Plan

The GPU server has no Docker permission. Use a systemd user service.

Target service:

```text
hypofit-push-worker.service
```

Suggested service shape:

```ini
[Unit]
Description=Hypofit push delivery worker
After=network-online.target hypofit-api.service

[Service]
WorkingDirectory=/home/bukae/hypofit/apps/api
EnvironmentFile=/home/bukae/hypofit/apps/api/.env
ExecStart=/home/bukae/miniconda3/envs/hypofit/bin/python -m app.workers.push_delivery_worker
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

Operational commands:

```bash
ssh bukae-gpu "systemctl --user daemon-reload"
ssh bukae-gpu "systemctl --user enable --now hypofit-push-worker.service"
ssh bukae-gpu "systemctl --user status hypofit-push-worker.service --no-pager -l"
ssh bukae-gpu "journalctl --user -u hypofit-push-worker.service -n 120 --no-pager"
ssh bukae-gpu "systemctl --user restart hypofit-push-worker.service"
```

Deployment rule:

- Deploy code by git sync.
- Do not overwrite `.env` blindly.
- Back up `.env` before adding worker variables.
- Keep APNs `.p8` and FCM JSON out of git.

## Implementation Steps

### Step 1 - Add Worker Settings

Files:

```text
apps/api/app/core/config.py
.env.example
```

Status: implemented.

Tasks:

- Add worker enable and sleep interval settings.
- Keep current API behavior unchanged when `PUSH_WORKER_ENABLED=false`.
- Document defaults.

### Step 2 - Add Push Worker Module

Files:

```text
apps/api/app/workers/__init__.py
apps/api/app/workers/push_delivery_worker.py
```

Status: implemented.

Tasks:

- Create async loop.
- Open a DB session per batch.
- Call `dispatch_pending_deliveries`.
- Log sanitized batch results.
- Gracefully stop on SIGTERM/SIGINT.
- Sleep based on active/idle/error state.

### Step 3 - Add Worker Tests

Files:

```text
apps/api/tests/test_push_worker.py
```

Status: implemented.

Tasks:

- Verify one loop iteration calls dispatch when enabled.
- Verify disabled worker exits or idles without dispatch.
- Verify exceptions are logged and do not crash the supervisor loop
  unexpectedly.
- Keep provider calls mocked.

### Step 4 - Add Optional Dispatch Metrics

Files:

```text
apps/api/app/repositories/push.py
apps/api/app/services/push.py
apps/api/app/api/v1/routes/health.py
```

Status: partially implemented.

Tasks:

- Add repository helper for pending count and oldest pending age.
- Add readiness output fields if this does not bloat health responses.
- Keep secrets and raw token data out of health output.

Current implementation:

- Worker enablement, batch size, and sleep interval settings are exposed in
  readiness.
- Pending count and oldest pending age are still deferred to avoid adding a DB
  query to readiness before the first deployed worker smoke.

### Step 5 - Add Systemd Service Template

Files:

```text
infra/systemd/hypofit-push-worker.service
docs/deployment.md
```

Status: implemented.

Tasks:

- Add service template.
- Document GPU install/restart/log commands.
- Mention that one worker process is the MVP-supported topology.

### Step 6 - Deploy to GPU

Steps:

```text
git push from local
ssh bukae-gpu
cd /home/bukae/hypofit
git pull
install/update Python deps if needed
backup .env
add PUSH_WORKER_* variables
install systemd user service
restart API if config changed
start worker
check logs
check readiness
```

Status: completed on 2026-06-09.

### Step 7 - End-to-End Smoke

Smoke cases:

```text
chat message -> APNs/FCM push -> tap opens chat room
application selected -> push -> tap opens 내 인터뷰
support reply -> push -> tap opens support
invalid token mocked -> device disabled
transient provider failure mocked -> delivery remains retryable
```

Status: moved to `docs/completed/native-push-notification-apns-fcm-plan.md`.
Mocked provider behavior is covered by existing push provider tests. Real
workflow/device smoke remains part of the broader native push closeout.

Manual helper:

```bash
python scripts/manual_push_smoke.py \
  --email sehyeon73@gmail.com \
  --type chat_message \
  --target-type chat_room \
  --target-id <chat_room_uuid> \
  --dispatch
```

## Acceptance Criteria

- [x] Worker settings exist and are documented.
- [x] Worker module exists and can be run with `python -m`.
- [x] Worker uses the existing `dispatch_pending_deliveries` service.
- [x] Worker can be disabled with `PUSH_WORKER_ENABLED=false`.
- [x] Worker logs sanitized batch results.
- [x] Worker handles transient loop errors without losing pending deliveries.
- [x] GPU systemd user service template exists.
- [x] GPU deployment docs include start/status/log/restart commands.
- [x] Deployed GPU worker starts and stays running.
- [ ] A real workflow event sends push without manual admin dispatch.
- [ ] TestFlight tap routing still works after automatic dispatch.
- [x] No raw push tokens or provider secrets appear in logs.

## Open Decisions

### Should `application_canceled`, `application_withdrawn`, and `session_completed`
send OS push?

Recommendation:

- Add `session_completed` only if the user needs immediate confirmation.
- Add `application_canceled` if it affects an already active respondent.
- Keep `application_withdrawn` in-app only unless founders need immediate
  awareness.

### Should the worker live on GPU or EC2?

Recommendation for MVP:

- Run it on GPU with the API because it reuses the same code, `.env`, DB tunnel,
  APNs key, and FCM JSON.

Fallback:

- If GPU outbound HTTPS becomes unstable again, move only the push worker to EC2
  while keeping the outbox in Supabase.

### Should dispatch also run immediately after enqueue?

Recommendation:

- Not for MVP. Let the worker poll every few seconds.

Reason:

- It avoids mixing product mutations with provider latency.
- It keeps retry behavior centralized.

Future:

- Add PostgreSQL `LISTEN/NOTIFY` or a lightweight wake mechanism if latency
  becomes a product issue.

## Relationship to Other Documents

- `native-push-notification-apns-fcm-plan.md`
  - Parent native push implementation plan.
- `push-notification-tap-routing-hardening-plan.md`
  - Client-side behavior after a notification is tapped.
- `api-operations-readiness-plan.md`
  - Operational readiness, logs, health, and deployment verification.
- `google-play-data-safety-worksheet.md`
  - Push notification data and permissions must match Play declarations.
- `ios-store-readiness/apple-app-privacy-label-worksheet.md`
  - Push behavior must match iOS App Privacy labels.

## Current Next Action

Run local verification, then deploy Steps 6-7 only when ready:

```text
API worker tests
GPU systemd installation
real workflow event smoke
```
