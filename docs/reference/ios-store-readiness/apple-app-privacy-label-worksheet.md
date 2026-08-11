# Apple App Privacy Label Worksheet

Status: reference - parked until Apple App Store work is scheduled

Last updated: 2026-06-01

## Purpose

Prepare Hypofit's App Store Connect App Privacy answers for the first iOS
submission.

This is a draft worksheet, not legal advice and not final App Store Connect
input. Re-check it against the final iOS build, generated native permissions,
SDK list, backend behavior, privacy policy, and operator runbooks before
submission.

Use this together with:

- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/completed/legal-pages-implementation-plan.md`

## Source Basis

Official Apple sources checked on 2026-05-31:

- App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect privacy management:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/

Apple App Privacy answers generally need to state:

- what data types the app or third-party partners collect
- whether data is linked to the user
- whether data is used for tracking
- why the data is collected
- whether the data is optional or required for feature use

## Current iOS App and SDK Scope

iOS app:

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

Relevant native configuration:

- iOS bundle identifier:
  - `com.contentruck.hypofit`
- iOS tablet support:
  - `supportsTablet: false`
- Sensitive permission plugins:
  - `expo-location`
  - `expo-image-picker`
- Current permission copy:
  - location: `내 주변 인터뷰를 보여드리기 위해 현재 위치를 사용합니다.`
  - camera: `프로필 사진을 촬영하기 위해 카메라를 사용합니다.`
  - photos: `프로필 사진을 선택하기 위해 사진 보관함을 사용합니다.`

Current non-goals:

- No advertising SDK.
- No analytics SDK intentionally added.
- Sentry crash reporting SDK is being added for TestFlight/release crash
  diagnosis and should be treated as diagnostics collection until removed.
- No AppTrackingTransparency flow.
- No background location.
- Native push notification implementation is now in progress with
  `expo-notifications`, APNs device tokens, and FCM tokens. App Privacy answers
  must be rechecked before submitting a build that includes this code.
- No automated payment, escrow, subscription, boost, or in-app purchase.

## App Privacy Summary Draft

Likely high-level App Store Connect direction:

- The app collects data.
- Data is linked to the user's identity for account, profile, interview,
  application, chat, support, moderation, and account deletion workflows.
- The app does not use data for tracking in the current MVP.
- The app does not share data with advertising networks.
- The app processes current location for map/nearby discovery and stores
  founder-selected interview place coordinates for offline-capable interview
  posts.
- The app collects user-generated content including posts, applications, chat,
  support inquiries, reports, and profile images.

Final answer must be reviewed after:

- [ ] final iOS production build is generated
- [ ] final iOS SDK/dependency list is reviewed
- [ ] final privacy policy URL and wording are frozen
- [ ] Supabase/Vercel/API/Kakao processing language is confirmed
- [ ] location logging behavior is confirmed for query-string lat/lng values

## Data Type Matrix

### Contact Info

Likely App Privacy data types:

- Email Address
- Name
- Phone Number, if entered by the user

Collected from:

- Supabase Auth social identity and provider-returned email, when available.
- `app_users` profile fields.
- Support/report/account deletion contact forms.

Linked to user:

- Yes.

Used for tracking:

- No.

Purposes:

- App Functionality
- Account Management
- Developer Communications
- Safety / moderation follow-up where tied to reports or deletion requests

Required or optional:

- Email is required for account login.
- Name is required or expected for profile/account use depending on signup
  policy.
- Phone number is optional if the user enters it.

Notes before submission:

- Confirm whether phone number is actually required anywhere in the iOS flow.
- Confirm public support/deletion forms do not collect unnecessary extra contact
  fields.

### User ID and Authentication Identifiers

Likely App Privacy data types:

- User ID

Collected/processed:

- Supabase user id.
- App user id.
- Session/access token.

Linked to user:

- Yes.

Used for tracking:

- No.

Purposes:

- App Functionality
- Account Management
- Fraud Prevention, Security, and Compliance

Required or optional:

- Required for logged-in features.

Notes before submission:

- Do not expose service-role keys or backend secrets in mobile code.
- Verify token storage is limited to normal Supabase client session handling.

### Photos or Videos

Likely App Privacy data types:

- Photos or Videos

Collected:

- User-selected or user-captured profile image.
- Profile image storage path and public URL.

Linked to user:

- Yes.

Used for tracking:

- No.

Purposes:

- App Functionality

Required or optional:

- Optional. Users can use the account without a profile image.

Notes before submission:

- Confirm Supabase `profileimage` bucket visibility and removal policy.
- Confirm profile image can be reported or removed if abusive.
- Confirm privacy policy says profile images may be visible in profile, chat,
  and interview-related contexts.

### Location

Likely App Privacy data types:

- Precise Location, if the final App Store answer treats latitude/longitude
  current-location queries or stored meeting coordinates as precise location.
- Coarse Location may also be relevant if UI displays a nearby area rather than
  exact address, but stored coordinates currently require conservative review.

Collected/processed:

- Current device location when the user uses the map or nearby interview
  filters.
- Founder-selected interview location:
  - place name
  - address
  - latitude
  - longitude
  - precision flag
  - source flag

Linked to user:

- Current location query:
  - potentially yes if the authenticated API request includes lat/lng query
    parameters and server logs retain request details.
  - final answer depends on log handling and whether lat/lng is retained.
- Founder-selected interview location:
  - yes, because it is tied to a post and founder account.

Used for tracking:

- No.

Purposes:

- App Functionality

Required or optional:

- Optional for general app use.
- Required only for map/nearby discovery or offline interview location
  selection.

Notes before submission:

- Confirm no background location permission is present.
- Confirm current location is not written to a user profile or location history
  table.
- Confirm API logs do or do not store query strings containing lat/lng.
- Confirm manual search/list fallback works when location permission is denied.
- Confirm App Privacy label matches the privacy policy's current-location and
  stored interview-location wording.

### User Content

Likely App Privacy data types:

- Other User Content
- Customer Support

Collected:

- Interview posts.
- Target customer descriptions.
- Application answers.
- Available times.
- Chat messages.
- Support inquiries.
- Reports.
- Feedback text.
- Rejection reasons and session/no-show notes if entered.

Linked to user:

- Yes.

Used for tracking:

- No.

Purposes:

- App Functionality
- Developer Communications
- Fraud Prevention, Security, and Compliance

Required or optional:

- Required only when the user uses the related feature:
  - founder creates a post
  - respondent applies
  - users chat
  - user contacts support
  - user reports abuse

Notes before submission:

- Keep terms clear about prohibited conduct.
- Keep report/block affordances reachable.
- Confirm no-show reporting is separated from abuse reporting.
- Confirm account deletion policy explains which content may be retained for
  safety, dispute, moderation, or legal reasons.

### Search History

Likely App Privacy data type:

- Search History may not need to be declared if search terms are not stored.

Current state:

- Interview search text appears local client-side.
- Kakao place search terms are sent to the FastAPI proxy and Kakao Local API.
- There is no intentional stored search-history feature.

Linked to user:

- Needs verification.

Used for tracking:

- No.

Purposes:

- App Functionality.

Notes before submission:

- Confirm server logs do or do not retain place-search query strings.
- If search terms are logged and retained with user identifiers, add Search
  History to App Privacy.
- If search terms are processed transiently and not retained, document that
  decision here before submission.

### Usage Data

Likely App Privacy data type:

- Product Interaction is not intentionally collected by the app today.

Current state:

- No analytics SDK is intentionally installed.
- Backend does create domain events and audit events for workflow, support,
  report, block, notification, deletion, moderation, and lifecycle actions.

Linked to user:

- Domain/audit events are linked to users.

Used for tracking:

- No.

Purposes:

- App Functionality
- Fraud Prevention, Security, and Compliance
- Developer Communications where support events are involved

Notes before submission:

- App Store Connect wording requires care here. Do not declare generic
  analytics if no analytics SDK exists, but do declare user-linked operational
  events if they fit Apple's data taxonomy.
- Confirm whether App Store Connect's `Other Usage Data` category should be
  selected for audit/workflow events.

### Diagnostics

Likely App Privacy data type:

- Crash Data and Other Diagnostic Data may apply if Sentry remains enabled in
  the final iOS build.
- Performance Data should not be declared unless Sentry performance tracing or
  another performance-monitoring SDK behavior is intentionally enabled.

Current state:

- Sentry crash reporting is being added to `apps/mobile`.
- Sentry receives client crash/error events, app version/build, OS/device
  metadata, stack traces, and Hypofit startup breadcrumbs.
- Sentry is configured not to send default PII. The current mobile runtime also
  strips explicit Sentry user context before sending events.
- API/GPU/Supabase/Vercel may process request logs, IP address, error logs, and
  technical metadata.

Linked to user:

- Server-side API logs may be linkable through auth/user id, request token, IP,
  or timestamps depending on logging configuration.

Used for tracking:

- No.

Purposes:

- App Functionality
- Fraud Prevention, Security, and Compliance
- Developer Communications only when tied to support.

Notes before submission:

- Confirm final iOS build does not include a crash/analytics SDK.
- Confirm API log retention and whether logs include auth identifiers or request
  bodies.
- If a crash/diagnostics SDK is added later, update this worksheet before
  submission.

### Identifiers

Likely App Privacy data types:

- User ID is already covered above.
- Device ID is not intentionally collected today unless a dependency or Apple
  platform service collects it in a way App Privacy requires disclosure.

Current state:

- No ads identifier usage is intended.
- No ATT flow is implemented.
- Push token/device token collection is being implemented for notification
  delivery and must be reflected in final App Privacy answers before release.

Linked to user:

- User ID: yes.
- Device ID: not intentionally collected.

Used for tracking:

- No.

Notes before submission:

- Verify final SDK list for any device identifier collection.
- Do not add push, analytics, ads, or attribution SDKs without updating this
  worksheet and the privacy policy.

### Purchases and Financial Info

Likely App Privacy data types:

- Not collected in current MVP.

Current state:

- No automated payment.
- No escrow.
- No subscription.
- No in-app purchase.
- 사례비 is coordinated between users outside the app's payment processing.

Used for tracking:

- No.

Notes before submission:

- If payment, escrow, subscriptions, boosts, premium listing, or paid app-only
  features are added, open a separate payment/IAP compliance plan and update
  App Privacy before implementation.

## Tracking Answer Draft

Likely answer:

- No, Hypofit does not use data for tracking in the current MVP.

Rationale:

- No advertising SDK is intentionally installed.
- No analytics SDK is intentionally installed.
- No ATT flow is implemented.
- No data broker or cross-app advertising use is intended.

Must remain true:

- Do not add ads, attribution, analytics, or third-party tracking SDKs without
  revisiting App Privacy and ATT.
- Do not share email, user id, device id, location, or user content with third
  parties for advertising or tracking.

## Data Linked to User Draft

Likely linked-to-user categories:

- Contact Info
- User ID
- User Content
- Photos or Videos
- Location, at least for founder-selected interview locations and possibly for
  current-location queries depending on log retention
- Operational/audit events if declared as Usage Data
- Support/report/account deletion data

Likely not linked-to-user:

- None should be claimed without verifying logs and SDK behavior.

## Data Used for Third-Party Advertising Draft

Likely answer:

- No.

Reason:

- No ads SDK or advertising use exists in current scope.

## Data Shared With Third Parties Draft

Use caution:

- Apple App Privacy distinguishes data collection and third-party sharing by
  purpose. Infrastructure processors still need privacy policy disclosure, even
  when they are not advertising/data-broker sharing.

Known processors/providers:

- Supabase:
  - auth
  - database
  - storage
- FastAPI/GPU/EC2 API runtime:
  - API processing and logs
- Vercel:
  - public web, legal, account deletion, support pages
- Kakao Local:
  - place search via backend proxy
- Google Maps / Apple Maps depending on final `react-native-maps` provider:
  - map rendering and possibly location display

Final review:

- [ ] Confirm final iOS map provider and its data handling.
- [ ] Confirm Kakao Local search request payload and logging.
- [ ] Confirm privacy policy processor section is aligned.

## Permission Checklist

Expected iOS permissions:

- Location When In Use:
  - map and nearby interview discovery
- Camera:
  - profile image capture
- Photos:
  - profile image selection

Should not be present:

- Always/background location.
- Contacts.
- Microphone.
- Calendars.
- Reminders.
- Bluetooth.
- Health.
- Motion/fitness.
- Push notifications.
- Tracking/ATT.

Before submission:

- [ ] Generate the iOS native project/build artifacts through EAS or Expo
      prebuild path.
- [ ] Inspect resulting iOS permission strings.
- [ ] Confirm no unexpected sensitive permission appears.
- [ ] Confirm permission denial states are usable in the app.

## Final Review Questions

- [ ] Does App Store Connect need `Precise Location` or `Coarse Location`, or
      both, based on how current-location and interview-place coordinates are
      retained?
- [ ] Are place-search query strings retained in API logs?
- [ ] Are current-location lat/lng query strings retained in API logs?
- [ ] Does `react-native-maps` on iOS use Google Maps or Apple Maps for the
      final build?
- [ ] Does the final iOS binary include any SDK that collects diagnostics,
      analytics, device identifiers, or crash data?
- [ ] Does the profile image bucket remain public at launch?
- [ ] Can users remove or replace profile images?
- [ ] Do support/report/deletion records have a documented retention period?
- [ ] Is the final privacy policy URL live and identical to the in-app privacy
      content?
- [ ] Are all App Privacy answers consistent with the legal text in
      `packages/contracts/src/legal.ts`?

## Current Blockers

- [ ] Final iOS build has not been generated and inspected.
- [ ] App Privacy answers have not been entered or reviewed in App Store
      Connect.
- [ ] Current-location and place-search server log retention is not confirmed.
- [ ] Final map provider data handling is not confirmed.
- [x] Final support email/operator legal name is confirmed for the current
      launch track:
      `박종인`, `ssamso8282@gmail.com`.
- [ ] Public deletion verification email and retention/purge runbook are not
      closed.
- [ ] Privacy policy needs final pre-submission legal/operator review.
