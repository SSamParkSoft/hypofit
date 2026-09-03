# Hypofit Store Review Data

Status: reference

Last updated: 2026-08-12

## Purpose

Prepare deterministic, API-backed product data for a provider-authenticated
store reviewer. This is not a frontend mock mode and does not create a hidden
email/password login.

## Current Reviewer Account

```text
Provider: Google
Email: hypofit.review@gmail.com
Role: founder and respondent
```

The Google account must already exist in Supabase Auth and must have completed
the normal Hypofit social-login onboarding before the seed runs. The seed does
not know, change, or store the Google password.

Play Console owns the password entered for review access. Keep that account
free of OTP, passkeys, two-step verification, recovery prompts, and location-
dependent access challenges during the review window.

## Seeded Product State

`apps/api/scripts/seed_social_store_review_data.sql` creates or resets only the
deterministic store-review fixture:

- reviewer role `both` plus founder/respondent profiles;
- two reviewer-owned interview posts;
- two applications submitted by the reviewer;
- two applications received by the reviewer;
- four chat rooms with representative open, selected, and completed states;
- scheduled and completed interview sessions;
- read and unread notifications;
- one open and one answered support inquiry;
- two synthetic counterpart profiles that cannot sign in.

Fixture posts use `archived` status. The reviewer can still see posts they own
or applied to through the authenticated visibility rules, while ordinary users
do not receive the fixture in public discovery.

## Run On Lightsail

Copy the SQL to the host and invoke it with the production database URL already
stored in `/opt/hypofit/config/api.env`:

```bash
scp apps/api/scripts/seed_social_store_review_data.sql \
  deploy@54.116.198.195:/tmp/seed_social_store_review_data.sql

ssh deploy@54.116.198.195
DB=$(sed -n 's/^DATABASE_URL=//p' /opt/hypofit/config/api.env)
docker run --rm \
  -v /tmp/seed_social_store_review_data.sql:/seed.sql:ro \
  postgres:16-alpine \
  psql "$DB" \
  -v review_email='hypofit.review@gmail.com' \
  -f /seed.sql
```

The script aborts unless exactly one active `app_users` row matches the supplied
email. It uses one transaction, deterministic UUIDs, and deletes only its own
fixture rows before recreating them. Rerunning it is the supported reset path.

## Verification

After seeding:

1. Sign out and sign in with `hypofit.review@gmail.com` through the Google
   button in the final Android build.
2. Confirm both `내 신청` and `내 모집글` states are populated.
3. Open chat, notifications, support inquiry history, profile/legal links, and
   account deletion without mutating the reviewer account.
4. Confirm a different ordinary account does not see the archived fixture in
   the public interview list or map.
5. Repeat the login on a clean device or browser profile to detect Google
   security challenges before submission.

## Play Console App Access

Use the following values in the restricted app-access declaration:

```text
Name: Google Play Reviewer Account
Username: hypofit.review@gmail.com
Password: enter the Google account password directly in Play Console
```

English access instructions:

```text
Open the app and tap "Continue with Google". Sign in with the reviewer Google
account above. No in-app OTP, subscription, payment, invite code, or location-
based restriction is required. The account has both founder and respondent
roles and contains preloaded interview posts, applications, chats,
notifications, and support history. Location and notification permissions are
optional for the main review flow.
```

Keep the account on the Google OAuth tester allowlist until the production OAuth
consent configuration is approved. Recheck the same instructions in the final
release-signed Android build before every submission.

## Runtime Mock Policy

Runtime frontend mock data remains disabled. Store review and screenshots use
the real mobile app, Spring API, Supabase Auth, and Supabase Postgres path.

## Pre-launch Personal QA Account

`apps/api/scripts/seed_sehyeon_home_test_data.sql` is a separate idempotent
fixture for `sehyeon73@gmail.com`. It does not reuse or delete the store-review
UUID ranges. It creates:

- six open interview posts, including real coordinates around the configured
  Ansan test area;
- four open surveys covering `opened`, `submitted`, and organizer-side
  `confirmed` participation states;
- three open beta-test posts covering applied, selected/chat, and
  organizer-side applicant-review states;
- six applications received by the account, including five applicants on one
  interview with `applied`, `selected`, and `rejected` states, and four
  applications submitted by the account;
- four chat rooms with read/unread messages;
- one future scheduled session;
- four notifications.

Survey rows deliberately use the Google Forms host landing page, not a real
response form. They are for product-state and UI verification only; do not use
them to test actual external-form completion.

The open posts are intentionally public while Hypofit remains pre-launch. Run
the fixture on Lightsail with the production database URL already stored on the
host:

```bash
scp apps/api/scripts/seed_sehyeon_home_test_data.sql \
  deploy@54.116.198.195:/tmp/seed_sehyeon_home_test_data.sql

ssh deploy@54.116.198.195
DB=$(sed -n 's/^DATABASE_URL=//p' /opt/hypofit/config/api.env)
docker run --rm \
  -v /tmp/seed_sehyeon_home_test_data.sql:/seed.sql:ro \
  postgres:16-alpine \
  psql "$DB" \
  -v target_email='sehyeon73@gmail.com' \
  -f /seed.sql
```

Rerunning the command resets only UUID ranges `81*` through `86*` owned by this
fixture. Remove or archive its `82*` interview-post range before real public
traffic starts.
