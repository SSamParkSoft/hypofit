# Architecture

## Service Summary

Hypofit helps pre-founders and early-stage founders find real target customers for paid customer discovery interviews. A founder creates an interview post with a service description, target respondent conditions, interview mode, time requirements, and reward. A respondent reviews the opportunity and applies if their experience, distance, schedule, and expected compensation fit.

The initial host side focuses on student founders, but respondents should not be limited to students. Respondents must be selected according to the real customer segment of each startup idea.

## Core Value

For founders:

- Faster access to customer validation opportunities.
- Easier recruitment of respondents matching a specific service domain.
- A structured flow for screening, scheduling, completion, and no-show tracking.

For respondents:

- A way to convert personal experience into paid interview participation.
- Clear visibility into reward, time, mode, and location before applying.
- More relevant opportunities based on their profile and experience.

## System Overview

```text
Browser / Web app
  -> Vercel
  -> hypofit-api.bukae.co.kr
  -> Lightsail static IPv4 54.116.198.195
  -> host Nginx
  -> Spring Boot container on 127.0.0.1:8080
  -> Supabase Postgres/Auth
```

### Backend Runtime

The canonical API is the Java 21 Spring Boot application in `apps/api`. It runs
as one memory-limited Docker container on Amazon Lightsail behind host Nginx.
The retired school GPU and FastAPI runtime are not rollback targets.

The public domain, `/api/v1` contract, standard error envelope, and Supabase
Auth/Postgres ownership remain stable. Flyway is the only schema migration
authority.

### Frontend

Hypofit currently has two frontend targets:

- `apps/web`: React/Vite web app and public web resources deployed to Vercel.
- `apps/mobile`: Expo React Native app for native iOS and Android
  distribution.

The web app remains useful for desktop/web access, public legal pages, the
install page, and fallback PWA behavior. Native store distribution should use
the Expo mobile app instead of a thin WebView/PWA wrapper.

Expected responsibilities:

- Public interview listing.
- Founder interview post creation.
- Respondent profile and application flow.
- Founder applicant review and session scheduling.
- Application status and interview session tracking.
- Public privacy policy and account deletion web resources.
- PWA manifest, icons, and service worker behavior for web fallback.
- Native permission, safe-area, map, image picker, and store-readiness behavior
  in the Expo mobile app.

The React web source follows this enforced dependency direction:

```text
app -> pages -> features -> shared
                   |          |
                   +------> packages/contracts
```

- `app` wires providers, the declarative route manifest, access policy, and the
  connected desktop shell.
- `pages` are route-level compositions. Domain workflows, cache operations, and
  transport parsing do not belong directly in page JSX.
- `features` own domain controllers, query-key factories, derived read models,
  and feature-local UI. A cross-feature dependency must be an explicit directed
  workflow edge checked by the architecture boundary script.
- `shared` owns product-agnostic transport, configuration, navigation helpers,
  and UI primitives, and cannot import upward from product features or pages.

The web API boundary preserves API error codes, request IDs, validation
details, abort state, and retryability in a typed `ApiError`. TanStack Query
uses stable user identity rather than bearer tokens for protected cache keys,
forwards abort signals to requests, applies one bounded retry policy, and clears
protected cache data on user transition or sign-out.

Recommended stack:

- React
- Vite
- TypeScript
- TanStack Query
- Tailwind CSS as the primary UI styling layer
- Radix UI or shadcn/ui selectively for accessible interactive primitives
- Supabase client for auth if Supabase Auth is used directly from the PWA

Recommended mobile stack:

- Expo React Native
- Expo Router
- TypeScript
- TanStack Query
- NativeWind for static screen/component styling
- React Native style props for runtime measurements, map containers,
  safe-area-dependent values, and gesture/animation values
- `react-native-maps`, `expo-location`, and backend-proxied Kakao Local search
  for the current MVP map flow

### Backend

The backend is a Spring Boot application deployed on Lightsail.

Expected responsibilities:

- Business rules for interview posts, applications, selection, sessions, completion, and no-shows.
- Supabase Auth token verification through JWKS.
- Database access to Supabase Postgres.
- API contract exposed through OpenAPI.
- CORS control for the Vercel PWA domain.

Current stack:

- Java 21
- Spring Boot 4.1.x and Spring MVC
- Spring Security Resource Server
- Spring Data JPA/JDBC
- Flyway
- PostgreSQL

Backend transaction boundary:

- Route handlers authenticate, validate, and delegate. They should not own
  multi-step business transactions.
- Repository adapters should load, insert, and update rows. They should not
  call external providers or own transaction completion.
- Top-level service methods own business transactions and should generally
  commit once after core database state and dependent in-database side effects
  are prepared.
- Multi-step workflows should persist the core state before external provider
  calls such as email or push delivery. If provider delivery is needed, prefer a
  durable outbox row and a worker, or commit the core request before the
  external call and store the provider result afterward.
- Chat message retries should use client-generated idempotency keys.
- Application and session status changes should use conditional updates or
  locks so stale actions return `409` rather than creating duplicate side
  effects.

### Database and Auth

Supabase should be used for durable state.

Recommended use:

- Supabase Postgres for core service data.
- Supabase Auth for user registration and login.
- Optional Supabase Storage for future uploaded assets.

Spring connects directly to Supabase Postgres for core transactional logic.

Social authentication preserves the same boundary:

```text
provider authorization
  -> Supabase Auth validates provider and issues the session
  -> Spring verifies the Supabase bearer token
  -> Spring re-reads the Supabase identity with server authority
  -> Hypofit identity inventory and onboarding/account policy
```

The API must not introduce a second Hypofit JWT. Provider subjects are stable
identity keys; email, name, and profile image remain nullable profile metadata.
See `docs/active/cross-platform-social-login-authentication-plan.md` while the
implementation is active.

Lightsail connects to a supported Supabase direct or pooler endpoint. Do not
place these components on Lightsail:

- PostgreSQL primary database.
- Redis used as a critical coordination store.
- Durable queue.
- Distributed lock service.
- Permanent file storage.

Allowed local server data:

- Code checkout.
- `.env` file.
- Runtime logs.
- Temporary files.
- Local cache.

## Domain Model

Initial domain entities:

```text
User
FounderProfile
RespondentProfile
InterviewPost
Application
InterviewSession
AttendanceRecord
```

### User

Represents an authenticated person. The user chooses a primary role during
signup, but the role is a product entry mode rather than a separate account
type.

Role behavior:

- `founder`: can create and manage interview posts, and can still apply to
  other interview opportunities.
- `respondent`: can browse, apply, and chat, but founder-only creation and
  모집 management surfaces are hidden and blocked by the API.
- `both`: can use founder tools and respondent participation flows.

Important fields:

- id
- email
- name
- bio
- phone
- role
- profile_image_path
- profile_image_url
- created_at

### FounderProfile

Represents founder-side metadata.

Important fields:

- user_id
- team_name
- service_domain
- startup_stage
- university optional

### RespondentProfile

Represents respondent-side matching information.

Important fields:

- user_id
- birth_year
- occupation
- location
- available_modes
- interests
- experience_tags

### InterviewPost

Represents a paid interview recruitment post.

Important fields:

- id
- founder_id
- title
- service_summary
- target_description
- reward_amount
- duration_minutes
- interview_mode
- location
- schedule_options
- status

### InterviewPostView

Represents a user confirming that they opened or inspected an interview post.
This is stored server-side so Home, Interviews, Map, and Detail can share the
same read state across devices.

Important fields:

- id
- user_id
- interview_post_id
- first_viewed_at
- last_viewed_at
- view_count
- source

### Application

Represents a respondent applying to an interview post.

Important fields:

- id
- interview_post_id
- respondent_id
- answers
- available_times
- status

### InterviewSession

Represents a confirmed interview appointment.

Important fields:

- id
- application_id
- scheduled_at
- meeting_type
- meeting_url
- place
- status

### AttendanceRecord

Tracks completion, cancellation, and no-show behavior.

Important fields:

- id
- session_id
- founder_confirmed
- respondent_confirmed
- no_show_party
- completed_at

## API Shape

Initial API groups:

```text
/api/v1/me
/api/v1/interview-posts
/api/v1/applications
/api/v1/sessions
```

Representative endpoints:

```text
POST   /api/v1/me/sync

POST   /api/v1/interview-posts
GET    /api/v1/interview-posts
GET    /api/v1/interview-posts/{id}
PATCH  /api/v1/interview-posts/{id}/status
GET    /api/v1/interview-post-views/
POST   /api/v1/interview-posts/{id}/view

POST   /api/v1/interview-posts/{id}/applications
GET    /api/v1/founder/applications
GET    /api/v1/respondent/applications
PATCH  /api/v1/applications/{id}/status

POST   /api/v1/sessions
PATCH  /api/v1/sessions/{id}
POST   /api/v1/sessions/{id}/complete
POST   /api/v1/sessions/{id}/no-show
```

For protected create/update operations, the browser sends a Supabase access token in
`Authorization: Bearer <token>`. Spring derives the acting user from the token subject.
The frontend must not send trusted `founder_id` or `respondent_id` ownership claims for
protected actions.

`GET /api/v1/interview-posts` is the canonical interview discovery/search
endpoint. It accepts `status`, `mode`, `founder_id`, `q`, `reward_min`,
`reward_max`, `lat`, `lng`, `radius_m`, `sort`, and `limit`. Keyword search is
server-side and covers title, service summary, target description, and location
text fields. Location filtering remains PostGIS-backed when coordinates are
provided.

Current web authentication flow:

```text
Supabase social OAuth/OIDC login
  -> browser session
  -> Authorization bearer token on protected API requests
  -> POST /api/v1/me/sync
  -> app_users row keyed by JWT subject
```

Profile images are uploaded directly from the PWA to the Supabase Storage bucket
`profileimage` under a user-scoped object path. The API stores the resulting
`profile_image_path` and `profile_image_url` on `app_users` through `/api/v1/me/sync`.
The service-role key is not needed for this browser upload path.

The PWA may expose only Supabase anon/public keys through `VITE_` environment variables.
Service-role keys, database passwords, and signing private material must stay server-only.

## AI Summaries

The schema and API contract support source-versioned interview-post and
applicant summary artifacts. Applicant output is founder-only. Generation is
disabled until the active AI-summary plan's provider, evaluation, and rollout
gates are implemented. The feature must not score, rank, recommend, select, or
reject users.
