# Hypofit API Operations Readiness Plan

Status: completed - implementation history

Last updated: 2026-06-01

## Purpose

This document consolidates the backend API gaps that must be closed before
Hypofit can be operated as a real interview matching service and prepared for a
Google Play-first release while keeping App Store review readiness visible.

It covers:

- current FastAPI endpoint inventory
- missing operational APIs
- account deletion, soft deletion, anonymization, and retention policy
- support, report, moderation, and blocking workflows
- audit/event history
- notification center backend
- Google Play, App Store, and Korean legal readiness implications
- implementation order for `apps/api`

This is an implementation planning document, not legal advice. Retention periods
and deletion exceptions must be reviewed again before production launch, payment
handling, or broader public release.

## Current Status

As of 2026-05-29, the recent API operations pass is implemented in `apps/api`
and deployed to the GPU runtime.

Verified from the deployed environment:

- public `GET /health` returned `status=ok`
- public `GET /api/v1/health/ready` returned `status=ok` with `database=ok`
- GPU `alembic current` reported
  `0013_application_session_moderation_status (head)`

Implemented and deployed backend foundations now include:

- account deletion request APIs:
  - `POST /api/v1/account-deletion-requests/public`
  - `POST /api/v1/account-deletion-requests/public/verify`
  - `POST /api/v1/account-deletion-requests/me`
  - `POST /api/v1/account-deletion-requests/me/delete`
- support/admin operations:
  - support ticket events
  - admin ticket list/status/reply APIs
- user safety and moderation basics:
  - block/unblock/list APIs
  - server-side block enforcement in application create and chat send
  - admin moderation actions
  - moderation effects for interview posts, users, applications, and sessions
- notification foundation:
  - `notifications` table
  - notification list/read/read-all APIs
  - notification events for applications, chat, support replies, sessions,
    completion, and no-show
- interview lifecycle additions:
  - interview post edit/archive/reopen
  - respondent application withdrawal
  - session reschedule/cancel

Remaining launch-hardening work stays open:

- outbound email delivery for public deletion verification and support workflow
  notifications
- scheduled retention/anonymization purge processor after the retention window
- deployed `apps/api/scripts/store_review_smoke.py` execution with a reviewer
  account; the GPU `.env` currently exposes `SUPABASE_URL` but not
  `SUPABASE_ANON_KEY`, which the script requires
- readiness expansion from config-presence checks to real external-provider
  reachability checks
- deeper post/application/session state-transition matrix and operator runbook
  detail if not already captured elsewhere

## Implementation Progress

Last implementation pass: 2026-05-29

Completed in `apps/api`:

- added `account_deletion_requests` model, schema, repository, service, route,
  and migration
- added authenticated account deletion request API:
  `POST /api/v1/account-deletion-requests/me`
- added public account deletion request API:
  `POST /api/v1/account-deletion-requests/public`
- added public account deletion verification API:
  `POST /api/v1/account-deletion-requests/public/verify`
- added MVP account deactivation/anonymization API:
  `POST /api/v1/account-deletion-requests/me/delete`
- added `app_users` deletion/deactivation/anonymization timestamp fields
- added inactive-account guard in `CurrentAppUser`
- added best-effort Supabase Storage profile image object deletion during
  authenticated account deletion
- added `support_ticket_events` model and migration
- added admin support ticket list/status/reply APIs under `/api/v1/admin`
- added `user_blocks` model, schema, repository, service, route, and migration
- added block/unblock/list APIs:
  - `POST /api/v1/users/{user_id}/block`
  - `DELETE /api/v1/users/{user_id}/block`
  - `GET /api/v1/me/blocked-users`
- added server-side block enforcement in application creation and chat message
  sending
- added `moderation_actions` model and migration as the storage foundation for
  future operator moderation decisions
- added admin moderation action API:
  `POST /api/v1/admin/moderation/actions`
- added `audit_events` model, repository helper, and migration
- added audit events for public/authenticated account deletion requests,
  completed account deletion, user block/unblock, support status changes,
  support replies, and moderation actions
- added actual moderation effects for:
  - hiding/removing/restoring `chat_message` targets by masking message bodies
    in user-facing chat reads
  - hiding/removing/restoring `interview_post` targets by moving posts to
    `hidden`, `removed`, or `open`
  - blocking/unblocking/restoring `user` targets through `deactivated_at`
  - hiding/removing/restoring `application` targets through
    `moderation_status`
  - hiding/removing/restoring `session` targets through `moderation_status`
- extended interview post status values to include `archived`, `hidden`, and
  `removed`
- added `moderation_status` to applications and interview sessions
- excluded hidden/removed applications and sessions from user-facing repository
  reads
- excluded archived/hidden/removed interview posts from default discovery
  queries
- added founder-owned interview post edit API:
  `PATCH /api/v1/interview-posts/{post_id}`
- added founder-owned interview post archive API:
  `POST /api/v1/interview-posts/{post_id}/archive`
- added founder-owned interview post reopen API:
  `POST /api/v1/interview-posts/{post_id}/reopen`
- added interview post update, close, and archive audit events
- added interview post reopen audit event
- guarded interview post edits to draft/open posts without existing
  applications
- added `notifications` model, schema, repository, service, route, and
  migration
- added in-app notification list/read/read-all APIs:
  - `GET /api/v1/notifications`
  - `POST /api/v1/notifications/{notification_id}/read`
  - `POST /api/v1/notifications/read-all`
- added notification events for new applications, application selection,
  application rejection, chat messages, and visible support replies
- added respondent application withdrawal API:
  `POST /api/v1/applications/{application_id}/withdraw`
- added application withdrawal notification and audit events
- blocked respondent withdrawal after a selected application already has a
  scheduled interview session
- added session reschedule API:
  `PATCH /api/v1/sessions/{session_id}`
- added session cancellation API:
  `POST /api/v1/sessions/{session_id}/cancel`
- added session reschedule/cancellation counterpart notifications and audit
  events
- guarded session reschedule/cancellation so only scheduled sessions can be
  changed
- added session completion audit events and participant notifications
- added no-show audit events and participant notifications with canonical
  `no_show_marked` notification type
- extended report targets to include `chat_message`
- added API readiness endpoint:
  `GET /api/v1/health/ready`
- restored `apps/api/scripts/seed_account_demo_data.py` for a rich single
  reviewer/test account such as `sehyeon73@gmail.com`
- added `apps/api/scripts/store_review_smoke.py` for deployed API smoke checks
  with a reviewer/demo account
- documented `ADMIN_EMAILS` in `.env.example`

Verified:

- `apps/api/.venv/bin/python -m pytest apps/api/tests`
  - 91 passed
  - 9 skipped
  - 2 warnings
- `apps/api/.venv/bin/python -m compileall apps/api/app apps/api/alembic/versions apps/api/scripts`
- `apps/api/.venv/bin/python -m ruff check apps/api/app apps/api/tests apps/api/scripts`
- `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/web exec tsc --noEmit`

Still open:

- outbound email delivery for public deletion verification links and support
  workflow notifications
- scheduled hard/soft purge job for retention windows after account deletion
- deeper post/application/session state transition matrix
- readiness endpoint expansion for external provider reachability beyond config
  presence
- live execution of the store-review smoke script against the deployed API and
  seeded reviewer account; GPU `.env` currently lacks `SUPABASE_ANON_KEY`,
  which the script requires
- operator runbook details if not already covered in deployment docs

## Current API Inventory

The current backend has the core user-facing MVP loop mostly implemented.

### Health

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/health/ready`

Current role:

- process-level health check
- readiness check verifies DB connectivity and required configuration presence
- deployed public health and readiness endpoints returned `status=ok` on
  2026-05-29

### Account and Profile

- `GET /api/v1/me`
- `POST /api/v1/me/sync`
- `PATCH /api/v1/me`

Current role:

- syncs Supabase Auth user into `app_users`
- reads and updates name, role, phone, bio, profile image fields
- supports `founder`, `respondent`, and `both`

Current gaps:

- no `DELETE /me`
- authenticated and public deletion request APIs exist, but outbound email
  verification delivery and background purge behavior remain open
- no data export or privacy request endpoint
- no backend-owned profile image upload/delete flow

### Interview Posts

- `GET /api/v1/interview-posts/`
- `POST /api/v1/interview-posts/`
- `GET /api/v1/interview-posts/{post_id}`
- `PATCH /api/v1/interview-posts/{post_id}`
- `POST /api/v1/interview-posts/{post_id}/archive`
- `POST /api/v1/interview-posts/{post_id}/reopen`
- `PATCH /api/v1/interview-posts/{post_id}/status`

Current role:

- browse interview posts
- create founder-owned interview posts
- edit founder-owned draft/open posts before applications arrive
- close posts
- archive posts to hide them from discovery while preserving records
- reopen closed/archived posts when the founder wants to recruit again
- list by mode, status, founder, location, radius, and sort
- edit, close, archive, and reopen actions write audit events

Current gaps:

- moderation status now supports `hidden` and `removed`, but there is no full
  operator review queue around post-level outcomes yet
- only `closed` status update is supported
- deeper state-transition rules are still needed for post reopen and
  application/session-linked post lifecycle

### Interview Post Views

- `GET /api/v1/interview-post-views/`
- `POST /api/v1/interview-posts/{post_id}/view`

Current role:

- stores per-user viewed/read state

Current gaps:

- no deletion/anonymization behavior for deleted users
- no retention policy for view data

### Applications

- `GET /api/v1/applications/`
- `POST /api/v1/applications/`
- `POST /api/v1/applications/{application_id}/withdraw`
- `PATCH /api/v1/applications/{application_id}/status`

Current role:

- respondent applies
- founder selects/rejects/cancels/no-shows/completes via status update
- duplicate application is protected by unique constraint
- selecting/rejecting updates chat state and writes system messages
- respondent owner can withdraw applied/selected applications before a session
  is scheduled
- withdrawal notifies the founder and writes an audit event
- hidden/removed applications are excluded from user-facing reads

Current gaps:

- status transition rules are too loose for long-term operation
- no transition audit table
- blocked-user enforcement exists before application creation
- broader application-level moderation outcomes still need operator UX

### Chat

- `GET /api/v1/chat/rooms/`
- `GET /api/v1/chat/rooms/{room_id}`
- `PATCH /api/v1/chat/rooms/{room_id}/settings`
- `POST /api/v1/chat/rooms/{room_id}/read`
- `GET /api/v1/chat/rooms/{room_id}/messages`
- `POST /api/v1/chat/rooms/{room_id}/messages`

Current role:

- lists user chat rooms
- supports mute/hide settings
- supports read state and unread count
- sends plain text messages

Current gaps:

- no user-side message delete endpoint
- admin moderation can hide messages, but there is no user-visible appeal or
  per-message moderation history surface yet
- no attachment support
- server-side block enforcement exists for message send
- notification event exists for new messages, but push delivery remains deferred

### Sessions and Attendance

- `GET /api/v1/sessions/`
- `POST /api/v1/sessions/`
- `PATCH /api/v1/sessions/{session_id}`
- `POST /api/v1/sessions/{session_id}/complete`
- `POST /api/v1/sessions/{session_id}/cancel`
- `POST /api/v1/sessions/{session_id}/no-show`

Current role:

- founder schedules selected applications
- founder or respondent can mark completion/no-show if they belong to the
  interview
- founder or respondent can reschedule or cancel a scheduled session
- reschedule/cancel notifies the counterpart and writes audit events
- completion and no-show transitions write audit events and create in-app
  notifications
- attendance records exist at the model level
- hidden/removed sessions are excluded from user-facing reads

Current gaps:

- no structured dispute flow
- no no-show appeal/review flow
- no trust score or no-show history surface
- complete/no-show appeal and operator review flows remain future work

### Places

- `GET /api/v1/places/search`

Current role:

- Kakao Local REST keyword search

Current gaps:

- no cache
- no rate limiting
- no structured outbound HTTP client
- no fallback provider
- no dependency readiness check

### Notifications

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/notifications/read-all`

Current role:

- stores durable in-app notification records
- exposes list/read/read-all behavior for web and mobile clients
- creates notification events for applications, chat messages, support replies,
  session changes, completion, and no-show

Current gaps:

- no push token registration or push delivery
- no explicit unread-count-only endpoint
- no account deletion status notification flow yet

### Support and Reports

- `GET /api/v1/support/tickets`
- `POST /api/v1/support/tickets`
- `PATCH /api/v1/support/tickets/{ticket_id}`
- `DELETE /api/v1/support/tickets/{ticket_id}`

Current role:

- user-scoped inquiry/report/privacy/account-deletion ticket intake
- user can edit/delete only open tickets
- answered/reviewing tickets are locked at the service layer
- admin list/status/reply APIs and support ticket events provide a basic
  operator queue without direct DB edits

Current gaps:

- no assignment, internal note, or resolution reason
- no email notification on new ticket
- user deletion of open support ticket currently hard-deletes the record

## Operating Risks If Left Unfixed

### Google Play account deletion risk

If Hypofit lets users create accounts, Google Play requires an in-app path and
a web path where users can delete their account or request deletion. The web
path must be functional, relevant, discoverable, and reference the app or
developer name.

Current risk:

- the backend now exposes public request/verify and authenticated
  request/deactivate endpoints, so the primary remaining risk is no longer
  missing API coverage
- outbound email delivery for public verification links is still missing, so
  public deletion still depends on a manual verification step
- there is still no scheduled backend processor that enforces retention windows
  and final purge/anonymization behavior

### Google Play UGC/report/block risk

Hypofit includes UGC-like surfaces:

- profile text and profile image
- interview posts
- application answers
- chat messages
- support/report free text

Google Play UGC policy expects in-app reporting and blocking for UGC surfaces.
The current API now has report intake, durable user blocking, and baseline
moderation enforcement, but the operator workflow is still incomplete.

Current risk:

- block enforcement currently covers application creation and chat send, but
  broader future interaction surfaces still need the same guardrails
- moderation actions and audit events exist, but operator queue/history UX and
  assignment remain incomplete
- report outcomes are not yet surfaced back to end users

### App Store account deletion and privacy risk

Apple App Review Guideline 5.1.1 requires an easily accessible privacy policy
and requires apps that support account creation to offer account deletion inside
the app. Apple's separate account deletion guidance also says only offering
temporary deactivation is not enough; the user must be able to delete the whole
account record and associated personal data except data that must legally be
retained.

Current risk:

- backend account deletion now has public request/verify plus authenticated
  request/deactivate flows, and deactivated users are blocked from core
  workflow APIs
- outbound email verification delivery, the retained-vs-deleted data map, and
  the retention/purge processor are still unfinished
- profile images have best-effort authenticated deletion, but chat, support,
  location, and interview workflow retention behavior still needs a deeper
  documented matrix

API implication:

- keep `requested`, `verified`, `in_review`, `completed`, `rejected`, and
  `canceled` flows consistent across public and in-app requests
- add outbound email delivery and clear user/operator status visibility when
  deletion takes extra time
- finish the retention map and purge processor for retained versus anonymized
  data
- make the privacy policy match the implemented deletion and retention behavior

### App Store UGC moderation risk

Apple App Review Guideline 1.2 requires apps with user-generated content to
provide filtering for objectionable material, a reporting mechanism, timely
responses, the ability to block abusive users, and published contact
information.

Hypofit has multiple UGC and user-to-user surfaces:

- interview posts
- profile name, bio, and profile image
- application answers and available-time notes
- chat messages
- support and report free text

Current risk:

- users can now submit reports and block another user through a durable API
- chat send and application creation enforce block state server-side
- interview posts, chat messages, users, applications, and sessions now have
  baseline moderation effects and audit events
- operator review UX, assignment/history, and user-facing appeal/outcome
  surfaces remain incomplete

API implication:

- keep expanding block enforcement to future interaction surfaces
- keep report targets, moderation action coverage, and operator-visible history
  aligned as more UGC surfaces are added
- add operator workflow and runbook detail around moderation outcomes
- preserve published support contact information in app and public legal pages

### App Store app completeness and review access risk

Apple App Review Guideline 2.1 expects final app binaries, complete metadata,
working URLs, a live backend, and demo account access when the app includes
login. Guideline 4.2 also rejects apps that do not provide enough native app
value or feel like a thin wrapper around a website.

Current risk:

- reviewer seed and smoke scripts now exist, and deployed public health and
  readiness are responding with `status=ok`
- official reviewer credentials, seeded review data, and live deployed
  store-review smoke are still not fully formalized
- readiness now checks DB connectivity and required config presence, but it
  still does not verify real external-provider reachability
- if a submitted iOS build shows mock-only surfaces, review can treat the app as
  incomplete

API implication:

- keep demo accounts and review seed data documented and reproducible
- expand readiness health beyond DB and required provider configuration presence
- avoid hiding unfinished backend flows behind static mobile UI for store builds
- preserve the Expo native app path instead of a thin WebView wrapper

### App Store payment and reward wording risk

Apple App Review Guideline 3.1.1 generally requires in-app purchase for digital
goods and digital services. Hypofit's case fee is intended as compensation for a
real-world or video interview, not a digital content purchase, but the product
must avoid implying that Apple, Google, or Hypofit automatically holds or
guarantees the payment unless a compliant payment/escrow system is implemented.

Current risk:

- interview posts expose reward amounts, but there is no payment, escrow,
  receipt, refund, or dispute API
- user-facing copy could accidentally imply platform-managed payment

API implication:

- keep MVP backend limited to `reward_amount` and interview coordination
- do not add payment status claims until payment flow, legal text, and store
  policy classification are decided
- if payments are added later, model receipts, refund/dispute records, tax/legal
  retention, and store-specific payment rules explicitly

### App Store location and permission risk

Apple App Review Guideline 5.1.5 requires Location Services to be directly
relevant to app features, requires notice and consent before location collection,
and expects the app to explain the purpose. Guideline 5.1.1 also expects data
minimization and alternatives where possible.

Current risk:

- current location is core to map and nearby interview discovery, but the API
  still needs clear retention and deletion behavior for user/post coordinates
- place search and geocoding behavior is split between mobile and backend
- privacy labels and policy text can drift from actual collected location data

API implication:

- store only the minimum location fields needed for interview discovery
- track location source and precision where useful
- support manual place search when users deny current-location permission
- anonymize or remove user-linked location data during account deletion where
  legally possible
- keep App Store privacy labels and Google Play Data safety answers aligned with
  actual fields and SDK behavior

### CS operations risk

Users can create support tickets, and the backend now has a basic API-backed
operating queue, but the operator workflow is still thin.

Current risk:

- support intake, admin status transitions, replies, and event history are now
  API-backed
- assignment, internal notes, resolution reasons, outbound email, and operator
  runbook detail remain open

### Data retention and deletion risk

Korean law generally requires personal data to be deleted when the purpose is
achieved unless another law requires retention. For commerce-like records, the
Electronic Commerce Act Enforcement Decree provides category-based retention
periods. For communication-related logs, the Communications Secrets Protection
Act Enforcement Decree may require retention of certain communication fact
data.

Current risk:

- deletion request records, deactivation/anonymization timestamps, and audit
  events now provide a foundation for retention handling
- no data classification map exists in code
- no table fields distinguish active data from retained legal records
- no purge/anonymization job exists
- privacy policy text can drift from actual backend behavior

## Legal and Policy References

Use these as planning inputs. Confirm with legal counsel before production.

- Google Play account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play User Generated Content policy:
  https://support.google.com/googleplay/android-developer/answer/9876937
- Google Play moderation guidance:
  https://support.google.com/googleplay/android-developer/answer/12923286
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Store privacy details:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store review submission overview:
  https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/overview-of-submitting-for-review/
- Electronic Commerce Act Enforcement Decree article 6:
  https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=63460
- Communications Secrets Protection Act Enforcement Decree:
  https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=121362

## App Store Review API Implications

Apple App Store release is not the current first store target, but the backend
should not be designed in a way that later blocks App Review. The requirements
below are API and data-model implications of the Apple review rules that matter
for Hypofit's product shape.

### Guideline 1.2 - User-Generated Content

Relevant Hypofit surfaces:

- founder-created interview posts
- respondent applications and free-text answers
- chat rooms and chat messages
- profile images and profile bios
- support/report text

App Store expectation:

- objectionable content should be filterable or removable
- users should be able to report offensive content
- users should be able to block abusive users
- concerns should receive a timely response
- contact information should be published and easy to find

Backend requirements:

- `support_tickets.kind = report` must support all UGC target types
- add `chat_message` as a report target
- add `user_blocks` and enforce it server-side
- add moderation actions for hide, remove, warn, block, unblock, restore, and
  close report
- add operator support queue so reports are not dead-end submissions
- add audit events for every moderation action

Minimum MVP acceptance:

- a user can report another user, interview post, chat room, or chat message
- a user can block another user from the profile card or chat actions
- blocked users cannot continue sending messages
- an operator can see reports and record an outcome
- support contact appears in profile/legal/support surfaces

### Guideline 2.1 - App Completeness

App Store expectation:

- submitted builds should be final enough to review
- backend services should be live and accessible during review
- apps with login should provide a demo account or full-featured demo mode
- placeholder text, broken URLs, and mock-only paths should be removed before
  submission

Backend requirements:

- define reviewer demo accounts and seed data
- expose readiness health beyond process liveness
- keep legal/support/account deletion URLs live
- ensure mobile app store builds point at production or review-safe backend
- avoid mock data in submitted builds unless it is part of a clearly described
  demo mode

Minimum MVP acceptance:

- `GET /health` and `GET /api/v1/health/ready` pass during review
- reviewer account can browse posts, apply, open chat, submit support/report,
  and request account deletion
- every URL listed in App Store Connect works without local development context

### Guideline 3.1.1 - Payments and In-App Purchase

App Store expectation:

- digital goods and digital services generally use Apple's in-app purchase
  system
- apps must clearly describe purchase-related features and make them reviewable
- creator/UGC monetization can still trigger payment-policy review

Hypofit interpretation for MVP:

- the interview case fee is compensation for a real-world or video interview
  session, not a digital content unlock
- the MVP backend should treat reward as post metadata only
- Hypofit should not claim escrow, automatic payment, refund handling, or
  payment guarantee until those systems exist

Backend requirements if payments are deferred:

- keep only advertised reward amount and reward description
- do not add `paid`, `escrowed`, `settled`, or `refunded` states unless the
  product actually supports them
- keep user-facing copy clear that payment is coordinated between participants
  unless a compliant payment system is launched

Backend requirements if payments are added later:

- add payment records, payer/payee identity, receipt, refund, dispute, and
  settlement tables
- document store-policy classification before implementation
- update privacy policy, terms, Data safety, and App Store privacy labels
- add legal retention periods for payment and dispute records

### Guideline 4.2 - Minimum Functionality

App Store expectation:

- the app should provide a real app experience and not merely wrap a website
- core features should be functional and useful on the submitted platform

Backend requirements:

- core mobile flows must be API-backed:
  - account/profile
  - interview discovery
  - post creation
  - application
  - chat
  - support/report
  - account deletion
- native-only permission flows such as location and profile-image selection
  should not depend on web-only behavior
- readiness and review data should make the app useful without local mock data

Minimum MVP acceptance:

- the Expo app can complete the core founder/respondent loop through FastAPI
- web/PWA fallback can remain available, but App Store submission is not a
  WebView wrapper

### Guideline 4.8 - Login Services

App Store expectation:

- if an app uses a third-party or social login service to set up or
  authenticate the user's primary account, it may need to provide an equivalent
  Apple-friendly login option depending on the login method and current Apple
  exceptions

Current Hypofit posture:

- email/password via Supabase is the simplest MVP-compatible path
- if Google, Kakao, or another social login is added for iOS, Sign in with Apple
  implications must be reviewed before submission

Backend requirements:

- keep auth provider identity separate from `app_users`
- support provider linking without changing the user id used by workflow tables
- avoid hardcoding one provider into account deletion, profile, support, or
  audit behavior

### Guideline 5.1.1 - Privacy, Data Collection, and Account Deletion

App Store expectation:

- privacy policy link must be provided in App Store Connect and inside the app
- the policy must identify collected data, collection method, use, sharing,
  retention/deletion behavior, and user consent withdrawal/deletion process
- apps should collect only relevant data
- apps with account creation must offer account deletion inside the app

Backend requirements:

- account deletion APIs must be first-class, not only a generic support ticket
- deletion must remove or anonymize personal data that is not legally retained
- support, report, chat, application, location, and profile image data must have
  explicit deletion/anonymization behavior
- every retained exception needs a reason and audit trail
- privacy policy and App Store privacy labels must match actual API behavior

Minimum MVP acceptance:

- profile page exposes account deletion
- public legal/support route exposes deletion request path
- deletion request status is visible to the user or support team
- deleted/deactivated users cannot keep using core workflow APIs

### Guideline 5.1.5 - Location Services

App Store expectation:

- location use must be directly relevant to app features
- the app must obtain consent before collecting, transmitting, or using location
  data
- the app should explain why location is needed
- users who deny permission should have a reasonable alternative where possible

Backend requirements:

- use current location only for map and nearby interview discovery
- support manual region/place search without requiring current location
- store founder interview post coordinates only when needed for offline
  interview discovery
- avoid storing respondent live location unless a specific feature requires it
- add deletion/anonymization behavior for user-linked location records
- keep Kakao/local-search usage documented in privacy policy and store labels

Minimum MVP acceptance:

- denying current-location permission does not block all app use
- nearby filters degrade to manual search
- stored coordinates are linked to interview posts, not continuous user tracking

### App Store Connect Privacy Labels

Apple's App Store privacy details page requires developers to declare data
collected by the app and integrated third-party partners. The declaration must
stay accurate when SDKs or backend behavior change.

Hypofit data categories to map before iOS submission:

- contact info: email, phone number if collected
- user content: profile image, profile bio, interview posts, applications, chat
  messages, support/report content
- identifiers: Supabase user id, app user id, device/push token if added later
- location: coarse or precise location depending on map/post behavior
- diagnostics: crash logs if Sentry/Firebase/Expo diagnostics are added
- usage data: analytics events if analytics SDK is added
- purchases: only if payments or subscriptions are implemented later

Backend requirements:

- keep a data inventory in docs aligned with schema and SDKs
- update privacy labels when adding analytics, crash reporting, push, payment,
  profile image upload, or location behavior
- keep `EXPO_PUBLIC_*` values free of backend secrets; privacy labels do not
  reduce the need for secret hygiene

## Proposed Retention Policy Baseline

This is a working baseline for API/schema design. It should be refined before
launch.

### Account profile data

Examples:

- name
- email
- phone
- bio
- role
- profile image path/url

Proposed behavior:

- active while account is active
- on account deletion completion, anonymize or remove directly identifying
  fields unless legally retained
- remove profile image from Supabase Storage where technically possible
- retain only minimal account deletion audit metadata

Proposed fields:

- `app_users.deactivated_at`
- `app_users.deleted_at`
- `app_users.anonymized_at`
- `app_users.deletion_requested_at`
- `app_users.deletion_completed_at`
- `app_users.deletion_reason`

### Interview posts

Examples:

- title
- service summary
- target description
- location
- reward
- schedule options

Proposed behavior:

- founder can close/archive posts
- do not hard delete by default if applications, sessions, or disputes exist
- hidden/removed status should be available for moderation
- if founder account is deleted, preserve operational record but anonymize
  founder identity in read models

Proposed status extension:

- `draft`
- `open`
- `closed`
- `completed`
- `archived`
- `hidden`
- `removed`

### Applications

Examples:

- answers
- available times
- status
- rejection reason

Proposed behavior:

- retain while interview workflow or dispute period is active
- allow respondent withdrawal
- anonymize respondent profile link after account deletion, while preserving
  workflow history needed for disputes
- keep application status transition events append-only

### Chat messages

Examples:

- message body
- message type
- sender id
- room id

Proposed behavior:

- retain while room/interview/dispute is active
- if a user deletes account, anonymize sender identity but preserve message
  body only when required for dispute, moderation, or legal record
- allow user-side hide/archive separately from operator moderation
- support message/report target granularity before public launch

### Support and reports

Examples:

- inquiry/report body
- contact email
- target id/type
- metadata
- operator notes/replies

Proposed behavior:

- normal support inquiries: retain for CS/dispute handling period
- reports and moderation actions: retain longer as safety/audit evidence
- account deletion requests: retain minimal audit proof after completion
- user deletion should not hard-delete already handled tickets

Suggested retention baseline:

- open/editable user drafts or open inquiries: user can withdraw/delete before
  staff handling starts
- in-review/resolved/closed support records: soft close, not hard delete
- consumer complaint/dispute records: up to 3 years if applicable
- contract/payment/supply records: up to 5 years if applicable
- display/advertising records: up to 6 months if applicable

### Access logs

Proposed behavior:

- keep operational access logs in server/log infrastructure with retention
  documented
- avoid storing logs only on the GPU server local disk
- classify whether logs are ordinary service logs or communication fact data
- if communication fact data retention applies, plan around 3-month retention
  for applicable data categories

## Target Backend Modules

The API should remain consistent with the existing architecture:

```text
route -> auth/dependency validation -> service -> repository -> database
```

New modules should follow the same shape:

```text
apps/api/app/api/v1/routes/account_deletion.py
apps/api/app/api/v1/routes/admin_support.py
apps/api/app/api/v1/routes/blocks.py
apps/api/app/api/v1/routes/notifications.py
apps/api/app/api/v1/routes/moderation.py

apps/api/app/services/account_deletion.py
apps/api/app/services/admin_support.py
apps/api/app/services/blocks.py
apps/api/app/services/notifications.py
apps/api/app/services/moderation.py

apps/api/app/repositories/account_deletion.py
apps/api/app/repositories/support_events.py
apps/api/app/repositories/blocks.py
apps/api/app/repositories/notifications.py
apps/api/app/repositories/audit_events.py

apps/api/app/schemas/account_deletion.py
apps/api/app/schemas/admin_support.py
apps/api/app/schemas/blocks.py
apps/api/app/schemas/notifications.py
apps/api/app/schemas/moderation.py
```

## Schema Plan

### `app_users` additions

Add:

- `deactivated_at timestamptz null`
- `deleted_at timestamptz null`
- `anonymized_at timestamptz null`
- `deletion_requested_at timestamptz null`
- `deletion_completed_at timestamptz null`
- `deletion_reason text null`

Read behavior:

- normal user reads should exclude or hide deleted users
- counterpart summaries should return an anonymized fallback when needed
- deleted users should not be able to create posts, apply, send messages, or
  open new support tickets except deletion/privacy follow-up

### `account_deletion_requests`

Fields:

- `id uuid primary key`
- `user_id uuid null references app_users(id)`
- `email text not null`
- `requester_name text null`
- `reason text null`
- `status text not null`
- `source text not null`
- `verification_token_hash text null`
- `verified_at timestamptz null`
- `processed_by uuid null references app_users(id)`
- `processed_at timestamptz null`
- `result text null`
- `retention_note text null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

Status values:

- `requested`
- `verified`
- `in_review`
- `completed`
- `rejected`
- `canceled`

Source values:

- `mobile_app`
- `public_web`
- `operator`

### `support_ticket_events`

Fields:

- `id uuid primary key`
- `ticket_id uuid references support_tickets(id)`
- `actor_user_id uuid null references app_users(id)`
- `actor_type text not null`
- `event_type text not null`
- `from_status text null`
- `to_status text null`
- `message text null`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null`

Event types:

- `created`
- `edited`
- `deleted_by_user`
- `status_changed`
- `assigned`
- `operator_replied`
- `internal_note_added`
- `closed`

### `user_blocks`

Fields:

- `id uuid primary key`
- `blocker_id uuid references app_users(id)`
- `blocked_user_id uuid references app_users(id)`
- `reason text null`
- `source text not null`
- `created_at timestamptz not null`
- `revoked_at timestamptz null`

Constraints:

- unique active block per blocker/blocked pair
- blocker cannot block self

Enforcement:

- do not create application if either participant blocked the other
- do not create or return active chat rooms that violate block policy
- do not allow sending message to a blocked user
- support/report should still be allowed after block

### `moderation_actions`

Fields:

- `id uuid primary key`
- `actor_user_id uuid null`
- `target_type text not null`
- `target_id uuid not null`
- `action text not null`
- `reason text null`
- `source_ticket_id uuid null references support_tickets(id)`
- `metadata jsonb not null default '{}'`
- `created_at timestamptz not null`

Target types:

- `user`
- `interview_post`
- `application`
- `chat_room`
- `chat_message`
- `session`

Actions:

- `warn`
- `hide`
- `remove`
- `block`
- `unblock`
- `close_report`
- `restore`

### `notifications`

Fields:

- `id uuid primary key`
- `user_id uuid references app_users(id)`
- `type text not null`
- `title text not null`
- `body text not null`
- `target_type text null`
- `target_id uuid null`
- `metadata jsonb not null default '{}'`
- `read_at timestamptz null`
- `created_at timestamptz not null`

Notification types:

- `application_created`
- `application_selected`
- `application_rejected`
- `application_withdrawn`
- `chat_message`
- `session_scheduled`
- `session_rescheduled`
- `session_canceled`
- `session_completed`
- `no_show_marked`
- `support_replied`
- `report_resolved`
- `account_deletion_updated`

### `audit_events`

Fields:

- `id uuid primary key`
- `actor_user_id uuid null`
- `actor_type text not null`
- `event_type text not null`
- `target_type text not null`
- `target_id uuid null`
- `before jsonb null`
- `after jsonb null`
- `reason text null`
- `request_id text null`
- `ip_hash text null`
- `created_at timestamptz not null`

Use for:

- account deletion processing
- support status changes
- moderation decisions
- role changes
- profile image deletion
- critical interview/session state changes

## API Plan

### P0 Account Deletion APIs

#### Public deletion request

`POST /api/v1/account-deletion-requests/public`

Auth:

- no app auth required

Request:

```json
{
  "email": "user@example.com",
  "requester_name": "박세현",
  "reason": "서비스를 더 이상 사용하지 않음"
}
```

Response:

```json
{
  "id": "uuid",
  "status": "requested",
  "message": "계정 삭제 요청이 접수됐어요."
}
```

Notes:

- for MVP, this can create a request and notify the team mailbox
- before true automation, operator manually verifies ownership
- rate limit by email/IP should be added before public launch

#### Authenticated deletion request

`POST /api/v1/me/deletion-request`

Auth:

- `CurrentAppUser`

Request:

```json
{
  "reason": "서비스를 더 이상 사용하지 않음"
}
```

Behavior:

- creates `account_deletion_requests`
- sets `app_users.deletion_requested_at`
- creates notification for user
- creates audit event

#### Authenticated deletion execution

`DELETE /api/v1/me`

or

`POST /api/v1/me/delete`

MVP decision:

- prefer `POST /api/v1/me/delete` if the operation is asynchronous and creates
  a processing request
- use `DELETE /api/v1/me` only if it immediately completes deactivation or
  anonymization

Minimum behavior:

- require current user
- mark account as deactivated
- anonymize direct identifiers
- revoke or instruct client to sign out
- do not hard delete workflow records
- preserve minimal audit trail

### P1 Operator Support APIs

#### Admin auth baseline

MVP options:

1. allow only configured admin emails from `ADMIN_EMAILS`
2. add `app_users.is_admin`
3. create separate `operators` table

Recommended MVP:

- start with `ADMIN_EMAILS` env allowlist
- later migrate to `operators` table with role/permission model

#### List tickets

`GET /api/v1/admin/support/tickets`

Query:

- `kind`
- `status`
- `category`
- `target_type`
- `limit`
- `cursor`

#### Update ticket status

`PATCH /api/v1/admin/support/tickets/{ticket_id}/status`

Request:

```json
{
  "status": "in_review",
  "reason": "확인 시작"
}
```

#### Add operator reply

`POST /api/v1/admin/support/tickets/{ticket_id}/replies`

Request:

```json
{
  "body": "문의 내용을 확인했어요. 계정 상태를 점검한 뒤 안내드릴게요.",
  "visible_to_user": true
}
```

Behavior:

- adds `support_ticket_events`
- if visible, user can see it in the app later
- creates `support_replied` notification

#### Close report or inquiry

`POST /api/v1/admin/support/tickets/{ticket_id}/close`

Request:

```json
{
  "resolution": "처리 완료",
  "user_visible_message": "처리가 완료됐어요."
}
```

### P1 Blocking APIs

#### Block user

`POST /api/v1/users/{user_id}/block`

Request:

```json
{
  "reason": "채팅이 불편했어요."
}
```

Behavior:

- creates active user block
- hides or restricts active chat rooms between users
- prevents future messages
- prevents future applications/interactions as appropriate

#### Unblock user

`DELETE /api/v1/users/{user_id}/block`

Behavior:

- sets `revoked_at`
- writes audit event

#### List blocked users

`GET /api/v1/me/blocked-users`

### P1 Report/Moderation APIs

#### Extend report targets

Current target types:

- `interview_post`
- `application`
- `chat_room`
- `user`
- `session`

Add:

- `chat_message`

#### Moderator action

`POST /api/v1/admin/moderation/actions`

Request:

```json
{
  "target_type": "chat_message",
  "target_id": "uuid",
  "action": "hide",
  "reason": "개인정보 요구"
}
```

Behavior:

- creates `moderation_actions`
- applies target state change if needed
- adds support ticket event if linked to a report
- creates user notification when appropriate

### P2 Notification APIs

#### List notifications

`GET /api/v1/notifications`

Query:

- `unread_only`
- `limit`
- `cursor`

#### Mark read

`POST /api/v1/notifications/{notification_id}/read`

#### Mark all read

`POST /api/v1/notifications/read-all`

Event producers:

- application created
- application selected
- application rejected
- chat message created
- session scheduled
- session completed
- no-show marked
- support reply created
- report resolved
- account deletion status changed

Push notifications:

- defer Expo push token registration until EAS/native permission work is ready
- in-app notification table should be implemented first

### P2 Interview Lifecycle APIs

#### Edit interview post

`PATCH /api/v1/interview-posts/{post_id}`

Status: implemented as MVP lifecycle API.

Rules:

- founder owner only
- draft/open posts only
- no editing after applications exist unless a later explicit exception is
  designed
- every edit writes an audit event

#### Archive post

`POST /api/v1/interview-posts/{post_id}/archive`

Status: implemented as MVP lifecycle API.

Rules:

- founder owner only
- hides from default discovery
- remains reachable through explicit status filters and owner/admin flows
- preserves record
- every archive writes an audit event

#### Withdraw application

`POST /api/v1/applications/{application_id}/withdraw`

Status: implemented as MVP lifecycle API.

Rules:

- respondent owner only
- allowed for `applied` and `selected` applications
- blocked once a selected application already has a scheduled interview session
- creates notification for founder
- writes audit event

#### Cancel/reschedule session

`POST /api/v1/sessions/{session_id}/cancel`

`PATCH /api/v1/sessions/{session_id}`

Status: implemented as MVP lifecycle API.

Rules:

- founder or respondent participant
- only `scheduled` sessions can be canceled or rescheduled
- preserve history through audit events
- notify counterpart

### P3 Privacy Export APIs

#### Data export request

`POST /api/v1/me/data-export-request`

Behavior:

- creates a privacy support ticket or dedicated export request
- operator handles manually for MVP

#### Data export download

`GET /api/v1/me/data-export`

Defer until:

- deletion/anonymization rules are stable
- export format is documented
- storage location and expiry are decided

## Service Rules

### Account deletion rule

Do not hard delete `app_users` immediately.

Reason:

- many tables reference `app_users` with `RESTRICT`
- workflow records may be needed for dispute, moderation, no-show, and support
- deleting the user row can break historical read models and auditability

MVP behavior:

1. mark account as deactivated
2. block login/use at API layer
3. anonymize direct identifiers
4. remove profile image
5. keep workflow records with anonymized user summaries
6. keep minimal deletion audit event

### Soft delete rule

Prefer:

- `deleted_at`
- `archived_at`
- `hidden_at`
- `removed_at`
- `anonymized_at`

Avoid:

- `session.delete(...)` on user-visible workflow records
- deleting records with dispute/moderation value

Exception:

- user-created open support inquiry may be hard-deleted before staff handling,
  but once `in_review`, `resolved`, or `closed`, convert it to soft deletion or
  withdrawal.

### Admin action rule

Every operator action must write an event.

Minimum fields:

- actor
- target
- action
- reason
- before/after state where practical
- timestamp

### Blocking rule

Block must be enforced server-side.

Client-side hiding is not enough.

Enforce in:

- chat message send
- chat room list/detail
- application creation where blocker/blocked relationship exists
- future matching/recommendation logic

### Notification rule

Notification should be created in the same service transaction as the event it
represents when possible.

Examples:

- selecting an application creates a notification for the respondent
- rejecting an application creates a notification with rejection summary
- support reply creates notification for ticket owner
- no-show mark creates notification for counterpart

## Implementation Phases

### Phase 0 - Documentation and scope lock

Status: completed for the current planning pass

Tasks:

- keep this document active
- add it to active README
- align `google-play-first-launch-readiness-plan.md` and
  `google-play-data-safety-worksheet.md` when implementation begins
- keep App Store review implications visible even though Google Play remains
  the first native-store target

Exit criteria:

- team agrees on soft-delete/anonymization-first strategy
- public deletion path behavior is decided
- App Store and Google Play review-sensitive API surfaces are mapped to
  implementation phases

### Phase 1 - Account deletion foundation

Status: implemented as MVP API foundation; email verification and purge jobs
remain open.

Files likely affected:

- `apps/api/app/models/user.py`
- `apps/api/app/models/support.py`
- `apps/api/app/schemas/account_deletion.py`
- `apps/api/app/services/account_deletion.py`
- `apps/api/app/repositories/account_deletion.py`
- `apps/api/app/api/v1/routes/account_deletion.py`
- `apps/api/app/api/v1/router.py`
- Alembic migration
- API tests

Tasks:

- add account deletion request table - done
- add user deletion/deactivation fields - done
- add public deletion request endpoint - done
- add authenticated deletion request endpoint - done
- add MVP account deactivation/anonymization service - done
- add tests for public request, authenticated request, and deactivated-user
  access behavior - done

Exit criteria:

- public web deletion request can submit to FastAPI without app auth
- authenticated user can request deletion in-app
- deleted/deactivated users cannot use core workflow APIs
- deletion event is auditable

### Phase 2 - Support operator queue

Status: implemented as MVP support queue foundation. Admin list/status/reply
APIs, support ticket event storage, and staff-handling edit locks exist;
assignment, internal notes, close-specific endpoint, resolution reasons, and
email delivery remain open.

Files likely affected:

- `apps/api/app/api/dependencies.py`
- `apps/api/app/models/support.py`
- `apps/api/app/schemas/admin_support.py`
- `apps/api/app/services/admin_support.py`
- `apps/api/app/repositories/support.py`
- `apps/api/app/repositories/support_events.py`
- `apps/api/app/api/v1/routes/admin_support.py`
- Alembic migration
- API tests

Tasks:

- add admin authorization dependency - done
- add `support_ticket_events` - done
- add admin ticket list/filter endpoint - done
- add status update endpoint - done
- add operator reply endpoint - done
- add internal note endpoint - open
- add close endpoint - open
- block user edits once ticket has staff handling - done

Exit criteria:

- operator can process support/report/deletion tickets without direct DB edits
- every status change writes an event
- user can see appropriate user-visible replies later

### Phase 3 - User blocking and moderation

Status: implemented as MVP moderation foundation. User block APIs, server-side
block enforcement, moderation action storage, admin moderation action intake,
user suspension, and interview post/application/session moderation effects all
exist. Operator queue/history UX, assignment, and appeal handling remain open.

Files likely affected:

- `apps/api/app/models/user.py` or new `models/moderation.py`
- `apps/api/app/schemas/blocks.py`
- `apps/api/app/services/blocks.py`
- `apps/api/app/repositories/blocks.py`
- `apps/api/app/services/chat.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/schemas/support.py`
- `apps/api/app/api/v1/routes/blocks.py`
- `apps/api/app/api/v1/routes/moderation.py`
- Alembic migration
- API tests

Tasks:

- add `user_blocks` - done
- add block/unblock/list APIs - done
- enforce blocks in chat send - done
- enforce blocks in application creation - done
- extend report target type to `chat_message` - done
- add `moderation_actions` - done
- add admin moderation action endpoint - done
- add operator queue/history and appeal workflow detail - open

Exit criteria:

- users can block another user in-app
- blocked users cannot continue messaging
- reports can be processed and audited
- Google Play and App Store UGC report/block requirements have backend support

### Phase 4 - Notifications

Status: implemented and deployed as in-app notification API foundation.
Notification storage plus list/read/read-all APIs are live. Push token
registration, push delivery, and account-deletion status notifications remain
open.

Files likely affected:

- `apps/api/app/models/notification.py`
- `apps/api/app/schemas/notifications.py`
- `apps/api/app/services/notifications.py`
- `apps/api/app/repositories/notifications.py`
- `apps/api/app/api/v1/routes/notifications.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/services/chat.py`
- `apps/api/app/services/sessions.py`
- `apps/api/app/services/support.py`
- Alembic migration
- API tests

Tasks:

- add notification table - done
- add list/read/read-all APIs - done
- create notification on selected/rejected application - done
- create notification on new chat message - done
- create notification on support reply - done
- create notification on account deletion status change - open

Exit criteria:

- mobile notification tab uses real API data
- unread count can be computed from backend
- push notification can be added later without changing event model

### Phase 5 - Interview lifecycle hardening

Status: partially implemented. Post edit/archive/reopen, respondent
withdrawal, session cancel/reschedule, completion, and no-show APIs now have
ownership checks, state guards, audit events, notifications, and focused
tests. Deeper linked post/application/session state-transition rules, no-show
appeal/review, and full state-transition matrices remain open.

Files likely affected:

- `apps/api/app/schemas/interview_posts.py`
- `apps/api/app/services/interview_posts.py`
- `apps/api/app/repositories/interview_posts.py`
- `apps/api/app/api/v1/routes/interview_posts.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/api/v1/routes/applications.py`
- `apps/api/app/services/sessions.py`
- `apps/api/app/api/v1/routes/sessions.py`
- API tests

Tasks:

- add post edit endpoint - done
- add post archive endpoint - done
- add post reopen endpoint - done
- add respondent withdraw endpoint - done
- add session cancel endpoint - done
- add session reschedule endpoint - done
- add state transition tests - partially done for withdrawal and
  cancel/reschedule, and post edit/archive/reopen

Exit criteria:

- user-facing withdrawal and session scheduling actions no longer rely on
  overloaded status patch
- founder-owned edit/archive actions are separated from status patch
- user-facing lifecycle actions have clear ownership and allowed states

### Phase 6 - Readiness and observability

Status: partially implemented and deployed. `GET /api/v1/health/ready` checks
DB connectivity and required configuration presence, deployed public
`/health`, `/api/v1/health`, and `/api/v1/health/ready` are responding with
`status=ok`, and GPU Alembic is at head. Request-id middleware, structured
logging, external provider reachability checks, and GPU/operator log command
documentation remain open.

Files likely affected:

- `apps/api/app/core/logging.py`
- `apps/api/app/core/database.py`
- `apps/api/app/main.py`
- `apps/api/app/api/v1/routes/health.py`
- deployment docs

Tasks:

- add request id middleware
- add structured logging
- add `GET /api/v1/health/ready` - done
- check DB connectivity in readiness endpoint - done
- optionally check Kakao config presence - done for config presence only
- document GPU log commands and health smoke commands
- document reviewer demo account and seed-data readiness for store review -
  partially done

Exit criteria:

- API service health distinguishes process alive from dependency ready
- operations can diagnose common failures without reading raw DB state
- App Review and Play Console reviewers can access live backend features during
  review

### Phase 7 - Store review backend readiness

Status: partially implemented. Reviewer seed and store-review smoke scripts
exist, but live deployed smoke has not run from the GPU host because the GPU
`.env` does not currently expose `SUPABASE_ANON_KEY`, which
`apps/api/scripts/store_review_smoke.py` requires.

Files likely affected:

- `apps/api/app/services/account_deletion.py`
- `apps/api/app/services/blocks.py`
- `apps/api/app/services/moderation.py`
- `apps/api/app/services/support.py`
- `apps/api/app/services/notifications.py`
- `apps/api/app/api/v1/routes/health.py`
- seed/demo data scripts
- privacy/legal docs

Tasks:

- create or document reviewer demo accounts for founder and respondent flows -
  partially done through seed scripts, but official reviewer credentials remain
  open
- seed enough API-backed data for reviewer exploration - partially done through
  demo and single-account reviewer seed scripts
- run account deletion, report, block, support, and location-denial smoke
- confirm no store build points at local mock data
- confirm privacy policy, terms, support, and public deletion URLs are live
- confirm App Store privacy labels and Google Play Data safety answers match
  actual API, SDK, and permission behavior
- review all reward/payment copy to ensure Hypofit does not claim payment
  processing unless payment APIs exist

Exit criteria:

- store reviewer can exercise the MVP loop without private instructions beyond
  demo credentials
- account deletion and support/report paths are real API-backed flows
- UGC report/block paths are enforced server-side
- location and profile-image permission denial paths are usable
- legal/privacy/store declarations match implemented data collection

## Testing Plan

### Unit and route tests

Required:

- account deletion request validation
- public deletion endpoint without auth
- authenticated deletion request
- deactivated user cannot create post/apply/chat
- support admin status changes
- user block/unblock/list
- block enforcement in chat send
- block enforcement in application create
- notification list/read/read-all
- report target type validation
- interview post edit/archive ownership and state guards
- respondent application withdrawal ownership and state guards
- session cancel/reschedule ownership and scheduled-state guards

### Repository integration tests

Current repository integration tests are skipped unless `TEST_DATABASE_URL` is
set.

Required:

- run repository tests against test Postgres before major API deployment
- include migrations in test setup
- verify unique constraints and PostGIS location queries
- verify soft-delete filters

### Deployment smoke tests

After GPU deployment:

- verified on 2026-05-29:
  - `GET /health` -> `status=ok`
  - `GET /api/v1/health` -> `status=ok`
  - `GET /api/v1/health/ready` -> `status=ok`, `database=ok`
  - GPU `alembic current` ->
    `0013_application_session_moderation_status (head)`
- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/health/ready`
- public deletion request dry run against test email
- authenticated `/me` with demo account token
- support ticket create/list
- block/unblock with demo users
- notification list
- interview post edit/archive with demo founder account
- respondent application withdrawal with demo users
- session reschedule/cancel with demo users

### Store review smoke tests

Before Google Play or App Store submission:

Current blocker:

- GPU `.env` currently exposes `SUPABASE_URL` but not `SUPABASE_ANON_KEY`, so
  `apps/api/scripts/store_review_smoke.py` cannot complete deployed Supabase
  password login from the GPU host yet

- reviewer demo account can sign in without team assistance
- reviewer demo account can browse real API-backed interview posts
- respondent flow can apply to an interview and open the resulting chat
- founder flow can create a post and see an application/chat path
- support inquiry can be submitted and listed
- report flow can be submitted for at least one UGC target
- block flow prevents further chat sends from the blocked counterpart
- account deletion request can be started in-app
- public account deletion request URL works outside the installed app
- privacy policy and terms links open from the app
- location permission denial still allows manual region/place search
- profile-image permission denial does not block account use
- notification center handles empty and populated states without relying on
  push permission
- no submitted build surface depends on local mock data unless explicitly
  documented as a review demo mode

## Deployment Plan

Rules:

- deploy backend by git sync to GPU server
- do not manually patch production schema without migration
- avoid Docker assumptions on GPU server
- restart `hypofit-api.service` after code deploy
- check `hypofit-api-reverse-tunnel.service`
- check `hypofit-db-tunnel.service` if DB access fails

Recommended sequence for schema work:

1. commit migration and code together
2. push to GitHub
3. GPU `git pull --ff-only`
4. run Alembic upgrade on GPU
5. restart API service
6. run health and route smoke
7. update active document status

## Open Decisions

- Should public deletion request require email verification before creating an
  operator-visible request?
- Should in-app deletion immediately deactivate the account, or only create a
  review request?
- Should support ticket user-delete remain hard delete for open tickets, or
  become a withdrawal event?
- Who is the first operator identity model: `ADMIN_EMAILS`, `is_admin`, or
  separate `operators` table?
- What exact retention periods apply if Hypofit later handles payments or
  escrow directly?
- Should chat message body be anonymized on account deletion, or retained for
  dispute/moderation evidence with sender anonymized?
- Should `founder` users be allowed to apply as respondents when role is only
  `founder`, or should that require `both`?

## Current Priority

The first implementation foundation is now implemented:

1. account deletion request and deactivation/anonymization foundation
2. support/admin ticket queue and event history
3. durable user block and moderation enforcement
4. notification table and notification APIs
5. respondent withdrawal and session cancel/reschedule lifecycle APIs
6. founder post edit/archive/reopen lifecycle APIs
7. complete/no-show notification and audit consistency
8. public deletion verification endpoint and best-effort profile-image storage
   purge during authenticated deletion
9. user/application/session moderation effects
10. single-account reviewer seed script

The next backend priorities are now launch-hardening tasks:

1. outbound email delivery for public deletion verification and support
   workflow notifications
2. scheduled retention purge job after the legal retention window
3. live store-review smoke execution against the deployed API and reviewer seed
   account, which is currently blocked on the GPU host until
   `SUPABASE_ANON_KEY` is available there
4. readiness verification beyond config presence, including external-provider
   reachability
5. deeper post/application/session state-transition matrix
6. operator runbook detail for support/moderation and deployed smoke flows

Do not spend time on payment, escrow, AI matching, or complex admin UI before
these operational safety APIs and launch-hardening checks are stable.

Google Play remains the first launch target, but the same backend work should be
kept App Store-ready. Account deletion, UGC report/block, privacy policy
accuracy, location consent, reviewer demo access, and payment/reward wording are
shared launch blockers across both stores.
