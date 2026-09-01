# Code Remediation Implementation Plan

Status: completed

Last updated: 2026-06-15

## Purpose

Record the implementation work extracted from the 2026-06-15 repository audit
pass. User-operated checks are not tracked as active implementation backlog.

The full audit baseline and historical findings are preserved in
`docs/completed/code-qa-remediation-plan.md`.

## Implementation Backlog

### 1. Public Interview Post Visibility

- [x] Add route/repository visibility coverage that draft, closed,
      completed, archived, hidden, and removed posts are excluded from public
      discovery.

### 2. Deleted Or Deactivated User Sync Guard

- [x] Update mobile auth handling for `account_inactive` so the user is signed
      out or shown a clear account-deleted/deactivated message.
- [x] Decide whether immediate account deletion should also disable or delete
      the Supabase Auth user, then implement the chosen behavior.
- [x] Update legal/account deletion docs if the deletion behavior changes.

### 3. Support And Report Retention

- [x] Update privacy/legal retention wording when retention periods are changed
      in backend policy.

### 4. Application And Session State Machine

- [x] Decide whether `canceled` belongs only to respondent withdrawal or also
      founder/admin cancellation.
- [x] Add remaining service guards for valid previous-state transitions where
      current code still allows broad updates.
- [x] Add any remaining partial unique DB index needed for non-terminal session
      invariants.
- [x] Ensure chat menu actions call the correct application/session endpoint.
- [x] Add API tests for stale object/state conflicts not covered by the
      concurrency plan.
- [x] Update mobile copy/status mapping after backend state-machine decisions.

### 5. Android Release Configuration

- [x] Add an Android local build helper or document the local Android build
      command path.

### 6. OTP Signup Verification

- [x] Keep Supabase email template guidance aligned with `{{ .Token }}` OTP
      usage.
- [x] Keep resend email copy guidance aligned with "인증번호" wording.
- [x] Ensure Sentry auth failure capture remains sanitized.
- Move OTP fallback/history documents to completed/reference only when the old
  link/deep-link flow is removed after user approval.

### 7. Native Push And Notification Routing

- [x] Add atomic push delivery claim or stricter row-locking strategy.
- [x] Add/keep uniqueness guard for notification/device delivery pairs.
- [x] Add tests for duplicate-dispatch prevention.
- [x] Add service-level tests for chat mute, block suppression, and self-event
      suppression.

### 8. Native UI Platform Decisions

- [x] Document why `enableScreens(false)` exists and what crash or dependency
      condition requires it.
- [x] Create a bounded validation task for `enableScreens(true)` or document
      why it remains deferred.
- [x] Document why `newArchEnabled: false` exists and which dependency blocks
      enabling it.
- [x] Decide whether push permission should remain automatic after first
      authenticated app entry or move behind a user action.

### 9. Contracts And API Type Coverage

- [x] Inventory API schemas not represented in `packages/contracts`.
      Current inventory:
      `docs/completed/contracts-coverage-inventory.md`.
- [x] Decide whether to manually add contracts or generate them from FastAPI
      OpenAPI.
- [x] Add contracts for account deletion, support/report, notifications,
      push devices/preferences, place search, and health/readiness where useful.
- [x] Update mobile/web API clients to import shared contracts where practical.
- [x] Add type-level compile coverage where contracts change.

Current decision: keep manual shared TypeScript contracts for the MVP. FastAPI
OpenAPI generation can be revisited as a separate migration after the API shape
stabilizes or if contract drift becomes frequent.

### 10. Readiness Endpoint Semantics

- [x] Define required providers per environment.
- [x] Make Kakao, Supabase JWKS/Auth, APNs, FCM, and outbound email status
      visible as ready/degraded where practical.
- [x] Avoid slow or destructive live sends in readiness checks.
- [x] Add tests for ready/degraded semantics.
- [x] Document operator interpretation in deployment docs.

## Close Criteria

Move this document to `docs/completed/` when the implementation backlog above is
either completed or split into narrower active feature plans.
