# Apple Developer Account and App Store Connect Operations Plan

Status: reference - parked until Apple App Store work is scheduled

Last updated: 2026-06-01

## Purpose

Prepare the Apple Developer Program, App Store Connect, team roles, API keys,
public contact values, and operational ownership needed before Hypofit can be
built, uploaded, tested, and submitted on iOS.

This document is not about app UI or policy content. It covers the account and
operations layer that must exist before `eas build`, `eas submit`, TestFlight,
or App Review can become reliable.

Use together with:

- `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/completed/legal-pages-implementation-plan.md`

## Source Basis

Official Apple sources checked on 2026-05-31:

- Apple Developer Program enrollment:
  https://developer.apple.com/programs/enroll/
- Apple D-U-N-S Number guidance:
  https://developer.apple.com/support/D-U-N-S/
- App Store Connect accounts and roles:
  https://developer.apple.com/help/app-store-connect/manage-your-team/overview-of-accounts-and-roles/
- Apple Developer Program roles:
  https://developer.apple.com/support/roles/
- App Store Connect API:
  https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api

Important Apple implications:

- Apple Developer Program enrollment can be individual or organization.
- Organization enrollment uses the organization's legal entity information and
  D-U-N-S Number for verification.
- The organization name is displayed as the seller name of apps on the App
  Store.
- The person who enrolls is the Account Holder.
- Roles in App Store Connect control access to apps, builds, TestFlight,
  metadata, API keys, users, financial reports, and customer support.
- API keys are generated for App Store Connect automation and must be kept out
  of git.

## Current Hypofit State

Known product/team values:

- Product name:
  - `Hypofit`
- Team/company display name currently used in documents:
  - `contentruck팀`
- Confirmed service provider name:
  - `박종인`
- Confirmed support/privacy email for the current launch track:
  - `ssamso8282@gmail.com`
- iOS bundle identifier:
  - `com.contentruck.hypofit`
- App name in Expo config:
  - `Hypofit`
- iOS target:
  - iPhone only, `supportsTablet: false`

Current blocker:

- No final Apple Developer account/team details are documented.
- No App Store Connect app record details are documented.
- No Apple role/ownership matrix is documented.
- No App Store Connect API key metadata is documented.
- No final public support/privacy contact is documented.

## Account Type Decision

Decision needed:

- [ ] Individual Apple Developer Program account.
- [ ] Organization Apple Developer Program account.

Recommended direction:

- Use an organization account if `contentruck` can be represented as a real
  legal entity with D-U-N-S verification.

Reason:

- Organization enrollment displays the organization name as the App Store seller
  name.
- It is cleaner for team ownership, role delegation, and future handoff.
- It avoids shipping a team product under a single person's personal seller
  name if that is not intended.

If using an individual account:

- The individual account holder's name may be exposed as the seller name.
- App Store Connect users can still be invited, but this is weaker for team
  ownership.
- The legal/support/privacy text must not imply a corporation if the seller is
  actually an individual unless the relationship is clearly explained.

If using an organization account:

- Confirm legal entity name.
- Confirm D-U-N-S Number.
- Confirm legal authority to bind the organization.
- Confirm business address and phone.
- Confirm Account Holder identity and backup owner.

## Legal and Public Identity Alignment

Current confirmed legal/contact values:

- service provider name:
  - `박종인`
- operator/team display name:
  - `contentruck팀`
- support/privacy email:
  - `ssamso8282@gmail.com`

Before App Store submission:

- [ ] Decide final App Store seller name.
- [x] Decide final legal operator/service provider name in terms/privacy
      policy: `박종인`.
- [x] Decide final support/privacy email for the current launch track:
      `ssamso8282@gmail.com`.
- [ ] Ensure App Store seller name, legal pages, support contact, App Review
      contact, and public web URLs do not contradict each other.
- [ ] Ensure confirmed contact values are reflected in:
  - `packages/contracts/src/legal.ts`
  - web env
  - mobile EAS production env
  - App Store Connect support URL/contact fields
  - public support/report/account deletion pages if needed

Rule:

- Ship with `ssamso8282@gmail.com` only while it remains the intentionally
  confirmed public support/privacy contact for the current launch track.

## App Store Connect App Record

Required values:

- [ ] App name:
  - `Hypofit`
- [ ] Primary language.
- [ ] Bundle ID:
  - `com.contentruck.hypofit`
- [ ] SKU.
- [ ] User access decision:
  - all apps access
  - or app-specific access for Hypofit
- [ ] App Store Connect app id, `ascAppId`.
- [ ] Category:
  - initial recommendation: Business
- [ ] Age rating:
  - align with 19+ positioning in legal/signup copy
- [ ] Support URL:
  - likely `https://hypofit.bukae.co.kr/support`
- [ ] Privacy policy URL:
  - likely `https://hypofit.bukae.co.kr/legal/privacy`
- [ ] Marketing URL, optional.

Store identity consistency:

- App Store display name should match Expo app name and screenshots.
- Bundle ID should match `apps/mobile/app.config.ts`.
- App icon and screenshot branding should use `Hypofit`.
- Seller name should match or clearly map to the legal operator identity.

## Team Roles and Access

Minimum roles to decide:

- Account Holder:
  - owns Apple Developer Program membership and legal agreements
  - can transfer Account Holder role
  - must be reachable during launch
- Admin:
  - can manage users and broad App Store Connect setup
  - should not be overused if only build upload is needed
- App Manager:
  - suitable for app metadata, pricing, TestFlight, and submission workflow
  - good day-to-day role for product owner/release manager
- Developer:
  - suitable for builds/certificates depending on permissions
  - useful for engineering access without financial/admin scope
- Customer Support:
  - useful after launch for App Store customer support/review responses if
    needed

Recommended MVP role matrix:

- [ ] Account Holder:
  - one team owner, not a shared login
- [ ] Admin backup:
  - one trusted backup
- [ ] App Manager / Developer:
  - release engineer account
- [ ] Customer Support:
  - support/operator account if App Store review/user support work is separated

Security rules:

- Do not share Apple ID passwords.
- Use named users and roles.
- Keep 2FA reachable by the accountable owner.
- Document who can respond if Apple Review asks a question.
- Document who can rotate App Store Connect API keys.

## Certificates, Identifiers, Profiles, and EAS Credentials

Required before first iOS EAS build:

- [ ] Bundle identifier exists in Apple Developer account:
  - `com.contentruck.hypofit`
- [ ] App Store distribution certificate path is decided:
  - EAS-managed
  - or manually provided
- [ ] Provisioning profile path is decided:
  - EAS-managed
  - or manually provided
- [ ] Push capability remains disabled unless push work is opened.
- [ ] Associated domains/deep links are not enabled unless a deep-link plan is
      opened.
- [ ] Sign in with Apple capability remains disabled unless third-party/social
      login is added.
- [ ] Maps/location/photo/camera permissions are handled through Expo config and
      privacy strings.

Recommended MVP direction:

- Use EAS-managed iOS credentials for the first TestFlight build unless there is
  a clear reason to manually manage certificates and profiles.

Reason:

- It reduces certificate/provisioning complexity during MVP.
- It keeps the critical path focused on validating the build and review flow.

## App Store Connect API Key Operations

Required for EAS Submit automation:

- [ ] App Store Connect API access is available.
- [ ] API key is created with the minimum practical role for build submission.
- [ ] Key ID is stored outside git.
- [ ] Issuer ID is stored outside git.
- [ ] `.p8` private key file is stored outside git.
- [ ] Key owner/rotation owner is documented.
- [ ] Key revocation procedure is documented.

Storage recommendation:

```text
/Users/sehyeon/hypofit-secrets/app-store-connect/AuthKey_<KEY_ID>.p8
```

Do not store API key files under the repository unless the exact path is
git-ignored and the user explicitly chooses that workflow.

If a local path is used in `apps/mobile/eas.json`, keep the `.p8` path stable
and outside git. The example path in the EAS plan is illustrative only.

## Public URL and Contact Ownership

URLs to own before submission:

- Privacy policy:
  - `https://hypofit.bukae.co.kr/legal/privacy`
- Terms:
  - `https://hypofit.bukae.co.kr/legal/terms`
- Support:
  - `https://hypofit.bukae.co.kr/support`
- Account deletion:
  - `https://hypofit.bukae.co.kr/account-deletion`
- API readiness:
  - `https://hypofit-api.bukae.co.kr/api/v1/health/ready`

Operational owner checklist:

- [ ] Who updates legal text?
- [ ] Who updates Vercel env and redeploys web?
- [ ] Who updates EAS production env?
- [ ] Who monitors support inbox?
- [ ] Who handles deletion requests?
- [ ] Who handles abuse reports?
- [ ] Who can restart the Lightsail API container during review?
- [ ] Who responds to App Review messages?

## App Review Response Runbook

Before submission:

- [ ] Decide a primary Apple Review responder.
- [ ] Decide a backup responder.
- [ ] Make sure both can access App Store Connect messages.
- [ ] Keep demo account reset instructions ready.
- [ ] Keep API restart commands ready.
- [ ] Keep public URL health checks ready.
- [ ] Keep a short explanation of 사례비/payment scope ready.
- [ ] Keep account deletion path explanation ready.
- [ ] Keep report/block/moderation path explanation ready.

If Apple asks about login:

- Explain that login is required because posts, applications, chat, support,
  reports, and account deletion are account-tied.
- Provide demo credentials and flow steps from the metadata/review-assets plan.

If Apple asks about payments:

- Explain that Hypofit currently does not process payments, escrow,
  subscriptions, or in-app purchases.
- Explain that 사례비 coordination happens between users outside the app's
  payment processing.

If Apple asks about location:

- Explain that foreground location is used only for nearby interview discovery
  and map display.
- Explain that users can still browse/search without granting location.

If Apple asks about UGC:

- Explain interview posts, applications, chat, profiles, and images are UGC.
- Point to report/block/support paths.
- Explain moderation is operator-reviewed during MVP.

If Apple asks about deletion:

- Point to `프로필 > 계정 삭제`.
- Point to public deletion page:
  `https://hypofit.bukae.co.kr/account-deletion`.
- Explain retained records where required for safety, dispute, no-show,
  moderation, or legal reasons.

## Current Blockers

- [ ] Apple account type decision is open.
- [ ] Organization legal entity/D-U-N-S status is not documented.
- [ ] Account Holder is not documented.
- [ ] Backup Admin is not documented.
- [ ] App Store Connect app record is not created or documented.
- [ ] `ascAppId` is not documented outside git.
- [ ] App Store Connect API key is not created/configured.
- [ ] EAS iOS credentials/provisioning are not verified.
- [ ] Final public support/privacy email is not decided.
- [ ] Final legal operator name is not decided.
- [ ] App Review responder and backup responder are not documented.
- [ ] Review-week API/tunnel restart owner is not documented.

## Documentation Links

Keep aligned with:

- `docs/reference/ios-store-readiness/ios-eas-testflight-build-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/completed/legal-pages-implementation-plan.md`
- `docs/reference/support-report-flow-plan.md`
- `docs/deployment.md`
- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
