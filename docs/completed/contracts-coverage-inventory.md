# Contracts Coverage Inventory

Status: completed - historical contract inventory

Last updated: 2026-06-15

## Purpose

This inventory records which FastAPI schema surfaces have shared TypeScript
coverage in `packages/contracts`. It is a reference artifact for the active
closeout tracked in `docs/completed/code-remediation-implementation-plan.md`.

The current MVP direction is manual shared contracts for stable client-facing
API shapes. FastAPI OpenAPI generation remains a later option if the API surface
or client count grows enough to justify generated clients.

## Current Coverage

| API surface | FastAPI source | Shared contract source | Status |
| --- | --- | --- | --- |
| Standard errors | `apps/api/app/schemas/errors.py` | `packages/contracts/src/api/errors.ts` | Covered |
| Health/readiness | `apps/api/app/api/v1/routes/health.py` | `packages/contracts/src/api/health.ts` | Covered |
| Current user/profile | `apps/api/app/schemas/users.py` | `packages/contracts/src/api/me.ts`, `packages/contracts/src/api/users.ts` | Covered |
| Interview posts | `apps/api/app/schemas/interview_posts.py` | `packages/contracts/src/api/interview-posts.ts` | Covered |
| Interview post views | `apps/api/app/schemas/interview_post_views.py` | `packages/contracts/src/api/interview-posts.ts` | Covered |
| Applications | `apps/api/app/schemas/applications.py` | `packages/contracts/src/api/applications.ts` | Covered |
| Sessions/no-show | `apps/api/app/schemas/sessions.py` | `packages/contracts/src/api/sessions.ts` | Covered |
| Chat rooms/messages/settings/read state | `apps/api/app/schemas/chat.py` | `packages/contracts/src/api/chat.ts` | Covered |
| Support/report tickets | `apps/api/app/schemas/support.py` | `packages/contracts/src/api/support.ts` | Covered |
| Admin support replies/events | `apps/api/app/schemas/admin_support.py` | `packages/contracts/src/api/support.ts` | Covered |
| Account deletion | `apps/api/app/schemas/account_deletion.py` | `packages/contracts/src/api/account-deletion.ts` | Covered |
| User blocks | `apps/api/app/schemas/blocks.py` | `packages/contracts/src/api/blocks.ts` | Covered |
| Moderation actions | `apps/api/app/schemas/moderation.py` | `packages/contracts/src/api/moderation.ts` | Covered |
| Notifications | `apps/api/app/schemas/notifications.py` | `packages/contracts/src/api/notifications.ts` | Covered |
| Push devices/preferences/dispatch | `apps/api/app/schemas/push.py` | `packages/contracts/src/api/push.ts` | Covered |
| Kakao place search | `apps/api/app/schemas/places.py` | `packages/contracts/src/api/places.ts` | Covered |

## Remaining Contract Work

- Client adoption is intentionally not complete in this inventory pass. Web and
  mobile API clients should import these shared types during the next client
  touch of each API surface.
- The manual contracts should be refreshed whenever FastAPI schema fields,
  enum values, endpoint payloads, or readiness check shapes change.
- Generated OpenAPI clients can replace or supplement these files later, but
  that should be a dedicated migration so web and mobile imports change
  deliberately.
