# Code QA Remediation Plan

Status: completed - historical QA record

Last updated: 2026-06-15

## Purpose

This document preserves the 2026-06-15 repository QA pass, original findings,
and historical remediation context.

It is intentionally cross-cutting. The QA found risks that span FastAPI API
state rules, Expo React Native release readiness, store-review sensitive
flows, and active mobile UI behavior.

Do not use this document as the active backlog. The implementation-only active
backlog extracted from this QA pass is
`docs/completed/code-remediation-implementation-plan.md`.

## QA Baseline

Commands run on 2026-06-15:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
cd apps/api && .venv/bin/python -m pytest
cd apps/mobile && npx -y expo-doctor
```

Results:

- Mobile TypeScript: passed.
- Web production build: passed.
- API tests: 122 passed, 9 skipped.
- Expo Doctor: 18/18 checks passed.

The checks prove that the current code compiles and the existing test suite
passes. They do not prove that the product state machine, store review flows,
release-device behavior, or production provider configuration are complete.

## External Standards To Keep In Mind

Use current official docs as the baseline when implementing this plan:

- Expo EAS Build and app store build flow:
  https://docs.expo.dev/build/introduction/
- Expo app config, including iOS build numbers and Android version codes:
  https://docs.expo.dev/versions/latest/config/app/
- Expo notifications and native APNs/FCM push setup:
  https://docs.expo.dev/push-notifications/push-notifications-setup/
- React Native production performance:
  https://reactnative.dev/docs/performance
- Apple Human Interface Guidelines, especially navigation, tab bars, safe
  areas, launch, and permission timing:
  https://developer.apple.com/design/human-interface-guidelines/
- Android Core App Quality:
  https://developer.android.com/docs/quality-guidelines/core-app-quality

## Current Priority Order

1. Prevent public data exposure and deleted-user rehydration.
2. Preserve support/report/moderation evidence.
3. Make application/session state transitions impossible to corrupt.
4. Harden Android release configuration before Play Store work.
5. Close OTP and push real-device smoke gaps.
6. Clean up native UI/platform correctness issues.
7. Move completed or reference-only work out of `docs/active`.

## Scope

In scope:

- `apps/api`
- `apps/mobile`
- `packages/contracts`
- active launch/readiness documents
- tests and smoke scripts needed to prove the fixes

Out of scope unless explicitly requested:

- broad visual redesign unrelated to QA findings
- new payment flow
- NICE/PASS identity verification implementation
- full websocket chat rewrite
- unrelated web desktop redesign

## Findings And Remediation Tasks

### 1. Public Interview Post Visibility

Severity: high

Problem:

- Public `GET /api/v1/interview-posts/` can list statuses other than `open`
  when no `status` query is provided.
- Public `GET /api/v1/interview-posts/{post_id}` can return any status by id,
  including records that should not be discoverable by respondents.

Evidence:

- `apps/api/app/api/v1/routes/interview_posts.py`
- `apps/api/app/repositories/interview_posts.py`

Target behavior:

- Public discovery list returns only `status == "open"` by default.
- Public detail returns `404` for non-open posts unless the requester is the
  founder owner or an admin.
- Founder-owned and admin review surfaces can still fetch draft, closed,
  archived, hidden, or removed records through authenticated paths.
- Mobile search, home, map, and detail screens keep working with open public
  posts.

Implementation plan:

- [x] Add repository/service functions that distinguish public-readable posts
      from owner/admin-readable posts.
- [x] Change unauthenticated list default to `open` only.
- [x] Change public detail to hide non-open posts.
- [x] Add authenticated owner detail path or route behavior for the founder's
      own non-open posts.
- [x] Ensure mobile `내 모집글` and founder management screens use the
      authenticated owner-readable path.
- [ ] Add API tests:
  - [x] public list route passes anonymous visibility context
  - [x] public detail route hides missing/non-visible posts as 404
  - [x] authenticated founder/admin route context is passed to service
  - [ ] repository-level fixture test for draft/closed/completed/archived/
        hidden/removed exclusion
- [ ] Run mobile smoke for home/interview/map detail navigation after the API
      behavior changes.

Close criteria:

- Public discovery cannot expose non-open posts.
- Founder management still works.
- API tests cover both public and owner paths.

### 2. Deleted Or Deactivated User Sync Guard

Severity: high

Problem:

- `/api/v1/me/sync` currently trusts a valid Supabase Auth token and can update
  an existing app user even if the app user was deactivated or deleted.
- This can reintroduce direct identifiers after account deletion.

Evidence:

- `apps/api/app/api/v1/routes/me.py`
- `apps/api/app/repositories/users.py`
- `apps/api/app/repositories/account_deletion.py`

Target behavior:

- Deleted or deactivated app users cannot be silently reactivated by `/me/sync`.
- The API returns a clear conflict error, such as `409 account_inactive`, when
  a deleted/deactivated app user tries to sync.
- If a future reactivation flow is needed, it must be explicit and documented.

Implementation plan:

- [x] Add a service-level check in user sync for existing rows with
      `deleted_at` or `deactivated_at`.
- [x] Return a normalized `409` API error with a stable code.
- [ ] Ensure mobile auth handles this case by signing out or showing a clear
      account-deleted message.
- [ ] Consider disabling or deleting the Supabase Auth user during immediate
      account deletion if product/legal direction confirms it.
- [x] Add API tests:
  - [x] active user can sync
  - [x] deleted user sync is rejected
  - [x] deactivated user sync is rejected
  - [x] deleted user cannot update profile through `/me`
- [ ] Update legal/account deletion docs if the actual deletion behavior
      changes.

Close criteria:

- Deleted/deactivated app users cannot write PII back to their profile.
- Mobile does not trap the user in a broken logged-in state.

### 3. Support And Report Retention

Severity: high

Problem:

- User-deleted support/report tickets can be hard-deleted.
- Because ticket events are linked with cascading deletes, the audit trail can
  disappear.
- Reports are store-review sensitive user-generated-content evidence and should
  not be destructively removed by ordinary user actions.

Evidence:

- `apps/api/app/services/support.py`
- `apps/api/app/repositories/support.py`
- `apps/api/app/models/support.py`

Target behavior:

- User deletion hides a ticket from the user's normal list but preserves the
  ticket and events for operator review, abuse prevention, dispute handling,
  and legal retention.
- Admin/operator surfaces can still see hidden/deleted-by-user tickets where
  needed.
- Answered or in-progress support items remain immutable from the user's side
  except for allowed follow-up flows.

Implementation plan:

- [x] Add `user_hidden_at`, `deleted_by_user_at`, or equivalent soft-delete
      field to support tickets.
- [x] Change user delete API to mark hidden/deleted-by-user instead of hard
      deleting.
- [x] Preserve the `deleted_by_user` event.
- [x] Hide user-hidden tickets from default user list.
- [x] Keep admin list capable of filtering or viewing hidden/deleted-by-user
      tickets.
- [x] Add migration and model/schema updates.
- [x] Add API tests:
  - [x] user delete hides ticket from user list
  - [x] ticket events remain after user delete
  - [x] admin can still inspect hidden report/support item
  - [x] user cannot edit answered/in-progress ticket
- [ ] Update privacy/legal retention wording if retention periods are changed.

Close criteria:

- Reports and support evidence are not lost by normal user deletion.
- UI still behaves like deletion from the user's perspective.

### 4. Application And Session State Machine

Severity: high

Problem:

- Application status updates currently allow terminal states such as
  `completed`, `no_show`, and `canceled`.
- This can bypass session endpoints that own scheduling, attendance, no-show
  metadata, audit, chat state, and notification behavior.
- Multiple sessions can potentially be created for one selected application
  without a strong service/DB guard.

Evidence:

- `apps/api/app/schemas/applications.py`
- `apps/api/app/api/v1/routes/applications.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/services/sessions.py`
- `apps/api/app/repositories/sessions.py`

Target behavior:

- Application review endpoint handles review decisions only:
  - `selected`
  - `rejected`
  - possibly pre-schedule `canceled` only if product direction keeps it
- Session lifecycle endpoint owns:
  - scheduled
  - rescheduled
  - canceled after schedule
  - completed
  - no-show
- A selected application cannot create duplicate active sessions.
- Chat room state and notifications follow one canonical transition path.

Implementation plan:

- [x] Define the allowed MVP state machine in docs and tests.
- [x] Remove `completed` and `no_show` from application status update input.
- [ ] Decide whether `canceled` belongs to application withdrawal only or also
      founder pre-schedule cancellation.
- [ ] Add service guards so only valid previous states can transition to
      `selected` or `rejected`.
- [x] Add session creation guard for existing active session on the same
      application.
- [ ] Add a partial unique DB index if feasible for non-terminal sessions per
      application.
- [ ] Ensure chat menu actions call the correct application/session endpoint.
- [ ] Add API tests:
  - [x] cannot complete application directly
  - [x] cannot mark no-show through application endpoint
  - [x] duplicate active session creation is rejected
  - [x] session completion creates/updates the expected records
  - [x] no-show path creates/updates the expected records
- [ ] Update mobile copy/status mapping after the backend state machine is
      tightened.

Close criteria:

- There is exactly one canonical path for completion and no-show.
- Impossible status combinations are blocked at the API layer.

### 5. Android Release Configuration

Severity: high

Problem:

- The mobile app has iOS build-number guardrails but not equivalent Android
  version-code guardrails.
- Production `autoIncrement` is disabled, so Google Play releases need a
  deterministic `versionCode` process.
- Android FCM can be built without an enforced `google-services.json` path.

Evidence:

- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/scripts/eas-local-ios-build.sh`

Target behavior:

- Production Android builds require a positive integer
  `HYPOFIT_ANDROID_VERSION_CODE`.
- `android.versionCode` is set from that value.
- Production Android builds fail early if `GOOGLE_SERVICES_JSON` is missing
  when push is in scope.
- Android release-like smoke can verify app launch, login, push token
  registration, and FCM receipt.

Implementation plan:

- [x] Add `HYPOFIT_ANDROID_VERSION_CODE` parsing and validation in
      `app.config.ts`.
- [x] Add `android.versionCode`.
- [x] Add production Android guard for `GOOGLE_SERVICES_JSON`.
- [ ] Add an Android local build helper or documented EAS local Android build
      command.
- [x] Update `.env.example` or mobile env docs with Android release variables.
- [ ] Update active push plan with the exact Android smoke steps.
- [ ] Run:
  - [x] `npx -y expo-doctor`
  - [x] mobile typecheck
  - [x] public app config inspection for production Android
  - [ ] Android internal/release-like device smoke when available

Close criteria:

- Android cannot be accidentally released with missing or duplicate version
  code.
- Android push configuration fails at build/config time, not after release.

### 6. OTP Signup Verification Closeout

Severity: medium/high

Problem:

- App code now supports 6-digit OTP verification, but the end-to-end flow still
  depends on Supabase dashboard email template and real-device smoke.
- The old email callback bridge is still present for compatibility and should
  not be removed until OTP is proven on real devices.

Evidence:

- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/screens/auth/EmailConfirmationScreen.tsx`
- `apps/mobile/app/auth/callback.tsx`
- `docs/completed/email-otp-verification-transition-plan.md`
- `docs/completed/email-verification-resend-mvp-plan.md`

Target behavior:

- New signup sends an email with a visible 6-digit token.
- User enters OTP in-app.
- Correct OTP creates/restores the Supabase session.
- Profile sync completes.
- Home opens.
- Wrong/expired OTP shows Korean, actionable copy.
- Resend is rate-limited by UI cooldown and provider limits.

Implementation plan:

- [ ] Confirm Supabase email template uses `{{ .Token }}`, not
      `{{ .ConfirmationURL }}`.
- [ ] Confirm resend email copy says "인증번호" and does not instruct the user
      to tap a link.
- [ ] Smoke on TestFlight with a fresh email:
  - [ ] signup
  - [ ] receive email
  - [ ] enter correct OTP
  - [ ] enter wrong OTP
  - [ ] resend after 90 seconds
  - [ ] login with unconfirmed email
- [ ] Verify Sentry captures auth failures with sanitized fields only.
- [ ] Decide whether the original link/deep-link plan can move to
      `docs/completed` or `docs/reference` after OTP smoke.

Close criteria:

- OTP signup works on a real TestFlight device.
- Active docs no longer track the old link-based path as if it were the main
  implementation path.

### 7. Native Push And Notification Routing Closeout

Severity: medium/high

Problem:

- APNs manual smoke has worked, but real workflow delivery, tap routing,
  Android FCM, mute/block suppression, and self-event suppression are not fully
  closed.
- Push dispatch may double-send if multiple dispatchers process the same
  pending rows.

Evidence:

- `apps/mobile/src/features/push/pushNotifications.ts`
- `apps/mobile/src/features/push/PushNotificationManager.tsx`
- `apps/mobile/src/features/push/notificationRouting.ts`
- `apps/api/app/services/push.py`
- `apps/api/app/repositories/push.py`
- `docs/completed/native-push-notification-apns-fcm-plan.md`

Target behavior:

- Real workflow notification rows create exactly one push delivery per eligible
  device.
- Muted chats do not send chat pushes.
- Blocked counterpart events do not push.
- Actor self-events do not push to the actor.
- Invalid provider tokens are disabled.
- Tapping a notification opens the correct screen after auth/profile sync.

Implementation plan:

- [ ] Add atomic push delivery claim or row-locking strategy.
- [ ] Add uniqueness guard for notification/device delivery pairs.
- [ ] Add tests for duplicate-dispatch prevention.
- [ ] Run real workflow push smoke:
  - [ ] application selected
  - [ ] application rejected
  - [ ] new chat message
  - [ ] support reply
- [ ] Run tap-routing smoke:
  - [ ] chat room
  - [ ] interview detail
  - [ ] my interviews
  - [ ] support
  - [ ] fallback notifications
- [ ] Run suppression smoke:
  - [ ] chat mute
  - [ ] user block
  - [ ] self-event
- [ ] Run Android FCM smoke after Android release config is hardened.

Close criteria:

- Push is reliable enough for TestFlight and Play internal testing.
- The active push plan can be reduced to platform-specific future work only.

### 8. Native UI Platform Correctness

Severity: medium

Problem:

- Some RN screens still appear to use web-style safe-area assumptions.
- `enableScreens(false)` and `newArchEnabled: false` are intentional-looking
  stability choices but need explicit documented blockers and re-evaluation.
- Push permission prompt currently fires automatically after auth, which may be
  acceptable by product request but should be validated against platform UX and
  user trust.

Evidence:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app.config.ts`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/chat/CounterpartProfileModal.tsx`
- `apps/mobile/src/features/push/PushNotificationManager.tsx`

Target behavior:

- Native surfaces use `react-native-safe-area-context` rather than CSS
  `env(safe-area-inset-*)`.
- The reason for disabling React Native Screens is documented, or the disable
  call is removed after release-device smoke.
- The reason for disabling New Architecture is documented, or an enablement
  branch is tested.
- Permission prompts are timed intentionally and remain understandable to
  users.

Implementation plan:

- [x] Search and remove native usage of CSS safe-area env strings.
- [x] Replace with `useSafeAreaInsets()` or `SafeAreaView`.
- [ ] Document why `enableScreens(false)` exists, including the crash or issue
      it mitigated.
- [ ] Create a small validation branch/task to try `enableScreens(true)` or
      removing the override.
- [ ] Document why `newArchEnabled: false` exists and which dependency blocks
      enabling it.
- [ ] Evaluate whether push permission should remain automatic after first
      login or move behind an in-app pre-permission CTA.
- [ ] Run simulator smoke on small and large iPhone sizes after layout changes.
- [ ] Run Android emulator smoke for tab navigation, chat thread, map, and
      profile settings after safe-area changes.

Close criteria:

- Native UI no longer relies on web-only safe-area syntax.
- Long-term architecture disables are documented and tracked.

### 9. Contracts And API Type Coverage

Severity: medium

Problem:

- `packages/contracts` does not fully cover all review-sensitive backend APIs.
- Some mobile code uses local ad hoc types for notifications, push, blocks,
  moderation, support/report, and account deletion.

Evidence:

- `packages/contracts/src/api`
- `apps/api/app/schemas`
- `apps/mobile/src/shared/api`

Target behavior:

- Shared API/domain types cover the flows that must remain consistent across
  API, mobile, web, and store-review docs.
- Type drift is reduced for support/report, account deletion, notifications,
  push, block, and moderation.

Implementation plan:

- [ ] Inventory API schemas not represented in `packages/contracts`.
- [ ] Decide whether to manually add contracts or generate from FastAPI
      OpenAPI.
- [ ] Add contracts for:
  - [ ] account deletion
  - [ ] notifications
  - [ ] push devices/preferences
  - [ ] blocks
  - [ ] moderation/report target types
  - [ ] support ticket target type `chat_message`
- [ ] Update mobile/web API clients to import shared contracts where practical.
- [ ] Add type-level compile coverage where changed.

Close criteria:

- Review-sensitive API shape changes are visible to frontend typecheck.
- No important store-review flow depends only on duplicated local types.

### 10. Readiness Endpoint Semantics

Severity: low/medium

Problem:

- Readiness can report overall `ok` while optional or production-required
  provider config is missing.
- For operations, there should be a distinction between:
  - app process is alive
  - DB is reachable
  - production-critical providers are configured/reachable
  - optional providers are degraded

Evidence:

- `apps/api/app/api/v1/routes/health.py`
- `docs/completed/api-operations-readiness-plan.md`

Target behavior:

- `/health` remains simple process liveness.
- `/api/v1/health/ready` clearly reports required vs optional dependency
  health.
- Production-required provider failures return a degraded/non-ok status where
  appropriate without causing destructive checks.

Implementation plan:

- [ ] Define required providers per environment.
- [ ] Make Kakao, Supabase JWKS/Auth, APNs, FCM, and outbound email status
      explicit.
- [ ] Avoid slow or destructive live sends in readiness.
- [ ] Add tests for ready/degraded semantics.
- [ ] Document the operator interpretation in deployment docs.

Close criteria:

- Operators can tell whether the API is safe to serve traffic, not merely
  whether the process is alive.

## Suggested Execution Order

### Phase 1: Backend Safety First

- [x] Public interview post visibility.
- [x] Deleted/deactivated sync guard.
- [x] Support/report soft delete.
- [x] Application/session state machine tightening.

Why first:

- These are data exposure, privacy, evidence-retention, and state-integrity
  risks.
- They affect mobile, web, store review, and operations.

Validation:

```bash
cd apps/api
.venv/bin/python -m pytest
```

### Phase 2: Mobile Release Configuration

- [x] Android versionCode guard.
- [x] Android Firebase config guard.
- [x] Production app config inspection.
- [ ] iOS/TestFlight OTP smoke.
- [ ] Android release-like smoke when device/emulator is ready.

Validation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
cd apps/mobile && npx -y expo-doctor
```

### Phase 3: Push Reliability

- [ ] Atomic push delivery claim.
- [ ] Duplicate delivery prevention tests.
- [ ] Real workflow push smoke.
- [ ] Tap routing and suppression smoke.

Validation:

```bash
cd apps/api
.venv/bin/python -m pytest tests/test_push_routes.py tests/test_push_worker.py tests/test_push_provider_clients.py
```

### Phase 4: Native UI Platform Cleanup

- [x] Safe-area cleanup.
- [ ] `enableScreens(false)` decision.
- [ ] `newArchEnabled: false` decision.
- [ ] Permission timing review.

Validation:

- iPhone small simulator smoke.
- iPhone large simulator smoke.
- Android emulator smoke.
- TestFlight real-device smoke before public testing.

### Phase 5: Documentation Closeout

- [ ] Update active docs after each implementation phase.
- [ ] Move completed implementation history to `docs/completed`.
- [ ] Move stable guidance to `docs/reference`.
- [x] Keep `docs/active/README.md` accurate.

2026-06-15 update: moved
`interview-detail-application-state-redesign-plan.md` from `docs/active/` to
`docs/completed/` because the implementation work is complete enough for
history/reference use. Active README now lists only the remaining launch,
release-smoke, and cross-cutting QA work.

## Deployment Notes

Backend:

- Implement through local code changes, tests, git sync, then deploy to GPU
  server by git-based workflow.
- Do not manually patch production schema without a migration.
- After API deployment, verify:

```bash
ssh bukae-gpu "curl -fsS http://127.0.0.1:8000/health"
ssh bukae-gpu "curl -fsS http://127.0.0.1:8000/api/v1/health/ready"
```

Mobile:

- Do not use EAS cloud build while cloud-build usage is intentionally paused.
- For iOS, use local IPA build and submit that explicit IPA path.
- For Android, add local/internal build guidance before Play Store testing.

Web:

- GitHub push is source publication and backup, not an automatic web
  production deploy trigger.
- Vercel Git auto-deploy is intentionally disabled for the current MVP release
  path. Deploy the web app only when the user explicitly asks for a web
  deployment, using a manual Vercel redeploy of the intended commit or an
  explicit Vercel CLI deploy.
- Run web build before any requested web deployment if web files are changed:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web build
```

## Close Criteria For This Plan

This document can move to `docs/completed/` when:

- high-severity backend findings are fixed and covered by tests,
- Android release config cannot be accidentally invalid,
- OTP signup passes real-device smoke,
- push delivery has duplicate-prevention and real workflow smoke,
- native safe-area/platform issues are either fixed or explicitly documented
  with a follow-up plan,
- active docs no longer contain stale or duplicate trackers for the same
  completed work.
