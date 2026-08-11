# DB Concurrency, Transactions, And Chat Hardening Plan

Status: completed

Last updated: 2026-06-15

## Implementation Update - 2026-06-15

Implemented in the current codebase:

- Added Alembic/ORM support for chat message idempotency, one scheduled
  session per application, one attendance record per session, and push delivery
  uniqueness/indexing.
- Reworked application review/withdrawal and session terminal flows to use
  locked or conditional state transitions before writing chat/notification
  side effects.
- Added optional chat `client_message_id`, message-based read marker payload,
  stable `before + before_id` pagination support, and mobile send/read usage.
- Added push delivery `for update skip locked` pending selection and stale
  `sending` recovery.
- Made push delivery enqueue idempotent with
  `on_conflict_do_nothing` on `(notification_id, push_device_id)`.
- Applied Alembic migrations `0017` and `0018` on the GPU API server and
  restarted `hypofit-api.service` and `hypofit-push-worker.service`.
- Verified:
  - `apps/api/.venv/bin/python -m compileall apps/api/app`
  - `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
  - `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build`
  - `apps/api/.venv/bin/python -m pytest apps/api/tests/test_chat_service.py apps/api/tests/test_sessions_service.py apps/api/tests/test_application_withdrawal.py`
- Deployment verified through internal and public API health/readiness checks.

Deferred outside active implementation:

- Deeper repository-level tests for true concurrent transactions against
  Postgres.
- Stricter claim-commit-send-result push provider split before running
  multiple worker processes. The MVP currently runs one worker and uses
  Postgres claiming, stale recovery, and unique delivery rows.

## Purpose

Harden Hypofit backend state transitions and chat-related writes against
duplicate taps, mobile retry, concurrent requests, and multiple worker
processes.

The current MVP API is usable for low-volume beta, but several workflows still
use this pattern:

```text
read current row/state
  -> decide what should happen
  -> write entity
  -> write chat system message
  -> write notification/push delivery
  -> commit
```

Without row-level locking, conditional updates, or stronger database
constraints, concurrent requests can create duplicate system messages,
duplicate notifications, duplicate scheduled sessions, or final-state
conflicts.

## Current Risk Summary

### Safe Enough For MVP

- Duplicate interview applications are protected by
  `uq_applications_post_respondent`.
- Duplicate chat rooms per application are protected by
  `uq_chat_rooms_application_id`.
- Duplicate chat participant settings per room/user are protected by
  `uq_chat_room_participant_settings_room_user`.
- Mobile chat polling is currently scoped to focused/active screens and does
  not poll in background.

### Not Production-Hardened Yet

- Application status changes can race:
  - founder selects and rejects the same application concurrently;
  - duplicate system messages can be appended;
  - duplicate or conflicting notifications can be produced;
  - last commit wins the final status.
- Session scheduling can race:
  - two scheduled sessions can be created for the same selected application.
- Session terminal actions can race:
  - complete, cancel, and no-show can all pass the current `scheduled` check
    before one of them commits.
- Push worker dispatch can race:
  - multiple worker processes can claim the same pending delivery;
  - provider send can succeed but DB commit can fail, leaving the delivery
    eligible for resend.
- Chat message send is not idempotent:
  - network retry or double tap can create duplicate user messages.
- Chat read state is timestamp-based:
  - `last_read_at = now()` can mark a just-arrived message read even if the
    user did not actually see it.
- Chat pagination uses `before: datetime` only:
  - same-timestamp messages can be skipped or duplicated across pages.

## Design Principles

- Keep all important state in Supabase Postgres.
- Prefer database constraints for invariants that must never break.
- Prefer conditional update or row lock for state transitions.
- Keep route handlers thin; put concurrency-sensitive logic in services and
  repositories.
- Make user actions idempotent where mobile retry or double tap is plausible.
- Do not add Redis, distributed locks, or GPU-local coordination for critical
  state.
- Keep push dispatch at-least-once initially, but reduce duplicate delivery
  risk with DB claiming and unique constraints.

## Target Transaction Model

For each workflow, the service should execute one explicit transactional unit:

```text
load/lock or conditional-update domain row
  -> validate allowed transition
  -> write domain row
  -> write chat system message if needed
  -> write notification row and push delivery outbox rows
  -> commit once
```

Provider-side work that can be slow or externally flaky should not run inside
the same transaction as core domain writes.

## Implementation Plan

### Phase 1: Database Constraints And Migrations

Add migrations for invariants that should be database-enforced.

- [x] Add partial unique index for one active scheduled session per
      application:

```sql
create unique index uq_interview_sessions_one_scheduled_per_application
on interview_sessions (application_id)
where status = 'scheduled' and moderation_status = 'visible';
```

- [x] Add uniqueness for push delivery per notification/device:

```sql
alter table push_deliveries
add constraint uq_push_deliveries_notification_device
unique (notification_id, push_device_id);
```

- [x] Decide and implement attendance-record uniqueness:
  - preferred MVP rule: one attendance record per session;
  - add `unique(session_id)` if product behavior does not require multiple
    attendance events per session.
- [x] Add chat message idempotency support:
  - add nullable `client_message_id`;
  - add unique index on `(room_id, sender_id, client_message_id)` where
    `client_message_id is not null`.
- [x] Add indexes required by new conditional queries:
  - `applications(id, status)`;
  - `interview_sessions(id, status)`;
  - `push_deliveries(status, next_attempt_at, created_at)`.

### Phase 2: Application State Transition Hardening

Update application repository/service code.

- [x] Add repository method for conditional status transition:

```text
update applications
set status = :next_status, ...
where id = :application_id
  and status in (:allowed_previous_statuses)
returning *
```

- [x] Replace in-memory `previous_status` checks with conditional update.
- [x] Define explicit allowed transitions:
  - `applied -> selected`
  - `applied -> rejected`
  - `applied -> canceled`
  - `selected -> canceled`
  - `selected -> completed`
  - `selected -> no_show`
- [x] Return `409 conflict` when the transition has already been consumed or is
      no longer valid.
- [x] Emit chat system messages and notifications only after the transition
      update returns a row.
- [x] Add more tests for concurrent-looking cases using stale object/state:
  - select after reject;
  - reject after select;
  - withdraw after selected with scheduled session;
  - repeated same transition.

### Phase 3: Session Scheduling And Terminal State Hardening

Update session repository/service code.

- [x] Replace `has_scheduled_session_for_application` read-then-insert with a
      DB-enforced unique scheduled-session invariant.
- [x] Catch `IntegrityError` on duplicate scheduled session and return `409`.
- [x] Add conditional terminal transitions:

```text
update interview_sessions
set status = :next_status
where id = :session_id
  and status = 'scheduled'
returning *
```

- [x] Ensure complete/cancel/no-show only emits audit, notification, and chat
      messages when the conditional update succeeds.
- [x] Ensure application status is updated consistently with terminal session
      state:
  - complete -> application completed;
  - no-show -> application no_show;
  - cancel -> session canceled and application remains selected for
    rescheduling.
- [x] Add more tests:
  - duplicate session creation returns conflict;
  - complete then no-show returns conflict;
  - cancel then complete returns conflict;
  - terminal action does not create duplicate attendance record.

### Phase 4: Chat Message Idempotency And Read State

Update chat API contract and mobile client.

- [x] Extend `ChatMessageCreate` with optional `client_message_id`.
- [x] Generate a UUID on mobile before sending each user message.
- [x] If a duplicate `client_message_id` is submitted, return the existing
      message instead of creating another row.
- [x] Keep optimistic UI from appending duplicate messages when server returns
      an already-existing message.
- [x] Replace or supplement `last_read_at` with a message-based read marker:
  - preferred: `last_read_message_id`;
  - fallback: set `last_read_at` to the latest visible counterpart message's
    `created_at`, not server `now()`.
- [x] Update unread-count query to use the selected read model.
- [x] Update pagination to use a stable cursor:
  - `before_created_at`;
  - `before_id`;
  - ordering by `(created_at desc, id desc)`.
- [x] Add more tests:
  - duplicate message retry returns one row;
  - unread count does not mark unseen messages as read;
  - pagination does not skip same-timestamp messages.

### Phase 5: Push Delivery Claiming And Idempotency

Update push repository/service/worker.

- [x] Add unique constraint on `(notification_id, push_device_id)`.
- [x] Make delivery enqueue idempotent:
  - use insert-on-conflict-ignore where possible;
  - or catch `IntegrityError` and reload existing rows.
- [x] Replace simple pending select with claim query:

```text
select ...
from push_deliveries
where status = 'pending'
  and next_attempt_at <= now()
for update skip locked
limit :limit
```

- [x] Commit claimed `sending` rows before provider calls, or use an atomic
      `update ... returning` claim.
- [x] Add recovery for stuck `sending` rows:
  - if `updated_at` older than configured threshold, return to `pending` unless
    max attempts exceeded.
- [x] Keep provider sends outside core domain write transactions.
- [x] Add tests:
  - two dispatch calls cannot process the same delivery row at once;
  - enqueue duplicate notification/device produces one delivery;
  - stuck sending row becomes retryable.

### Phase 6: Transaction Boundary Cleanup

Standardize commit behavior in backend services.

- [x] Document service-level transaction ownership:
  - route handlers do not commit;
  - repositories flush but do not commit;
  - top-level service method commits once.
- [x] Avoid nested service calls that may commit unexpectedly.
- [x] Check services that currently call `session.commit()` and make sure they
      are top-level workflow boundaries.
- [x] For multi-step workflows, avoid external provider calls before core DB
      commit.
- [x] Add an internal helper or convention for `commit + refresh` to reduce
      inconsistent behavior.

## API And Contract Changes

Expected contract changes:

- `ChatMessageCreate.client_message_id?: string`
- Chat message pagination may add:
  - `before_created_at?: string`
  - `before_id?: string`
- Chat room read endpoint may add:
  - `last_read_message_id?: string`

Mobile and web clients must be updated in the same change when request/response
contracts change.

## Test Plan

Backend:

- [x] Add repository/service tests for application transition conflicts.
- [x] Add repository/service tests for duplicate scheduled session conflicts.
- [x] Add repository/service tests for terminal session conflicts.
- [x] Add chat idempotency tests.
- [x] Add push delivery claiming/idempotency tests.
- [x] Run targeted API tests:

```bash
apps/api/.venv/bin/python -m pytest apps/api/tests
```

Mobile:

- [x] Typecheck mobile after contract changes:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

Deployment:

- [x] Apply Alembic migration locally.
- [x] Deploy API to GPU server through the documented git pull/systemd restart
      path.

## Rollback Plan

- Database migrations should be additive first:
  - add nullable columns;
  - add non-breaking indexes;
  - deploy code that uses them;
  - only then enforce stricter behavior if needed.
- If a unique constraint fails due to existing duplicate data:
  - write a cleanup query first;
  - archive/merge duplicates deliberately;
  - do not force-drop user-visible records without a retention decision.
- If push claiming causes delivery stalls:
  - disable push worker temporarily;
  - keep in-app notifications available;
  - inspect `push_deliveries` statuses before retrying.

## Close Criteria

Move this document to `docs/completed/` when:

- duplicate scheduled sessions are DB-impossible;
- application and session terminal transitions are conditional or locked;
- chat message send is idempotent;
- chat read state cannot mark unseen messages as read;
- push delivery enqueue and worker claiming are idempotent enough for multiple
  worker/process scenarios;
- targeted backend and mobile contract checks pass.
