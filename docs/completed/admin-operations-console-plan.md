# Admin Operations Console Plan

Status: completed

Last updated: 2026-06-29

## Purpose

Build the first Hypofit internal admin operations console for launch and store
review readiness.

The goal is not a large analytics dashboard. The goal is to make the current
MVP operable:

- answer user inquiries,
- review reports,
- process account-deletion requests,
- inspect moderation targets,
- create moderation actions,
- check API/push health,
- send narrowly scoped test or workflow notifications when needed.

This plan should replace the current API-only operator workflow for day-to-day
MVP operations while keeping the existing runbook as the operational reference.

## Source Basis

Repository references:

- `docs/reference/operator-support-moderation-runbook.md`
- `docs/reference/native-store-submission-readiness-plan.md`
- `docs/reference/api-operations-readiness-implementation-history.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/error-observability-contract.md`

Existing backend admin surfaces:

```text
GET   /api/v1/admin/support/tickets
PATCH /api/v1/admin/support/tickets/{ticket_id}/status
POST  /api/v1/admin/support/tickets/{ticket_id}/replies
POST  /api/v1/admin/moderation/actions
POST  /api/v1/admin/push-deliveries/dispatch
GET   /api/v1/health
GET   /api/v1/health/ready
```

Implemented in this plan:

```text
GET  /api/v1/admin/me
GET  /api/v1/admin/summary
GET  /api/v1/admin/targets/{target_type}/{target_id}
POST /api/v1/admin/notifications/test
GET  /api/v1/admin/support/tickets/{ticket_id}
```

Existing access model:

- Admin APIs use `CurrentAdminAppUser`.
- Admin access is currently controlled by `ADMIN_EMAILS`.
- Admin users must still be normal authenticated Supabase/Hypofit app users.

## Current Problem

Hypofit has store-review-sensitive user operations:

- support inquiries,
- reports,
- user blocking,
- profile images,
- chat messages,
- account deletion,
- push notifications,
- moderation and safety decisions.

The backend has foundations for these flows, but there is no dedicated operator
UI yet. Operators currently need API calls, Supabase inspection, scripts, and
logs. That is acceptable for very early testing, but weak for App Store/Google
Play launch because support/report/account-deletion responses must be handled
consistently.

## Product Principle

Keep the admin console internal and operational.

In scope:

- support/report/account-deletion inbox,
- ticket detail and event history,
- visible replies,
- internal notes/status reasons,
- moderation actions,
- target object preview,
- push health and dispatch controls,
- public URL/API readiness checks,
- minimal audit visibility.

Out of scope for the first admin console:

- product analytics dashboard,
- revenue dashboard,
- marketing campaign push,
- bulk user messaging,
- payment/settlement tooling,
- role-based admin organizations,
- complex CRM workflows,
- automated AI moderation,
- internal staff management UI,
- broad Supabase table editor.

Do not add a generic admin template that exposes unrelated product data. Every
screen must support a launch/review operation.

## Target Placement

Build the console under the existing web app:

```text
apps/web/src/pages/AdminPage.tsx
apps/web/src/features/admin/
apps/web/src/shared/api/admin.ts
```

Routes:

```text
/admin
/admin/tickets
/admin/tickets/:ticketId
/admin/reports
/admin/deletion-requests
/admin/moderation
/admin/health
/admin/push
```

MVP routing can be path-based in the current `apps/web/src/app/App.tsx` style
before introducing a full router. If the route surface becomes awkward, open a
separate routing cleanup plan rather than mixing it into admin implementation.

## UI Direction

This is a web operations console, not mobile product UI.

Design principles:

- dense but readable,
- table/list/detail split,
- no decorative cards,
- clear status badges,
- fast filtering,
- strong empty/error states,
- visible destructive-action confirmations,
- Korean operator copy,
- no exposed secrets or raw tokens.

Suggested desktop layout:

```text
left rail
  - 운영 홈
  - 문의
  - 신고
  - 계정 삭제
  - 조치 기록
  - 알림/푸시
  - 상태 점검

main
  - top summary
  - queue/list
  - selected detail panel
```

Mobile layout is not a priority for the admin console. It should remain usable
on narrow screens, but operators should use desktop web for real work.

## Security and Privacy Rules

Admin UI must be stricter than normal user UI.

- Require Supabase login.
- Require backend admin authorization through `ADMIN_EMAILS`.
- Do not trust frontend role flags.
- Hide admin routes from normal app navigation.
- If the signed-in user is not admin, show a generic access-denied page.
- Do not store service-role keys in the browser.
- Do not expose raw access tokens, refresh tokens, push tokens, APNs keys, FCM
  service-account JSON, Supabase service role keys, or DB URLs.
- Avoid printing raw user emails/phone numbers in screenshots or logs.
- Redact or collapse sensitive user-generated text where possible in list
  views; show full text only in detail views.
- All status/reply/moderation actions must go through FastAPI admin APIs and
  write audit/event history.

## Data Model Surfaces

### Support Tickets

Existing schema:

- `kind`: `inquiry`, `report`, `privacy`, `account_deletion`
- `category`: `account`, `interview_post`, `application`, `chat`, `reward`,
  `privacy`, `abuse`, `no_show`, `other`
- `status`: `open`, `in_review`, `resolved`, `closed`
- `subject`
- `body`
- `contact_email`
- `target_type`
- `target_id`
- `metadata`
- `deleted_by_user_at`
- `created_at`
- `updated_at`
- `events`

Admin UI must show:

- ticket id,
- kind/category,
- status,
- created/updated time,
- contact email,
- user id,
- target type/id,
- user-submitted subject/body,
- event history,
- operator replies,
- status changes and reasons.

### Moderation Actions

Existing action schema:

- target types:
  - `user`
  - `interview_post`
  - `application`
  - `chat_room`
  - `chat_message`
  - `session`
- action types:
  - `warn`
  - `hide`
  - `remove`
  - `block`
  - `unblock`
  - `close_report`
  - `restore`
- reason,
- source ticket id,
- metadata.

Admin UI must make it hard to perform an action without:

- target type,
- target id,
- source ticket if action came from a report,
- concise reason,
- confirmation for destructive or visibility-affecting actions.

### Push and Notifications

Existing push foundation:

- notification rows are created by workflow events,
- push delivery rows are dispatched by worker,
- admin dispatch endpoint exists for pending deliveries,
- manual smoke script exists for target users.

Admin UI first scope:

- show readiness state from `/api/v1/health/ready`,
- dispatch pending push deliveries,
- optionally call a new test-notification API if implemented,
- never add marketing or bulk push in this phase.

Push copy must remain safe:

- no raw chat message body in OS push,
- no report body,
- no phone number,
- no exact address,
- no rejection reason.

## Required Backend Additions

Existing admin APIs are enough for the first support inbox, but a useful console
needs small backend additions.

### 1. Admin Me Endpoint

Purpose:

- Let the web console confirm admin access and show operator identity.

Proposed API:

```text
GET /api/v1/admin/me
```

Response:

```json
{
  "id": "uuid",
  "email": "operator@example.com",
  "name": "Operator",
  "role": "admin"
}
```

Acceptance:

- returns `200` for `ADMIN_EMAILS` user,
- returns `403` for normal user,
- never exposes secret config.

### 2. Admin Ticket Detail Endpoint

Current list includes events, but detail endpoint is cleaner for UI.

Proposed API:

```text
GET /api/v1/admin/support/tickets/{ticket_id}
```

Acceptance:

- returns one `AdminSupportTicketRead`,
- includes event history,
- returns `404` if missing,
- admin only.

### 3. Admin Dashboard Summary

Purpose:

- Show queue counts without fetching all details.

Proposed API:

```text
GET /api/v1/admin/summary
```

Response direction:

```json
{
  "support": {
    "open": 3,
    "in_review": 1,
    "reports_open": 2,
    "account_deletion_open": 1
  },
  "health": {
    "api": "ok",
    "database": "ok",
    "push": "ok"
  }
}
```

Acceptance:

- counts open/in-review tickets by kind/status,
- includes minimal readiness summary,
- does not perform slow external calls beyond existing health checks.

### 4. Admin Target Preview Endpoint

Purpose:

- Operators need context before replying or moderating.

Proposed API:

```text
GET /api/v1/admin/targets/{target_type}/{target_id}
```

Supported target types:

- user,
- interview_post,
- application,
- chat_room,
- chat_message,
- session.

Response direction:

```json
{
  "target_type": "interview_post",
  "target_id": "uuid",
  "exists": true,
  "title": "...",
  "summary": "...",
  "status": "...",
  "owner_user_id": "uuid",
  "metadata": {}
}
```

Acceptance:

- admin only,
- safe preview only,
- no raw secrets,
- chat message body may be shown only in detail context and must be excluded
  from logs.

### 5. Admin Test Notification Endpoint

Purpose:

- Replace manual script for targeted push smoke while avoiding marketing push.

Proposed API:

```text
POST /api/v1/admin/notifications/test
```

Request:

```json
{
  "email": "tester@example.com",
  "type": "support_replied",
  "target_type": "support_ticket",
  "target_id": "uuid",
  "dispatch": false
}
```

Rules:

- dispatch defaults to `false`,
- allow only safe workflow notification types,
- require target id for route testing,
- record audit event,
- never expose raw device tokens.

Acceptance:

- creates a notification row for the target user,
- optionally enqueues/dispatches push when `dispatch=true`,
- returns delivery summary with token hash prefix only,
- admin only.

## Web Implementation Plan

### 1. Admin API Client

Create:

```text
apps/web/src/shared/api/admin.ts
```

Functions:

- `getAdminMe(accessToken)`
- `getAdminSummary(accessToken)`
- `listAdminTickets(params, accessToken)`
- `getAdminTicket(ticketId, accessToken)`
- `updateAdminTicketStatus(ticketId, payload, accessToken)`
- `replyToAdminTicket(ticketId, payload, accessToken)`
- `createModerationAction(payload, accessToken)`
- `getAdminTargetPreview(targetType, targetId, accessToken)`
- `dispatchPendingPushDeliveries(accessToken)`
- `sendAdminTestNotification(payload, accessToken)`

Use the existing `apiRequest` wrapper. If better error messages are needed,
open a small API client error-handling patch in the same implementation.

### 2. Admin Auth Gate

Create:

```text
apps/web/src/features/admin/AdminGuard.tsx
```

Behavior:

- if not logged in, show login prompt,
- if logged in, call `GET /api/v1/admin/me`,
- if `403`, show access denied,
- if loading, show compact loading state,
- if ok, render admin console.

Do not rely on `appUser.role`. Admin is separate from product role.

### 3. Admin Page Shell

Create:

```text
apps/web/src/pages/AdminPage.tsx
apps/web/src/features/admin/AdminShell.tsx
```

Sections:

- 운영 홈,
- 문의,
- 신고,
- 계정 삭제,
- 조치 기록,
- 알림/푸시,
- 상태 점검.

MVP can keep all sections in one page with tabs/segmented navigation. A later
router split is allowed if the file gets too large.

### 4. Ticket Queue

Features:

- filter by kind,
- filter by status,
- filter deleted-by-user,
- search by ticket id, contact email, target id, subject,
- sort newest first,
- show status badge,
- show unread/open/in-review emphasis,
- open detail panel.

List row fields:

- kind/category label,
- status,
- subject or short body,
- target type/id if present,
- contact email,
- created time,
- updated time.

Do not show full body in list rows when avoidable.

### 5. Ticket Detail

Features:

- user-submitted content,
- metadata preview,
- target preview fetch,
- event timeline,
- visible reply composer,
- internal status reason,
- status transition controls,
- source ticket copy button,
- target id copy button.

Status transitions:

- `open` -> `in_review`
- `open` -> `closed`
- `in_review` -> `resolved`
- `in_review` -> `closed`
- `resolved` -> `closed`
- allow reopening to `in_review` if a new issue is found, only with reason.

### 6. Report Review Flow

Report detail should add:

- report category,
- reported target preview,
- reporter user id,
- target owner/participant ids if available,
- block status if backend supports it,
- moderation action form.

Moderation actions:

- warn,
- hide,
- remove,
- block,
- unblock,
- close_report,
- restore.

Confirmation:

- required for `hide`, `remove`, `block`, `restore`.
- reason required for all moderation actions except `close_report`.

After action:

- append event/action summary,
- prompt operator to reply or resolve ticket.

### 7. Account Deletion Queue

Show:

- account-deletion tickets,
- public account-deletion requests if exposed through admin API,
- authenticated deletion request state,
- requester email,
- verification status if available,
- requested/processed times,
- retention note.

Needed backend decision:

- either expose account deletion requests through admin support tickets, or add
  admin deletion-request APIs.

First implementation can show support tickets of `kind=account_deletion` and
link to runbook for manual steps. A later patch should add full admin deletion
processing if not already covered.

### 8. Health Panel

Show:

- public API health,
- database readiness,
- Kakao REST key configured,
- Supabase/JWKS configured,
- outbound email configured,
- APNs/FCM configured,
- push worker enabled,
- push worker sleep/batch config,
- last checked time.

Actions:

- refresh,
- copy health JSON,
- link to runbook commands.

Do not expose secrets.

### 9. Push Panel

MVP push controls:

- dispatch pending deliveries,
- send test notification to one email,
- dry-run default,
- dispatch requires confirmation.

Do not implement:

- all-user push,
- segment push,
- marketing push,
- custom free-text push body.

Allowed test types:

- `chat_message`,
- `application_created`,
- `application_selected`,
- `application_rejected`,
- `session_rescheduled`,
- `session_canceled`,
- `no_show_marked`,
- `support_replied`.

### 10. Audit/Moderation History

First implementation:

- show moderation action result returned by create API,
- show ticket events.

Later implementation:

- add list API for moderation actions,
- add audit event search.

Do not block MVP admin console on full audit search.

## Store Review Relevance

The admin console supports App Store and Google Play readiness by making these
claims operationally true:

- users can contact support,
- reports can be reviewed,
- abusive users/content can be actioned,
- account deletion requests can be handled,
- push notification workflow can be tested,
- backend health can be monitored during review.

Before store submission, use the console to process at least one smoke item for:

- inquiry,
- report,
- account deletion request,
- support reply notification,
- moderation action dry run or test target action.

## Implementation Phases

### Phase 1: Backend Admin API Completion

- [x] Add `GET /api/v1/admin/me`.
- [x] Add `GET /api/v1/admin/support/tickets/{ticket_id}`.
- [x] Add `GET /api/v1/admin/summary`.
- [x] Add target preview endpoint.
- [x] Add test notification endpoint or document why script remains enough.
- [x] Add tests for admin allowed/forbidden behavior.
- [x] Add tests for ticket detail, status update, reply, and moderation action.

### Phase 2: Web Admin Shell

- [x] Add `/admin` to internal path handling.
- [x] Add lazy-loaded `AdminPage`.
- [x] Add admin access gate through `GET /api/v1/admin/me`.
- [x] Add admin API client.
- [x] Add admin shell navigation.
- [x] Add access denied state.

### Phase 3: Ticket Inbox

- [x] Add summary cards/counts.
- [x] Expand support ticket list filters beyond section tabs/status chips.
- [x] Add report/deletion quick filters.
- [x] Add ticket detail panel.
- [x] Add event timeline.
- [x] Add reply composer.
- [x] Add status transition controls.
- [x] Add target preview.

### Phase 4: Moderation Workflow

- [x] Add moderation action form from report detail.
- [x] Require reason and confirmation for sensitive actions.
- [x] Display the created moderation result payload, not only a generic success
      banner.
- [x] Suggest resolving/replying after action.

### Phase 5: Health and Push

- [x] Add health panel.
- [x] Add a dedicated push readiness display instead of only pretty-printing
      readiness JSON.
- [x] Add pending delivery dispatch button.
- [x] Add targeted test notification form if backend endpoint exists.
- [x] Add dry-run default and dispatch confirmation.

### Phase 6: QA and Deployment

- [x] Run web build/typecheck.
- [x] Run API tests for new admin endpoints.
- [x] Deploy FastAPI through GPU blue/green flow if backend changed.
- [x] Push web changes to GitHub for source publication and backup.
- [x] Use manual Vercel redeploy only when the user explicitly requests a web
      production deployment.
- [x] Verify `/admin` is not linked from public navigation.
- [x] Verify non-admin user receives `403`/access denied.
- [x] Verify admin user can process a test ticket.
- [x] Verify support reply triggers in-app notification and push where enabled.
- [x] Surface target preview `owner_user_id` and relevant metadata in the admin
      detail pane.
- [x] Decide whether broader queue search/deleted-user filtering is MVP-required
      or explicitly deferred.

## Acceptance Criteria

The first admin console is complete when:

- [x] an admin can log in through Supabase and access `/admin` in code path,
- [x] a non-admin cannot access `/admin` data through backend admin auth,
- [x] admin can list support/report/account-deletion tickets,
- [x] admin can open one ticket and see event history,
- [x] admin can change ticket status with reason,
- [x] admin can send a visible reply,
- [x] visible reply creates the expected user notification,
- [x] admin can preview a reported target,
- [x] admin can create a moderation action with source ticket,
- [x] admin can view API/push readiness,
- [x] admin can trigger only safe, scoped push dispatch/test actions,
- [x] no secret/token values are rendered by the admin UI,
- [x] remaining admin queue/filter/moderation-result gaps are shipped or
      explicitly deferred,
- [x] docs and runbook are updated after production smoke.

## Production Smoke Notes

### 2026-06-29

Executed a temporary production smoke against
`https://hypofit-api.bukae.co.kr` using `ssamso8282@gmail.com` as the configured
admin operator and `review-both@hypofit.demo` as the target user. The temporary
support ticket, events, audit rows, notification, and push delivery rows created
for the smoke were removed after verification.

Verified:

- `GET /api/v1/admin/me` returned `200` for the admin operator.
- `GET /api/v1/admin/summary` returned `200`.
- Admin support ticket list included the smoke ticket.
- Admin support ticket detail returned `200`.
- Admin ticket status update to `in_review` returned `200`.
- Admin visible reply created an `operator_replied` event.
- Visible support reply created a `support_replied` in-app notification.
- `GET /api/v1/health/ready` returned `200` with database `ok`, outbound email
  configured, push enabled, push worker enabled, APNs configured, and FCM
  configured.

Push delivery note:

- `review-both@hypofit.demo` had notification preferences enabled but no enabled
  registered push devices at smoke time, so no real device push was dispatched.
  The push provider readiness path was verified through `/api/v1/health/ready`.

## Open Questions

- Should account deletion requests get a dedicated admin API list/process
  endpoint, or remain part of support tickets for the first release?
- Should admin access stay as `ADMIN_EMAILS`, or should we add
  `app_users.is_admin` after launch?
- Should the web admin console be hidden behind a separate hostname later,
  such as `admin.hypofit.bukae.co.kr`?
- Should moderation action history get a list/search API in this phase, or is
  ticket-scoped action creation enough?
- Should test notification be an API endpoint, or should it remain a server-side
  script to reduce risk before first store submission?

## Non-Goals and Guardrails

- Do not add marketing push.
- Do not add all-user broadcast.
- Do not add user export/download.
- Do not expose raw PII in list views if a short preview is enough.
- Do not implement payments or settlement operations.
- Do not build a generic analytics dashboard.
- Do not give normal founder/respondent roles admin access.
- Do not bypass FastAPI admin authorization by querying Supabase directly from
  the browser.
