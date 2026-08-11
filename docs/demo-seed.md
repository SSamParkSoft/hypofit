# Hypofit Demo Seed

Status: reference

Last updated: 2026-08-11

This document describes legacy demo seed data and the current store-review seed
data used instead of frontend mock data.

## Purpose

Seed Supabase Auth and Supabase Postgres with test accounts and connected MVP
data so clients can be tested through the canonical Spring API.

Do not use the legacy demo accounts for production users. Supply a temporary
password through `DEMO_PASSWORD`; it must follow the same 8-character,
English-letter, and special-character policy as the clients and Supabase Auth.
Public production/review data should use the store-review seed flow below.

## Current Production/Review Policy

- Runtime frontend mock data should stay disabled.
- General users should not see old broad demo posts in public discovery.
- Official store-review data should be connected to the submitted reviewer
  account and helper fixture accounts.
- Store-review fixture posts should be archived/hidden from general public
  discovery unless a release-specific review flow explicitly needs otherwise.
- Test data that is not part of the store-review fixture can be deleted before
  or after review because Hypofit is not yet operating with real production
  users.

## Legacy Local/Staging Demo Accounts

Set one temporary password for every account before running the script:

```bash
export DEMO_PASSWORD="replace-with-a-compliant-demo-password"
```

Founder accounts:

```text
founder1@hypofit.demo
founder2@hypofit.demo
founder3@hypofit.demo
founder4@hypofit.demo
```

Respondent accounts:

```text
respondent1@hypofit.demo
respondent2@hypofit.demo
respondent3@hypofit.demo
respondent4@hypofit.demo
```

## Seeded Data

The seed script creates:

- 4 founder users
- 4 respondent users
- founder/respondent profile rows
- 14 interview posts
- 14 applications
- application statuses across applied, selected, rejected, completed, and no-show
- chat rooms and messages for every application
- session rows for selected/completed/no-show examples
- viewed post rows for respondent accounts

Map-facing demo posts are centered around the mobile simulator test location
`37.296513, 126.837080` near Hanyang University ERICA in Ansan. Offline-capable
fixtures use real nearby place coordinates instead of frontend keyword fallback
coordinates.

## Run

Required environment variables:

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
export DATABASE_URL="postgresql+asyncpg://..."
export DEMO_PASSWORD="replace-with-a-compliant-demo-password"
```

Run:

```bash
apps/api/.venv/bin/python apps/api/scripts/seed_demo_data.py
```

The script is idempotent for the demo dataset. It reuses existing Supabase Auth
users by email, resets their password to `DEMO_PASSWORD`, clears prior seeded product
data, and writes fresh connected data.

## Seed One Rich Account

Use this when one real test account needs both founder and respondent flows.
The script updates the target auth/app user role, keeps existing unrelated demo
data, clears only product data connected to the target account, and writes fresh
connected posts, applications, chats, sessions, and post views.

```bash
TARGET_EMAIL="sehyeon73@gmail.com" \
TARGET_NAME="박세현" \
TARGET_ROLE="both" \
DEMO_PASSWORD="replace-with-a-compliant-demo-password" \
apps/api/.venv/bin/python apps/api/scripts/seed_account_demo_data.py
```

## Store Review Smoke

Use this after API deployment and reviewer-account seeding to confirm reviewers
can reach the live backend with the prepared account.

```bash
HYPOFIT_API_BASE_URL="https://hypofit-api.bukae.co.kr" \
SUPABASE_URL="https://xxxxx.supabase.co" \
SUPABASE_ANON_KEY="..." \
REVIEW_EMAIL="sehyeon73@gmail.com" \
REVIEW_PASSWORD="replace-with-the-configured-review-password" \
apps/api/.venv/bin/python apps/api/scripts/store_review_smoke.py
```

## Store Review and Screenshot Seed

Use this for the official App Store / Google Play review account and screenshot
capture data. It creates one submitted reviewer account, helper fixture
accounts, marks them email-confirmed, and seeds realistic API-backed data
connected to the official account.

This is the preferred seed path for store review and screenshot capture.

Official submitted reviewer account:

```text
review-both@hypofit.demo / <STORE_REVIEW_PASSWORD>
```

Helper fixture accounts, not submitted as reviewer credentials:

```text
review-founder@hypofit.demo
review-respondent@hypofit.demo
```

Run:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_ENV=production \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

Override the default password if needed:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_PASSWORD="replace-with-review-password" \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

Reset fixture product data while preserving the auth users:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_MODE=reset \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

The script refuses to run unless `ALLOW_STORE_REVIEW_SEED=true` is present.
Run it against the deployed review backend before App Store / Play submission
and before screenshot capture.

If store-review fixture posts must be hidden from general public discovery,
archive them after seeding or keep the seed script default status archived.

## Mock Data Policy

Runtime frontend mock data has been removed. Keep:

```text
VITE_USE_MOCK_DATA=false
```

in local and deployed environments.
