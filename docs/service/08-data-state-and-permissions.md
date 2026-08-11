# Data State And Permissions

Status: service-source-of-truth

Last updated: 2026-08-08

## Authentication

Clients authenticate with Supabase Auth. Protected API requests send:

```text
Authorization: Bearer <supabase-access-token>
```

Spring verifies user identity before executing protected business logic. Do
not trust role, ownership, or user id values from the frontend.

For social login, Supabase Auth remains the only application session issuer.
Apple, Google, Kakao, and Naver authorization must end in a Supabase session;
The API does not issue a second access/refresh token pair. After authorization,
Spring re-reads the Supabase identity using server authority and applies
Hypofit account, deletion, re-registration, legal-consent, and onboarding
policy.

Social identity rules:

- identify a provider account by the verified issuer/provider subject, not by
  email, name, or profile image;
- never merge accounts from a client-supplied email alone;
- treat provider email and profile fields as nullable, mutable contact data,
  not as standalone login keys;
- if provider email is missing or its verification state is insufficient, use
  the active social-auth continuation for contact-email collection or
  confirmation without reintroducing public email/password login;
- the dedicated account-deletion email OTP flow verifies a destructive action
  only and must not bootstrap a session or revive removed email/password auth;
- do not use provider age, CI, profile, or real-user signals as legal identity
  verification or proof of the Hypofit 19+ policy;
- do not persist raw access tokens, refresh tokens, ID tokens, authorization
  codes, nonce values, or PKCE verifiers in ordinary user/profile records.

## Authorization Principles

- A founder can manage only their own interview posts.
- A respondent can manage only their own applications.
- Chat rooms are visible only to their founder and respondent participants,
  plus authorized operators where moderation requires it.
- Admin routes require admin identity checks.
- Report/block/account-deletion flows must not expose unrelated user data.
- An interview summary follows the post's existing visibility and is returned
  only on detail responses.
- An application summary is visible only to the founder who owns the target
  post. The respondent receives the original application with
  `ai_summary = null`; unrelated users receive `404`.
- AI output must never drive application ordering, selection, rejection, trust
  scoring, or another consequential state transition.

## State Transition Principles

State changes should be explicit and defensible.

Examples:

- application `applied -> selected`
- application `applied -> rejected`
- application `selected -> completed`
- session `scheduled -> completed`
- session `scheduled -> no_show`
- reward `pending -> founder_marked_paid -> respondent_confirmed`
- support `open -> in_review -> resolved/closed`

Use conditional updates, uniqueness constraints, locks, or transaction-aware
service logic where duplicate or stale actions could create inconsistent state.

AI summary writes use a canonical source hash plus monotonically increasing
work version. A stale worker may neither overwrite a newer result nor replace a
newer pending job with an old failure.

## Chat And Idempotency

Chat message creation should support client-generated ids so retry behavior does
not duplicate messages. Room list ordering should prefer the latest message and
unread state.

## Read State

The product records:

- post views,
- chat read state,
- notification read state.

Do not implement read-state purely as local UI state when it needs to persist
across devices or sessions.

## Account Deletion And Retention

Deletion should be a soft-state and redaction workflow rather than a blind hard
delete.

The system should:

- mark the app user as deactivated/deleted,
- redact user-visible personal data where appropriate,
- preserve legally or operationally necessary records,
- retain hashed email data only as needed for policy enforcement,
- clean up Supabase Auth where appropriate,
- support same-email re-registration after cleanup when allowed.

## Store Review Data

Reviewer/demo data should be clearly scoped. It can exist to demonstrate flows,
but ordinary users should not see irrelevant test data in production feeds.

## Location Data

Location is used for map and nearby discovery. The app must request permission
only with a clear product reason and must preserve graceful fallback behavior.

Post location fields can include exact coordinates, nearby/district precision,
manual text, and provider-derived place data. UI must not imply exact public
location when the post is configured to show only a neighborhood.

## Profile Images And Camera

Profile image upload is user-generated content. It triggers privacy/store
requirements around photo library/camera access, user content, reporting, and
moderation.

## Push Notifications

Push notification preferences must be respected. Push delivery should be driven
by durable notification/outbox-style state rather than one-off frontend calls.
