# Production Reliability And Posting Create Stabilization Plan

Status: active

Last updated: 2026-09-01

## Purpose

Harden the existing production path for authenticated posting creation without
replacing the modular monolith, Supabase Auth, Supabase Postgres, or the
Lightsail deployment model.

The immediate incident was a fresh Spring process timing out while retrieving
Supabase JWKS during Spring Security authentication. The request failed before
the controller, request parser, service, or database transaction. This plan
turns that incident into bounded, observable behaviour and prevents unsafe
retries from creating duplicate posts.

## Scope

In scope:

- authenticated deployment smoke and JWKS warm-up;
- explicit timeout budgets for JWT key retrieval and the API request path;
- precise auth infrastructure error handling and request correlation;
- idempotent posting creation;
- mobile draft schema versioning and explicit request mapping;
- compatibility checks between released mobile clients and `/api/v1`;
- release metadata, metrics, and constrained capacity observation.

Out of scope:

- microservices, Kubernetes, Kafka, Redis, a custom JWT issuer, or a second
  authentication service;
- a general parser/DTO rewrite unrelated to observed posting-create drift;
- blue/green deployment on the current 1 GiB Lightsail host;
- changing the approved mobile posting UI or participation workflow.

## Verified Baseline

```text
Expo mobile
  -> Supabase Auth access token
  -> mobile API client (Authorization, X-Request-ID, 20 s client timeout)
  -> Nginx
  -> Spring Security Resource Server
  -> Supabase JWKS verification
  -> InterviewPostController
  -> InterviewPostRequestParser
  -> InterviewPostWriteService transaction
  -> Supabase PostgreSQL / coupled durable side effects
```

Current mobile creation keeps a five-step `PostingCreationDraft` in
AsyncStorage and explicitly serializes it into `CreateInterviewPostInput`.
That separation is intentional: UI draft state must not become the wire
contract by accident. The Spring create boundary still accepts a raw JSON
wrapper and normalizes it in `InterviewPostRequestParser`, which makes
contract tests and compatibility rules especially important.

The deployed API retry for transient JWKS transport failure is a narrow
mitigation. It must remain limited to connect/read/transport failure, never
malformed, expired, issuer-invalid, audience-invalid, or signature-invalid
tokens.

### Local Implementation Checkpoint, 2026-08-31

The following work exists in the current local checkout and is not deployment
evidence:

- Supabase JWKS verification uses explicit bounded connect/read settings and
  retries one transport failure only. An exhausted verifier transport failure
  is presented as `503 auth_verifier_unavailable`; semantic token failures
  remain 401.
- New mobile drafts carry `schemaVersion` and one persisted
  `clientSubmissionId`. The create serializer sends it as an optional
  `client_submission_id`.
- API requests may carry safe `X-Client-Version`, `X-Client-Build`, and
  `X-Client-Revision` values. Spring accepts only bounded release-like values
  and adds them to structured-log MDC fields; missing headers remain compatible
  with released clients.
- The existing Actuator/Prometheus registry records JWT decode duration by a
  bounded outcome tag and counts JWKS transport retries. It does not tag bearer
  tokens, user identifiers, URLs, or request IDs.
- Posting creation records only the bounded outcomes `created`, `replayed`,
  `idempotency_conflict`, and `failed`; request, user, post, and submission
  identifiers are deliberately excluded from metric tags.
- Flyway `V0029` adds a nullable post submission ID and owner-scoped unique
  index. A PostgreSQL transaction advisory lock serializes identical
  owner/submission pairs. A repeated matching payload returns the existing post
  without enqueueing duplicate post-open side effects, while a reused key with
  a different normalized payload returns `409 idempotency_key_reused`.

The authenticated deployment smoke remains manual because Hypofit has a
social-only public authentication policy. Storing a social user session in
GitHub would make later deployments fail after expiry, and email/password grant
would reintroduce a prohibited identity path. Do not replace either with a
long-lived user session or service-role key. Until an explicit non-interactive
social-provider issuance design is approved, use a short-lived token from an
interactive social login only in the invoking process. The checked-in script
prints only the HTTP result plus safe request ID, never the token or `/me`
response. Production deployment, migration application, and authenticated
smoke have not been performed for this checkpoint.

### Local Validation Checkpoint, 2026-08-31

- `apps/api`: `./gradlew --no-daemon check integrationTest` passes, including
  Flyway `V0029`, schema validation, submission-ID persistence/lookup, and
  write-service replay/conflict coverage against Testcontainers PostgreSQL.
- `apps/mobile`: TypeScript typecheck and the focused release-metadata helper
  test pass. The standalone Node helper test emits a module-type warning only;
  it does not affect the Expo runtime or TypeScript result.
- No migration was applied to Supabase and no API image was deployed as part of
  this local checkpoint.

### Production Readiness Checkpoint, 2026-09-02

- `GET https://hypofit-api.bukae.co.kr/api/v1/health/ready` returned `200` with
  request ID `req_f8f96d0a0a1642ec8cd9c5fcfc1696e2`; its reported database,
  JWKS configuration, and required push/provider configuration checks were
  healthy.
- `infra/lightsail/authenticated-smoke.sh` was invoked without a configured
  `HYPOFIT_API_SMOKE_ACCESS_TOKEN` and stopped before making a request, as
  designed. No token was searched for in runtime files, no user session was
  persisted, and no service-role credential was used.
- Therefore this is an infrastructure-readiness observation only, not a fresh
  authenticated deployment smoke or a release verification.

### Authenticated Production Smoke Checkpoint, 2026-09-02

- A short-lived access token from an interactive social login was supplied only
  to the invoking shell and `infra/lightsail/authenticated-smoke.sh` returned
  `200` for `GET /api/v1/me` with request ID
  `req_6086f0ae508a4b91afd7230189271261`.
- This verifies the currently deployed API's public route, Supabase JWT
  verification, Spring Security principal mapping, and active profile lookup.
  The token was neither printed nor persisted.
- This is an authenticated production smoke result for the current deployment,
  not evidence that the uncommitted local changes, a new image, or migrations
  have been deployed.

### Social-only Smoke Policy Checkpoint, 2026-09-02

- The attempted password-grant automation was removed after confirming the
  active social-only policy removes public email/password, password-reset, and
  OTP flows. It must not be revived as a deployment-only backdoor.
- The deployment workflow remains an infrastructure readiness gate. A fresh
  authenticated `/api/v1/me` verification is performed manually after an
  interactive social login until a separately approved provider-token issuance
  design exists.
- The temporary GitHub `HYPOFIT_SUPABASE_URL` variable and
  `HYPOFIT_SUPABASE_ANON_KEY` secret created for the abandoned password-grant
  path must be removed; they are not part of the supported deployment contract.

### Observability Implementation Checkpoint, 2026-09-01

- The production `MeterRegistry` records a bounded
  `hypofit.interview_post.create` counter with only `created`, `replayed`,
  `idempotency_conflict`, and `failed` outcomes. It deliberately excludes
  request IDs, user IDs, post IDs, and submission IDs.
- `apps/api`: `./gradlew --no-daemon check integrationTest` passes after the
  counter was added. `apps/mobile`: TypeScript typecheck, release-metadata
  helper test, pure posting-create payload fixture tests for interview, survey,
  and beta-test mappings, smoke-script syntax check, and whitespace check pass.
- This remains local verification only. The Flyway migration, deployed image,
  authenticated smoke, and real Lightsail memory observation are still pending.

The deployment asset set includes `observe-runtime.sh`. After a deployment,
run it over SSH from `/opt/hypofit/runtime` to capture the pinned image,
container state/RSS/PIDs, host memory, recent kernel OOM evidence, and a
bounded set of local JVM/auth/create metrics. Its output excludes environment
variables, request bodies, bearer tokens, and external participation URLs.

### Production Observation Checkpoint, 2026-09-01

- The canonical readiness endpoint returned HTTP 200 with database and Supabase
  JWKS configuration reported healthy.
- GitHub Actions deployment remains enabled, but the repository has no
  authenticated-smoke credential configured. No workflow was changed to accept
  an expiring access token as a permanent secret.
- A fresh authenticated smoke, deployed image verification, and Supabase
  migration application remain required before this plan can leave `active`.

## Architecture Decisions

### Keep The Existing Responsibility Split

```text
Supabase Auth       identity and access-token issuance
Spring Security     token verification and authenticated principal
Spring services     ownership, workflow authorization, business rules
PostgreSQL          durable integrity via FK, UNIQUE, and CHECK constraints
```

Do not mint a Hypofit JWT after Supabase authentication. Spring may use a
Supabase access token to authenticate the request, but application services
remain responsible for domain authorization.

### Separate Runtime Readiness From Deployment Smoke

Runtime readiness remains local/critical-infrastructure oriented:

```text
process + database + required local configuration
```

It must not call the Supabase JWKS endpoint on every readiness request. A
cached verifier can continue to validate known keys during a transient remote
JWKS outage, so treating that outage as permanent process unhealth would be
misleading.

Deployment success adds a separate authenticated smoke:

```text
deploy -> readiness -> authenticated GET /api/v1/me -> traffic
```

The smoke both verifies the complete Spring Security path and warms a new
process's JWK cache before user traffic. The credential mechanism is a
security decision gate: use a dedicated least-privilege smoke account/session
only after its storage, rotation, and revocation policy is documented. Never
substitute a Supabase service-role key for a user bearer token and never put a
long-lived user access token in client-visible configuration.

### Bound Timeout Budgets From The Inside Out

Measure the actual Nginx, Spring, and custom JWT decoder values before changing
them. The required ordering is:

```text
JWKS connect/read + one bounded retry
  < Spring/Nginx request budget
  < mobile API-client timeout (currently 20 s)
```

Initial target for review, not an unverified production setting:

```text
JWKS connect: 1-2 s
JWKS read:    2-3 s
retry:        once, transport failures only
API budget:   below 10-15 s
mobile:       20 s
```

The custom `NimbusJwtDecoder` client must set its own bounded transport timeout
explicitly; generic application REST-client defaults do not prove the decoder
uses them.

### Use Semantic HTTP Failure Classes

| Situation | HTTP | Stable application code |
| --- | ---: | --- |
| malformed, expired, or invalid JWT | 401 | token-specific code |
| authenticated user lacks permission | 403 | permission code |
| temporary JWKS/verifier transport outage | 503 | `AUTH_VERIFIER_UNAVAILABLE` |
| request validation | 422 | validation code/details |
| idempotency key reused with another payload | 409 | `IDEMPOTENCY_KEY_REUSED` |
| unexpected application failure | 500 | request ID only |

A transient verifier outage must not become a misleading login-expired flow in
mobile clients. Do not log bearer tokens, full external URLs, or unmasked
personal data. Log only the reason, JWK `kid`/algorithm when available, request
correlation values, and safe client release metadata.

## Work Plan

## Phase 0: Establish Incident Evidence And Correlation

1. Confirm `RequestCorrelationFilter` executes before Spring Security and puts
   the server request ID into MDC and the response header.
2. Preserve client-provided `X-Request-ID` only after validating its shape, or
   generate a server ID; record both only when they are intentionally distinct.
3. Add structured auth-failure logs/metrics that distinguish invalid JWT from
   JWKS transport failure without recording the bearer token.
4. Record safe client release metadata (`X-Client-Version`, build, revision)
   when available. Missing headers remain compatible with released clients.

Exit gate: a pre-controller authentication failure can be correlated from
mobile error to Nginx log, Spring security log, and metric using a request ID.

## Phase 1: Stabilize JWT Verification

1. Inspect the deployed custom decoder and its HTTP client; prove the actual
   connect/read timeout and retry behaviour with a focused test.
2. Keep exactly one retry for transient resource-access failures. Do not retry
   semantic JWT failures.
3. Convert exhausted JWKS transport failures to the stable 503 error envelope.
4. Confirm a normally cached valid JWT does not require a remote call per
   request.
5. Document key-rotation/cache behavior and an operator response for a
   persistent verifier outage.

Exit gate: malformed/expired JWT returns 401, a simulated JWKS timeout returns
503, and a valid authenticated request succeeds after deployment warm-up.

## Phase 2: Make Deployment Success Authenticated

1. Retain `/api/v1/health/ready` as the infrastructure readiness gate.
2. Extend `deploy-api.yml` after readiness with one authenticated `/api/v1/me`
   smoke using the approved secret mechanism.
3. Fail and roll back deployment when the authenticated smoke fails; surface
   its safe request ID and API image digest in the workflow output.
4. Run the same smoke manually before automation is authorized, rather than
   claiming readiness alone proves product traffic works.
5. Do not add a public `/internal/version` endpoint merely for diagnostics.
   Put safe revision/build information in authenticated logs, protected
   operator diagnostics, or carefully reviewed actuator info.

Exit gate: a fresh deployment cannot be reported successful until both
readiness and an authenticated endpoint pass.

## Phase 3: Make Create-Post Retries Idempotent

### Contract

For a new mobile draft, generate one UUID `clientSubmissionId` before the
first publish attempt and persist it with the draft. Every retry of that same
publish operation sends the same ID.

`X-Request-ID` remains tracing-only. It is not an idempotency key.

### Persistence

1. Add a Flyway migration for nullable `client_submission_id` on the post
   creation record, preserving all existing data.
2. Add a uniqueness constraint scoped to owner and submission ID, such as
   `UNIQUE(founder_id, client_submission_id)` where the submission ID exists.
3. Store a canonical request hash with the submission ID when feasible.
4. On a matching owner/key and normalized payload, return the originally
   created post instead of creating another one.
5. On matching owner/key but a different normalized payload, return 409;
   never silently replace the original payload. A stored request hash remains
   optional future optimization, not a prerequisite for this MVP contract.
6. Ensure duplicate delivery does not duplicate currently coupled durable
   audit, notification, or queue work.

### Compatibility

Existing clients without `clientSubmissionId` keep their current create path
until a deliberate release deprecation. The server may accept an optional key;
it must not make a new required field in `/api/v1` without a supported-client
release plan.

Exit gate: a client timeout followed by retry returns one post and one set of
durable side effects; same key with changed payload returns 409.

## Phase 4: Stabilize Draft And Wire Contracts

1. Add `schemaVersion` to `PostingCreationDraft` and a migration/normalization
   function on AsyncStorage load.
2. Incompatible stale drafts are explicitly discarded with a calm recoverable
   message; do not serialize unknown fields into a new API request.
3. Keep `serializePostingCreationDraft()` as the single explicit mapper from
   canonical UI draft to `CreateInterviewPostInput`.
4. Add exhaustive mapping checks and contract fixtures for location source,
   recruitment type, participation mode, compensation, schedule, duration,
   deadline, and optional fields.
5. Use Spring DTO/OpenAPI improvements incrementally for the observed raw
   parser hotspots. Do not block stabilization on a whole-parser rewrite.
6. Treat `/api/v1` as additive: optional field additions are compatible;
   required additions, renames, enum value removals/renames, and semantic
   changes require a versioned migration strategy.

Exit gate: legacy draft recovery and current draft serialization pass fixture
tests; a released-client compatibility test still accepts the old payload.

## Phase 5: Release Observability And Capacity

1. Expose/collect HTTP count and latency, authentication success/failure,
   JWT-invalid/expired, JWKS fetch/failure/timeout/duration, and create-post
   success/failure/idempotent-replay metrics.
2. Attach API image revision, Flyway schema revision, safe client version/build,
   and request ID to incident evidence.
3. Observe container RSS, heap/non-heap, thread count, GC pause, Docker memory,
   swap/OOM events, and host free memory under real create-post smoke/load.
4. Keep the one-container rolling deployment while the 1 GiB host lacks enough
   verified headroom for two JVMs. Reassess host size before adding memory-heavy
   workloads, not after an OOM event.

Exit gate: an operator can distinguish client validation, invalid token,
verifier outage, duplicate retry, and server pressure from one incident record.

## Validation Matrix

| Case | Expected result |
| --- | --- |
| fresh deployment + valid smoke token | readiness then `/me` passes and warms JWKS cache |
| expired/malformed JWT | 401, no retry, no controller entry |
| simulated JWKS transport timeout | one bounded retry then 503, no controller entry |
| valid create once | one post and expected durable side effects |
| same `clientSubmissionId`, same payload | original post returned, no duplicate |
| same key, changed payload | 409 conflict |
| client timeout before server response | retry is safe when it uses the same submission ID |
| old mobile client without new field | existing supported create behavior remains valid |
| stale AsyncStorage draft | migrated or explicitly recoverable, never malformed API JSON |
| deployment smoke failure | deployment marked failed/rolled back according to runbook |

Run targeted Spring unit/integration tests, mobile TypeScript tests for draft
serialization, the migration test in a Docker-capable environment, and a
manual authenticated production smoke before declaring any phase deployed.

## Documentation And Security Gates

- Update `docs/service/10-operations-and-release.md` with the authenticated
  smoke and incident evidence contract when Phase 2 lands.
- Update `docs/reference/error-observability-contract.md` when the 503 auth
  verifier code and client presentation land.
- Update the Lightsail runbook with verified timeout values, smoke execution,
  rollback behavior, and secret rotation ownership.
- Update API/OpenAPI and mobile compatibility documentation with the optional
  idempotency contract before shipping it.
- Review the smoke credential, retention, rotation, and least-privilege policy
  before adding it to GitHub Actions or Lightsail configuration.

## Completion Criteria

This plan is complete only when:

1. deployment gates distinguish readiness from a real authenticated request;
2. JWKS infrastructure failure is bounded, observable, and not misreported as
   token expiry;
3. posting creation is safely replayable for supported mobile clients;
4. draft and API contract changes have explicit compatibility tests;
5. API/client/schema revision evidence and memory headroom are observable; and
6. no new distributed runtime is introduced merely to solve these MVP risks.
