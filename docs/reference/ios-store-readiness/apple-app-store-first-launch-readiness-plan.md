# Apple App Store First Launch Readiness Plan

Status: reference - parked until Apple App Store work is scheduled

Last updated: 2026-06-01

## Purpose

This document tracks the concrete work required before Hypofit can be submitted
to the Apple App Store as a native iOS app.

Apple App Store release remains a later track than Google Play, but iOS review
requirements affect the product now because account deletion, moderation,
privacy, location, screenshots, and reviewer access are shared launch blockers.

Use this document as the iOS execution plan. Use
`docs/reference/app-store-play-store-review-readiness.md` as the broader
cross-store reference.

## Scope

In scope:

- Expo React Native iOS app under `apps/mobile`.
- App Store Connect submission requirements.
- App Review risk mapping for Hypofit's interview-matching workflow.
- In-app account deletion, report/block, legal/support, privacy, location, and
  reviewer demo flow requirements.
- iOS build, TestFlight, screenshots, metadata, App Privacy, and review notes.

Out of scope:

- Google Play AAB, target API level, closed testing, and Play Console Data
  safety execution. Use `docs/reference/google-play-first-launch-readiness-plan.md`
  and `docs/reference/google-play-data-safety-worksheet.md` for those.
- A thin PWA/WebView-only iOS wrapper. Hypofit's iOS target is the Expo React
  Native app.
- Automated payment, escrow, subscriptions, boosts, or in-app purchases unless
  a separate payment plan is explicitly opened.

## Source Basis

Official sources checked on 2026-05-31:

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- Apple account deletion guidance:
  https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App Privacy Details:
  https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect privacy management:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple upcoming SDK requirements:
  https://developer.apple.com/news/upcoming-requirements/

Important current Apple requirements from those sources:

- Apple App Review Guidelines currently show a last updated date of
  2026-02-06.
- Since 2026-04-28, apps uploaded to App Store Connect must be built with
  Xcode 26 or later using the iOS 26 SDK or later.
- Account-based apps must give App Review full access through a demo account or
  fully featured demo mode.
- Backend services must be live and accessible during review.
- Apps with account creation must allow users to initiate account deletion
  inside the app.
- App privacy answers must cover data collected by the app and by third-party
  partners.
- A privacy policy URL is required in App Store Connect, and the policy must
  also be easily accessible inside the app.
- User-generated content requires filtering/moderation, reporting, blocking,
  and published contact information.
- Location Services may be used only when directly relevant, with consent and a
  clear purpose explanation.
- If third-party/social login is used for the primary account, Apple requires an
  equivalent privacy-preserving login option unless an exception applies.
- TestFlight beta distribution cannot be used to compensate testers.

## Current Hypofit State

### Native iOS App

Current state:

- `apps/mobile` is an Expo React Native app.
- Mobile app navigation is native Expo Router navigation, not a WebView shell.
- The top-level mobile IA includes home, interview discovery, map, chat, and
  profile tabs.
- Auth screens, splash/login, signup, profile, chat, map, interview search, and
  interview detail screens exist.
- NativeWind is the default mobile styling system.

Current App Store implication:

- The old "native wrapper does not exist" gap is no longer accurate.
- The remaining iOS risk is not the lack of a native app, but whether the iOS
  build, metadata, real reviewer flow, backend availability, legal/privacy
  surfaces, and moderation/deletion paths are complete enough for review.

Open:

- [ ] Confirm iOS bundle id in Expo app config.
- [ ] Confirm Apple Developer Program team/account.
- [ ] Confirm EAS iOS build profile and credentials.
- [ ] Produce the first TestFlight-compatible iOS build.
- [ ] Verify the build on a real iPhone, not only simulator.
- [ ] Confirm the build uses Xcode 26 and iOS 26 SDK or later.

### Backend and Public URLs

Current state:

- Public API: `https://hypofit-api.bukae.co.kr`.
- API is deployed through Gabia DNS and Lightsail host Nginx to the Spring
  container.
- Supabase stores durable auth/database/storage state.
- Public web app: `https://hypofit.bukae.co.kr`.
- Public account deletion page:
  `https://hypofit.bukae.co.kr/account-deletion`.
- Public legal routes exist under the web app.

Current App Store implication:

- App Review requires backend services to remain live during review.
- Public legal/support/deletion URLs must return HTTP 200 and must match the
  in-app legal/support/deletion surfaces.

Open:

- [ ] Confirm API readiness endpoint is healthy before submission.
- [ ] Confirm the Lightsail API container and database readiness stay healthy
      during review.
- [ ] Confirm public privacy policy URL.
- [ ] Confirm public terms URL.
- [ ] Confirm public support URL.
- [ ] Confirm public account deletion URL.
- [ ] Document emergency restart commands for review week.

### Authentication and Reviewer Access

Current state:

- Public login uses Supabase-backed Apple, Google, Kakao, and Naver social auth.
- Mobile session persistence is implemented through the mobile auth provider.
- First social login asks the user to select participation role and confirm age/terms.
- The MVP is now treated as a 19+ service.

Current App Store implication:

- Apple allows login-gated apps when login is core to the service, but App
  Review must be able to access the full logged-in workflow.
- The iOS provider set includes Sign in with Apple alongside third-party social
  login methods. Keep Apple available wherever those methods are offered on iOS.

Open:

- [ ] Prepare stable social-review access that does not depend on an employee's
      personal account or interactive second-factor approval.
- [ ] Seed both accounts with realistic posts, applications, chat rooms,
      notifications, and support/report examples.
- [ ] Prepare App Review notes explaining both roles and the exact paths to
      exercise the MVP loop.
- [ ] Verify login, logout, session restore, signup, and email-confirmation
      behavior on the iOS build.

## App Store Review Gate Matrix

### Gate 1: App Completeness

Apple risk:

- Review can reject incomplete apps, crashing apps, placeholder content,
  unreachable backends, unavailable login credentials, or metadata that does
  not reflect actual app behavior.

Hypofit requirement:

- The build submitted to Apple must be a stable app, not an internal prototype
  with visible mock-only labels, broken links, raw API errors, or inaccessible
  data.

Current status:

- Mobile screens are implemented and API-backed across major surfaces.
- Current active docs are limited to mobile auth/session startup hardening and
  Android current-location hardening. Notification, reviewer seed, and
  store-review smoke implementation history is in `docs/completed/`.

Required actions:

- [ ] Remove or hide any reviewer-visible `mock`, debug, placeholder, or
      implementation wording before submission.
- [ ] Run real-device iPhone smoke for:
  - splash/login/signup
  - home feed
  - interview search
  - map and location denial
  - interview detail
  - application submit
  - chat list/thread
  - profile/settings
  - support/report
  - account deletion request
- [ ] Run deployed API smoke with reviewer accounts.
- [ ] Confirm all public URLs in app metadata work.
- [ ] Confirm no screen depends on local-only `.env` values.

### Gate 2: Minimum Functionality and App-Like Experience

Apple risk:

- A simple repackaged website or thin shell can be rejected for not providing
  enough native app value.

Hypofit requirement:

- Submit the Expo React Native app, not a website wrapper.
- App navigation, loading, error, auth, profile, support, and legal flows must
  feel complete without browser affordances.

Current status:

- `apps/mobile` is already the primary iOS/Android app path.
- The web app remains useful for public legal pages and web fallback.

Required actions:

- [ ] Confirm iOS build opens directly into native splash/auth/app shell.
- [ ] Confirm no browser chrome or web wrapper artifacts appear.
- [ ] Confirm bottom tabs, native screen transitions, modals, and permission
      flows are all reachable in the iOS app.
- [ ] Confirm screenshots show app usage, not only splash/login.

### Gate 3: Account Deletion

Apple risk:

- Apps that support account creation must let users initiate deletion from
  inside the app.
- Only offering temporary deactivation is insufficient.
- Requiring users to call, email, or go through a hard-to-find support path can
  fail review for apps that are not highly regulated.

Hypofit requirement:

- Account deletion must be reachable from profile/settings.
- The flow must explain what is deleted, what may be retained, and when the
  request is processed.
- Public deletion path must be direct and must not be buried in generic support.

Current status:

- Mobile profile exposes `계정 삭제`.
- Mobile deletion screen uses dedicated account deletion request APIs.
- Public web account deletion route exists.
- API has public/authenticated deletion request and signed-in
  deactivation/anonymization foundations.
- Current deletion UI verifies a six-digit email code and then requires a
  separate destructive confirmation before anonymization begins.

Open:

- [ ] Confirm public deletion request verification email delivery.
- [ ] Confirm operator runbook for manual verification and completion.
- [ ] Confirm retention/purge policy for user profile, posts, applications,
      chat messages, reports, moderation/audit evidence, and no-show records.
- [ ] Confirm deletion completion notification or email path.
- [ ] Confirm the App Store review notes point to `프로필 > 계정 삭제`.

Submission rule:

- Do not submit to Apple while the only reliable deletion path is generic email.
  In-app deletion request and public direct deletion route must both work.

### Gate 4: User-Generated Content, Chat, Report, and Block

Apple risk:

- Interview posts, profile content, profile images, application answers, and
  chat messages are user-generated content.
- UGC surfaces require moderation/filtering, reporting, blocking, and published
  contact information.

Hypofit requirement:

- Users must be able to report abuse.
- Users must be able to block abusive users.
- Operator must be able to receive and act on reports.
- Terms must describe prohibited behavior.
- No-show reporting must remain separate from abuse reporting.

Current status:

- Support/report APIs exist.
- Chat room reporting exists.
- Profile/counterpart reporting and durable block/unblock controls exist.
- Server-side block enforcement exists for application creation and chat sends.
- Admin moderation action storage/API exists.

Open:

- [ ] Add or confirm report entry from interview detail/post surface.
- [ ] Decide whether individual chat-message reporting is needed before iOS
      submission, or whether room/user reporting is enough for MVP.
- [ ] Add blocked-users management list or document where users can unblock.
- [ ] Complete operator moderation queue/runbook for reports.
- [ ] Confirm profile-image removal path.
- [ ] Confirm terms include prohibited content and enforcement outcomes.

### Gate 5: Privacy Policy and App Privacy Labels

Apple risk:

- App Privacy answers must be accurate for all data the app and third-party
  partners collect.
- A privacy policy URL is required in App Store Connect and must be accessible
  inside the app.
- Privacy policy must explain collection, use, third-party sharing, retention,
  deletion, and consent withdrawal.

Hypofit likely data categories:

- Contact info:
  - email
  - name
  - phone number if entered
- User ID:
  - Supabase user id
  - profile/account id
- User content:
  - interview posts
  - application answers
  - chat messages
  - profile image
  - support and report tickets
- Location:
  - foreground current location when the user uses map or nearby search
  - stored interview location coordinates for offline-capable posts
- Usage/diagnostics:
  - server logs and technical request metadata
  - crash/analytics only if SDKs are added later

Current status:

- Legal content exists in `packages/contracts`.
- Web and mobile legal pages read the same content.
- Google Play Data safety worksheet exists and can be mirrored into App Store
  privacy label planning after platform-specific review.
- App Privacy label draft worksheet now exists at
  `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`.

Open:

- [ ] Verify final iOS SDK list before answering App Privacy.
- [ ] Confirm no analytics, crash reporting, advertising, tracking, or push SDK
      is unintentionally present.
- [ ] Confirm privacy policy covers Supabase, Vercel, API hosting, storage,
      Kakao Local API proxy, profile images, chat, reports, support, account
      deletion, and retention.
- [ ] Confirm privacy contact and operator legal name are final.

### Gate 6: Location Permission

Apple risk:

- Location must be directly relevant to the app feature.
- Users must consent before location collection/use.
- Purpose strings must clearly describe why location is needed.
- Apps should provide alternatives when users decline location where feasible.

Hypofit requirement:

- Use foreground location only.
- Use location for map and nearby interview discovery only.
- Do not require location to access the entire app.
- Allow manual search or non-location browsing when location is denied.

Current status:

- Mobile uses foreground location for map/search flows.
- No background location is intended.
- Map, permission rationale, and privacy/legal copy say background location is
  not used; the profile menu no longer exposes a separate location settings
  page.

Open:

- [ ] Verify iOS `NSLocationWhenInUseUsageDescription` copy in Expo config.
- [ ] Test location allow, deny, and restricted states on real iPhone.
- [ ] Confirm map still works with manual search/list mode when location is
      denied.
- [ ] Confirm App Privacy declares location according to final behavior.

### Gate 7: Photos and Camera

Apple risk:

- Photo/camera access must be purpose-specific and limited.
- The app should not request more access than needed.

Hypofit requirement:

- Use photo library/camera only for profile image changes.
- Do not require profile image upload to use account or core interview flows.

Current status:

- Profile image upload exists.
- Profile-image permission denial does not block account use according to the
  current QA notes.

Open:

- [ ] Verify iOS camera and photo purpose strings.
- [ ] Confirm profile image upload, denial, retry, and removal paths.
- [ ] Confirm privacy policy and App Privacy label cover photos/profile image.

### Gate 8: Payments, Rewards, and In-App Purchase

Apple risk:

- App-only paid features are not part of the MVP.
- The app must not mislead users into thinking Hypofit, Apple, or Google
  processes or guarantees 사례비.

Hypofit requirement:

- Keep MVP wording as `사례비`.
- Treat 사례비 as interview condition information, not as an in-app payment
  product.
- Do not imply Hypofit, Apple, or Google guarantees or processes 사례비.

Current status:

- No payment, escrow, settlement, subscription, boost, credit, or IAP exists.

Open:

- [ ] Audit all Korean UI copy for payment-guarantee wording.
- [x] Audit terms for no-payment/no-guarantee language.

### Gate 9: Age Rating and Minors

Apple risk:

- Age rating answers must be accurate.
- Apps that collect personal information from minors require heightened
  privacy handling.

Hypofit requirement:

- MVP is treated as a 19+ service because it includes meetings, chat, location,
  and 사례비 coordination.
- Do not market the app as for kids or students-only.

Current status:

- Terms/privacy mention 19+.
- Signup role screen includes a 19+ confirmation.

Open:

- [ ] Confirm App Store age-rating questionnaire answers match 19+ positioning.
- [ ] Confirm App Store metadata does not imply the app is for children.
- [ ] Confirm any university-founder copy does not imply minors can use paid
      interview flows.

### Gate 10: TestFlight

Apple risk:

- TestFlight is for beta distribution, not App Store production.
- Apple states TestFlight testers cannot be compensated for testing.

Hypofit requirement:

- Do not pay TestFlight testers as compensation for testing the app.
- If testing real interview workflows, separate product interview 사례비 from
  TestFlight testing compensation and keep the policy conservative.

Open:

- [ ] Prepare TestFlight testing instructions.
- [ ] Use internal team accounts first.
- [ ] Avoid recruiting paid external testers through TestFlight unless legal
      and App Review implications are reviewed.

## iOS Submission Checklist

### Developer Account and Build

- [ ] Apple Developer Program membership active.
- [ ] App Store Connect app record created.
- [ ] Bundle ID finalized.
- [ ] Expo/EAS project linked.
- [ ] iOS credentials/provisioning configured.
- [ ] Build profile uses Xcode 26 and iOS 26 SDK or later.
- [ ] TestFlight build uploaded.
- [ ] Real iPhone smoke passed.

### Metadata

- [ ] App name: `Hypofit`.
- [ ] Subtitle focuses on customer interview matching.
- [ ] Category selected.
- [ ] Age rating answers completed with 19+ positioning in mind.
- [ ] Support URL set.
- [ ] Privacy policy URL set.
- [ ] Account deletion URL ready for review notes if needed.
- [ ] Screenshots show real app flows:
  - home/interview feed
  - map
  - interview detail/application
  - chat list/thread
  - profile/settings/legal/support/account deletion
- [ ] Review notes include:
  - demo founder account
  - demo respondent account
  - how to switch/see role-specific flows
  - how to create a post
  - how to apply
  - how to open chat
  - where to find account deletion
  - where to report/block
  - that 사례비 is coordinated between users and not processed by Apple or
    Hypofit in MVP

### App Privacy

- [ ] App Privacy data categories drafted from actual code and SDKs.
- [ ] Privacy policy URL set in App Store Connect.
- [ ] In-app privacy policy link works.
- [ ] Tracking is not claimed unless ATT and tracking SDK behavior exists.
- [ ] Location, photos/profile image, chat, support/report, account deletion,
      and user-generated content are reflected accurately.

### Functional QA

- [ ] Fresh install opens without white-screen hang.
- [ ] Splash transitions correctly.
- [ ] Login works.
- [ ] Signup works.
- [ ] Session persists after app restart.
- [ ] Logout returns to login.
- [ ] Founder can create an interview post.
- [ ] Respondent can browse, view details, and apply.
- [ ] Applying creates or exposes the expected chat/scheduling path.
- [ ] Chat list and thread work.
- [ ] Report flow works.
- [ ] Block flow works and prevents future blocked interactions.
- [ ] Account deletion request works.
- [ ] Public deletion URL works outside the app.
- [ ] Legal/support pages open.
- [ ] Location allow/deny/manual fallback work.
- [ ] Profile image permission allow/deny works.
- [ ] Backend health remains stable during smoke.

## Current Submission Blockers

Blocking before an Apple App Store submission:

- [ ] iOS build/TestFlight path is not yet verified.
- [ ] Xcode 26/iOS 26 SDK build requirement is not yet verified for the Expo
      iOS build.
- [ ] Apple Developer account/team/bundle ID/App Store Connect record are not
      documented.
- [ ] App Review demo accounts and seeded data are not finalized.
- [ ] Deployed store-review smoke is not fully closed; current API ops notes
      still call out a missing `SUPABASE_ANON_KEY` for the review
      smoke script.
- [ ] Public deletion verification email delivery and deletion operator runbook
      remain open.
- [ ] Retention/purge policy after deletion is not fully operationalized.
- [ ] Operator moderation review queue/runbook remains open.
- [ ] Interview-detail report entry and individual chat-message report decision
      remain open.
- [ ] App Privacy labels are not prepared.
- [ ] App Store screenshots and review notes are not prepared.
- [ ] Real iPhone QA has not been completed.

Not blockers by themselves:

- OS push notification delivery, because current notification work is in-app
  only and the app should not claim push delivery.
- Automated payment/escrow, because the MVP should not claim to process or
  guarantee 사례비.
- iPad-specific design, unless iPad support is enabled for the App Store
  target.

## Recommended Sequence

1. Finish Google Play-first launch work unless the user explicitly pivots to
   iOS first.
2. Keep shared review blockers App Store-ready while doing Android work:
   account deletion, moderation/report/block, legal/privacy, reviewer accounts,
   and backend smoke.
3. Create the Apple Developer/App Store Connect setup.
4. Confirm Expo iOS build can use Xcode 26 and iOS 26 SDK.
5. Upload TestFlight build.
6. Run real-iPhone smoke against deployed API with seeded demo data.
7. Prepare App Privacy labels from the final SDK/data inventory.
8. Prepare screenshots and review notes.
9. Freeze copy around 사례비/payment, 19+ usage, location, support/report, and
   deletion.
10. Submit to App Review only after the checklist above is green.

## Documentation Links

Keep these documents aligned with this plan:

- `docs/reference/ios-store-readiness/apple-developer-account-operations-plan.md`
- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md`
- `docs/completed/api-operations-readiness-plan.md`
- `docs/completed/legal-pages-implementation-plan.md`
- `docs/reference/support-report-flow-plan.md`
- `docs/completed/mobile-api-ui-integration-completion-plan.md`
- `docs/reference/ui-final-qa-checklist.md`
- `docs/service/06-app-surfaces.md`

## Open Decisions

- Apple Developer account owner/team name.
- Whether the first iOS release supports iPhone only or iPhone+iPad.
- Final support email and legal operator name.
- Whether App Store review should get one both-role account or separate founder
  and respondent accounts.
- Whether individual chat-message reporting is required before first iOS
  submission.
- Whether public deletion completion remains manual or gets automated email
  delivery before iOS submission.
- Whether any paid app-only feature will be introduced. If yes, open a separate
  Apple IAP/payment compliance plan before implementation.
