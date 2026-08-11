# Google Play Data Safety Worksheet

Status: reference

Last updated: 2026-05-31

## Purpose

Prepare the Google Play Data safety form for the Android-first Hypofit launch.

This worksheet must be checked against the final Android AAB, backend schema,
Supabase configuration, and privacy policy before Play Console submission. Do
not treat it as legal advice or as final Play Console answers until the release
build is frozen.

## Current App and SDK Scope

Android app:

- `apps/mobile`
- Expo React Native
- Supabase client
- TanStack Query
- Expo Router
- Expo Location
- Expo Image Picker
- React Native Maps
- NativeWind
- Sentry React Native crash reporting

Backend and storage:

- FastAPI API at `https://hypofit-api.bukae.co.kr`
- Supabase Auth
- Supabase Postgres
- Supabase Storage bucket `profileimage`
- Kakao Local API called server-side through FastAPI
- FastAPI-backed storage now includes support/report tickets, support ticket
  events, account deletion requests, user blocks, moderation actions,
  notifications, and audit events in Supabase Postgres

Current non-goals:

- No ads SDK.
- No analytics SDK intentionally added.
- Sentry crash reporting SDK is being added for TestFlight/release crash
  diagnosis and should be treated as diagnostics collection until removed.
- No background location.
- No automated payment, escrow, subscription, or in-app purchase.
- Native push notification implementation is now in progress with
  `expo-notifications`, APNs, and FCM. Push tokens and notification preference
  data must be included in final Play Console Data safety answers before a build
  containing this feature is submitted.

## Data Collection Inventory

### Personal Info

Collected:

- Email address.
- Name.
- Phone number if the user enters it.
- One-line bio if the user enters it.
- Role: founder, respondent, or both.

Purpose:

- Account creation and login.
- Profile display.
- Interview matching workflow.
- Support and report handling.

Stored in:

- Supabase Auth.
- Supabase Postgres `app_users` and profile-related tables.

Play Data safety likely category:

- Personal info.
- App functionality.
- Account management.

### User IDs and Authentication

Collected/processed:

- Supabase user id.
- Access token/session token.

Purpose:

- Authentication.
- Authorization.
- Linking user-created content to the correct account.

Stored in:

- Supabase Auth.
- App local/session storage as Supabase client state.
- Backend verifies bearer token for protected API calls.

Play Data safety likely category:

- User IDs.
- App functionality.
- Account management.

### Profile Image

Collected:

- User-selected or user-captured profile image.
- Public profile image URL.
- Storage path.

Purpose:

- Profile display in profile/chat/interview-related surfaces.

Stored in:

- Supabase Storage bucket `profileimage`.
- Supabase Postgres user profile fields.

Play Data safety likely category:

- Photos or videos.
- App functionality.

Release notes:

- Confirm whether `profileimage` remains public.
- Privacy policy must state profile images may be visible to other users in
  service contexts.
- Inappropriate profile images must be reportable.

### Location

Collected/processed:

- Current device location when the user uses map or nearby filters.
- Founder-selected interview location:
  - place name
  - address
  - latitude
  - longitude
  - precision flag
  - source flag

Purpose:

- Show nearby interviews.
- Sort/filter interviews by distance.
- Display offline interview meeting area.

Stored in:

- Current location: should be transient request/query input only.
- Founder-selected post location: Supabase Postgres interview post fields.

Play Data safety likely category:

- Location.
- App functionality.

Release notes:

- Do not add background location.
- Confirm Android manifest does not include background location.
- If current location is not stored, Data safety should distinguish transient
  processing from stored interview-post location data.

### User-Generated Content

Collected:

- Interview posts.
- Target respondent descriptions.
- Application answers.
- Available times.
- Chat messages.
- Support inquiries.
- Reports.
- Feedback text.

Purpose:

- Core interview matching workflow.
- Chat coordination.
- Support, safety, and moderation.

Stored in:

- Supabase Postgres through FastAPI.

Play Data safety likely category:

- App activity.
- Messages.
- Other user-generated content.
- App functionality.
- Developer communications.

Release notes:

- Terms must prohibit abusive, fraudulent, discriminatory, harassing, and
  privacy-invasive content.
- Report/moderation path must remain available.
- Backend `user_blocks` enforcement exists, and the native client exposes
  block/unblock from chat counterpart profile surfaces. A dedicated blocked-user
  management list is still open.

### Interview Workflow Data

Collected:

- Application status.
- Selection/rejection status.
- Rejection reason.
- Session schedule.
- Completion status.
- No-show status.

Purpose:

- Manage the interview lifecycle.
- Resolve disputes and quality issues.

Stored in:

- Supabase Postgres through FastAPI.

Play Data safety likely category:

- App activity.
- App functionality.
- Fraud prevention, security, and compliance if retained for abuse/no-show
  review.

Release notes:

- Retention policy must explain why some records may be retained after account
  deletion.

### Support and Reports

Collected:

- Inquiry/report category.
- Inquiry/report body.
- Contact email.
- Target metadata:
  - user
  - interview post
  - application
  - chat room
  - session
- Reporter user id when authenticated.

Purpose:

- Customer support.
- Safety review.
- Abuse and no-show handling.

Stored in:

- Supabase Postgres `support_tickets` and `support_ticket_events`.

Play Data safety likely category:

- Personal info if contact email is included.
- App activity / other user-generated content.
- Developer communications.
- App functionality.

Release notes:

- Native app already submits real inquiry/report/feedback data to the backend.
- Admin status/reply APIs exist and support visible support-reply notification
  events.
- Final operator workflow/runbook still needs to be documented before
  production.

### Account Deletion Requests

Collected/processed:

- Requester email.
- Requester name on public web requests.
- Authenticated user id for signed-in requests.
- Request reason.
- Verification status and token hash for public verification flow.
- Deactivation/anonymization timestamps and result metadata when direct
  authenticated delete is used.

Purpose:

- Satisfy in-app and public account deletion obligations.
- Verify request ownership for public web deletion requests.
- Record retained-data rationale for safety/dispute/compliance follow-up.

Stored in:

- Supabase Postgres `account_deletion_requests`.
- Supabase Postgres user deactivation/deletion/anonymization fields.
- Best-effort profile image deletion result metadata during direct authenticated
  delete.

Play Data safety likely category:

- Personal info.
- User IDs.
- Account management.
- Fraud prevention, security, and compliance where retained records are
  explained.

Release notes:

- Current native `계정 삭제` screen uses the dedicated authenticated account
  deletion request API first, with direct signed-in delete/anonymization kept
  behind explicit confirmation.
- Dedicated backend account deletion request/verify/direct-delete APIs exist,
  so the release flow must keep the native app, public web page, privacy policy,
  and operator runbook aligned.
- Public verification email delivery and scheduled retention/purge follow-up
  are still open.
- Privacy policy must explain retained interview/support/report/dispute records
  after deletion.

### In-App Notifications

Generated/stored:

- Notification records for new applications.
- Application selection, rejection, and withdrawal events.
- New chat message events.
- Visible support reply events.
- Session reschedule, cancellation, completion, and no-show events.

Purpose:

- Let users check important status changes inside the app.

Stored in:

- Supabase Postgres `notifications`.

Play Data safety likely category:

- Derived from the underlying app activity and message data already disclosed
  above.
- Native push/device-token disclosures are now required for builds that include
  `expo-notifications` and push token registration.

Release notes:

- Backend notification records and read/read-all APIs exist.
- Current native notification screen consumes `/api/v1/notifications`, read,
  and read-all APIs for in-app notifications.
- Do not imply FCM/APNs or device push delivery until the release build has
  passed real token registration and delivery smoke. If the push code ships,
  update the Play Console Data safety form before submission.

### Diagnostics, Logs, and Technical Data

Potentially processed:

- IP address.
- Request logs.
- Device/browser/network metadata.
- API error logs.
- Client crash/error events.
- App version/build, OS/device metadata, stack traces, and startup breadcrumbs.

Purpose:

- Security.
- Debugging.
- Service reliability.

Stored in:

- Vercel/logging infrastructure if web is used.
- FastAPI/GPU server logs.
- Supabase logs.
- Sentry project `hypofit-mobile` if Sentry remains enabled in the release
  build.
- Google Play/Android platform may provide install and device aggregate data.

Play Data safety likely category:

- Device or other IDs only if collected by app/SDK.
- Diagnostics / crash logs if Sentry remains in the release build.

Release notes:

- Before submission, inspect generated Android permissions and included SDKs.
- Declare diagnostics/crash data if Sentry remains in the release build.
- Sentry is configured not to send default PII. The current mobile runtime
  also strips explicit Sentry user context before sending events.

## Data Sharing Inventory

Known service providers:

- Supabase:
  - auth
  - database
  - storage
- FastAPI hosting/runtime:
  - API processing
  - logs
- Google Maps:
  - native map display if used in Android build
- Kakao Local:
  - place search via backend
- Vercel:
  - public web/PWA/legal page hosting if linked from app/store listing

Do not claim:

- Selling personal data.
- Sharing for advertising.
- Background location sharing.
- Payment processing in MVP.
- Push notification delivery.

Need verification:

- Whether Google Maps SDK receives location directly from the native app when
  `showsUserLocation` is enabled.
- Whether any Expo/React Native dependency includes diagnostics by default.

## Permissions Checklist

Expected permissions:

- Foreground location:
  - for map and nearby interview filtering
- Camera:
  - for profile photo capture
- Photo/media access:
  - for profile photo selection
- Internet:
  - for API, Supabase, maps

Should not be present:

- Background location.
- Contacts.
- SMS.
- Call logs.
- Microphone.
- Broad file access / `MANAGE_EXTERNAL_STORAGE`.
- Installed apps inventory / broad package visibility.

Before submission:

- [ ] Generate production Android manifest.
- [ ] Review all permissions.
- [ ] Remove any permission not tied to a current user-facing feature.
- [ ] Ensure app copy and privacy policy explain every sensitive permission.

## Play Console Answer Draft

These are draft directions, not final answers.

### Does the app collect or share user data?

Likely answer:

- Yes.

Reason:

- Hypofit collects account/profile data, profile image, location for nearby
  discovery, user-generated interview/application/chat/support data, and
  account deletion request data.

### Is data encrypted in transit?

Likely answer:

- Yes, if all production endpoints use HTTPS.

Need verification:

- Production mobile API base URL must be `https://hypofit-api.bukae.co.kr`.
- Supabase endpoints use HTTPS.

### Can users request data deletion?

Likely answer:

- Yes, for request-based deletion.

Need verification:

- Public web deletion page currently returns HTTP 200 at
  `https://hypofit.bukae.co.kr/account-deletion`.
- Dedicated backend account deletion request and direct-delete endpoints exist.
- The chosen release flow is consistent across the native app, public web page,
  privacy policy, and operator runbook.

### Is data optional?

Use caution:

- Required for account:
  - email
  - name
  - role
- Optional:
  - phone number
  - profile image
  - one-line bio
- Location:
  - optional for general app use
  - required for map/nearby behavior and offline interview post creation
- Chat/application content:
  - required only when user uses those features.

## Gaps Before Final Data Safety Submission

- [x] Public account deletion URL deployed and reachable.
- [ ] Final Play Console account deletion URL confirmed.
- [ ] Privacy policy updated and publicly hosted with final production wording.
- [ ] Android manifest permissions reviewed from production AAB.
- [ ] Profile image bucket visibility and removal policy confirmed.
- [x] Native notification UI consumes backend in-app notification records and
      does not request push permission.
- [x] Native block-user flow is aligned with backend `user_blocks`
      enforcement.
- [ ] Account deletion mobile flow uses `account_deletion_requests`, but public
      verification email and Play Console final URL still need verification.
- [x] Operator workflow for support/report/deletion/moderation documented in
      `docs/reference/operator-support-moderation-runbook.md`.
- [ ] Final SDK list reviewed after production dependency install/build.
