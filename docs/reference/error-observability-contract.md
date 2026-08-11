# Error and Observability Contract

Status: reference

Last updated: 2026-07-20

This document defines the current Hypofit error-handling and diagnostics
contract across FastAPI, Expo React Native, and Sentry.

Use this document when changing:

- FastAPI exception handlers or route error behavior.
- Mobile API client behavior.
- Supabase Auth login/signup error handling.
- Sentry diagnostics, breadcrumbs, or release-build crash triage.
- Request IDs, support/debug codes, or user-facing error copy.

## Goals

Hypofit errors must satisfy three constraints at the same time:

1. Users see short Korean product copy that explains what to do next.
2. Support and developers can trace a failure with a request ID and stable code.
3. Secrets, tokens, emails, passwords, and raw request bodies are not sent to
   frontend UI, Sentry, logs, or screenshots.

## API Response Shape

FastAPI should return a standard error envelope for all handled errors:

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

For backward compatibility, legacy FastAPI `detail` may remain in the same
payload while old clients and tests are migrated:

```json
{
  "detail": "legacy detail",
  "error": {
    "code": "auth_required",
    "message": "로그인이 필요해요.",
    "status": 401,
    "request_id": "req_...",
    "debug_message": "legacy detail",
    "field_errors": null
  }
}
```

Validation errors should use:

- `error.code = "validation_failed"`
- `error.message = "입력값을 확인해 주세요."`
- `error.field_errors[]` with `field`, `message`, and `code`
- legacy `detail` containing FastAPI-compatible encoded validation details

## Request IDs

Every API request should carry a request ID:

- Mobile/web clients send `X-Request-ID`.
- FastAPI preserves a safe inbound `X-Request-ID` when present.
- FastAPI generates `req_<uuid>` when no valid request ID is provided.
- FastAPI returns the same value in the `X-Request-ID` response header.
- Error payloads include the same value as `error.request_id`.

Request IDs are safe to show in support context and Sentry tags. They are not a
substitute for authentication or authorization.

## Backend Error Classes

Business logic should prefer typed `AppError` subclasses over raw
`HTTPException` when the code has clear domain meaning.

Current examples:

- `AuthRequiredError`
- `PermissionDeniedError`
- `ResourceNotFoundError`
- `ConflictError`
- `InvalidStateTransitionError`
- `ExternalServiceUnavailableError`
- `DatabaseUnavailableError`

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
errors depending on the failure path. Login and signup flows must wrap the full
Supabase call in `try/catch` and normalize both shapes through
`getAuthErrorMessage`.

Expected user-facing cases:

- invalid credentials -> `이메일 또는 비밀번호를 다시 확인해 주세요.`
- email not confirmed -> `이메일 인증을 먼저 완료해 주세요.`
- already registered -> `이미 가입된 이메일이에요. 로그인해 주세요.`
- invalid email -> `이메일 형식을 확인해 주세요.`
- weak password -> `비밀번호는 영문과 특수문자를 포함해 8자 이상으로 입력해 주세요.`
- rate limit -> `요청이 많아요. 잠시 후 다시 시도해 주세요.`
- network/retryable fetch -> `네트워크 연결을 확인한 뒤 다시 시도해 주세요.`
- server instability -> `인증 서버 연결이 불안정해요. 잠시 후 다시 시도해 주세요.`

Signup profile-sync failures after Supabase account creation should not pretend
the account was not created. Use a user-facing message that tells the user to
try login/profile setup again.

### Social auth errors

Social login uses the same API error envelope and request ID contract as other
FastAPI requests. Web and mobile must branch on stable codes, never on provider
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

- `provider_capability`
- `attempt_create`
- `provider_authorization`
- `provider_callback`
- `supabase_token_exchange`
- `supabase_session_persist`
- `fastapi_identity_resolve`

An authorization cancellation is a normal user outcome. It should not be
captured as an exception or displayed as a destructive failure. Expired or
replayed attempts must clear local attempt storage before a new attempt starts.

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

Sentry should keep `sendDefaultPii: false`, clear `event.user`, redact exception
text, and use tags for stable correlation fields.

### Spring Candidate Logging And Sentry Policy

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

The Spring candidate currently implements the structured-log side of this
contract without requiring a Sentry secret. Adding a backend Sentry SDK must be
an explicit operational change after its Spring Boot 4 compatibility and
server-side DSN have been verified.

## Current Implementation Files

Backend:

- `apps/api/app/core/request_context.py`
- `apps/api/app/core/error_handlers.py`
- `apps/api/app/core/errors.py`
- `apps/api/app/schemas/errors.py`
- `apps/api/src/main/java/com/contentruck/hypofit/common/observability/RequestIdFilter.java`
- `apps/api/src/main/java/com/contentruck/hypofit/common/error/ApiExceptionHandler.java`
- `apps/api/src/main/resources/application-production.yml`

Mobile:

- `apps/mobile/src/shared/api/client.ts`
- `apps/mobile/src/features/auth/authErrors.ts`
- `apps/mobile/src/features/auth/AuthProvider.tsx`
- `apps/mobile/src/shared/diagnostics/sentry.ts`

Tests:

- `apps/api/tests/test_error_responses.py`

## Remaining Hardening

These items are follow-up work, not blockers for the current MVP error contract:

- Apply the same standard error parsing to the web API client.
- Add route-level Expo Router error boundaries for recoverable screen crashes.
- Add TanStack Query global error policy when mobile query usage expands.
- Convert more backend service-layer state errors from raw `HTTPException` to
  typed `AppError` subclasses.
- Add Sentry source-map and dSYM upload verification to the release-build
  checklist.
- Add a support UI affordance for copying the latest request ID when a critical
  authenticated API failure blocks the user.

## References

- FastAPI error handlers: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
- Expo Sentry setup: https://docs.expo.dev/guides/using-sentry
- Expo Router error handling: https://docs.expo.dev/router/error-handling/
