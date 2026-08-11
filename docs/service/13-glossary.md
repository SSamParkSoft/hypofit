# Glossary

Status: service-source-of-truth

Last updated: 2026-07-02

## Product Terms

Hypofit:
The interview matching service for paid customer discovery.

Founder / 창업자:
User who creates interview posts and reviews applicants.

Respondent / Interviewer / 인터뷰어:
User who applies to and participates in interviews.

Interview post / 모집글:
Founder-created recruitment post describing service, target customer, mode,
location, schedule, duration, reward, and recruit count.

Application / 신청:
Respondent's request to participate in a post, including relevant experience and
available times.

Selected / 선정:
Application accepted by founder.

Rejected / 반려:
Application declined by founder.

Canceled / 취소:
Application or session stopped before completion.

Session / 인터뷰 일정:
Scheduled interview event after selection.

No-show / 불참:
Scheduled participant did not attend without proper coordination.

Reward / 사례비:
Promised compensation for interview participation. Hypofit does not currently
guarantee payment.

Review / 후기:
Post-interview trust signal.

Support ticket / 문의:
User inquiry or operational support case.

Report / 신고:
Safety, abuse, misleading content, no-show, or policy issue raised by a user.

Block / 차단:
User-level interaction restriction.

Reviewer account / 심사 계정:
Store review/demo account with deterministic data for app review.

## Technical Terms

Spring Boot:
Java framework used by the canonical backend under `apps/api`.

FastAPI:
Retired Python backend represented only by historical migration documents and
the frozen legacy OpenAPI baseline.

Expo React Native:
Native mobile app framework under `apps/mobile`.

Vercel:
Web deployment target for `apps/web`.

Supabase:
Durable auth/database/storage provider.

EC2 reverse proxy:
Retired Nginx/reverse-tunnel topology formerly used for the GPU runtime.

GPU server:
Returned school server that is no longer part of the runtime topology.

Pinned-image rollback:
Lightsail deployment restores the previous immutable GHCR digest when the new
container fails readiness.

Sentry:
Release-build crash/error diagnostics source.

NativeWind:
Tailwind-like styling system used by the Expo mobile app.
