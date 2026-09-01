# Non-Goals And Decision Log

Status: service-source-of-truth

Last updated: 2026-08-08

## Current Non-Goals

Do not add these unless explicitly requested or a new active plan reopens them:

- full payment/escrow settlement,
- AI-based matching,
- interview recording/transcription,
- complex survey builder,
- broad social/community feed,
- multi-tenant organization management,
- compute-heavy media processing,
- a second API runtime or database on the Lightsail host,
- thin WebView wrapper as the native store app.

The optional team/company name stored on a founder profile is not multi-tenant
organization management. It is display-only attribution on interview posts;
membership, invitations, organization ownership, and organization permissions
remain out of scope.

## Durable Decisions

### Monorepo

The repo stays a monorepo while web, mobile, API, contracts, infra, and docs
change together during MVP development.

### Native Mobile

`apps/mobile` is the App Store and Google Play target. It must use native
navigation, permissions, safe-area handling, map/image/push integrations, and
mobile-specific UI.

### Web

`apps/web` remains the public web/legal/install/admin/fallback surface. It can
have a different layout from mobile.

### Spring On Lightsail

The canonical Spring API runs as one memory-limited Docker container on
Lightsail. Supabase remains the durable database and authentication system.

### Supabase As Durable State

Supabase Postgres/Auth is the durable system of record.

### Social-Login-Only Public Entry

The current public entry is social-only. iOS and web use Kakao, Apple, Google,
and Naver. Android uses Kakao, Google, and Naver because Apple login is not
part of the Android entry.
Email/password, signup email OTP, password recovery, and phone login are not
ordinary public entry methods and must not return as rollout fallback.
Provider email is mutable contact/profile data, not an account key or automatic
merge signal.
The only current email OTP policy is the dedicated account-deletion
confirmation flow. It is not sign-in, signup, or password-recovery auth.

### No Payment Guarantee

Reward coordination can be tracked, but Hypofit does not currently guarantee
payment or operate escrow.

### Manual Review Before AI Matching

Founder manual applicant review is intentional. It teaches what screening data
matters before ranking automation is introduced.

Source-grounded interview and applicant summaries are separately approved
under `docs/active/ai-interview-and-applicant-summary-plan.md` as reading aids.
They may restate only the current post or application source, must keep the
original content available, and must not rank, score, recommend, select, or
reject applicants. This exception does not reopen AI matching as MVP scope.
