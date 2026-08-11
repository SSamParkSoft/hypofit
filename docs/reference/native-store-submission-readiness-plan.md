# Native Store Submission Readiness Plan

Status: reference - release checklist

Last updated: 2026-06-15

## Purpose

Prepare Hypofit for Apple App Store review and Google Play submission from the
current Expo React Native mobile app.

This is the release checklist for native-store submission work. It is not an
active implementation backlog; move concrete code or schema work into
`docs/active/` only when a specific implementation task is reopened.

Current practical conclusion:

- iOS TestFlight/internal testing is usable as the validation path.
- iOS App Store production review should not be submitted until the items in
  this document are closed.
- Google Play internal testing can start after a verified Android AAB upload.
- Google Play production submission should wait until Data safety, account
  deletion URL, reviewer access, and any required closed testing are complete.

## Source Basis

Official references to re-check before final submission:

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect App Privacy:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple upcoming SDK requirements:
  https://developer.apple.com/news/upcoming-requirements/
- Google Play User Data policy:
  https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Data safety form:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play app access and login credential requirements:
  https://support.google.com/googleplay/android-developer/answer/15748846
- Google Play testing requirements:
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play target API level requirements:
  https://developer.android.com/google/play/requirements/target-sdk
- Android App Bundle:
  https://developer.android.com/guide/app-bundle

Repository references:

- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/operator-support-moderation-runbook.md`
- `docs/completed/native-push-notification-apns-fcm-plan.md`
- `docs/completed/legal-pages-implementation-plan.md`
- `docs/reference/api-bluegreen-deployment-runbook.md`

## Current Verified State

Verified locally on 2026-06-15:

- Public privacy policy URL returns HTTP 200:
  - `https://hypofit.bukae.co.kr/legal/privacy`
- Public terms URL returns HTTP 200:
  - `https://hypofit.bukae.co.kr/legal/terms`
- Public account deletion URL returns HTTP 200:
  - `https://hypofit.bukae.co.kr/account-deletion`
- Public API readiness is healthy:
  - `https://hypofit-api.bukae.co.kr/api/v1/health/ready`
- API readiness currently reports:
  - database `ok`
  - Kakao REST key configured
  - Supabase URL configured
  - JWKS configured
  - Resend outbound email configured
  - APNs configured
  - FCM configured
  - push worker enabled

Mobile config state:

- App path: `apps/mobile`
- Expo SDK: 53.x
- React Native: 0.79.x
- iOS bundle id: `com.contentruck.hypofit`
- Android package id: `com.contentruck.hypofit`
- App name: `Hypofit`
- Native architecture is intentionally disabled for the current release:
  - `newArchEnabled: false`
- iOS tablet support is disabled:
  - `supportsTablet: false`
- Sensitive native integrations:
  - `expo-location`
  - `expo-image-picker`
    - camera capture for profile photos
    - photo-library selection for profile photos
  - `expo-notifications`
  - `react-native-maps`
  - `@sentry/react-native`
  - Supabase client

User-facing review-sensitive flows currently exist:

- Email/password signup and login.
- Email OTP signup verification.
- Profile and account information editing.
- Role setting for founder/interviewer behavior.
- Profile image camera/photo-library flow.
- Interview post browsing, creation, detail, application, and management.
- Chat list and chat thread.
- In-app notifications and push notification routing foundation.
- Support inquiry, feedback, and report screens.
- User block/unblock controls from chat counterpart profile surfaces.
- In-app privacy policy and terms screens.
- In-app account deletion request path.
- Public account deletion page.

## Submission Readiness Decision

### iOS

Current readiness:

- TestFlight: ready for continued QA.
- App Store production submission: not ready yet.

Primary blockers:

- Final App Store Connect metadata and screenshots are not frozen.
- App Privacy labels are not confirmed against the final production build.
- Reviewer demo accounts and seeded data are not documented as review notes.
- Latest TestFlight build needs a full real-device smoke pass.
- Support/report/block/account-deletion flows need reviewer-path smoke.
- Case-fee wording must be checked so the app does not imply Hypofit, Apple, or
  Google processes or guarantees interview payments.

### Google Play

Current readiness:

- Internal testing: ready after verified Android AAB build/upload.
- Production submission: not ready yet.

Primary blockers:

- Production Android AAB has not been verified in Play Console.
- Target SDK must be verified from the generated AAB or Play Console.
- Data safety form must be finalized against the actual AAB, SDKs, permissions,
  privacy policy, and backend behavior.
- App access/reviewer account fields must be filled.
- Account deletion URL must be registered and tested in Play Console.
- Closed testing may be required depending on the Play developer account type.

## Launch Scope Rules

Keep the first store submission narrow.

In scope:

- Native mobile app distribution.
- Founder/interviewer MVP workflow.
- Email/password auth and email OTP verification.
- Location-based interview discovery.
- Profile image upload.
- Chat coordination.
- Push notifications for workflow events.
- Support, report, block, account deletion, and legal surfaces.

Out of scope for this submission:

- Payment, escrow, automated settlement, subscriptions, boosts, or in-app
  purchases.
- AI matching.
- Interview recording or transcription.
- Tablet-specific design.
- Marketing push notifications.
- Ads, ad SDKs, or tracking SDKs.

If a screen mentions 사례비, it must describe only the interview reward context
between users. Do not imply that Hypofit currently handles payment collection,
escrow, payment protection, settlement, refund, or dispute payment resolution.

## Cross-Store Critical Checklist

### 1. Release Build Freeze

- [ ] Freeze the mobile code intended for first store submission.
- [ ] Confirm no reviewer-visible `mock`, debug, placeholder, internal-only, or
      implementation wording remains.
- [ ] Confirm `.env`, keys, `.p8`, service accounts, and private credentials are
      not committed.
- [ ] Confirm production API base URL is used:
      `https://hypofit-api.bukae.co.kr`.
- [ ] Confirm Supabase anon key is the only Supabase key exposed in mobile.
- [ ] Confirm service role keys and DB passwords are server-only.
- [ ] Confirm Sentry release/build tags are available for production triage.

Suggested validation:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

### 2. Real-Device Smoke

Run on a real iPhone and at least one Android device or production-like Android
test install.

- [ ] Fresh install opens native splash and auth flow.
- [ ] Signup with a new email sends OTP.
- [ ] OTP verification completes.
- [ ] Login works after app restart.
- [ ] Auto-login/session restore works.
- [ ] Logout returns to auth flow.
- [ ] Profile edit works.
- [ ] Profile image photo-library permission flow works.
- [ ] Profile image camera permission flow works.
- [ ] Location permission request appears only when needed and copy is accurate.
- [ ] Map works with allowed location.
- [ ] Map works with denied location.
- [ ] Interview search and filters work.
- [ ] Interview detail opens from home, interview tab, map, notification, and
      chat where applicable.
- [ ] Respondent can apply to an interview.
- [ ] Applied interview shows the correct applied state.
- [ ] Founder can see applicant/application information.
- [ ] Founder can select or reject applicant.
- [ ] Chat room is created and opens correctly.
- [ ] Chat message send/receive works.
- [ ] Blocking a user prevents further chat/application where intended.
- [ ] Reporting a user/post/chat opens the correct report flow.
- [ ] Support inquiry can be submitted and viewed.
- [ ] Account deletion request can be created.
- [ ] Privacy policy and terms open inside the app.
- [ ] Push notification permission flow appears after authenticated entry.
- [ ] Push notification is received.
- [ ] Tapping push notification routes to the correct screen.
- [ ] App remains stable after cold start from a push notification.

### 3. Public Web Resources

- [x] Privacy policy URL returns HTTP 200.
- [x] Terms URL returns HTTP 200.
- [x] Account deletion URL returns HTTP 200.
- [ ] Confirm all three pages show Hypofit-specific content, not generic
      placeholder content.
- [ ] Confirm provider/operator information:
  - provider name: `박종인`
  - team/operator display name: `contentruck`
  - contact email: `ssamso8282@gmail.com`
- [ ] Confirm no payment or escrow terms are present while payment is not
      implemented.
- [ ] Confirm 19+ policy is consistent across signup, terms, privacy policy,
      and store age-rating answers.

### 4. Backend Review-Week Stability

- [x] Public API readiness endpoint is healthy.
- [x] Blue/green API deployment runbook exists.
- [x] API readiness reports outbound email configured.
- [x] API readiness reports APNs/FCM configured.
- [ ] Prepare a review-week monitoring checklist:
  - API health
  - reverse tunnel status
  - DB tunnel status
  - push worker status
  - Sentry issues
  - support/report inbox
- [ ] Prepare emergency restart commands from
      `docs/reference/api-bluegreen-deployment-runbook.md`.
- [ ] Keep backend live for the whole review period.

### 5. Reviewer Demo Accounts

Create reviewer accounts with predictable flows.

- [ ] Founder demo account.
- [ ] Interviewer/respondent demo account.
- [ ] Optional both-role demo account.
- [ ] Seed realistic interview posts.
- [ ] Seed applications in multiple states:
  - applied
  - selected
  - rejected
  - completed
  - no-show/absence where policy-appropriate
- [ ] Seed chat rooms.
- [ ] Seed notifications.
- [ ] Seed support/report examples only if they help review.
- [ ] Document exact login credentials and reviewer steps in App Store Connect
      and Play Console.

Reviewer note draft should include:

```text
Hypofit is an interview matching app for founders and interview participants.
Please use the founder demo account to create/review applications and the
respondent demo account to browse/apply/chat. The app does not process payments
or escrow interview rewards in this release.
```

## iOS App Store Execution Checklist

### 1. Build and Upload

- [ ] Confirm local iOS build path is used unless the user explicitly re-enables
      EAS cloud builds.
- [ ] Confirm `HYPOFIT_IOS_BUILD_NUMBER` is higher than the latest uploaded
      build.
- [ ] Produce a production IPA through the local build script.
- [ ] Upload the IPA to App Store Connect/TestFlight.
- [ ] Confirm App Store Connect processing completes.
- [ ] Install the exact processed TestFlight build on a real iPhone.
- [ ] Run real-device smoke from this document.

Current build guidance:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
cd apps/mobile
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack bash scripts/eas-local-ios-build.sh
```

Submit an existing local IPA only with an explicit path. Do not use
`eas submit --latest`.

### 2. App Store Connect Metadata

- [ ] App name: `Hypofit`.
- [ ] Subtitle describes interview matching without overclaiming.
- [ ] Description explains:
  - founders can recruit target customers for interviews
  - participants can apply to relevant interviews
  - chat is used for schedule coordination
  - rewards are not processed by Hypofit in this release
- [ ] Keywords prepared.
- [ ] Category selected.
- [ ] Support URL points to a live page or support route.
- [ ] Privacy policy URL points to:
      `https://hypofit.bukae.co.kr/legal/privacy`.
- [ ] Marketing URL only if available and polished.
- [ ] Review contact information uses a reachable operator contact.
- [ ] Review notes include demo accounts and workflow instructions.
- [ ] Age rating answers reflect 19+ policy if that remains the product
      decision.

### 3. Screenshots and Review Assets

- [ ] Capture screenshots from the exact release build or production-equivalent
      build.
- [ ] Include real app surfaces, not only splash/login:
  - home
  - interview discovery
  - interview detail
  - map
  - chat
  - profile/settings
- [ ] Avoid screenshots showing private user data, raw debug state, or mock
      labels.
- [ ] Confirm app icon appears correctly in App Store Connect.

### 4. App Privacy Labels

Use `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
as the worksheet, then fill App Store Connect.

Confirm at least these categories:

- [ ] Contact info:
  - email
  - name
  - phone number if collected
- [ ] User ID:
  - Supabase/app user id
- [ ] Photos or videos:
  - profile image if user uploads or captures one
- [ ] Camera access:
  - profile image capture through the device camera
- [ ] Location:
  - current location for nearby/map
  - founder-selected interview location coordinates
- [ ] User-generated content:
  - interview posts
  - application answers
  - chat messages
  - support inquiries
  - reports
  - feedback
- [ ] Diagnostics:
  - Sentry crash/error diagnostics
- [ ] Push token/device identifiers:
  - APNs token
  - FCM token
- [ ] Confirm data is not used for tracking unless tracking behavior is added
      later.
- [ ] Confirm there is no advertising SDK.

### 5. iOS Review-Sensitive Flow Checks

- [ ] Account deletion is discoverable from profile/settings.
- [ ] Account deletion can be initiated inside the app.
- [ ] Report and block controls are reachable from UGC/chat surfaces.
- [ ] Location permission copy clearly explains nearby interview discovery.
- [ ] Photo/camera permission copy clearly explains profile image use.
- [ ] Notification permission is requested after authenticated entry, not as an
      unrelated first-launch interruption.
- [ ] If social login is added later, evaluate Sign in with Apple requirements.
- [ ] Confirm there is no beta-tester reward language in TestFlight notes.

## Google Play Execution Checklist

### 1. Android Production AAB

- [ ] Confirm `GOOGLE_SERVICES_JSON` points to a readable local
      `google-services.json` outside git.
- [ ] Confirm `HYPOFIT_ANDROID_VERSION_CODE` is set and higher than any
      uploaded Play artifact.
- [ ] Confirm production env includes:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `GOOGLE_SERVICES_JSON`
  - Google Maps API key where required
- [ ] Run Android typecheck/build.
- [ ] Confirm output is `.aab`.
- [ ] Upload to Play Console internal testing.
- [ ] Confirm Play Console accepts the artifact.
- [ ] Confirm target SDK/API level from Play Console bundle explorer.

Suggested command:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
cd apps/mobile
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack bash scripts/eas-local-android-build.sh
```

### 2. Play Console Setup

- [ ] Create or confirm Play Console app.
- [ ] Confirm package name:
      `com.contentruck.hypofit`.
- [ ] Configure app signing.
- [ ] Configure internal testing track.
- [ ] Add internal testers.
- [ ] Upload AAB.
- [ ] Add release notes.
- [ ] Confirm install works from internal testing.

### 3. Google Play Data Safety

Use `docs/reference/google-play-data-safety-worksheet.md` as the worksheet.

Must include:

- [ ] Personal info:
  - email
  - name
  - phone number if collected
  - role
- [ ] User IDs:
  - Supabase user id
  - app user id
- [ ] Photos or videos:
  - profile image
- [ ] Location:
  - current device location
  - founder-selected meeting/post location
- [ ] Messages:
  - chat messages
- [ ] App activity / user-generated content:
  - interview posts
  - applications
  - support/report/feedback
  - status and session records
- [ ] Diagnostics:
  - Sentry crash/error diagnostics
- [ ] Device or other identifiers:
  - push notification tokens where Play categorization requires it
- [ ] Confirm no ads SDK.
- [ ] Confirm no analytics SDK unless added later.
- [ ] Confirm no payment data while payments are not implemented.
- [ ] Confirm data is encrypted in transit.
- [ ] Confirm users can request deletion.

### 4. Play Policy and App Content

- [ ] Privacy policy URL:
      `https://hypofit.bukae.co.kr/legal/privacy`.
- [ ] Account deletion URL:
      `https://hypofit.bukae.co.kr/account-deletion`.
- [ ] App access instructions with demo credentials.
- [ ] Content rating questionnaire.
- [ ] Target audience and content settings.
- [ ] Data safety form.
- [ ] Sensitive permissions review:
  - location
  - camera
  - photos/media
  - notification permission
- [ ] Confirm camera permission is justified only by profile photo capture.
- [ ] Confirm photo/media permission is justified only by profile image
      selection.
- [ ] Confirm no background location permission in final manifest.
- [ ] Confirm no unsupported payment claims.
- [ ] Confirm UGC moderation, report, block, and support paths are described
      consistently.

### 5. Closed Testing

Depending on the developer account type and Google Play requirements:

- [ ] Determine whether production access requires closed testing.
- [ ] If required, prepare at least 12 opted-in testers.
- [ ] Keep closed testing active for at least 14 continuous days if required.
- [ ] Ask testers to exercise:
  - signup/login
  - interview browsing
  - application
  - chat
  - notifications
  - report/support
  - account deletion request path
- [ ] Track crashes and user feedback during the test.
- [ ] Fix critical issues before production access request.

## Privacy and Legal Consistency Checklist

### Current Legal Identity

Store-facing identity currently planned:

- Provider/operator name: `박종인`
- Team/operator label: `contentruck`
- Contact email: `ssamso8282@gmail.com`

Before submission:

- [ ] Confirm App Store Connect seller/legal identity matches the intended
      individual/business setup.
- [ ] Confirm Play Console developer identity matches the intended
      individual/business setup.
- [ ] Confirm legal pages do not claim an incorporated company if the release
      is under an individual/business name that differs.
- [ ] Confirm contact email is reachable and monitored.

### No-Payment Release Wording

Because payment is not implemented:

- [ ] Remove or soften any copy implying in-app payment, escrow, settlement,
      refund, or payment guarantee.
- [ ] Terms should state that Hypofit does not currently process interview
      rewards.
- [ ] App metadata should not list paid services, in-app purchases,
      subscriptions, or payment protection.
- [ ] If paid features are added later, reopen store policy and payment docs.

### 19+ Policy

If the product keeps the 19+ decision:

- [ ] Signup requires 19+ confirmation.
- [ ] Terms state service is for users aged 19 or older.
- [ ] Privacy policy is aligned.
- [ ] Store age-rating answers are aligned.
- [ ] Reviewer notes mention the role of age confirmation only if needed.

## Operational Review Checklist

Before requesting production review:

- [ ] Confirm `hypofit-api.service` is active on GPU.
- [ ] Confirm `hypofit-api-reverse-tunnel.service` is active.
- [ ] Confirm `hypofit-db-tunnel.service` is active if DB tunnel is required.
- [ ] Confirm `hypofit-push-worker.service` is active.
- [ ] Confirm EC2 Nginx points to the active blue/green upstream.
- [ ] Confirm `/api/v1/health/ready` is healthy.
- [ ] Confirm Sentry receives release-build events.
- [ ] Confirm support/report/deletion inboxes are checked daily during review.
- [ ] Prepare rollback command or previous build reference.

Suggested public checks:

```bash
curl -s https://hypofit-api.bukae.co.kr/api/v1/health/ready
curl -I https://hypofit.bukae.co.kr/legal/privacy
curl -I https://hypofit.bukae.co.kr/legal/terms
curl -I https://hypofit.bukae.co.kr/account-deletion
```

## Submission Sequence

### Phase 1: Freeze and Smoke

- [ ] Freeze mobile code.
- [ ] Build iOS release candidate.
- [ ] Build Android release candidate.
- [ ] Run real-device smoke.
- [ ] Fix blockers only.

### Phase 2: Store Console Preparation

- [ ] Fill App Store Connect metadata.
- [ ] Fill App Privacy labels.
- [ ] Upload iOS screenshots.
- [ ] Fill Play Console store listing.
- [ ] Fill Play Console Data safety.
- [ ] Fill Play Console app access.
- [ ] Upload Android screenshots.

### Phase 3: Internal Testing

- [ ] Submit iOS build to TestFlight.
- [ ] Upload Android AAB to Play internal testing.
- [ ] Test demo accounts from installed builds.
- [ ] Verify push, auth, map, chat, and account deletion.

### Phase 4: Production Review

- [ ] Submit iOS App Store review once iOS checklist is closed.
- [ ] Start or complete Google Play closed testing if required.
- [ ] Request Google Play production access/release when the account is eligible.
- [ ] Monitor Sentry, API health, support/report/deletion channels during review.

## Definition of Done

This active document can be moved to `docs/completed/` only when:

- [ ] iOS production review package is either submitted or explicitly deferred
      with all remaining iOS blockers documented elsewhere.
- [ ] Google Play internal testing has a verified AAB upload.
- [ ] Google Play production-readiness blockers are either closed or explicitly
      deferred with a separate active Play production document.
- [ ] App Privacy and Data safety answers are completed from the final build.
- [ ] Public legal/deletion URLs are verified.
- [ ] Reviewer demo credentials and seeded data are documented.
- [ ] Real-device smoke results are recorded.
- [ ] Any docs changed by the release are updated:
  - `docs/reference/google-play-data-safety-worksheet.md`
  - `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
  - `docs/reference/app-store-play-store-review-readiness.md`
  - `docs/reference/operator-support-moderation-runbook.md`
