# App Store and Google Play Review Readiness

Status: reference

Last updated: 2026-06-01

## Purpose

Hypofit has a React web/PWA implementation and a dedicated Expo React Native
mobile app under `apps/mobile`. Native store distribution should use the Expo
app path for the Apple App Store and Google Play, while the web/PWA remains a
separate web distribution and install fallback.

This document tracks the review, policy, and product-readiness work needed
before submitting the native mobile app to the stores.

Google Play is now the first store target. Use
`docs/reference/google-play-first-launch-readiness-plan.md` as the source of
truth for Android/Play Console execution details.

When Apple App Store work is explicitly in scope, use
`docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
as the starting reference for iOS execution details. Move the relevant iOS
document back into `docs/active/` only when Apple submission work is actually
scheduled.

The current web/PWA deployment remains useful for MVP web distribution and
workflow validation. Native store work must still protect the MVP loop:

```text
founder creates interview post
  -> respondent applies
  -> founder reviews and selects applicant
  -> interview session is scheduled
  -> session is completed or marked no-show
```

## Current Distribution Assumption

Near-term:

- Web remains deployed through Vercel.
- The mobile app lives under `apps/mobile` using Expo React Native.
- PWA install remains a fallback, not the final store submission strategy.
- Public web resources remain important for privacy policy and external account
  deletion requirements.

Future native store path:

- Android: build and submit the Expo React Native app, meeting current Google
  Play target API and policy requirements.
- iOS: build and submit the Expo React Native app with native-feeling
  navigation, login/session handling, stable loading states, account deletion,
  support/report flows, and enough utility beyond opening a URL.

Do not submit the native app until the core workflow is stable enough for a real
reviewer using a demo account.

## Source Basis

Official sources checked on 2026-05-31:

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- Apple App Store Connect privacy management:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple Developer Program enrollment:
  https://developer.apple.com/programs/enroll/
- Apple upcoming SDK requirements:
  https://developer.apple.com/news/upcoming-requirements/
- Google Play Developer Program Policies:
  https://developer.android.com/distribute/play-policies
- Google Play user data policy:
  https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Data safety form:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play account deletion requirements:
  https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play app testing requirements for new personal developer accounts:
  https://support.google.com/googleplay/android-developer/answer/14151465
- Google Play internal, closed, and open testing setup:
  https://support.google.com/googleplay/android-developer/answer/9845334
- Google Play target API level requirement:
  https://developer.android.com/google/play/requirements/target-sdk

## Store-Specific Risk Summary

### Apple App Store

Highest risks for Hypofit:

- Incomplete iOS build/TestFlight/App Store Connect path.
- App submitted with stale SDK/build tooling. Apple currently requires uploads
  to be built with Xcode 26 or later and the iOS 26 SDK or later.
- Reviewer cannot access the logged-in workflow because demo accounts, seed
  data, or review notes are incomplete.
- Backend or API tunnel is unstable during review.
- Account deletion exists in product code but public verification email,
  retention/purge, and operator runbook are not yet fully closed.
- User-generated content moderation exists at the foundation level, but
  operator review workflow, interview-detail reporting, and blocked-user
  management still need completion.
- Incomplete privacy policy, App Privacy labels, support contact, or public
  legal URLs.
- Metadata screenshots show only splash/login instead of real app usage.
- Payment/case-fee wording implies Apple, Google, or Hypofit processes or
  guarantees 사례비.

Apple-specific implications:

- Submit the Expo React Native app under `apps/mobile`, not a thin WebView or
  repackaged website shell.
- If Hypofit supports account creation, account deletion must be available
  inside the app.
- If Hypofit has interview posts, profiles, applications, or chat messages
  visible to other users, treat the app as having user-generated content.
- User-generated content requires filtering/moderation, report flow, block
  capability, and published contact information.
- Because Hypofit offers third-party social login, keep an equivalent Sign in
  with Apple option available on iOS unless a documented exception applies.
- Paid person-to-person services can use payment methods other than IAP when the
  service is real-time between two people. Hypofit should still avoid implying
  Apple handles interview reward payments.
- TestFlight testers must not be compensated for beta testing.
- Screenshots should show the actual app experience, not only a logo, splash,
  or login page.

### Google Play

Highest risks for Hypofit:

- Missing privacy policy URL or mismatch between privacy policy and Data safety
  answers.
- Missing in-app and web account deletion path.
- Missing moderation/report/block flow for user-generated content and chat.
- Thin WebView/spam classification if the native shell only opens the website
  without clear app value.
- New personal developer account production access delay because Google requires
  a closed test before production access.
- Native Android build targets an outdated API level.

Google-specific implications:

- Every published app must complete the Data safety form, including closed,
  open, and production tracks.
- If account creation exists, users need a readily discoverable in-app path to
  request account deletion and an external web link for deletion requests.
- The current external deletion route is
  `https://hypofit.bukae.co.kr/account-deletion`.
- For new personal developer accounts created after 2023-11-13, production
  access requires a closed test with at least 12 opted-in testers for at least
  the previous 14 continuous days.
- Google may reject production access if testers are not meaningfully engaged.
- New apps and updates currently need to target Android 15, API level 35, or
  higher for standard phone/tablet apps.

## Hypofit Data and Privacy Checklist

The store forms must match actual implementation. Do not guess.

Likely data categories:

- Account data:
  - email
  - password handled by Supabase Auth
  - user id
  - role: founder, respondent, or both
- Profile data:
  - name
  - phone number if collected
  - profile image
  - bio or role-specific fields if added
- Interview workflow data:
  - interview posts
  - target customer description
  - application answers
  - available times
  - selection/rejection status
  - session status
  - completion/no-show records
- Chat data:
  - messages
  - participant identity
  - timestamps
- Location-related data:
  - interview post display location and stored coordinates for offline-capable
    posts
  - one-shot browser current location when the user enters the `지도` tab,
    taps `내 주변 보기`, or enables the `내 근처` interview filter
  - no background location, continuous tracking, or location history storage
    should be introduced without updating this document and the privacy policy
- Device/technical data:
  - IP address and logs through Vercel, Supabase, API server, and hosting stack.
  - Browser storage/session tokens.
  - Crash/analytics data only if an SDK is added.

Required before store submission:

- [ ] Public privacy policy URL.
- [ ] In-app privacy policy link.
- [ ] Public terms URL.
- [ ] Public support/contact URL.
- [ ] Data deletion URL that works without reinstalling the app.
- [ ] In-app account deletion request path.
- [ ] Data retention and deletion policy aligned with actual Supabase data.
- [ ] Supabase/Vercel/API subprocessors or infrastructure providers reflected
      in privacy policy where appropriate.
- [ ] Privacy labels/Data safety answers mapped from actual code and SDKs.

## Account Deletion Requirements

Hypofit supports account creation, so account deletion is required for both
stores.

Minimum implementation:

- Profile settings row: `계정 삭제`
- Confirmation screen:
  - explains what is deleted
  - explains what may be retained for fraud, dispute, no-show, legal, or safety
    reasons
  - requires explicit confirmation
- Backend endpoint:
  - verifies the authenticated user
  - marks account deletion request or deletes allowed user data
  - handles linked profile, applications, chat, and posts according to the data
    retention policy
- Public web deletion page:
  - reachable without app install
  - references Hypofit by name
  - lets a user request deletion by email/form
  - explains expected processing timeline

Open decision:

- Decide whether MVP account deletion is immediate self-service deletion or a
  verified deletion request workflow. A request workflow is acceptable only if
  it is easy to find, works, and clearly explains next steps.

## UGC, Chat, and Abuse Moderation Requirements

Hypofit includes user-generated interview posts, application answers, profile
content, profile images, and chat messages. Treat the app as UGC-enabled.

Required before store submission:

- [ ] Report interview post.
- [x] Report user/profile from chat counterpart profile surfaces.
- [x] Report chat room from chat menus.
- [ ] Report individual chat message if needed for review granularity.
- [ ] Durable block user from future chat/contact.
- [x] Moderation/contact email visible in support page.
- [ ] Clear prohibited behavior in terms.
- [ ] Admin or operator workflow for reviewing reports.
- [ ] No-show reporting separated from abuse reporting.
- [ ] Profile image upload restrictions and removal path.

MVP-safe implementation:

- Add report buttons in profile, chat detail, and interview detail surfaces.
- Store reports in Supabase with reporter id, target type, target id, reason,
  free-text detail, status, and created timestamp.
- Hide blocked users from new chat interactions where feasible.
- Start with manual operator review instead of complex automated moderation.

## Case Fee Copy Review Notes

Hypofit currently uses interview case fees as post information. The app does
not implement payment, escrow, settlement, subscription, boost, credit, or
in-app purchase in the MVP.

Store-safe copy:

- Use `사례비`.
- State only that the founder and respondent should confirm case-fee conditions
  before the interview.
- Do not imply Hypofit guarantees payment.
- Do not imply Apple or Google processes the reward.

## Native App Build Requirements

### Android

Current path:

- Use the Expo React Native app in `apps/mobile`.
- Do not submit a thin PWA/WebView wrapper as the first Google Play target.

Required:

- Android App Bundle.
- Package name fixed once uploaded.
- Target API level 35 or higher under current Google Play requirement.
- App signing configured.
- Store listing screenshots from actual app screens.
- Privacy policy URL and Data safety form.
- Closed testing plan if using a new personal developer account.

### iOS

Current path:

- Use the Expo React Native app in `apps/mobile`.
- Do not submit a simple full-screen WKWebView that only opens
  `hypofit.bukae.co.kr`.
- Keep web/PWA distribution as a fallback and public legal/deletion surface, not
  as the App Store binary strategy.

Required:

- Apple Developer Program membership.
- Bundle ID, signing, provisioning, and App Store Connect app record.
- Xcode 26 / iOS 26 SDK upload requirement verification before submission.
- App Privacy answers.
- Privacy policy URL.
- Review notes with demo account.
- Stable backend availability during review.
- App screenshots showing actual interview discovery, chat, profile, and
  account/settings screens.

App-like requirements for Hypofit:

- Native-feeling splash/loading states.
- No visible browser chrome.
- Deep links or route restoration for key app paths.
- In-app navigation works without relying on browser affordances.
- Login session persists correctly.
- Error states are not raw web/API errors.
- Account deletion and support are reachable from profile/settings.

## Store Metadata Checklist

Prepare before first submission:

- [ ] App name: `Hypofit`
- [ ] Subtitle/short description focused on interview matching.
- [ ] Full description:
  - founder creates paid interview post
  - respondent finds interviews by experience/time/location/reward
  - application opens chat/scheduling flow
  - no promise of guaranteed payment or automated escrow
- [ ] Category decision:
  - likely `Business`, `Productivity`, or similar depending on final store fit.
- [ ] Support URL.
- [ ] Privacy policy URL.
- [ ] Marketing URL, optional.
- [ ] Demo account credentials.
- [ ] Review notes explaining:
  - founder/respondent roles
  - mock/test data if used
  - how to create a post
  - how to apply
  - how chat/session flow works
  - where account deletion is located
  - where reporting/blocking is located
- [ ] Screenshots:
  - splash/login should not be the only screenshots
  - home interview feed
  - interview detail/application
  - chat list/thread
  - profile/settings/legal
  - account deletion/reporting if relevant

## Testing Plan Before Store Submission

### Shared Functional Tests

- [ ] Fresh install opens without a white screen hang.
- [ ] Splash does not trap the user.
- [ ] Login works.
- [ ] Sign-up works with email confirmation behavior documented.
- [ ] Session persists after app restart.
- [ ] Logout works.
- [ ] Account deletion/request path works.
- [ ] Founder can create interview post.
- [ ] Respondent can browse and apply.
- [ ] Chat room is created or visible after application.
- [ ] Report/block path works.
- [ ] Legal/support pages open from profile.
- [ ] API remains available during review.

### Apple Review Preparation

- [ ] Test on a real iPhone, not only simulator.
- [ ] Provide demo account or fully featured demo mode.
- [ ] Ensure backend services and test data stay live during review.
- [ ] Make screenshots show actual app use.
- [ ] Verify the app is not just a thin website wrapper.

### Google Play Preparation

- [ ] Build Android App Bundle.
- [ ] Target Android 15/API 35 or higher.
- [ ] Complete app content questionnaires.
- [ ] Complete Data safety form.
- [ ] Provide privacy policy URL.
- [ ] Provide data deletion URL.
- [ ] If personal developer account is new, prepare 12+ testers and a 14-day
      closed test.
- [ ] Add tester feedback channel.
- [ ] Keep testers meaningfully engaged during closed testing.

## Current Hypofit Gaps

Blocking before app-store submission:

- [ ] Native Expo app exists, but production store builds are not yet confirmed
      for both stores.
- [ ] Google Play AAB and Apple TestFlight/App Store Connect paths are not
      fully verified.
- [ ] Apple Xcode 26 / iOS 26 SDK upload requirement is not verified for the
      first iOS build.
- [ ] Account deletion is implemented at the API/mobile/web-surface level, but
      public deletion verification email, retention/purge follow-up, and
      operator completion runbook remain open.
- [ ] Public data deletion URL exists, but final store metadata and public
      wording review are not confirmed.
- [ ] UGC report/block flow is partially implemented but not complete:
      chat-room reporting, profile/counterpart reporting, durable block APIs,
      and server-side block enforcement exist; interview-detail reporting,
      blocked-user management, no-show/report separation, and moderation review
      workflow remain open.
- [ ] Operator moderation workflow is not confirmed.
- [ ] Store privacy labels/Data safety answers are not prepared.
- [ ] Demo reviewer account is not prepared.
- [ ] Real device native-app QA has not been done.
- [ ] Store screenshots and review notes are not prepared.

Non-blocking for current PWA MVP:

- Native app bundle setup.
- Store account enrollment.
- Store metadata.
- Closed testing.
- Native push notifications.

## Recommended Sequence

1. Finish Google Play-first active work unless the user explicitly pivots to
   iOS first.
2. Keep shared review blockers green while Android work continues: account
   deletion, public deletion URL, legal/privacy, support/report, block,
   moderation, reviewer accounts, and backend smoke.
3. Prepare store privacy/Data safety/App Privacy mapping from actual
   implementation.
4. Build and smoke Android AAB for Google Play.
5. Build and smoke iOS TestFlight build for Apple App Store.
6. Run real-device QA with seeded founder/respondent demo accounts.
7. Prepare screenshots, metadata, review notes, and public URLs.
8. Submit to each store only after its platform-specific checklist is green.

## Open Decisions

- Which developer account type will be used for Google Play: personal or
  organization?
- Whether the first iOS release supports iPhone only or iPhone+iPad.
- Real support email and operator legal name are confirmed for the current
  launch track:
  - `박종인`
  - `ssamso8282@gmail.com`
- Final reward/payment policy before native store release.
- Whether foreground location remains limited to map/nearby interview discovery
  or expands into other workflow areas.
