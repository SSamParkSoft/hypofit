# Store Review And Compliance

Status: service-source-of-truth

Last updated: 2026-08-08

## Why This Matters

Hypofit includes account creation, location, profile images, chat, user-generated
content, support/report flows, push notifications, and account deletion. Store
reviewers inspect these as product behavior, not only as policy text.

## Required User-Facing Paths

The app must keep these reachable:

- social login entry,
- terms and privacy policy,
- support/inquiry,
- report problem,
- block user where counterpart interaction exists,
- account deletion,
- notification settings,
- permission rationale,
- logout.

## User-Generated Content

UGC surfaces include:

- profile names/images/bio,
- interview posts,
- application answers,
- chat messages,
- support/report content,
- reviews.

UGC-sensitive features must preserve:

- report,
- block,
- moderation,
- support contact,
- abusive content handling.

## Privacy Labels And Data Safety

Privacy declarations must match implementation. Re-check labels when changing:

- name/email/phone,
- precise or approximate location,
- profile image/camera/photo access,
- chat/support/report content,
- user identifiers,
- diagnostics/crash/performance data,
- push token behavior,
- analytics or tracking SDKs,
- payment behavior.

## Account Deletion

If users can create accounts, they must be able to request/delete accounts in
app and through a public web path where required.

Deletion behavior must align with:

- visible account deactivation/redaction,
- necessary retention,
- same-email re-registration policy,
- public deletion URL,
- privacy policy.

The deletion-confirmation email OTP is a dedicated destructive-action check.
It is not a replacement for removed email/password, signup-email-OTP, or
password-recovery auth.

## Payments And Rewards

The MVP does not implement payment settlement or escrow. Store metadata and UI
copy must not imply that Hypofit guarantees reward payment.

Use language like "사례비 조건" or "약속한 사례비" rather than payment guarantee
language unless a compliant payment flow is actually implemented.

## Permissions

Location:

- needed for map/nearby discovery,
- must have graceful fallback,
- must be reflected in store privacy/data declarations.

Camera/photo:

- needed for profile image upload,
- must have permission copy and privacy declarations.

Push:

- user permission and settings must be respected,
- notification content should be useful and route to relevant screens.

## Reviewer Demo Data

Reviewer accounts should demonstrate the app without requiring real external
coordination. Seeded reviewer data should include representative posts,
applications, chat, notifications, support, and legal/profile paths as needed.
Reviewer notes should describe the enabled provider-based login path and any
tester allowlist, not a hidden email/password fallback.

The current Google Play reviewer is `hypofit.review@gmail.com`, authenticated
through the visible Google button. Its deterministic product fixture is owned
by `apps/api/scripts/seed_social_store_review_data.sql`; operational details are
in `docs/demo-seed.md`.

## Platform-Specific References

- Google Play: `docs/reference/google-play-first-launch-readiness-plan.md`
- Google Play Data safety: `docs/reference/google-play-data-safety-worksheet.md`
- Apple App Store: `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- Apple App Privacy: `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- Store metadata/assets: `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
