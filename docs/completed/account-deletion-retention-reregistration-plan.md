# Account Deletion, Retention, and Re-Registration Hardening Plan

Status: completed

Last updated: 2026-07-12

## Purpose

Define and implement a clear Hypofit account deletion, retention, and
same-email re-registration policy.

The current product allows account deletion from the app and exposes a public
account deletion web route, but the actual backend behavior still leaves an
important ambiguity:

```text
User deletes account
  -> app_users is marked deleted/deactivated
  -> profile identifiers are partially removed
  -> Supabase Auth user remains
  -> app_users.email remains unique and unchanged
  -> same email cannot cleanly sign up again
```

This plan turns that ambiguity into an explicit product, legal, backend,
mobile, web, and operations implementation task.

This document is not legal advice. It is a product and engineering plan based
on public legal/store guidance and must be reviewed again before paid flows,
escrow/reward processing, or broader public launch.

## Executive Decision

MVP target policy:

```text
Account deletion completes immediately for direct account/profile identifiers.
The user may sign up again with the same email after deletion completes.
The new account is a new account and does not restore old interviews, chats,
applications, reports, reviews, or trust history.
Some past records may remain in anonymized or restricted form for safety,
abuse prevention, dispute handling, legal obligations, and audit integrity.
```

Why this is the recommended policy:

- It matches normal user expectation: deleting an account should not permanently
  burn the email unless abuse prevention requires it.
- It makes the mobile copy simpler: "삭제 후 다시 가입할 수 있지만 이전 기록은
  복구되지 않아요."
- It better matches the privacy principle that direct identifiers should not be
  retained without a clear purpose.
- It avoids a support-heavy flow where users have to ask the team to manually
  re-enable or purge an old Auth account.
- It keeps existing interview workflow records stable without exposing a
  deleted user's identity.

Alternative policy:

```text
Same-email re-registration is blocked after account deletion.
```

This is simpler technically, but it is worse for UX and requires stronger
up-front copy:

- "삭제 후에는 같은 이메일로 다시 가입할 수 없어요."
- User support needs a manual recovery path.
- The privacy policy must justify why the email remains retained after deletion.

Unless the team explicitly chooses this alternative, implement the recommended
same-email re-registration policy.

## Public Sources and Legal/Store Basis

Use these sources as implementation background. Re-check them before final
release because store and privacy requirements can change.

- 개인정보보호법 제21조 개인정보의 파기:
  https://www.law.go.kr/법령/개인정보보호법/제21조
- 개인정보보호법:
  https://www.law.go.kr/법령/개인정보보호법
- 전자상거래 등에서의 소비자보호에 관한 법률 시행령:
  https://www.law.go.kr/법령/전자상거래등에서의소비자보호에관한법률시행령
- 통신비밀보호법 시행령:
  https://www.law.go.kr/법령/통신비밀보호법시행령
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Google Play account deletion/data deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Supabase Auth Admin delete user reference:
  https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

Implementation interpretation for Hypofit:

- 개인정보는 수집 목적 달성, 보유기간 경과 등으로 불필요해지면 파기해야 한다.
- 다른 법령이나 분쟁 대응 등 정당한 목적이 있는 기록은 목적과 기간을
  명확히 제한해 보관해야 한다.
- App Store와 Google Play는 계정 생성 기능이 있으면 앱 내부 계정 삭제
  경로와 외부/웹 삭제 요청 경로를 요구한다.
- 단순 비활성화만으로 "삭제"라고 설명하면 심사와 사용자 신뢰 모두에서
  위험하다.
- Hypofit은 현재 결제/정산 기능이 없으므로 결제 기록 보존 조항은
  활성 정책이 아니라 미래 확장 주의사항으로만 둔다.

## Current Implementation Snapshot

### Backend

Relevant files:

- `apps/api/app/models/user.py`
- `apps/api/app/models/account_deletion.py`
- `apps/api/app/repositories/account_deletion.py`
- `apps/api/app/services/account_deletion.py`
- `apps/api/app/services/users.py`
- `apps/api/app/repositories/users.py`
- `apps/api/app/core/errors.py`
- `apps/api/app/api/v1/routes/account_deletion.py`

Current behavior:

- `app_users.email` is unique.
- `deactivate_and_anonymize_user()` sets:
  - `deactivated_at`
  - `deleted_at`
  - `anonymized_at`
  - `deletion_requested_at`
  - `deletion_completed_at`
  - `deletion_reason`
  - `name = "탈퇴한 사용자"`
  - `bio = null`
  - `phone = null`
  - `profile_image_path = null`
  - `profile_image_url = null`
- It does not anonymize `app_users.email`.
- It does not delete or disable the Supabase Auth user.
- Profile image object deletion is attempted after the DB deletion state is
  committed.
- Push devices are disabled.
- `users.sync_user()` rejects a row with `deleted_at` or `deactivated_at`.
- Auth dependency rejects deleted/deactivated users before protected actions.

Practical result:

- A deleted account cannot use the app.
- The same email cannot cleanly re-register because:
  - Supabase Auth may still have the original user.
  - `app_users.email` uniqueness still reserves the email.
- Current UX copy saying the user cannot log in is accurate, but the product
  policy for re-registration is not explicit enough.

### Mobile

Relevant files:

- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx`
- `apps/mobile/src/shared/api/accountDeletion.ts`
- `apps/mobile/src/features/account-deletion/useAccountDeletionMutations.ts`
- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/features/auth/authErrors.ts`

Current behavior:

- Signed-in users can delete the account from profile.
- After deletion, mobile clears auth state and routes away from protected app
  state.
- If a deleted/deactivated account logs in, the app shows:
  - `탈퇴했거나 비활성화된 계정이에요. 다른 계정으로 로그인해 주세요.`

Required change:

- If same-email re-registration is implemented, the copy should no longer imply
  permanent email lockout.
- Login rejection should remain for old stale sessions, but signup should allow
  the same email after backend/Auth cleanup completes.

### Web

Relevant files:

- `apps/web/src/pages/AccountDeletionPage.tsx`
- `apps/web/src/pages/LegalPage.tsx`
- `apps/web/src/pages/SupportPage.tsx`

Current behavior:

- Public account deletion route exists.
- Public deletion email verification exists through backend-owned Resend path.
- Legal copy describes deletion/anonymization in broad MVP terms.

Required change:

- Public deletion page and privacy policy must state:
  - what is deleted immediately,
  - what may be retained,
  - whether same-email re-registration is allowed,
  - whether old records are restored.

## Data Classification and Target Retention Policy

### Direct Account Identifiers

Examples:

- email address
- name
- phone number
- profile image path/url
- auth user linkage
- push token/device binding

Target behavior on account deletion:

- Remove or anonymize immediately.
- Disable push devices immediately.
- Delete profile image object best-effort.
- Remove or delete Supabase Auth account so same-email re-registration is not
  blocked.
- Keep only a non-reversible or operationally limited deletion proof when
  needed.

Recommended implementation:

- Replace `app_users.email` with a synthetic value:

```text
deleted+{user_id}@deleted.hypofit.local
```

- Keep `name = "탈퇴한 사용자"`.
- Clear `bio`, `phone`, profile image path/url.
- Add or use a retention/audit field for deletion result.
- Do not keep raw email in `app_users` after deletion.

### Account Deletion Request Records

Examples:

- public deletion request email
- requester name
- reason
- verification token hash
- status/result/retention note
- processed timestamps

Target behavior:

- Keep request records long enough to prove and audit deletion handling.
- After completion, avoid keeping raw email indefinitely.

Recommended implementation:

- Add fields:
  - `email_hash`
  - `email_redacted_at`
  - `retention_until`
  - `auth_user_delete_status`
  - `auth_user_deleted_at`
- On completion:
  - keep hash or masked email for audit/search if needed,
  - redact raw email unless operational retention requires it,
  - keep request id, status, timestamps, result, and retention note.

### Interview Workflow Records

Examples:

- interview posts
- applications
- chat rooms/messages
- sessions
- attendance records
- reward confirmation state
- reviews

Target behavior:

- Preserve workflow integrity for the other party.
- Replace deleted user display with "탈퇴한 사용자".
- Do not expose profile image, phone, email, or profile bio.
- Preserve records needed for:
  - selected/rejected/completed/no-show state,
  - support investigation,
  - abuse prevention,
  - dispute handling,
  - review/trust integrity.

Open product/legal decision:

- Chat message bodies may contain personal information users typed manually.
  For MVP, retain them for dispute/safety but restrict display/export after
  deletion where needed. Before public scale, decide whether old chat bodies
  should be partially hidden, time-limited, or separately purgeable.

### Support, Report, Moderation, and Audit Records

Target behavior:

- Retain minimal records needed for safety, moderation, and dispute handling.
- Avoid direct identifiers when the account is deleted.
- Keep audit events for operator accountability.
- Do not expose deleted user PII in admin surfaces except where operationally
  necessary and access-controlled.

### Logs and Diagnostics

Target behavior:

- Do not log raw access tokens, refresh tokens, passwords, OTP codes, or
  full request bodies.
- Do not send raw email/name/phone to Sentry.
- Retain operational logs only for a limited period.
- If legal/operational logs include IP/device/request identifiers, document
  the retention period in the privacy policy.

## Target User Flows

### Signed-In Deletion

```text
Profile
  -> 계정 삭제
  -> confirmation modal
  -> user confirms
  -> POST /api/v1/account-deletion-requests/me/delete
  -> backend anonymizes app_users identifiers
  -> backend disables push devices
  -> backend deletes profile image object best-effort
  -> backend deletes Supabase Auth user or queues retry
  -> mobile clears local session
  -> login screen
```

Expected copy:

- Before deletion:
  - "계정을 삭제하면 프로필 정보와 로그인 정보가 삭제돼요."
  - "이전 신청, 모집글, 채팅, 신고 기록은 분쟁 대응과 서비스 안전을 위해
    익명화된 기록으로 남을 수 있어요."
  - "삭제 후 같은 이메일로 다시 가입할 수 있지만 이전 기록은 복구되지
    않아요."
- After deletion:
  - "계정이 삭제됐어요."

### Same-Email Re-Registration

```text
Deleted user signs up with same email
  -> Supabase Auth creates a new auth user
  -> OTP verification succeeds
  -> FastAPI /me/sync creates a new app_users row
  -> new account starts clean
  -> old records remain linked to old anonymized user id
```

Expected behavior:

- Old account data is not restored.
- Old trust/review history is not attached to the new account.
- Old chat rooms do not reappear.
- Old applications/posts are not visible as "mine".
- Any old public-facing rows show "탈퇴한 사용자" where a deleted user must be
  displayed.

### Public Web Deletion Request

```text
User cannot access app
  -> visits /account-deletion
  -> enters email and reason
  -> receives verification email
  -> verifies request
  -> operator or automated job processes deletion
```

Target policy:

- If the matching user exists, process through the same anonymization/Auth
  cleanup path as signed-in deletion.
- If the matching user does not exist, mark request as completed/no matching
  account without exposing whether the account existed to third parties.
- If email delivery fails, leave an operator-visible failure result and show
  support fallback.

## Backend Implementation Plan

### Phase 1. Policy Constants and Error Contract

- [x] Add a backend-level account deletion policy module or constants:
  - deleted email domain: `deleted.hypofit.local`
  - deletion display name: `탈퇴한 사용자`
  - same-email re-registration allowed: `true`
  - public response behavior for no-matching account
  - retention notes
- [x] Split current inactive-account error codes:
  - `account_deleted`
  - `account_deactivated`
- [x] Keep future operator-facing lifecycle error codes deferred until a real
      client/API branch needs them:
  - `account_deletion_pending`
  - `account_auth_cleanup_pending`
- [x] Keep user-facing messages short and avoid leaking whether an email has
      an old deleted account during signup.

### Phase 2. Schema Migration

Add migration for deletion audit and redaction metadata.

Candidate fields for `account_deletion_requests`:

- [x] `email_hash text null`
- [x] `email_redacted_at timestamptz null`
- [x] `retention_until timestamptz null`
- [x] `auth_user_delete_status text null`
- [x] `auth_user_deleted_at timestamptz null`
- [x] `auth_user_delete_error_code text null`

Candidate fields for `app_users`:

- [x] No partial unique email change required because `email` is overwritten
      with a synthetic anonymized value.
- [x] If the team wants easier audit lookup, add `deleted_email_hash text null`
      instead of retaining raw email.

Constraints:

- [x] Keep `app_users.email` unique.
- [x] Synthetic deleted email must be deterministic enough for idempotency and
      unique enough for constraints.
- [x] Do not add a nullable unique email unless the team explicitly wants
      partial unique index behavior.

### Phase 3. Supabase Auth Cleanup

- [x] Implement server-side Supabase Auth admin delete/disable helper using
      service-role credentials only.
- [x] Never expose service-role credentials to mobile/web.
- [x] After DB anonymization commit, call Supabase Auth Admin delete user.
- [x] Record result in `account_deletion_requests`:
  - `deleted`
  - `not_found`
  - `failed_retryable`
  - `skipped_missing_config`
- [x] If Auth deletion fails, keep app account deleted and surface an operator
      retry item. Same-email signup may still be blocked until retry succeeds.
- [x] Add a safe retry script/job for rows with failed Auth cleanup.
  - Implemented as `apps/api/scripts/retry_account_deletion_auth_cleanup.py`.
  - Default mode is dry-run.
  - Write mode requires `ALLOW_ACCOUNT_DELETION_AUTH_RETRY=true`.
  - `failed_non_retryable` requires explicit
    `INCLUDE_NON_RETRYABLE_ACCOUNT_DELETION_AUTH_RETRY=true`.

Transaction ordering:

```text
1. Validate current user and request.
2. Prepare deletion request row.
3. Disable push devices.
4. Anonymize app_users direct identifiers.
5. Mark request completed with auth cleanup pending.
6. Commit DB.
7. Delete profile image object best-effort.
8. Delete Supabase Auth user best-effort.
9. Record external cleanup results.
```

Reasoning:

- The DB must not be rolled back just because storage or Auth cleanup is
  temporarily unavailable.
- External cleanup failures need explicit retryability and operator visibility.

### Phase 4. Account Deletion Repository/Service Changes

- [x] Update `deactivate_and_anonymize_user()` to anonymize `email`.
- [x] Add email hashing helper:
  - normalize lower-case email,
  - hash with server-side secret pepper if available,
  - avoid raw email in logs/Sentry.
- [x] Update public request processing to store hash and redact raw email after
      completion.
- [x] Ensure repeated delete/cleanup handling is safe:
  - already deleted user returns current completed request or a safe conflict,
  - retry processor can re-run Auth cleanup safely.
- [x] Ensure profile image object deletion stays best-effort and observable.
- [x] Ensure push devices are disabled before local/mobile session is cleared.

### Phase 5. Re-Registration Handling

- [x] Confirm signup flow can create a new Supabase Auth user after old Auth
      cleanup.
- [x] Confirm locally that `/me/sync` creates a new `app_users` row because old
      row has a different synthetic email and old auth id.
- [x] Prevent accidental resurrection:
  - never update a deleted `app_users` row from a new auth user,
  - never match deleted users by old raw email,
  - never restore old role/profile/image/chat/application state.
- [x] Add local tests for:
  - delete account,
  - old account remains deleted,
  - new account creation does not reuse the old app user id.
- [x] Add and run deployed smoke for:
  - same email signup after Auth cleanup,
  - new account starts with no old "my interviews" or chats.

### Phase 6. Public Deletion Processing

- [x] Public verified deletion should invoke the same internal deletion service
      as signed-in deletion when a matching active account exists.
- [x] If multiple historical deleted accounts share the same hashed email,
      process only active matching accounts and avoid leaking account existence.
- [x] If no active account exists:
  - return success-like public copy,
  - mark request as completed/no matching active account,
  - do not expose existence details.
- [x] Add operator runbook steps for public deletion request review and retry.

### Phase 7. Admin/Operator Visibility

- [x] Admin deletion queue shows:
  - request status,
  - verification status,
  - account cleanup status,
  - profile image purge status,
  - Auth cleanup status,
  - retention note,
  - retry action when available.
  - Implemented through `/api/v1/admin/account-deletion-requests` and the web
    admin `계정 삭제` section.
  - Auth cleanup retry is exposed only for retryable statuses and records audit
    events through the shared deletion service.
- [x] Hide raw email after redaction.
- [x] Use masked email or hash in admin display after completion.
- [x] Add audit events:
  - `account_deletion_email_redacted`
  - `account_deletion_auth_user_deleted`
  - `account_deletion_auth_user_delete_failed`
  - `account_deletion_rejoin_allowed`

## Mobile Implementation Plan

### Delete Account Screen

- [x] Update copy to explain same-email re-registration policy.
- [x] Keep destructive confirmation modal.
- [x] On success, clear local Supabase session and app runtime state.
- [x] Route to login.
- [x] Show a short toast/message:
  - `계정이 삭제됐어요.`
- [x] Do not leave the user on a protected tab after deletion.

### Login and Signup Copy

- [x] If an old stale session returns `account_deleted`, route to login and
      show:
  - `삭제된 계정이에요. 다시 가입하려면 회원가입을 진행해 주세요.`
- [x] If Auth cleanup is still pending and Supabase blocks signup, show a
      same-email edge-case message:
  - `이미 가입된 이메일이에요. 최근 계정을 삭제했다면 잠시 후 다시 시도해 주세요.`
- [x] Keep provider/debug details in Sentry only.

### Profile and Legal Entry Points

- [x] Ensure account deletion remains reachable from profile.
- [x] Ensure terms/privacy links remain reachable before signup completion.
- [x] Ensure public deletion URL is documented in legal copy.

## Web Implementation Plan

- [x] Update `/account-deletion` copy:
  - same-email re-registration allowed after deletion completes,
  - previous records are not restored,
  - retained records are anonymized/restricted where possible,
  - support contact for unresolved deletion.
- [x] Update privacy policy:
  - direct account/profile data deletion,
  - retained workflow/safety/dispute records,
  - current no-payment MVP note,
  - future payment/settlement records will require separate retention policy.
- [x] Update terms/privacy copy where same-email re-registration affects account
      lifecycle wording.
- [x] Keep web route public and accessible without login.

## Tests and Verification

### Backend Tests

- [x] Account deletion anonymizes:
  - email,
  - name,
  - bio,
  - phone,
  - profile image path/url.
- [x] Account deletion disables push devices.
- [x] Account deletion records audit events.
- [x] Account deletion records storage/Auth cleanup statuses.
- [x] Repeated delete/cleanup handling is safe.
- [x] Same-email re-registration succeeds after Supabase Auth cleanup.
- [x] Same-email re-registration does not restore the old app user id locally.
- [x] Public deletion verify path does not leak account existence.
- [x] Deleted users cannot access protected endpoints.
- [x] Deleted user display in post/application/chat/review contexts is safe.
  - API user rows are anonymized in place.
  - Mobile/web applicant fallbacks use `탈퇴한 사용자` and never expose a UUID
    fragment when the user summary is unavailable.

### Mobile Smoke

- [ ] Sign up a user.
- [ ] Create profile.
- [ ] Delete account from profile.
- [ ] App returns to login.
- [ ] Old session does not hang splash.
- [ ] Sign up again with the same email.
- [ ] New account reaches home.
- [ ] Old chats/applications are not visible in the new account.

### Web Smoke

- [ ] Public `/account-deletion` opens without auth.
- [ ] Public deletion request sends email or shows support fallback.
- [ ] Verification link marks request verified.
- [x] Privacy policy and account deletion copy match backend behavior.

### Store Review Smoke

- [ ] App Store reviewer can find account deletion in profile.
- [ ] Google Play Data safety deletion URL points to working public web route.
- [ ] App Privacy/Data safety answers match:
  - account deletion,
  - retained support/report/chat data,
  - location/profile image/push behavior.

## Migration and Backfill Plan

### Existing Deleted Users

- [x] Find rows where `deleted_at is not null` and raw email remains.
- [x] For each deleted row:
  - compute hash,
  - write deletion request audit metadata if available,
  - replace `app_users.email` with synthetic deleted email,
  - attempt Supabase Auth admin delete,
  - record Auth cleanup status.
- [x] Run production dry-run first.
- [x] Keep script idempotent.
- [x] Never print raw emails in logs; print counts and masked identifiers only.

### Existing Active Users

- [x] Backfill script does not select active user emails.
- [x] Backfill script does not delete active Supabase Auth users.
- [x] Synthetic email strategy preserves unique email constraints locally.

## Risks and Mitigations

### Risk: Supabase Auth Deletion Fails

Impact:

- Same-email signup remains blocked at the Auth provider even if `app_users`
  was anonymized.

Mitigation:

- Record `auth_user_delete_status`.
- Add retry script/operator action.
- Show "처리 중" copy if signup hits this edge case.

### Risk: Retained Chat Contains Personal Information

Impact:

- Deleting profile identifiers may not remove PII typed inside chat messages.

Mitigation:

- Restrict chat visibility after account deletion where appropriate.
- Keep chat retention tied to dispute/safety purpose.
- Add future purge/redaction policy after legal review.

### Risk: Old Records Accidentally Attach to New Account

Impact:

- User expectation and privacy violation.

Mitigation:

- Treat new Auth user id as a completely new app user.
- Do not match historical records by email.
- Use user id ownership only.
- Tests must assert clean account state.

### Risk: Legal Copy Overpromises

Impact:

- Store review rejection or user trust issue.

Mitigation:

- Use "삭제 또는 익명화" only where the backend really does it.
- Explain retained categories clearly.
- Do not mention payment retention until payment exists.

## Documentation Updates Required

Update these documents when implementation begins or finishes:

- `docs/active/README.md`
- `docs/reference/legal-pages-implementation-history.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/store-review-readiness-audit-2026-06-22.md`
- `docs/reference/operator-support-moderation-runbook.md`
- `docs/completed/api-operations-readiness-plan.md`
- `docs/completed/legal-pages-implementation-plan.md`

Also update public/in-app legal copy if the implemented policy differs from
this plan.

## Implementation Checklist

### Backend

- [x] Add deletion policy constants/helpers.
- [x] Add schema migration for deletion audit/Auth cleanup/redaction metadata.
- [x] Add email hash and synthetic deleted email helpers.
- [x] Anonymize `app_users.email` during account deletion.
- [x] Implement Supabase Auth admin cleanup helper.
- [x] Record Auth cleanup result.
- [x] Add Auth cleanup retry script.
- [x] Implement public verified deletion processing through the same deletion
      service.
- [x] Run real Supabase re-registration smoke against the deployed API.
  - Local deletion/public-deletion/retry-script coverage exists.
  - Local no-resurrection coverage exists.
  - Real same-email re-registration still needs deployed Supabase Auth smoke.

### Mobile

- [x] Update delete-account copy.
- [x] Update deleted-account login/signup copy.
- [x] Confirm local session clears after deletion.
- [x] Confirm same-email signup flow copy handles cleanup-pending cases.

### Web

- [x] Update public account deletion copy.
- [x] Update privacy policy and terms where needed.
- [x] Verify public deletion page remains accessible without login.

### Operations

- [x] Add dry-run backfill script for already-deleted users.
- [x] Add operator runbook for Auth cleanup retry.
- [x] Add smoke command for account deletion and re-registration.
- [x] Run production dry-run before any data-changing backfill.

## 2026-07-12 Operational Verification

- Production redaction backfill dry-run found one deleted/deactivated user and
  zero users needing raw-email redaction. No write-mode backfill was needed.
- Auth-cleanup retry dry-run found zero completed deletion requests requiring
  retry.
- Deployed same-email re-registration smoke passed:
  - first account deletion completed,
  - Supabase Auth cleanup status was `deleted`,
  - the same email created a different Auth user and app user,
  - the second disposable smoke account was deleted after verification.
- Public `https://hypofit.vercel.app/account-deletion` returned HTTP 200.
- API tests passed as part of the full backend suite on 2026-07-12.
- Play Console URL entry and console-side declaration checks are intentionally
  deferred until Play Console authentication is available.

## Completion Criteria

This document can move to `docs/completed/` only when:

- direct identifiers, including `app_users.email`, are anonymized on deletion,
- Supabase Auth cleanup exists and is observable,
- same-email re-registration is tested and works after deletion completion,
- old records do not reattach to a new account,
- public and in-app deletion copy match backend behavior,
- privacy policy/Data safety/App Privacy references are updated,
- existing deleted accounts are backfilled or explicitly scheduled,
- production smoke verifies deletion and re-registration on the deployed API.
