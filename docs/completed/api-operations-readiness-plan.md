# Hypofit API Operations Readiness Plan

Status: completed

Last updated: 2026-06-08

## Purpose

This completed document records the FastAPI launch-hardening work.
The full endpoint inventory and implementation history were moved to
`docs/completed/api-operations-readiness-implementation-history.md`.

Use this document when changing backend behavior that affects Google Play
review, account deletion, support/report operations, blocking/moderation,
notifications, audit events, readiness checks, reviewer demo access, or
retention policy.

## Current Backend Baseline

As of the latest API operations pass, the deployed backend foundation includes:

- account deletion request APIs
- direct authenticated deactivation/anonymization API
- support ticket and admin support APIs
- user block/unblock/list APIs with server-side enforcement
- moderation action API and moderation-status fields
- audit events
- in-app notification list/read/read-all APIs and workflow event producers
- interview post edit/archive/reopen APIs
- application withdrawal API
- session reschedule/cancel/complete/no-show flows
- readiness endpoint `GET /api/v1/health/ready`
- reviewer/demo seed scripts

## Launch-Hardening Tasks

### 1. Public Deletion Email Flow

- Provider direction: use Resend for MVP outbound email where Supabase Auth
  cannot own the flow. Signup OTP delivery is tracked in
  `docs/completed/email-otp-verification-transition-plan.md`; the superseded
  link-confirmation bridge is preserved in
  `docs/completed/email-verification-resend-mvp-plan.md`; public deletion
  verification now has a backend-owned Resend path and a persisted result code
  when provider configuration is missing or delivery fails.
- [x] Wire outbound email delivery for public deletion verification.
- [x] Implement and document the public deletion verification route behavior.
- [x] Document the fallback process if email delivery fails.
- [x] Keep public deletion copy aligned with the actual backend request flow.

### 2. Retention and Purge Processing

- [x] Define the first MVP retention windows for deleted accounts, reports,
      support tickets, chat, applications, sessions, and no-show records.
- [x] Add or schedule a purge/anonymization processor for records that should
      no longer remain identifiable after the retention window.
- [x] Document which records are retained for safety, abuse prevention,
      dispute handling, or legal obligations.

MVP retention implementation decision:

- Account deletion immediately anonymizes direct profile identifiers in
  `app_users`, clears profile image references, attempts profile-image object
  deletion, and disables enabled push devices for the user.
- Interview workflow records, support/report records, chat records, no-show
  records, audit events, and dispute-relevant records are retained where needed
  for safety, abuse prevention, dispute handling, and legal obligations.
- The first MVP purge processor is scheduled as an operator process rather than
  an always-on worker: review retained records through the operator runbook and
  anonymize or purge expired records before public launch expansion. A durable
  automated purge worker should be split into a later narrow plan after actual
  retention windows are confirmed with counsel or the final release policy.

### 3. Readiness Endpoint Hardening

- [x] Expand readiness checks beyond config presence where practical.
- [x] Check real reachability for external providers that can fail production
      behavior, such as Supabase database access and Kakao Local proxy
      dependency.
- [x] Keep readiness checks fast enough for operations and non-destructive.

### 4. Operator Runbook

- [x] Document how an operator reviews support tickets.
- [x] Document how an operator reviews reports and moderation actions.
- [x] Document how an operator processes public deletion requests.
- [x] Document how to inspect audit events during a dispute or review issue.

Runbook:

- `docs/reference/operator-support-moderation-runbook.md`

### 5. State-Transition Implementation Review

- [x] Review post/application/session status transitions for impossible states.
- [x] Confirm selected/rejected/withdrawn/scheduled/completed/no-show behavior
      remains consistent across API, mobile UI, notifications, and audit logs.
- [x] Add focused tests only where real state-transition risk remains.

## Close Criteria

This document can move to `docs/completed/` when:

- public deletion verification email is live or a documented MVP fallback is
  accepted,
- retention/purge policy is implemented or explicitly deferred with a dated
  launch decision,
- readiness checks cover the production dependencies needed for review,
- operator runbooks exist for support, reports, moderation, and deletion,
- no unresolved backend behavior contradicts Google Play documents or legal
  copy.
