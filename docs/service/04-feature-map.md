# Feature Map

Status: service-source-of-truth

Last updated: 2026-08-08

## Mobile App

`apps/mobile` is the main product surface for native distribution.

### Auth

- Splash and startup readiness.
- Platform-aware Apple, Google, Kakao, and Naver social-login entry.
- OAuth/OIDC callback completion and provider error recovery.
- New-account legal consent and role selection.
- Existing-account social identity linking and provider status.
- Supabase Auth session handling.
- Auth preflight and Sentry diagnostics.

Public email/password, email OTP, password recovery, and phone login are not
current release entry methods. Any retained legacy routes are compatibility
cleanup surfaces only and must stay hidden or redirect. Provider email/contact
handling and the dedicated account-deletion email OTP flow are separate from
public login.

### Home

- Brand entry.
- Recent interview feed.
- Personal progress summary.
- Notification entry point.

### Interviews

- Interview list.
- Search and filters.
- Interview detail.
- Application flow.
- My interviews.
- My posts.
- Post creation.
- Post management and applicant entry points.

### Map

- Current-location permission and fallback.
- Google Maps on native mobile.
- Backend-proxied Kakao place search.
- Interview markers and clustered/list behavior.
- Bottom sheet/list overlay.
- Search result behavior.

### Chat

- Chat list.
- Chat thread.
- Message composer.
- Date separators and system messages.
- Read/unread state.
- Room settings.
- Counterpart profile/report/block.
- Workflow actions for selection, rejection, scheduling, completion, reward, and review.

### Profile

- Account information.
- Profile image.
- Role settings.
- Notification settings.
- Appearance settings.
- Support/inquiry.
- Report/problem path.
- Feedback.
- Legal documents.
- Account deletion.
- Logout.

### Notifications

- Notification center.
- Push token registration.
- Notification preferences.
- Tap routing to relevant app surfaces.

## Web App

`apps/web` is not the mobile-store target. Its main responsibilities are:

- public web presence,
- legal pages,
- account deletion page,
- install/PWA fallback,
- possible admin/operator web surfaces,
- Vercel deployment.

Do not use the desktop web UI as the visual source for native mobile screens.
Mobile parity should come from the approved phone-sized mobile UI and current
Expo implementation.

## Spring API

Current API route families:

- health/readiness,
- me/profile sync,
- interview posts,
- interview post views,
- applications,
- sessions,
- chat,
- places,
- notifications,
- push,
- support,
- account deletion,
- blocks,
- moderation,
- admin support,
- admin operations.

## Shared Contracts

`packages/contracts` contains shared TypeScript types and pure helpers for:

- roles,
- interview modes,
- rewards,
- recruit count formatting,
- API-facing domain objects,
- legal text.

Keep these contracts aligned with Spring API contracts when changing API behavior.
