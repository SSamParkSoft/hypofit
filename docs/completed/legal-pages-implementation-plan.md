# Hypofit Legal Pages Launch Closeout Plan

Status: completed

Last updated: 2026-06-15

## Purpose

This completed document records the legal-page closeout work for the MVP and
Google Play-first launch. The detailed implementation history and legal
copy rationale were moved to
`docs/reference/legal-pages-implementation-history.md`.

This is not legal advice. Before public release, the final public wording should
be reviewed against actual product behavior, provider list, retention policy,
and store declarations.

## Current Baseline

The app and web surfaces currently include:

- in-app privacy policy screen
- in-app terms screen
- public privacy route at `https://hypofit.vercel.app/legal/privacy`
- public terms route at `https://hypofit.vercel.app/legal/terms`
- public account deletion route at
  `https://hypofit.vercel.app/account-deletion`
- shared legal copy through `@hypofit/contracts`
- confirmed operator/contact values for the current launch track:
  - service provider name: `박종인`
  - operator/team display name: `contentruck팀`
  - support/privacy email: `ssamso8282@gmail.com`
- shared launch constants in `packages/contracts/src/legal.ts` for:
  - service provider name
  - operator/team display name
  - support/privacy email
  - public terms/privacy/account-deletion URLs
  - current legal provider list used by shared copy

## Active Closeout Tasks

### 1. Public Operator Identity

- [x] Decide the public operator/legal name for store release.
      Current confirmed service provider name: `박종인`.
- Ensure the operator name matches or clearly corresponds to the Google Play
  developer/store listing identity at Play Console submission time.
- [x] Replace temporary wording in shared in-app/public legal copy.

### 2. Support and Privacy Contact

- [x] Decide whether the release keeps `ssamso8282@gmail.com` or switches to a
      domain email. Current confirmed contact email: `ssamso8282@gmail.com`.
- [x] Update in-app legal screens, public legal pages, and support screens.
- Update Play Console metadata with the same contact/provider wording at release
  submission time.

### 3. Provider and International Transfer Wording

- Confirm final providers used by the release build at submission time:
  Supabase, Vercel, GPU/API hosting, EC2 reverse proxy/Gabia DNS, Kakao Local,
  Google Maps, Supabase/Resend email delivery, APNs/FCM, Expo, Apple/Google
  store services, and any analytics/crash SDKs if later added.
- [x] Centralize the current shared legal provider/contact facts in
      `packages/contracts/src/legal.ts`.
- Keep processor/outsourcing and international transfer wording aligned with the
  actual provider set at release submission time.
- [x] Do not mention advertising, subscriptions, escrow, or analytics SDKs
      unless they actually ship.

### 4. Retention and Deletion Wording

- [x] Align privacy retention periods with the API retention/purge decision.
- [x] Explain which data is deleted, anonymized, or retained after account
      deletion.
- [x] Ensure the public account deletion page describes the same request and
      verification flow that the backend actually supports.

### 5. Store-Review Content Consistency

- Keep privacy policy, terms, Google Play Data safety, app permission copy, and
  actual app behavior aligned in the shared legal/content sources at release
  submission time.

## Close Criteria

This document can move to `docs/completed/` when:

- final operator/contact values are set or explicitly accepted for launch,
- public terms/privacy/account-deletion pages match in-app content,
- retention/deletion wording matches backend behavior,
- provider/processor wording matches the release build,
- Google Play Data safety and privacy policy are consistent.
