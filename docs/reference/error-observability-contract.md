# Error and Observability Contract

Status: reference

Last updated: 2026-08-25

This document defines the current Hypofit error-handling and diagnostics
contract across Spring Boot, Expo React Native, web, and Sentry.

Use this document when changing:

- Spring exception handlers or controller error behavior.
- Mobile API client behavior.
- Supabase social-auth and session-bootstrap error handling.
- Sentry diagnostics, breadcrumbs, or release-build crash triage.
- Request IDs, support/debug codes, or user-facing error copy.

## Goals

Hypofit errors must satisfy three constraints at the same time:

1. Users see short Korean product copy that explains what to do next.
2. Support and developers can trace a failure with a request ID and stable code.
3. Secrets, tokens, emails, passwords, and raw request bodies are not sent to
   frontend UI, Sentry, logs, or screenshots.

## API Response Shape

The Spring API returns a standard error envelope for all handled errors:

```json
{
  "error": {
    "code": "auth_required",
    "message": "로그인이 필요해요.",
    "status": 401,
    "request_id": "req_...",
    "debug_message": "Optional server-side debug summary.",
    "field_errors": null
  }
}
```

Validation errors should use:

- `error.code = "validation_failed"`
- `error.message = "입력값을 확인해 주세요."`
- `error.field_errors[]` with `field`, `message`, and `code`

## Request IDs

Every API request should carry a request ID:

- Mobile/web clients send `X-Request-ID`.
- Spring preserves a safe inbound `X-Request-ID` when present.
- Spring generates `req_<uuid>` when no valid request ID is provided.
- Spring returns the same value in the `X-Request-ID` response header.
- Error payloads include the same value as `error.request_id`.

Request IDs are safe to show in support context and Sentry tags. They are not a
substitute for authentication or authorization.

They are also not idempotency keys. A create request that needs safe retrying
uses its resource-specific submission key; a request ID only connects the
client error to proxy and server diagnostics.

For posting creation, a repeated `client_submission_id` with the same
normalized payload returns the original post. Reusing that ID with a changed
payload returns `409 idempotency_key_reused`; clients must create a new draft
submission ID instead of retrying a different request under the old one.

Mobile clients may additionally send bounded release metadata in
`X-Client-Version`, `X-Client-Build`, and `X-Client-Revision`. Spring records
only safe, release-like values in structured-log MDC fields. The headers remain
optional for released-client compatibility and must never contain tokens,
account identifiers, or other user data.

## Backend Error Classes

### Authentication verifier availability

Invalid, expired, malformed, or signature-invalid bearer tokens return `401`
with the existing token-specific codes. A temporary failure retrieving the
Supabase JWKS is different: the API returns `503` with
`auth_verifier_unavailable`, preserves `X-Request-ID`, and tells the client to
retry later. Clients must not treat that code as a sign-out or token-refresh
trigger. Bearer tokens, raw JWKS responses, and complete external URLs are not
written to diagnostics.

The Prometheus registry records JWT decode duration with a bounded `outcome`
tag and a separate JWKS transport-retry counter. Request IDs and bearer tokens
are intentionally excluded from metric tags to avoid high cardinality and
credential exposure.

Business logic should prefer typed `HypofitException` subclasses when the code
has clear domain meaning.

Current examples include `AuthRequiredException`,
`HypofitValidationException`, and domain-specific permission, not-found, and
conflict subclasses.

### Planned service maintenance

An operator-declared full maintenance period is distinct from authentication
verifier availability and generic upstream failure. Nginx returns the standard
envelope with HTTP `503`, `error.code = maintenance_in_progress`, Korean retry
copy, `Cache-Control: no-store`, and a bounded `Retry-After` header. The public
`GET /api/v1/service-status` response contains only safe title, message, mode,
and optional ETA details while Spring or Postgres may be unavailable.

Mobile activates its full maintenance surface only for the exact
`503 maintenance_in_progress` combination. It preserves the Supabase session,
local posting draft, and client submission ID, and does not retry a mutation in
the background. `auth_verifier_unavailable`, generic `503`, `502`, `504`, and
network failure retain their own retry/error paths and must never log the user
out or falsely claim planned maintenance.

Route handlers should stay thin:

```text
route -> auth/dependency validation -> service -> repository -> database
```

Do not put large business-state branching or direct SQL error translation in
route handlers.

## Mobile API Client

`apps/mobile/src/shared/api/client.ts` is the mobile transport boundary.

It should:

- Add `X-Request-ID` to every request.
- Apply a finite timeout.
- Parse the standard `error` envelope first.
- Fall back to legacy `detail`, `message`, or plain text only when needed.
- Throw `ApiError` for HTTP failures.
- Throw `NetworkError` for fetch/timeout failures.
- Capture sanitized Sentry diagnostics for both HTTP and network failures.

`ApiError` should carry:

- `code`
- `status`
- `userMessage`
- `debugMessage`
- `fieldErrors`
- `requestId`
- `method`
- `path`

UI screens should display `error.userMessage` or a screen-specific fallback,
not raw backend `debug_message`.

## Auth Errors

Supabase Auth can return errors either as `{ error }` values or as thrown/retry
errors depending on the provider and callback path. Social authorization,
session exchange, and profile onboarding must normalize both shapes through the
shared auth-error helpers.

Expected user-facing cases:

- user cancellation -> no destructive error; return to the login choices
- provider rejection -> `로그인을 완료하지 못했어요. 같은 방법으로 다시 시도해 주세요.`
- rate limit -> `요청이 많아요. 잠시 후 다시 시도해 주세요.`
- network/retryable fetch -> `네트워크 연결을 확인한 뒤 다시 시도해 주세요.`
- server instability -> `인증 서버 연결이 불안정해요. 잠시 후 다시 시도해 주세요.`

Profile-onboarding failures after Supabase session creation must not pretend the
social authorization failed. Preserve the session and route back to the missing
onboarding step.

### Social auth errors

Social login uses the same API error envelope and request ID contract as other
Spring API requests. Web and mobile must branch on stable codes, never on provider
messages or raw Supabase error text.

Current server-owned codes:

- `social_provider_disabled`: the provider feature flag or required server
  configuration is disabled.
- `social_provider_review_pending`: the provider is configured but is not yet
  approved for general use.
- `social_unsupported_platform`: the provider is intentionally unavailable on
  the requesting platform, such as Apple on Android.
- `social_state_mismatch`: the requested return path or attempt binding is not
  valid.
- `social_callback_expired`: the attempt is missing, expired, or its one-time
  secret does not match.
- `social_attempt_replayed`: a consumed or terminal attempt cannot be completed
  by a different session.
- `social_identity_not_verified`: Supabase Admin did not return the expected
  provider identity for the authenticated user.
- `social_identity_conflict`: the provider subject already belongs to another
  Hypofit user.
- `social_account_link_required`: a verified provider email matches a different
  existing Hypofit account, so explicit authenticated linking is required.
- `social_provider_unavailable`: Supabase Admin or the external provider could
  not be reached safely.

Client-only cancellation, browser exchange, and local persistence failures may
use `social_authorization_cancelled`, `social_code_exchange_failed`,
`social_profile_sync_failed`, or `social_unknown`. These client codes must carry
a `phase` but must not expose authorization codes, callback URLs, provider
tokens, attempt secrets, emails, or provider-subject identifiers.

Supported social-auth phases are:

- `attempt_create`
- `provider_authorization`
- `provider_callback`
- `supabase_token_exchange`
- `supabase_session_persist`
- `api_identity_resolve`

An authorization cancellation is a normal user outcome. It should not be
captured as an exception or displayed as a destructive failure. Expired or
replayed attempts must clear local attempt storage before a new attempt starts.

### AI summary worker errors

AI summary generation is asynchronous and must never fail the interview or
application write request. Artifact state may contain only these stable codes:

- `ai_summary_provider_not_configured`
- `ai_summary_provider_invalid_configuration`
- `ai_summary_provider_auth_failed`
- `ai_summary_provider_rate_limited`
- `ai_summary_provider_timeout`
- `ai_summary_provider_unavailable`
- `ai_summary_output_schema_invalid`
- `ai_summary_output_policy_invalid`
- `ai_summary_source_unavailable`
- `ai_summary_source_changed`
- `ai_summary_internal_error`

Logs may include artifact id, summary type, stable code, work version, provider,
model, attempt count, duration, and token counts. They must not include source
fields, generated summary text, prompts, provider response bodies, or API keys.

## Sentry Safety Rules

Sentry must be useful for TestFlight and production triage, but it must not
become a raw data sink.

Allowed diagnostic fields:

- `phase`
- `source`
- `code`
- `status`
- `request_id`
- `method`
- `path`
- `provider_name`
- `platform`

Do not send:

- email addresses
- passwords
- Supabase access or refresh tokens
- service role keys
- database URLs
- request or response bodies
- raw form input
- profile image URLs when not required for debugging
- OAuth authorization codes, callback URLs, state values, PKCE verifiers, and
  social-attempt secrets
- provider subjects, Supabase identity IDs, and provider access or refresh
  tokens
- AI source fields, prompt text, generated summary content, and raw provider
  output payloads

Sentry should keep `sendDefaultPii: false`, clear `event.user`, redact exception
text, and use tags for stable correlation fields.

### Spring Logging And Sentry Policy

The Spring candidate emits Spring Boot ECS JSON logs in the `production`
profile. MDC fields, including `request_id`, are included automatically. Local
and test profiles retain human-readable console logs.

Backend Sentry capture, when enabled for the Spring runtime, must follow these
rules:

- Enable it only through a server-side DSN and environment/release metadata.
- Keep default PII collection disabled.
- Capture unhandled 5xx failures and exhausted background-worker failures.
- Use `request_id`, stable error code, environment, and release as correlation
  tags or structured context.
- Do not attach request/response bodies, authorization or cookie headers,
  database URLs, provider payloads, email addresses, phone numbers, OAuth
  material, or Supabase tokens.
- Do not report expected validation, authentication, authorization, not-found,
  or conflict responses as Sentry errors.
- Keep structured server logs authoritative for investigation when no backend
  Sentry DSN is configured.

The Spring API implements the structured-log side of this
contract without requiring a Sentry secret. Adding a backend Sentry SDK must be
an explicit operational change after its Spring Boot 4 compatibility and
server-side DSN have been verified.

## Current Implementation Files

Backend:

- `apps/api/src/main/java/com/contentruck/hypofit/common/observability/RequestIdFilter.java`
- `apps/api/src/main/java/com/contentruck/hypofit/common/error/ApiExceptionHandler.java`
- `apps/api/src/main/resources/application-production.yml`

Mobile:

- `apps/mobile/src/shared/api/client.ts`
- `apps/mobile/src/features/auth/authErrors.ts`
- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/shared/diagnostics/sentry.ts`

Tests:

- `apps/api/src/test/java/com/contentruck/hypofit/common/error/ApiExceptionHandlerTest.java`

## Remaining Hardening

These items are follow-up work, not blockers for the current MVP error contract:

- Apply the same standard error parsing to the web API client.
- Add route-level Expo Router error boundaries for recoverable screen crashes.
- Add TanStack Query global error policy when mobile query usage expands.
- Convert more backend service-layer state errors to typed
  `HypofitException` subclasses.
- Add Sentry source-map and dSYM upload verification to the release-build
  checklist.
- Add a support UI affordance for copying the latest request ID when a critical
  authenticated API failure blocks the user.

## References

- Spring MVC exception handling:
  https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html
- Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
- Expo Sentry setup: https://docs.expo.dev/guides/using-sentry
- Expo Router error handling: https://docs.expo.dev/router/error-handling/
