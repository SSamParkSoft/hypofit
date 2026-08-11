# Google Play Launch Readiness Plan

Status: reference

Last updated: 2026-07-12

## Purpose

This document tracks the Android/Google Play release path independently from
the already released iOS `1.0.0` baseline. The goal is to make the current Expo
React Native app acceptable for internal
testing, closed testing, production access, and eventual production release on
Google Play.

If older PWA, responsive-layout, or general store-readiness documents conflict
with this plan, this document is the source of truth for Google Play launch
decisions.

iOS follow-up work remains out of scope for this Android-specific document.

## Current Hypofit State

Mobile app:

- Native app lives in `apps/mobile`.
- Framework: Expo React Native.
- Styling: NativeWind and React Native `style` props.
- Android package id in `apps/mobile/app.config.ts`:
  - `com.contentruck.hypofit`
- App name:
  - `Hypofit`
- Current Expo app config includes:
  - profile image camera/photo permission copy through `expo-image-picker`
  - foreground location permission copy through `expo-location`
  - Google Maps API key wiring through `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `apps/mobile/eas.json` build profiles exist, but Expo project linkage,
  App Signing/keystore setup, and the first production AAB are still
  unverified.

Backend/API:

- FastAPI public API:
  - `https://hypofit-api.bukae.co.kr`
- Current repo/deploy state includes:
  - authenticated/public account deletion request APIs
  - direct authenticated account deactivation/anonymization API
  - admin support ticket list/status/reply APIs
  - durable `user_blocks` API with server-side enforcement for application
    creation and chat message sending
  - moderation action API and moderation-status storage
  - in-app notification table/events plus list/read/read-all APIs
  - readiness endpoint `GET /api/v1/health/ready`
- Supabase is used for auth, database, and profile image storage.
- Kakao Local search is proxied through FastAPI so the Kakao REST API key stays
  backend-only.

Implemented or partially implemented review-relevant flows:

- Login and signup.
- Profile and account information editing.
- Profile image upload.
- Interview post creation and application flow.
- Chat list/thread.
- Support/report inquiry creation and history inside the app.
- Account deletion entry in profile now uses the dedicated authenticated
  `account_deletion_requests` API first and only exposes direct signed-in
  delete/anonymization after explicit confirmation.
- Terms and privacy screens inside the app plus public legal routes in
  `apps/web`.
- Public account deletion web page in `apps/web`, deployed at
  `https://hypofit.bukae.co.kr/account-deletion`.
- Backend in-app notification records/events exist, and the native notification
  surfaces now consume the in-app notification APIs.
- Backend block and moderation foundations exist, and the native app now
  exposes reviewer-visible block/unblock controls from chat counterpart
  profiles.

Not yet sufficient for Google Play production:

- Public account deletion web resource returns HTTP 200 at
  `https://hypofit.bukae.co.kr/account-deletion`; only Play Console URL entry is
  deferred.
- Public privacy policy and account deletion URLs still need final Play Console
  confirmation and final wording review.
- Native and public account deletion use the shared backend deletion service.
- Public deletion verification email and same-email re-registration have been
  verified against the deployed API. The operator runbook is documented in
  `docs/reference/operator-support-moderation-runbook.md`.
- Production deletion redaction/Auth-cleanup dry-runs found no pending cleanup
  candidates on 2026-07-12.
- Data safety has an initial worksheet, but it still needs verification against
  the final Android manifest, AAB, SDK list, and privacy policy.
- Privacy policy needs Google Play-specific details for location, profile
  image, chat, reports, retention, deletion, and subprocessors.
- Native notification tab/settings consume the backend notification API, and
  APNs/FCM delivery plus the push worker are configured. Demo-user routing smoke
  and final Data safety/privacy synchronization remain.
- Backend `user_blocks` enforcement exists, and the native app now exposes a
  durable block/unblock control from chat counterpart profiles, but a
  dedicated blocked-users management list is still open.
- Production AAB build has not been verified in Play Console.
- Reviewer seed data exists and reviewer login was verified on an Android
  emulator. Play App Signing, Play Console authentication, production AAB,
  physical-device smoke, and closed-testing preparation remain open.

## Backend Prerequisite Status

- [x] Public API is deployed at `https://hypofit-api.bukae.co.kr`.
- [x] Public and authenticated account deletion request APIs exist.
- [x] Direct authenticated account deactivation/anonymization endpoint exists.
- [x] Public account deletion web page exists.
- [x] Support/report ticket APIs exist.
- [x] Admin support ticket status/reply APIs exist.
- [x] Durable `user_blocks` APIs exist and are enforced on application creation
      and chat sending.
- [x] Moderation action storage/API exists.
- [x] In-app notification table/events plus list/read/read-all API exist.
- [x] Readiness endpoint `GET /api/v1/health/ready` exists.
- [x] Native app uses the dedicated account deletion request APIs.
- [ ] Public deletion verification email delivery is live.
- [x] Native notification UI consumes backend notification records.
- [x] Native app exposes user block/unblock controls.
- [ ] Account deletion retention/purge follow-up is automated.
- [ ] Reviewer/demo account smoke has been run against the deployed API.

## Official Source Basis

Official sources checked on 2026-05-27:

- Google Play User Data policy:
  https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Data safety form:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play app account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play app access and login credential requirements:
  https://support.google.com/googleplay/android-developer/answer/15748846
- Google Play target API level requirements:
  https://support.google.com/googleplay/android-developer/answer/11926878
- Google Play app testing requirements for new personal developer accounts:
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play content ratings:
  https://support.google.com/googleplay/android-developer/answer/9898843
- Google Play target audience and app content settings:
  https://support.google.com/googleplay/android-developer/answer/9867159
- Google Play sensitive permissions policy:
  https://support.google.com/googleplay/android-developer/answer/9888170
- Android App Bundle requirement:
  https://developer.android.com/guide/app-bundle
- Google Play payments policy:
  https://support.google.com/googleplay/android-developer/answer/10281818

## Launch Principle

Do not submit a build that promises behavior the backend does not actually
support.

For Google Play review, the native app, Play Console declarations, privacy
policy, terms, Data safety form, permissions, and reviewer demo accounts must
all describe the same product.

If a feature is not real yet, either:

- remove it from the release build,
- mark it clearly as unavailable without promising behavior, or
- implement the backend and operator process before submission.

## Google Play Critical Requirements

### 1. Android App Bundle

Requirement:

- New Google Play apps must be published with Android App Bundle (`.aab`).

Hypofit work:

- Use the local Android AAB build path while EAS cloud builds remain disabled
  by repo policy.
- Produce an Android production build locally.
- Confirm the artifact is `.aab`, not only an `.apk`.
- Upload first to internal testing before any wider track.
- Delete uploaded local AAB artifacts after upload and verification unless an
  immediate re-upload requires keeping them.

Expected command direction:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile build:android:local
```

Open work:

- Confirm EAS project setup remains valid for local build credentials and env
  retrieval.
- Confirm Android keystore / Play App Signing plan.
- Confirm the local build profile emits AAB.

### 2. Target API Level

Requirement:

- Standard new apps and updates submitted after the current Google Play target
  API deadline must target Android 15, API level 35, or higher.

Hypofit work:

- Confirm Expo SDK 53 build output targets API 35.
- Verify target SDK in the generated AAB or Play Console bundle explorer.
- Keep Expo SDK upgrades grouped; do not manually drift native dependency
  versions away from Expo compatibility.

Acceptance:

- Play Console does not show target API warning for the uploaded AAB.

### 3. Privacy Policy

Requirement:

- A privacy policy URL is required.
- The URL must be active, public, non-PDF, non-geofenced, and relevant to the
  app.
- The privacy policy must include developer information, privacy contact,
  collected data categories, sharing/processing parties, secure handling,
  retention, and deletion policy.

Hypofit work:

- Create a public privacy policy page for Hypofit.
- Keep the in-app privacy screen aligned with the public page.
- Include `박종인` as the confirmed service provider name.
- Include `contentruck팀` as the team/operator display name where a team label
  is useful.
- Include contact email confirmed for the current launch track:
  - `ssamso8282@gmail.com`
- Do not describe this email as temporary in store-facing copy unless the team
  later confirms a domain support email migration.

Must cover these data categories:

- Account:
  - email
  - Supabase user id
  - auth/session data handled by Supabase
  - role: founder, respondent, both
- Profile:
  - name
  - phone number
  - one-line bio
  - profile image and profile image storage path/url
- Interview workflow:
  - interview posts
  - target respondent descriptions
  - application answers
  - available times
  - selection/rejection status and reason
  - schedule/session/completion/no-show records
- Chat:
  - room metadata
  - messages
  - unread/read state
  - participant identity
- Support/report:
  - inquiry content
  - report content
  - target metadata
  - contact email
- Location:
  - current location used for map and nearby filters
  - interview post place coordinates selected by founders
  - no background location
  - no continuous location history
- Technical:
  - server logs
  - IP/device/network data handled by infrastructure
  - crash/analytics only if later SDKs are added

Infrastructure/subprocessors to disclose where appropriate:

- Supabase for auth, database, and storage.
- Vercel for web hosting if the public legal pages or web app remain connected.
- Hypofit FastAPI server and hosting/tunnel infrastructure.
- Google Maps SDK on Android if used in the native build.
- Kakao Local API through backend place search.

### 4. Data Safety Form

Requirement:

- Data safety must be completed for closed, open, and production tracks.
- It must match the actual app and privacy policy.
- Third-party SDK data collection must also be reflected.

Hypofit work:

- Build a Data safety worksheet before Play Console entry.
- Do not answer from memory at submission time; map every answer to actual code,
  SDK, backend, and privacy policy text.

Likely Data safety declarations:

- Personal info:
  - name
  - email
  - phone number if collected
  - user ids
- Photos/videos:
  - profile image selected or captured by user
- App activity:
  - interview posts
  - applications
  - chat activity
  - support/report activity
- Location:
  - approximate or precise location depending on map SDK behavior and current
    location use
- Messages:
  - chat messages
- Diagnostics:
  - only if crash reporting or analytics SDK is added

Decisions needed:

- Whether profile image is public by design.
- Whether current location is stored or only used transiently.
- Whether support/report data is retained indefinitely for safety.
- Whether chat messages are encrypted only in transit or also at rest through
  provider defaults.

Acceptance:

- Data safety answers, privacy policy, and implemented behavior do not conflict.

### 5. Account Deletion

Requirement:

- If users can create accounts in the app, users must be able to request account
  deletion inside the app and outside the app through a web resource.
- Temporary deactivation does not count as deletion.
- Retained data must be explained if retained for security, fraud prevention,
  dispute, legal, or safety reasons.

Current Hypofit state:

- In-app `계정 삭제` screen exists.
- The native screen now creates an authenticated deletion request first and
  only exposes direct signed-in delete/anonymization after explicit
  confirmation.
- Dedicated backend account deletion routes now exist:
  - `POST /api/v1/account-deletion-requests/me`
  - `POST /api/v1/account-deletion-requests/me/verify`
  - `POST /api/v1/account-deletion-requests/me/resend`
  - `POST /api/v1/account-deletion-requests/me/confirm`
  - `POST /api/v1/account-deletion-requests/public`
  - `POST /api/v1/account-deletion-requests/public/verify`
  - `POST /api/v1/account-deletion-requests/public/resend`
  - `POST /api/v1/account-deletion-requests/public/confirm`
  - `POST /api/v1/account-deletion-requests/me/delete`
- New native and public flows require a six-digit email code followed by a
  separate explicit final confirmation. Verification alone does not delete an
  account.
- `POST /me/delete` remains deprecated only for the already released iOS
  `1.0.0` compatibility window and is not used by the current mobile UI.
- Direct authenticated delete currently deactivates/anonymizes the user and
  attempts profile image removal from Supabase Storage.
- Public deletion page exists at `https://hypofit.bukae.co.kr/account-deletion`.

Gaps:

- Native app now uses the dedicated authenticated API, but the public web
  request flow is not yet aligned to the same
  `account_deletion_requests` contract.
- Public verification email delivery is still open.
- End-to-end operator workflow is documented in
  `docs/reference/operator-support-moderation-runbook.md`; SLA remains a launch
  policy decision.
- Scheduled purge/retention follow-up after deletion remains open.
- Final privacy policy wording and retained-record windows are not surfaced in
  final public wording yet.

Required MVP implementation:

- Public web page:
  - keep `https://hypofit.bukae.co.kr/account-deletion` live
  - references Hypofit and contentruck
  - works without app installation
  - copy must match the actual backend request/verification flow
  - explains what data is deleted and what may be retained
- In-app delete request:
  - already exists, but it should either migrate to
    `account_deletion_requests` or remain support-ticket based only if the web
    page and privacy policy describe the same process
- Backend/operator workflow:
  - request states and reviewer/operator actions must be documented
  - operator can verify request
  - operator can mark request processed
  - documented service path for direct user delete versus manual operator
    processing

Recommended MVP policy:

- Use deletion request workflow first, not instant destructive deletion.
- Keep direct authenticated delete limited to the signed-in user path and keep
  the public web path request/verification based.
- Delete or anonymize profile fields and auth access.
- Retain minimal records needed for abuse, no-show, dispute, or legal purposes.
- Explain retained records clearly in privacy policy.

### 6. App Access for Review

Requirement:

- If app functionality is behind login, Play review must receive valid and
  reusable app access instructions.
- Credentials must work regardless of reviewer location.
- Instructions should be clear and available in English.

Hypofit work:

- Prepare stable reviewer accounts.
- Avoid OTP or expiring password during review.
- Seed enough data so reviewers can inspect:
  - home feed
  - interview search
  - map
  - create interview post
  - apply to interview
  - chat
  - support/report
  - account deletion request

Recommended reviewer accounts:

```text
Founder/respondent demo
Email: review-both@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>
Role: founder and respondent
```

Helper fixture accounts, not submitted unless Play review explicitly asks for
additional credentials:

```text
Founder demo
Email: review-founder@hypofit.demo
Role: founder

Respondent demo
Email: review-respondent@hypofit.demo
Role: respondent
```

Do not reuse personal user accounts as official reviewer credentials.

Seed command:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_ENV=production \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

The official reviewer accounts must be pre-confirmed and must not require email
OTP during Play review.

### 7. Location Permission

Requirement:

- Sensitive permissions must be necessary for current app functionality,
  disclosed, user-consented, and not used for hidden or unimplemented purposes.

Current Hypofit state:

- `expo-location` is used for map and nearby interview filters.
- Permission copy says current location is used to show nearby interviews.
- Background location is not used.

Required before submission:

- Ensure the app requests location only when entering a feature that needs it:
  - map tab
  - nearby radius filter
- Keep in-app explanation before or near the system permission request.
- Do not add background location.
- Do not claim continuous tracking.
- Privacy policy must say current location is used only for nearby discovery
  unless product changes.

Acceptance:

- Reviewer can deny location and still use non-location parts of the app.
- Denied location state is not broken or blank.

### 8. Photo and Camera Permissions

Requirement:

- Photo/camera access must be tied to a clear user-facing function.

Current Hypofit state:

- `expo-image-picker` is used for profile image capture/selection.
- Permission copy exists in `app.config.ts`.
- Profile image is uploaded to Supabase Storage bucket `profileimage`.

Required before submission:

- Confirm Android 13+ photo permission behavior in actual build.
- Privacy policy must explain profile image storage and visibility.
- Data safety must include photo/profile image collection.
- Terms or profile copy should explain that profile images are user-provided and
  can be reported if inappropriate.

### 9. UGC, Reports, and Blocking

Hypofit has user-generated content:

- profile names, bios, images
- interview posts
- application answers
- chat messages
- report/support text

Current state:

- Support/report ticket API exists.
- Report entry exists from chat and interview detail surfaces.
- Admin support ticket status/reply API and moderation action API exist.
- Durable `user_blocks` backend exists and is enforced when creating
  applications and sending chat messages.
- Mobile client exposes block/unblock from chat counterpart profiles.

Required before broad Play testing:

- Terms must prohibit:
  - illegal content
  - harassment
  - hate/discrimination
  - sexual harassment
  - fraud/scam
  - privacy-invasive requests
  - spam
- Report flow must persist:
  - reporter id
  - target type
  - target id
  - category
  - body
  - status
  - created timestamp
- Operator review process must exist, even if manual.
- Block user is exposed in the native client from chat counterpart profiles and
  is backed by `user_blocks`.

Recommended MVP:

- Keep report as support-ticket backed.
- Use the existing admin support/moderation APIs as the first operator
  foundation.
- Add a dedicated blocked-users management list later if support/settings needs
  broader control beyond chat counterpart profiles.

### 10. Notifications

Current state:

- Backend notification records, event generation, and list/read/read-all APIs
  exist.
- Native `알림` consumes `/api/v1/notifications`.
- Native push delivery is implemented through `expo-notifications`, APNs, and
  FCM, and the API readiness check reports the providers and worker configured.

Risk:

- A reviewer can see real in-app notification rows, but demo-user data and
  read-state routing still need signed-in smoke.
- Notification copy and deep-link routing still need final release smoke.

Google Play-safe direction:

- Keep the current in-app notification list/read UI.
- Keep push separate from in-app notifications in implementation and policy
  wording.
- Update privacy policy and Data safety before submitting any build that
  includes push token registration.

Recommended first Play path:

- Do not ship push notification claims until real device delivery is verified.
- Either keep the current informational wording or wire real in-app
  notification list/read before submission.
- Do not request notification permission outside the explicit user action or
  high-value workflow moments defined in the native push plan.

### 11. Content Rating and Target Audience

Requirement:

- Complete the content rating questionnaire.
- Declare target audience accurately.

Hypofit recommendation:

- Target adults / older teens only if legally and product-wise intended.
- Do not target children.
- Avoid store listing artwork/copy that makes the app appear child-directed.
- No ads in MVP unless explicitly added.

Likely questionnaire notes:

- No gambling.
- No explicit sexual content.
- No violence.
- User-generated content exists through posts/chat/profiles.
- Users can report content.
- Purchases/payment are not handled by the app in MVP.

Acceptance:

- Content rating is assigned.
- Target audience selection does not trigger Families policy obligations.

### 12. Case Fee Copy

Current Hypofit state:

- The product mentions interview case fees as information in interview posts.
- The app does not process payment, escrow, settlement, subscription, boost,
  credit, or in-app purchase in the MVP.

Google Play implication:

- Do not describe Hypofit as a payment, escrow, settlement, or reward guarantee
  service.
- Do not add external-payment links or paid app features in this milestone.

First Play-safe policy:

- Use `사례비` as interview condition information.
- State only that 사례비 조건은 창업자와 응답자가 인터뷰 전 확인해야 합니다.
- Keep the terms aligned with the actual app behavior: no in-app payment or
  platform-managed settlement.

### 13. Store Listing

Required assets/content:

- App name:
  - `Hypofit`
- Short description.
- Full description.
- App icon.
- Feature graphic.
- Phone screenshots.
- Privacy policy URL.
- Support email.
- App category.
- Tags.
- Target audience.
- Content rating questionnaire.

Hypofit screenshot set should show:

- splash/login is not enough
- home feed
- interview search
- map
- interview detail/application
- chat
- profile/support or account deletion

Copy guidance:

- Do not overclaim payment guarantee.
- Do not claim AI matching if not implemented.
- Do not claim verified identity if not implemented.
- Do not imply background location tracking.
- Do not mention App Store until relevant.

### 14. Closed Testing

Requirement:

- New personal developer accounts may need closed testing before production.
- Current official requirement: at least 12 opted-in testers for the previous
  14 continuous days before applying for production access.

Hypofit work:

- Decide whether the Play Console account is personal or organization.
- If personal/new:
  - recruit at least 12 testers
  - keep them opted in for 14 continuous days
  - collect feedback
  - answer production access questions
- Use internal testing first for team smoke.
- Then closed testing with real Android testers.

Testing checklist:

- login/signup
- profile edit and image upload
- location permission grant/deny
- map marker/list behavior
- interview creation
- interview application
- chat list/thread
- report/inquiry
- account deletion request
- offline/error states
- app cold start and resume

Production access questions to prepare:

- Who is the intended audience?
- What value does the app provide?
- What feedback came from closed testing?
- What changed based on that feedback?
- Why is the app ready for production?
- Expected installs in year one.

### 15. Backend Reliability During Review

Risk:

- Google reviewers must be able to access the app whenever review occurs.
- Hypofit API runs on the school GPU server through reverse tunnel, which may be
  less stable than a managed API host.

Required before submission:

- Confirm API health:
  - `GET https://hypofit-api.bukae.co.kr/api/v1/health`
- Confirm Supabase auth works.
- Confirm reverse tunnel and API service restart commands are documented.
- Confirm demo data exists and survives restart.
- Avoid scheduling review while GPU/server maintenance is likely.

Recommended:

- Add external uptime check for:
  - API health
  - Supabase auth reachability
  - map/place search
- Prepare quick restart runbook:
  - `hypofit-api.service`
  - `hypofit-api-reverse-tunnel.service`
  - `hypofit-db-tunnel.service`

## Release Work Plan

### Phase 1: Policy-Safe MVP Surface

Goal: remove or complete features that create review risk.

Tasks:

- [x] Ship notification MVP as in-app list/read UI backed by backend
      notification APIs.
- [x] Ship block user MVP through native block/unblock controls backed by
      `user_blocks`.
- [x] Keep account deletion request visible in profile.
- [ ] Align terms with UGC, reports, no-show, and case fee limitations.
- [ ] Align privacy policy with actual data and SDKs.
- [x] Align repository guidance with the current Expo mobile release posture.

Acceptance:

- Every visible settings/support/moderation feature has a real backend or clear
  non-promissory state.

### Phase 2: Account Deletion and Data Policy

Goal: satisfy account deletion and data policy requirements.

Tasks:

- [x] Create public account deletion page.
- [x] Add public/authenticated account deletion request APIs and direct
      authenticated delete/anonymization endpoint.
- [ ] Add Play Console-ready account deletion URL.
- [ ] Align native and public request flows to `account_deletion_requests`.
- [ ] Define deletion/anonymization policy.
- [x] Document operator workflow for deletion requests and support-ticket
      fallback in `docs/reference/operator-support-moderation-runbook.md`.
- [ ] Update privacy policy retention/deletion section.
- [ ] Update in-app account deletion copy to match policy.

Acceptance:

- A user can request account deletion from both app and web.
- The chosen release flow matches the backend that the app/web actually use.
- The operator knows exactly how to process the request.
- Retained data categories are disclosed.

### Phase 3: Data Safety Worksheet

Goal: prepare exact Play Console answers.

Tasks:

- [x] Inventory every SDK in `apps/mobile/package.json`.
- [ ] Inventory every permission from generated Android manifest.
- [x] Map all client-side data submission points.
- [x] Map backend persisted tables and Supabase Storage buckets.
- [x] Add backend storage for support ticket events, account deletion requests,
      user blocks, moderation actions, notifications, and audit events.
- [x] Create Data safety answer sheet.
- [ ] Cross-check privacy policy and Data safety for contradictions.

Acceptance:

- Data safety can be entered into Play Console without guessing.

### Phase 4: Android Build Readiness

Goal: produce an uploadable Android build.

Tasks:

- [x] Commit `apps/mobile/eas.json` build profiles.
- [x] Confirm Android package id:
      `com.contentruck.hypofit`.
- [ ] Complete Expo project/EAS linkage and App Signing setup.
- [ ] Configure production env:
      `EXPO_PUBLIC_API_BASE_URL=https://hypofit-api.bukae.co.kr`
- [ ] Configure Google Maps key if `react-native-maps` provider requires it.
- [ ] Build production AAB.
- [ ] Confirm target API 35+.
- [ ] Confirm no debug/dev endpoint is embedded.
- [ ] Upload to internal testing.

Acceptance:

- Play Console accepts the AAB without target API or package errors.

### Phase 5: Reviewer and Demo Data

Goal: make review deterministic.

Tasks:

- [x] Add reviewer/demo seed and deployed smoke scripts.
- [ ] Create reviewer demo accounts.
- [ ] Seed founder/respondent posts, applications, chats, sessions, reports.
- [ ] Write English app-access instructions.
- [ ] Verify credentials from a clean Android install.
- [ ] Keep accounts reusable and not OTP-dependent.

Acceptance:

- Reviewer can see the core product loop within five minutes.

### Phase 6: Closed Testing

Goal: satisfy production access and catch device issues.

Tasks:

- [ ] Decide Play Console account type and whether closed testing requirement
      applies.
- [ ] Prepare tester list or Google Group.
- [ ] Run internal testing first.
- [ ] Run closed testing with enough opted-in testers.
- [ ] Collect feedback and fixes.
- [ ] Prepare production access answers.

Acceptance:

- Closed test satisfies Play Console requirement.
- Feedback is documented and addressed.

### Phase 7: Production Submission

Goal: submit only after policy and workflow are consistent.

Tasks:

- [ ] Complete store listing.
- [ ] Complete App content:
      - privacy policy
      - Data safety
      - app access
      - ads declaration
      - content rating
      - target audience
      - data deletion
      - health declaration if prompted
- [ ] Upload production AAB.
- [ ] Submit for review.
- [ ] Monitor Play Console policy messages.

Acceptance:

- No unresolved App content warnings remain.
- Production release is submitted with stable backend and reviewer access.

## Immediate Next Tasks

Highest priority:

1. Complete Expo project/EAS linkage, App Signing, and the production profile
   already defined in `apps/mobile/eas.json`.
2. Produce internal-testing AAB.
3. Review the generated Android manifest permissions and SDK list from that
   AAB.
4. Finalize public privacy policy and account deletion URLs/copy for Play
   Console.
5. Run signed-in smoke for the real in-app notification list/read UI.
6. Run signed-in smoke for native user block/unblock controls backed by
   `user_blocks`.
7. Prepare reviewer demo accounts and English app-access instructions.
8. Run real-device smoke and deployed store-review smoke against the reviewer
   account.
9. Prepare internal/closed testing.

## Current Risk Register

### High

- Production AAB is still unbuilt/unverified.
- Account deletion still needs final Play Console URL confirmation plus a
  documented operator processing workflow.
- Data safety has an initial worksheet but has not been verified against the
  final Android manifest and production AAB.
- Privacy policy has been expanded for native Google Play data categories but
  still needs public deployment and final legal/operator review.
- Reviewer/demo account creation, real-device smoke, and app-access
  instructions are still open.

### Medium

- Notification UI is now API-backed, but live demo-user routing/read-state
  smoke is still open.
- Native user block/unblock is now exposed from the chat profile modal, but
  real-device smoke and a dedicated blocked-users management list are still
  open.
- API backend relies on GPU server and reverse tunnel during review.
- Google Maps native key and Android build behavior are not yet verified in a
  production AAB.
- Closed-testing timeline may delay launch if using a new personal developer
  account.
- Store screenshots and listing copy are not prepared.

### Low

- App package id is already defined.
- Foreground location and profile-image permission copy exists.
- In-app terms/privacy screens exist.
- Support/report/admin/block/moderation/notification backend foundations exist.

### Notification Scope Update

Current implementation on 2026-07-12:

- Backend creates in-app notification records for applications, chat messages,
  support replies, and session changes.
- Native notification list/read behavior calls `/api/v1/notifications`.
- Push device registration, APNs/FCM provider delivery, and the push worker are
  implemented and enabled in the deployed API environment.
- Notification preferences remain user-controllable from profile settings.

Remaining before Play review:

- Run reviewer-account notification routing/read-state smoke on the final
  Android release artifact.
- Reconcile Data safety, privacy policy, and Android permission declarations
  with the final artifact before submission.

## Definition of Ready for Google Play Internal Testing

- [ ] Production AAB builds successfully.
- [x] API base URL points to `https://hypofit-api.bukae.co.kr`.
- [x] Supabase auth works from the installed Android `1.0.1` build.
- [x] Location permission grant and current-location retry work on the Android
      emulator.
- [ ] Profile image upload works.
- [ ] Reviewer/demo account can exercise core workflow.
- [x] Privacy policy URL exists.
- [x] Public account deletion URL exists and returns HTTP 200.
- [ ] No obvious debug UI or mock labels are visible.

## Definition of Ready for Google Play Production

- [ ] Internal testing passed.
- [ ] Closed testing requirement satisfied if applicable.
- [ ] Public privacy policy URL approved.
- [ ] Public account deletion URL works.
- [ ] Data safety form completed and consistent.
- [ ] App access instructions and demo accounts work.
- [ ] Content rating completed.
- [ ] Target audience completed.
- [ ] AAB target API level accepted.
- [ ] Store listing assets complete.
- [ ] Backend health is stable during review window.
- [x] Support/report/deletion operator workflow is documented.
