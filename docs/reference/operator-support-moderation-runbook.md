# Operator Support, Report, Deletion, and Audit Runbook

Status: reference

Last updated: 2026-08-12

## Purpose

This runbook defines the MVP operator workflow for Hypofit support tickets,
reports, moderation actions, public account-deletion requests, push smoke, and
audit-event inspection.

Operators should use the internal web admin console first and fall back to
authenticated admin API calls, Supabase inspection, and API logs only when the
console does not expose the needed operation.

## Safety Rules

- Do not share user emails, phone numbers, raw chat text, access tokens, refresh
  tokens, push tokens, or Supabase service keys in screenshots or reports.
- Use support-ticket IDs, report IDs, moderation-action IDs, user IDs, and
  request IDs when discussing cases internally.
- Keep raw provider logs and `.env` values off Notion, Slack, and GitHub.
- When the operator is unsure whether a request is a legal/privacy request,
  keep the ticket open and escalate before closing it.

## Access Model

Admin APIs require an authenticated Hypofit app user that passes
`CurrentAdminAppUser`.

Current admin surfaces:

```text
GET   /api/v1/admin/me
GET   /api/v1/admin/summary
GET   /api/v1/admin/support/tickets
GET   /api/v1/admin/support/tickets/{ticket_id}
PATCH /api/v1/admin/support/tickets/{ticket_id}/status
POST  /api/v1/admin/support/tickets/{ticket_id}/replies
GET   /api/v1/admin/targets/{target_type}/{target_id}
POST  /api/v1/admin/moderation/actions
POST  /api/v1/admin/notifications/test
POST  /api/v1/admin/push-deliveries/dispatch
```

Operational health surfaces:

```text
GET /health
GET /api/v1/health
GET /api/v1/health/ready
```

## Admin Console

Use `/admin` in the web app for routine MVP operations. The console is not
linked from public navigation and requires the authenticated user email to be in
`ADMIN_EMAILS`.

Primary console checks:

1. Confirm `GET /api/v1/admin/me` succeeds for the operator.
2. Use the summary and health panels to check support queue counts, API health,
   database readiness, outbound email readiness, and push readiness.
3. Use the support ticket inbox for inquiries, reports, privacy requests, and
   account-deletion requests.
4. Open ticket detail before acting. Check target preview when a ticket points
   to a user, post, application, chat room, chat message, or session.
5. For reports, create moderation actions from the report detail and keep the
   reason concise.
6. For user-visible replies, verify an in-app notification is created.
7. Use push dispatch/test controls only for scoped operator smoke or intended
   reviewer/internal test devices.

Production smoke performed on 2026-06-29 verified:

- admin operator access with `ssamso8282@gmail.com`,
- support ticket list/detail,
- status update,
- visible operator reply,
- `support_replied` in-app notification creation,
- API/database/email/push readiness through `/api/v1/health/ready`.

At smoke time, the review account had no enabled registered push device, so no
real APNs/FCM device delivery was dispatched. Provider configuration and worker
readiness were verified through readiness checks.

## Manual Push Smoke

Use this only for intended TestFlight, internal, or Play smoke accounts. The
script creates a real notification row and a push delivery row. It prints only
the push token hash prefix, never the raw APNs/FCM token.

Run it from the deployed API checkout after the production `.env` is loaded:

```bash
cd /home/bukae/hypofit/apps/api
python scripts/manual_push_smoke.py \
  --email sehyeon73@gmail.com \
  --type chat_message \
  --target-type chat_room \
  --target-id <chat_room_uuid> \
  --provider apns \
  --environment production \
  --dispatch
```

Target-specific examples:

```bash
python scripts/manual_push_smoke.py \
  --email sehyeon73@gmail.com \
  --type application_created \
  --target-type interview_post \
  --target-id <interview_post_uuid> \
  --dispatch

python scripts/manual_push_smoke.py \
  --email sehyeon73@gmail.com \
  --type support_replied \
  --target-type support_ticket \
  --target-id <support_ticket_uuid> \
  --dispatch
```

Safety rules:

- Use `--dispatch` only when an actual device notification is intended.
- Omit `--dispatch` for a dry run. The script rolls back the notification and
  delivery rows in dry-run mode.
- Do not paste raw device tokens or provider credentials into reports.
- After dispatch, verify `dispatch_result.status` and then tap the
  notification on the device to confirm route behavior.

## Support Ticket Review

1. List open and in-review support tickets.
2. Check:
   - `kind`
   - `category`
   - `subject`
   - `body`
   - `contact_email`
   - `target_type`
   - `target_id`
   - event history
3. If the issue needs more information, reply visibly to the user.
4. Move the ticket to `in_review` while investigating.
5. Move the ticket to `resolved` only after the user-facing action is complete
   or the operator response clearly explains the decision.
6. Use `closed` for duplicates, spam, invalid requests, or already-resolved
   tickets that should not remain in the active queue.

Do not edit user-submitted ticket text. Add operator replies/events instead.

## Report Review

Reports are stored as `support_tickets.kind = report`.

1. Review the report target:
   - `user`
   - `interview_post`
   - `application`
   - `chat_room`
   - `chat_message`
   - `session`
2. Check whether the target still exists and is visible.
3. Check whether the reporter and reported user have an active block relation.
4. If action is needed, create a moderation action and link it to the source
   ticket.
5. Reply to the reporter with a short visible update when appropriate. Do not
   disclose private moderation details about another user.
6. Mark the report `resolved` after the review decision is recorded.

## Moderation Action Review

Use moderation actions for product-state changes caused by a report or operator
review.

Current target types:

```text
user
interview_post
application
chat_message
session
```

Before applying moderation:

- Confirm the target type and ID.
- Confirm the requested action matches current policy.
- Link the action to `source_ticket_id` when it came from a report.
- Write a concise internal reason.

After applying moderation:

- Confirm the target state changed as expected.
- Confirm the action wrote an audit event.
- Keep user-facing replies minimal and non-sensitive.

## Public Account-Deletion Requests

Public deletion requests exist for users who cannot access the app or need a
public path for store policy requirements.

MVP flow:

1. User submits a public deletion request.
2. The backend sends a verification email through the configured outbound email
   provider.
3. User opens the verification link.
4. If an active account matches, the backend runs the same deletion workflow as
   in-app account deletion.
5. If no active account matches, the backend completes the request without
   exposing whether an account existed.
6. The backend redacts the raw request email after completion and stores only
   operational deletion metadata.

Operator checks:

- Confirm request status and `result`.
- Confirm `email_redacted_at` is set after completion.
- Confirm `retention_note` matches the retained workflow/safety records.
- Confirm `auth_user_delete_status` is `deleted` or `not_found` before telling
  the user same-email re-registration should work immediately.
- If `auth_user_delete_status` is `pending`, `failed_retryable`, or
  `skipped_missing_config`, run the Auth cleanup retry flow below.
- Do not disclose whether another person owns or owned the submitted email.

## Account Deletion Auth Cleanup Retry

Use this only for completed account deletion requests whose app account was
already deleted/anonymized but Supabase Auth cleanup did not finish.

Dry-run from the deployed API checkout:

```bash
cd /home/bukae/hypofit/apps/api
python scripts/retry_account_deletion_auth_cleanup.py
```

Apply retry after checking the dry-run output:

```bash
cd /home/bukae/hypofit/apps/api
ALLOW_ACCOUNT_DELETION_AUTH_RETRY=true \
python scripts/retry_account_deletion_auth_cleanup.py
```

By default the script retries only:

```text
pending
failed_retryable
skipped_missing_config
null legacy status
```

Only include `failed_non_retryable` after an operator confirms the old failure
cause has been fixed:

```bash
cd /home/bukae/hypofit/apps/api
ALLOW_ACCOUNT_DELETION_AUTH_RETRY=true \
INCLUDE_NON_RETRYABLE_ACCOUNT_DELETION_AUTH_RETRY=true \
python scripts/retry_account_deletion_auth_cleanup.py
```

Safety rules:

- The script must not print raw user emails.
- Do not run write mode before a dry-run.
- If the script reports `skipped_missing_config`, check `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` in the API runtime environment.
- If the script reports `failed_retryable`, inspect API logs/Sentry for provider
  or network failure and retry later.
- If the script reports `deleted` or `not_found`, same-email re-registration
  should no longer be blocked by Supabase Auth for that account.

## Account Deletion Re-Registration Smoke

Use this after deploying account deletion changes, applying migrations, and
configuring `ACCOUNT_DELETION_HASH_PEPPER`. The smoke creates a disposable
Supabase Auth user, syncs an app profile, deletes it through the API, then
creates another Supabase Auth user with the same email and confirms a new
`app_users` id is created.

Dry-run from the deployed API checkout:

```bash
cd /home/bukae/hypofit/apps/api
API_BASE_URL=https://hypofit-api.bukae.co.kr \
SMOKE_ACCOUNT_EMAIL=hypofit-delete-smoke@example.com \
SMOKE_ACCOUNT_PASSWORD='replace-with-strong-password' \
python scripts/smoke_account_deletion_reregistration.py
```

Run the real smoke only with a disposable email:

```bash
cd /home/bukae/hypofit/apps/api
API_BASE_URL=https://hypofit-api.bukae.co.kr \
SMOKE_ACCOUNT_EMAIL=hypofit-delete-smoke@example.com \
SMOKE_ACCOUNT_PASSWORD='replace-with-strong-password' \
ALLOW_ACCOUNT_DELETION_REREGISTRATION_SMOKE=true \
python scripts/smoke_account_deletion_reregistration.py
```

Required runtime env:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Safety rules:

- Use only a disposable smoke email.
- Do not run this against a real user email.
- The script prints a short email hash marker, not the raw email.
- The script cleans up the second smoke account through the API deletion flow
  after verifying re-registration.
- If the smoke fails after creating an Auth user, the script attempts Supabase
  Auth cleanup, but the operator should still check by the printed ids and
  audit events before re-running.

## Audit Event Inspection

Use audit events to answer dispute and review questions such as:

- Who changed an application status?
- Who canceled or rescheduled a session?
- Who marked no-show?
- Which report caused a moderation action?
- When was an account deletion requested or completed?

Inspection checklist:

1. Start from the product object ID: user, ticket, report, post, application,
   session, or moderation action.
2. Search audit events by `target_type` and `target_id`.
3. Compare `before`, `after`, `reason`, and `metadata`.
4. Record only the minimum non-sensitive facts needed for the decision.

## Logs And Health

Lightsail Spring API container:

```bash
ssh deploy@54.116.198.195 "cd /opt/hypofit/runtime && docker compose ps"
ssh deploy@54.116.198.195 "cd /opt/hypofit/runtime && docker compose logs --tail=120 api"
```

Public health:

```bash
curl -sS https://hypofit-api.bukae.co.kr/api/v1/health
curl -sS https://hypofit-api.bukae.co.kr/api/v1/health/ready
```

Readiness checks are non-destructive. They should not expose secrets.

## Escalation

Escalate before closing a ticket when it involves:

- account deletion dispute
- payment or case-fee dispute
- personal information exposure
- abuse, harassment, or repeated no-show behavior
- legal notice or law-enforcement request
- store-review policy issue

## Current Gaps

- The admin console is intentionally MVP-scoped and does not replace Supabase
  inspection for deep audit/debug work.
- Public deletion verification email delivery remains manual unless explicitly
  changed.
- Retention/purge automation is not finalized yet.
- Domain support email migration is deferred; current launch contact remains
  `ssamso8282@gmail.com` unless explicitly changed.
