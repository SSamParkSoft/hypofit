# Hypofit Store Review Readiness Audit

Status: completed - dated review audit

Last updated: 2026-06-22

Scope:

- iOS App Store and Google Play first-submission readiness
- Current Expo React Native mobile app, FastAPI API, Vercel public legal pages
- Review-sensitive flows: signup, login, legal consent, account deletion, UGC, report/block, location/photo/camera/push permissions, reviewer access

This is not legal advice. Use it as an engineering and store-submission readiness checkpoint before App Store Connect or Play Console submission.

## Executive Summary

Current status: conditionally ready, not final green.

Hypofit now covers most required review surfaces for an account-based marketplace-style app:

- In-app legal consent is reachable during signup.
- In-app privacy policy and terms links exist.
- Public privacy policy, terms, support, and account-deletion URLs are reachable.
- Account deletion exists in-app and as a public web route.
- User-generated content surfaces have report paths, and chat counterpart blocking exists.
- Camera, photo library, location, push, diagnostics, and account data are documented in code and legal text.
- Reviewer seed account and fixture data exist.
- The audit originally covered the `1.0.0` reviewed/released baseline. Current
  follow-up mobile uploads use `1.0.1` or later with the same bundle/package IDs,
  permission copy, and non-exempt encryption status unless a release-specific
  change updates them.

The current readiness risk is not that the product is fundamentally missing review-critical areas. The main risk is consistency, first-step visibility, and final verification:

- Signup legal links are visible on the mobile role step, but not yet visible before the first account-information submission step.
- Account deletion completes in-app after a destructive confirmation dialog; the public account-deletion page remains available for users who cannot log in.
- App Store metadata, screenshots, and App Privacy labels are still not final submission artifacts.
- Google Play store listing, Data safety, tester/reviewer access, and final AAB checks are still not final submission artifacts.
- App Store Connect App Privacy and Google Play Data safety answers must exactly match actual shipped behavior.
- TestFlight/release build smoke with the reviewer account must pass after the latest navigation, legal, auth, and OTP changes.
- Backend, reverse tunnel, DB tunnel, public legal pages, and reviewer seed data must stay live during review.
- Store metadata, screenshots, review notes, and demo account instructions must be entered with the current no-payment/no-escrow positioning.

Recommended decision:

- Do not submit production review until the final checklist in this document is checked on a release build.
- TestFlight/internal testing submission is acceptable after the current code is built and smoke-tested.
- Before production review, add terms/privacy links to the first signup step and extend the review smoke to cover legal/account-deletion routes.

Review-sensitive gaps found by code/docs audit:

- Mobile signup first step does not show terms/privacy links before requesting an email OTP.
- Store review smoke currently checks API health, login, posts, chat, notifications, and support tickets, but not public legal or account-deletion URLs.
- Mobile report flows cover interview posts, chat rooms, and counterparts; per-message report is not exposed even though backend support schemas can represent message targets.

## Official Criteria Checked

Apple official references checked on 2026-06-22:

- App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy overview: https://developer.apple.com/app-store/app-privacy-details/
- App Store Connect privacy management: https://developer.apple.com/help/app-store-connect/manage-app-privacy/

Google official references checked on 2026-06-22:

- User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- User Generated Content policy: https://support.google.com/googleplay/android-developer/answer/9876937

Relevant policy interpretation:

- Apple expects the submitted app to be complete, stable, metadata-complete, and connected to a live backend. If login is required, a valid demo account must be provided.
- Apple requires accurate privacy disclosures, user-facing privacy policy access, appropriate permission purpose strings, and in-app account deletion when account creation exists.
- Apple UGC requirements include a way to report objectionable content, block abusive users, and contact the developer.
- Google Play requires Data safety answers to be accurate and consistent with the privacy policy and actual SDK/backend behavior.
- Google Play requires in-app and external account deletion paths when account creation exists.
- Google Play UGC surfaces require terms acceptance, objectionable-content rules, in-app reporting, and blocking for user-to-user interactions.

## Current Implementation Evidence

### Legal Consent and Legal Pages

Current implementation:

- Signup role step requires age and legal confirmation before starting.
- The signup consent copy links to in-app terms and privacy screens.
- Signup account step collects name, email, and password before the user sees those legal links.
- Public legal URLs exist:
  - `https://hypofit.bukae.co.kr/legal/privacy`
  - `https://hypofit.bukae.co.kr/legal/terms`
  - `https://hypofit.bukae.co.kr/account-deletion`
  - `https://hypofit.bukae.co.kr/support`
- Public URL header checks returned `HTTP/2 200` on 2026-06-22.

Code evidence:

- `apps/mobile/src/screens/auth/SignUpRoleScreen.tsx`
- `apps/mobile/src/shared/navigation/backNavigation.ts`
- `apps/web/src/app/App.tsx`
- `packages/contracts/src/legal.ts`

Readiness:

- Apple: partial pass. Legal consent exists, but first-step visibility should be improved before production submission.
- Google Play: partial pass. Legal consent exists, but first-step visibility should be improved before production submission.

Residual risk:

- A reviewer may expect terms/privacy access before the first account data submission, not only before final onboarding completion.
- The current public legal URLs are SPA routes returning `index.html`. This is acceptable if the rendered page shows the correct document, but screenshots/manual browser verification should be captured before submission.

### Account Deletion

Current implementation:

- In-app account deletion screen exists under profile.
- In-app deletion now uses a simple confirmation dialog and immediately calls the authenticated deletion endpoint.
- Public account deletion page exists for non-app access.
- Legal text explains deletion, retained dispute/safety records, and support contact.

Code evidence:

- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx`
- `apps/web/src/pages/AccountDeletionPage.tsx`
- `packages/contracts/src/legal.ts`

Readiness:

- Apple: pass, pending release-build smoke. The reviewer can reach an in-app deletion flow that completes after confirmation.
- Google Play: partial pass. The public deletion URL exists, but final Play Console URL entry and email verification behavior must be checked.

Residual risk:

- Do not let the reviewer permanently delete the only reviewer account during review. Review notes should say the deletion flow is visible and usable, but the demo account may be restored if deletion is tested.

### User-Generated Content, Reporting, Blocking

Current implementation:

- Interview post detail has a report entry for other users' posts.
- Chat list and chat thread have report actions.
- Counterpart profile modal supports block/unblock.
- Backend services check active blocks before applications and chat messages.
- Terms define prohibited behavior and moderation actions.

Code evidence:

- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`
- `apps/mobile/src/screens/chat/ChatListScreen.tsx`
- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`
- `apps/mobile/src/screens/chat/CounterpartProfileModal.tsx`
- `apps/api/app/services/blocks.py`
- `apps/api/app/services/applications.py`
- `apps/api/app/services/chat.py`
- `packages/contracts/src/legal.ts`

Readiness:

- Apple: likely pass.
- Google Play: likely pass.

Residual risk:

- Profile report and chat report paths should be smoke-tested in the release build with the reviewer account.
- Moderation is MVP-level. If reviewers inspect operator response deeply, `docs/reference/operator-support-moderation-runbook.md` should match the current admin/support tooling.

### Reviewer Account and Seed Data

Current implementation:

- Reviewer account and seed data are documented in `store-review-demo-seed-summary-2026-06-16.md`.
- Seed includes interview posts, applications, chat rooms, notifications, support tickets, view/read state, and map-visible data.
- The reviewer account is intended to have both founder and interviewer capabilities and not require OTP.

Readiness:

- Apple: pass if entered in App Review notes and the account logs in on TestFlight/release build.
- Google Play: pass if entered in Play Console sign-in instructions.

Residual risk:

- The seed summary contains a real review password. Do not move it into public docs or commit it if this repository is public.
- Run the review-account smoke immediately before submission and again after backend deployment.
- The current smoke script should be extended to verify public legal URLs and account-deletion surfaces.

### Permissions and Privacy Labels

Current implementation:

- Camera and photo library permission copy is configured for profile photos.
- Location permission copy is configured for nearby/map interviews.
- Push notifications are implemented and should be declared.
- Sentry diagnostics, push tokens, chat/support/report contents, profile image, location, name/email, and user identifiers are all privacy-relevant.

Code evidence:

- `apps/mobile/app.config.ts`
- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `packages/contracts/src/legal.ts`

Expected App Privacy / Data safety categories:

- Name: app functionality, linked to user.
- Email address: app functionality and customer support, linked to user.
- Phone number: only declare if actually collected in the current build.
- Precise location: app functionality, linked to user, not used for tracking.
- Approximate location: app functionality, linked to user, not used for tracking.
- Photos or videos: app functionality, linked to user.
- Email or text messages / other user content: app functionality, customer support, safety/moderation, linked to user.
- Customer support: app functionality, linked to user.
- User ID: app functionality, linked to user.
- Crash, performance, diagnostic data: app functionality and analytics if Sentry/diagnostic dashboards are used to improve quality; usually linked depending on Sentry user context.

Readiness:

- Apple: conditionally pass after App Privacy labels are checked against the final build and Sentry configuration.
- Google Play: conditionally pass after Data safety answers are checked against the final build, SDK list, and privacy policy.

Residual risk:

- Do not under-declare diagnostics or location. Reviewers compare privacy labels, permission prompts, SDK behavior, and policy pages.
- If phone number is not collected in the current release, remove it from store declarations.
- App Privacy and Data safety should be treated as blocked until checked against the final IPA/AAB, dependency list, Sentry behavior, push registration, location usage, and legal text.

### Store Metadata, Screenshots, and Review Notes

Current implementation:

- Metadata and screenshot planning documents exist.
- Reviewer account and suggested review-note text exist in the seed summary.
- iOS local build and TestFlight upload paths exist.
- Android local build path exists.

Readiness:

- Apple: not final. App Store Connect metadata, screenshots, App Privacy labels, and final TestFlight/release smoke remain required.
- Google Play: not final. Store listing, screenshots, Data safety, sign-in details, AAB verification, and account testing requirements remain required.

Residual risk:

- Screenshots must be captured from the current app and seeded data, not from older mock states.
- Review notes must clearly say the app currently does not process payments and that case-fee amounts are informational.
- Store listing copy must not overclaim matching, payments, identity verification, or reward guarantees.

### Payments, Case Fees, Rewards

Current implementation:

- The app displays interview case-fee amounts as recruitment information.
- There is no in-app payment, escrow, subscription, or digital goods purchase flow.
- Legal text states Hypofit does not guarantee or process case-fee payment.

Code/legal evidence:

- `packages/contracts/src/legal.ts`

Readiness:

- Apple: likely pass if review notes state no payment is processed in-app.
- Google Play: likely pass if Data safety and store listing do not imply a payment service.

Residual risk:

- Avoid wording that implies Hypofit holds, guarantees, transfers, or settles rewards.
- If payment is added later, store policy, privacy policy, terms, and backend settlement logic must be reviewed again.

### Build, Version, and Runtime

Audited implementation at the time:

- Expo app version was `1.0.0`; follow-up uploads now use `1.0.1` or later.
- iOS bundle ID: `com.contentruck.hypofit`.
- Android package: `com.contentruck.hypofit`.
- iOS non-exempt encryption is declared false.
- Backend API target is `https://hypofit-api.bukae.co.kr`.
- Local build runbook exists.

Code evidence:

- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `docs/reference/mobile-local-build-runbook.md`

Readiness:

- Apple: pending latest local IPA/TestFlight build and real-device smoke.
- Google Play: pending Android AAB build, internal/closed testing path, and Play Console checks.

Residual risk:

- EAS cloud builds are disabled by repo rule until the user explicitly
  re-enables them; use the local build/upload path.
- GPU API and tunnels must remain live for review.

## Platform-Specific Verdict

### Apple App Store

Verdict: medium risk, submit only after P0 fixes and final smoke.

Likely pass areas:

- Login/demo account path exists.
- Legal links and account deletion exist.
- UGC report/block paths exist.
- Permission strings are present.
- No payment processing avoids immediate IAP/financial-flow complexity.

Must finish before submission:

1. Build the latest iOS release/TestFlight artifact from the current code.
2. Log in with the reviewer account on a real iPhone.
3. Add terms/privacy links to the first signup step, or otherwise make legal access visible before account-information submission.
4. Verify signup legal links, login, home, interviews, detail, map, chat, notifications, profile, report, support, terms, privacy, and account deletion.
5. Confirm App Privacy labels match current data collection.
6. Add review notes with:
   - reviewer account
   - backend URL
   - no payment processing
   - location permission purpose
   - account deletion path
7. Upload final screenshots that show the actual app, not mockups.

### Google Play

Verdict: medium risk, acceptable for internal/closed testing after P0 fixes and final smoke.

Likely pass areas:

- Account deletion URL exists.
- UGC report/block paths exist.
- Privacy/terms URLs exist.
- Permissions are purpose-limited.
- Data model supports reviewer demo data.

Must finish before production submission:

1. Build Android AAB from current code.
2. Verify Play Console Data safety answers against the final SDK list.
3. Set privacy policy URL and account deletion URL.
4. Add terms/privacy links to the first signup step.
5. Add sign-in instructions with the single reviewer account.
6. Confirm location, camera, photo, notifications, crash/diagnostic, and user-content declarations match implementation.
7. Complete any Play Console testing requirement that applies to the developer account.

## Final Submission Checklist

Blockers to clear before production review:

- [ ] Latest mobile code is built into a release artifact.
- [ ] Reviewer account login works on the release artifact.
- [ ] Review-account seed data is present and not empty.
- [ ] Public legal URLs render the intended documents in a normal browser.
- [ ] Signup first step exposes terms and privacy links before account data is submitted.
- [ ] In-app signup links open terms and privacy from the consent step.
- [ ] In-app account deletion route is reachable from profile.
- [ ] External account deletion page is reachable.
- [ ] Account deletion confirmation deletes the account and returns to login on the release build.
- [ ] Report button works from interview detail.
- [ ] Report and block work from chat/profile surfaces.
- [ ] Location permission appears once at the right moment and map remains usable if denied.
- [ ] Camera/photo permission appears only when changing profile photo.
- [ ] Push notification permission appears at the intended post-login moment.
- [ ] App Privacy labels are checked against implementation.
- [ ] Google Play Data safety answers are checked against implementation.
- [ ] App Store screenshots and metadata are final.
- [ ] Google Play screenshots and store listing are final.
- [ ] Store listing copy does not imply payment processing or reward guarantees.
- [ ] API health checks pass from outside the local network.
- [ ] GPU API, reverse SSH tunnels, and DB tunnel are monitored during review.

## Priority Fixes

P0 before store review:

- Add terms/privacy links to the first signup step.
- Extend store-review smoke to cover public legal URLs and account-deletion routes.
- Run latest TestFlight/release-build smoke with the reviewer account.
- Confirm public legal/account-deletion URLs render correct content, not just `200`.
- Reconcile App Privacy and Data safety with the final build.
- Keep review seed account active and document review notes in App Store Connect / Play Console.

P1 before broad tester rollout:

- Capture iPhone screenshots with the seeded account.
- Capture Android screenshots after AAB/internal testing build.
- Verify report/block/support flows create operator-visible records.
- Verify Sentry receives release-build errors with sanitized user context.

P2 after first review submission:

- Add a stricter internal release smoke script that verifies legal URLs, account deletion, reviewer login, chat, notifications, support, and report endpoints in one command.
- Add a store-metadata checklist file that mirrors the final App Store Connect and Play Console entries.
