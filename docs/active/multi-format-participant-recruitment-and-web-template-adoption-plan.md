# Multi-Format Participant Recruitment And Web Template Adoption Plan

Status: active

Last updated: 2026-08-28

Supersedes:

- `roleless-research-recruitment-and-external-form-plan.md`

## 1. Purpose

Hypofit must move from a founder-only customer-interview product to a focused
participant-recruitment product for people who need evidence from real users.
The first supported recruitment formats are:

- in-person or remote customer/user interviews,
- external surveys such as Google Forms,
- beta-tester recruitment for products, apps, prototypes, or services.

At the same time, the React web product should adopt proven free web-template
patterns without becoming a copied generic dashboard or replacing the current
Hypofit architecture and brand system.

This document is the single implementation authority for:

- removing founder/respondent roles as customer authorization,
- adding recruitment types and type-specific workflows,
- supporting survey participants and beta testers,
- adapting licensed free web UI blocks into the existing React application,
- updating landing, authenticated web, mobile, API, contracts, schema, legal,
  store, and release behavior required by that product change.

### 1.1 Document Ownership And Related Plans

This plan owns the cross-product transition: recruitment types, roleless
authorization, type-specific workflows, compatibility gates, and the rules for
selecting and adapting free web-template sources.

It does not replace the detailed page-level owners:

- `desktop-web-service-ui-advancement-plan.md` owns authenticated `/app`
  composition, component boundaries, responsive behavior, and web validation.
- `landing-page-and-store-creative-production-plan.md` owns public landing-page
  composition and store creative production.
- `hypofit-brand-logo-icon-system-migration-plan.md` owns logo and icon assets.
- `cross-platform-social-login-authentication-plan.md` owns authentication and
  account identity behavior.

When implementation touches one of those areas, follow both documents. Record
the recruitment decision here and the page-specific execution detail in the
existing owner instead of creating duplicate checklists.

## 2. Current Repository Findings

As of 2026-08-21:

- Production interview workflows still use legacy founder/respondent relation
  names, but customer roles no longer authorize product actions.
- New and synchronized users are normalized to compatibility role `both`.
- Web and mobile use legal-consent onboarding and no longer expose role
  selection, role settings, or role-gated create/manage actions.
- Shared contracts and API fields still use `founder_id`, `respondent_id`, and
  `interview_mode`.
- `V0026__add_interview_post_recruitment_type.sql` adds the compatibility
  discriminator `recruitment_type` with the safe default `interview` and a
  database constraint for `interview`, `survey`, and `beta_test`.
- Spring and the shared TypeScript contract carry the discriminator and the
  type-specific survey/beta-test fields. Flyway `V0027` adds those fields and
  the survey participation state table.
- Survey open/submit/withdraw/confirm/list and beta-test application/selection
  behavior are implemented in Spring. `entry_mode` is now exposed through the
  post contract: legacy surveys remain `direct`, while new posts default to
  `application_required`. Survey and beta-test post creation remain
  disabled by default until capability-aware web/mobile clients are released.
- Capability-aware web and mobile clients send
  `X-Hypofit-Features: recruitment-types-v1`. Clients without that capability
  only discover interview posts and receive `client_upgrade_required` when
  directly opening another type.
- The web app is React 18, Vite, TypeScript, Tailwind CSS 4, TanStack Query,
  Lucide, and a small set of local UI primitives. It does not currently use a
  complete third-party dashboard component system.
- The web architecture enforces `app -> pages -> features -> shared` and
  explicit cross-feature dependencies. Template adoption must preserve this.
- iOS `1.0.0` is already released and only understands interview posts.

The superseded external-form plan was documentation only. Because its schema
and API additions were not implemented, this plan may correct its field names
and workflows without a data migration from that draft.

## 3. Product Positioning

### 3.1 Product Definition

Hypofit helps teams and individuals recruit people who match a research or
validation purpose, then manage participation through the workflow appropriate
to that activity.

Recommended public description:

```text
고객 인터뷰, 설문, 베타테스트에 필요한 참여자를 찾고
모집부터 진행까지 관리하세요.
```

Primary organizer audiences:

- companies and product teams conducting user research,
- founders validating a problem, customer, or product,
- researchers and graduate students recruiting study participants,
- teams recruiting beta testers before or after launch,
- individuals conducting a bounded, legitimate research activity.

Primary participant value:

- discover activities that match their experience and conditions,
- understand format, expected time, reward, deadline, and organizer context,
- apply or participate through a clear type-specific flow,
- track participation status and contact the organizer when the format permits.

### 3.2 Product Boundary

Hypofit is a recruitment and participation-coordination service. It is not:

- a native survey builder,
- a form-response database or analytics suite,
- a generic gig/task marketplace,
- an arbitrary link directory,
- an AI matching, ranking, or rejection system,
- an escrow, settlement, or reward-guarantee provider,
- a remote video-call or screen-recording platform in this phase.

## 4. Core Product Decisions

1. Replace customer-facing roles with ownership and participation rules.
2. Use one top-level `recruitment_type`. The first released client capability
   covers `interview`, `survey`, and `beta_test`; the extensible domain also
   reserves `usability_test`, `research_experiment`, `focus_group`, and
   `other` behind a server-owned rollout flag.
3. Keep `interview_mode` only for interview posts. Do not add surveys or beta
   tests to that enum.
4. Preserve the existing interview application, selection, chat, scheduling,
   attendance, reward, and review workflow.
5. Use an external-form participation flow for surveys. Hypofit does not store
   survey answers. Surveys may be direct or application-required; the latter
   reuses the existing application and selection state and does not create chat.
6. Use application, selection, and chat for beta-tester recruitment, but do not
   create interview sessions, attendance, no-show, interview reward
   confirmation, or interview reviews for beta tests.
7. In the first beta-test MVP, recruitment ends at selected tester coordination.
   Do not add a full test-run management system until real use requires it.
8. Keep existing database and `/api/v1/interview-posts` naming during the
   released-client compatibility window. User-facing copy may say `모집`.
9. Hide unsupported post types from released clients using an explicit client
   capability, not user-agent guessing.
10. Adapt licensed UI patterns into the current design system. Do not replace
    the app with a cloned template repository.

## 5. Recruitment Type Model

```text
recruitment_type
  interview
  survey
  beta_test
  usability_test
  research_experiment
  focus_group
  other
```

### 5.1 Interview

Supported participation methods:

```text
interview_mode
  offline
  online
  both
```

Direct workflow:

```text
post -> application -> organizer selection -> chat/schedule
     -> interview session -> attendance/completion or issue/no-show
     -> reward confirmation and review where applicable
```

This is the existing production workflow and must remain behaviorally stable.

### 5.2 Survey

Initial provider:

```text
external_provider
  google_forms
```

Workflow:

```text
participant opens survey post
  -> reviews conditions, time, reward, deadline, and data notice
  -> Hypofit records open intent idempotently
  -> system browser opens the approved Google Forms responder URL
  -> participant returns and selects 제출했어요
  -> organizer may confirm participation
```

Application-required workflow:

```text
participant applies
  -> organizer selects the application
  -> participant opens the approved external form URL
  -> participant returns and declares submission
  -> organizer confirms where needed
```

The post API never returns `external_url`. The authenticated `POST .../survey/open`
action returns it only for direct surveys or selected applicants of
application-required surveys.

Statuses:

```text
opened -> submitted -> confirmed
                  \-> withdrawn
```

Rules:

- `opened` is not proof of submission.
- `submitted` is the participant's declaration.
- `confirmed` is organizer confirmation, not provider verification.
- Survey participation does not create an application, chat room, interview
  session, attendance record, no-show record, or interview review.
- Hypofit does not import questions, answers, or Google Sheets data.

### 5.3 Beta Test

Initial beta-test scope:

- app or web-product beta testers,
- prototype or concept testers,
- service-experience testers,
- remote testing only in the first release.

Workflow:

```text
post -> tester application -> organizer selection -> chat
     -> organizer privately shares access and instructions
```

Rules:

- Reuse the current application and selection workflow.
- Reuse chat only after selection.
- Do not expose an install, TestFlight, internal-track, prototype, credential,
  or private test URL in the public post.
- Store public test purpose, target conditions, expected effort, device or
  platform requirements, test period, reward, and recruitment count.
- Use existing application experience and availability answers with
  type-specific labels before introducing new answer tables.
- Do not create interview sessions or attendance/no-show semantics.
- Defer task checklists, bug tracking, telemetry ingestion, build distribution,
  and formal test-completion states until observed product demand justifies
  them.

## 6. Roleless Account And Authorization

### 6.1 Customer Rules

- Every authenticated user may create a recruitment post.
- Every authenticated user may participate in another user's open post.
- A user may not participate in their own post.
- Only the post owner may edit, close, delete, or inspect participants.
- Only a participation owner may update their own participation.
- Interview and beta-test chat requires membership in the corresponding
  application and room.
- Interview session actions remain interview-only.
- Admin/operator authorization remains separate from customer behavior.

### 6.2 Compatibility Policy

- Keep `app_users.role` temporarily and normalize new/synchronized users to
  compatibility value `both`.
- Stop using role for Spring authorization before dropping the field.
- Keep `role` in existing responses while released clients require it.
- Remove role selection from new web/mobile onboarding.
- Remove role settings from new web/mobile profile surfaces.
- Treat old-client role updates as a compatibility no-op normalized to `both`.
- Keep legacy identifiers such as `founder_id` and `respondent_id` during this
  release. Rename them only in a later contract version after old-client
  support is intentionally ended.

## 7. Data Model Plan

Keep `B0024__alembic_schema_baseline.sql` immutable. Recheck migrations and use
the next available `V0026+` Flyway version.

### 7.1 `interview_posts` Additions

```text
recruitment_type            varchar not null default 'interview'
external_provider           varchar null
external_url                text null
participation_deadline_at   timestamptz null
external_data_notice        text null
beta_test_platforms         text[] null
beta_test_starts_at         timestamptz null
beta_test_ends_at           timestamptz null
```

Constraints:

- `recruitment_type` is constrained to the supported extensible taxonomy.
- Interview posts require existing interview mode and conditional location and
  schedule validation.
- Survey posts require provider, URL, deadline, and data notice.
- Beta-test posts require at least one platform, a test period, expected time,
  target conditions, and recruitment count.
- Survey and beta-test posts do not require an interview location or schedule.
- Keep a compatibility `interview_mode` value if making it nullable would break
  released clients. Supporting clients must ignore it when type is not
  `interview`.
- `reward_amount = 0` is allowed and renders as `사례비 없음`.
- `compensations` is the canonical JSON array for new clients. During the
  compatibility window, `reward_amount` remains present as the first cash
  compensation or `0`; existing rows are backfilled to either `CASH/KRW` or
  `NONE` by `V0028`.

### 7.1.1 Compensation And Workflow Extension (2026-08-26)

Customer-facing vocabulary uses `공고`, `참여자`, and `보상`. `인터뷰` remains
one recruitment type, not the platform-wide object. New clients normalize every
post through `compensations[]`; supported values are `cash`, `gift_card`,
`points`, `product`, `coupon_or_access`, `other`, and `none`. `none` cannot be
combined with another value.

`V0028__expand_recruitment_posting_domain_and_compensations.sql` expands the
database type constraint and adds compatibility workflow columns
(`entry_mode`, `schedule_mode`, `participation_mode`, `duration_mode`, and
  `external_participation`). It does not remove `/api/v1/interview-posts` or
`reward_amount`, and all extended type creation remains disabled until
capability-aware web/native flows and store-review material are released.

Use columns rather than separate detail tables for this MVP because only two
bounded new types are being added and the conditional fields are small. Split
detail tables only if the type-specific models materially grow.

### 7.2 Survey Participation Table

```text
survey_participations
  id
  post_id
  participant_id
  status
  opened_at
  submitted_at
  confirmed_at
  withdrawn_at
  created_at
  updated_at
```

Required database behavior:

- unique `(post_id, participant_id)`,
- foreign keys matching current application deletion policy,
- status check constraint,
- owner-list and participant-activity indexes,
- compare-current-state transitions in one service transaction,
- idempotent duplicate open and submit actions.

### 7.3 Beta-Test Applications

- Continue using `applications` for beta-test applications.
- Keep `relevant_experience` and `available_times` in the compatibility API,
  but present them as `관련 경험` and `테스트 가능한 기간` in new clients.
- Selection may create a chat room.
- Session creation must reject non-interview posts.
- Do not add a beta-run table in the first release.

## 8. API And Contract Plan

### 8.1 Post Contracts

Add to request and response contracts:

```text
recruitment_type
external_provider?
external_url?
participation_deadline_at?
external_data_notice?
beta_test_platforms?
beta_test_starts_at?
beta_test_ends_at?
```

Preserve current routes:

```text
POST   /api/v1/interview-posts
PATCH  /api/v1/interview-posts/{postId}
GET    /api/v1/interview-posts
GET    /api/v1/interview-posts/{postId}
```

Add survey participation routes:

```text
POST /api/v1/interview-posts/{postId}/survey/open
POST /api/v1/interview-posts/{postId}/survey/submit
POST /api/v1/interview-posts/{postId}/survey/withdraw
POST /api/v1/interview-posts/{postId}/survey/confirm
GET  /api/v1/interview-posts/{postId}/survey/participants
```

API rules:

- Reject survey routes for other recruitment types.
- Permit application routes for interviews, beta tests, and
  `application_required` surveys. Survey selection never creates a chat room.
- Permit direct participation only through the survey routes.
- Permit session creation only for interviews.
- Preserve API error envelopes, validation details, and `X-Request-ID`.

Required new error codes:

- `recruitment_type_not_supported`
- `recruitment_type_action_not_allowed`
- `survey_url_invalid`
- `survey_provider_not_supported`
- `survey_not_available`
- `survey_participation_invalid_state`
- `self_participation_forbidden`
- `client_upgrade_required`

### 8.2 External URL Safety

- Require HTTPS.
- First survey allowlist: `docs.google.com/forms` and `forms.gle`.
- Parse URLs structurally; never use substring validation.
- Reject embedded credentials, localhost, IP literals, and unsupported hosts.
- Do not fetch or follow the URL from Spring.
- Do not log query parameters in analytics, Sentry, notifications, or support
  exports.
- Open the survey using the system browser, not an arbitrary WebView.
- Share beta-test access links privately after selection rather than storing
  them in the public post during the first release.

### 8.3 Released-Client Protection

New clients send:

```text
X-Hypofit-Features: recruitment-types-v1
```

- List, search, map, recommendation, and direct-detail endpoints must hide or
  reject survey/beta-test posts when the capability is absent.
- Unsupported direct detail returns `client_upgrade_required`.
- Do not infer support from a user-agent substring.
- Keep server-owned feature flags for survey and beta-test creation/discovery.
- Enable a type only after supporting clients are released and smoke-tested.

## 9. Information Architecture And Copy

### 9.1 Target Terminology

| Current | Target |
| --- | --- |
| 창업자 | 모집자, or omit when ownership is obvious |
| 응답자 / 인터뷰어 | 참여자 |
| 인터뷰 만들기 | 모집글 만들기 |
| 인터뷰 찾기 | 모집 찾기 |
| 내 인터뷰 | 내 활동 |
| 내가 만든 인터뷰 | 만든 모집 |
| 내가 신청한 인터뷰 | 참여한 모집 |
| 인터뷰 방식 | 참여 방식 |

Type labels:

- `대면 인터뷰`
- `화상 인터뷰`
- `대면·화상 인터뷰`
- `설문`
- `베타테스트`

Do not partially rename the top-level navigation. Change list, detail, create,
my activity, map, notification, landing, legal, and store copy together when
the new types are enabled.

### 9.2 Creation Flow

First step:

```text
어떤 참여자를 모집할까요?

인터뷰
직접 이야기를 나눌 참여자를 모집해요

설문
Google Forms에 응답할 참여자를 모집해요

베타테스트
제품이나 서비스를 먼저 사용해볼 참여자를 모집해요
```

Common fields:

- title and purpose,
- participant conditions,
- expected time,
- reward,
- recruitment count,
- deadline or period,
- organizer/team identity.

Interview-only fields:

- interview mode,
- location and public precision,
- date or flexible availability,
- application experience and available-time questions.

Survey-only fields:

- Google Forms responder URL,
- response deadline,
- data-collection notice,
- link-access confirmation.

Beta-test-only fields:

- target platform or device,
- test period,
- expected effort,
- relevant experience and testing availability questions,
- private access sharing after selection.

### 9.3 Discovery And Detail

- Add `전체 / 인터뷰 / 설문 / 베타테스트` filtering.
- Show one clear type badge on every row/card.
- Keep map results limited to in-person-capable interviews.
- Use type-specific primary actions:
  - `인터뷰 신청하기`
  - `설문 참여하기`
  - `베타테스트 신청하기`
- Show organizer name or team/company name on every detail and compact result.
- Show expected time, reward, recruitment count, and deadline consistently.
- Survey detail must show the external host and data notice before leaving.
- Beta-test detail must not expose private distribution links.

### 9.4 Home, My Activity, Chat, And Notifications

- Home may mix all supported types but must label each type clearly.
- `내 활동` separates `참여한 모집` and `만든 모집` without profile roles.
- Survey activity shows opened/submitted/confirmed status without chat or
  schedule controls.
- Beta-test activity shows application/selection state and chat after selection.
- Chat remains interview and selected-beta-test only.
- Notifications must be meaningful state changes, not every survey-link open.

## 10. Free Web Template Adoption Strategy

### 10.1 Decision

Use free templates as licensed layout and interaction sources, not as a new
application foundation.

Primary reference:

- shadcn/ui Blocks: open-source React-compatible blocks with source ownership.

Secondary reference:

- Flowbite React Admin Dashboard: MIT-licensed examples for dense navigation,
  list, filter, table, and settings patterns.

Reference-only unless separately approved:

- Preline UI: useful free blocks and responsive examples, but the free/fair-use
  terms and framework-agnostic HTML/JS require a per-block license and
  integration review.
- Full third-party dashboards that request attribution or add a large parallel
  component system.

### 10.2 Why Not Copy A Full Template

A full template drop-in would conflict with:

- existing route and authentication ownership,
- TanStack Query server-state behavior,
- API error and request-ID contracts,
- architecture-boundary checks,
- Hypofit tokens, typography, brand, and copy,
- current responsive and accessibility behavior,
- implemented map and chat workspace scroll ownership.

The adopted unit is a page pattern or UI block, not an entire app shell with
mock data and unrelated business logic.

### 10.3 Template Selection Gate

Every copied or adapted block must record:

- source URL and repository,
- exact file or block name,
- source version, tag, or commit when available,
- license and attribution obligations,
- copied versus visually reimplemented status,
- production destination files,
- dependencies introduced,
- accessibility and responsive review result.

Reject a source when:

- no explicit license exists,
- commercial use or modification is unclear,
- attribution requirements cannot be met,
- it requires replacing the current router or state architecture,
- it introduces a second uncontrolled token/theme system,
- it depends on a framework-specific runtime incompatible with React/Vite,
- it duplicates existing local primitives without a measurable UX benefit.

If source code is copied, preserve required copyright/license notices in a
third-party notice file. A public GitHub repository without a license is not a
usable template source.

### 10.4 Integration Rules

- Do not run a full template installer against `apps/web`.
- Do not replace Tailwind configuration or Hypofit tokens wholesale.
- Do not copy template auth, routing, API, analytics, or data models.
- Port one bounded block at a time into the correct `shared` or `features`
  owner.
- Keep shared primitives product-agnostic.
- Add a cross-feature dependency only for a real workflow edge.
- Prefer existing Button, Badge, Field, PageLayout, Workspace, Avatar, state,
  shell, and notification primitives before adding equivalents.
- New interactions must retain keyboard, focus, reduced-motion, loading,
  empty, error, and responsive behavior.
- Use Spoqa Han Sans Neo, Hypofit green, warm white, amber accent, and current
  radii/spacing rather than the template's default theme.

### 10.5 Approved Figma Visual Reference

Reference record:

- Source: [Car Rent Website Design - Pickolab Studio](https://www.figma.com/design/E0zReee8AEmMWCMwD9BAtb/Car-Rent-Website-Design---Pickolab-Studio--Community-?node-id=44-16499&m=dev)
- Inspected frame: `44:16499`, `HF - Dashboard Admin Car Rent`
- Source owner: Pickolab Studio
- Captured: 2026-08-20
- Intended use: visual-language reference only
- In-file permission: personal and commercial projects are allowed; resale of
  the kit and use inside a paid UI kit are prohibited.
- Community requirement: retain creator attribution and a source/license record
  because free Figma Community files use CC BY 4.0 unless an additional license
  applies.

Patterns to borrow:

- a quiet near-white page background with flat white work surfaces,
- one confident primary action color,
- strong title/body/metadata weight hierarchy,
- compact 24px linear icons with restrained inactive color,
- solid rectangular buttons with moderate corner radius,
- circular utility icon buttons with a light border,
- 8px-based spacing with repeated 16px, 24px, and 32px intervals,
- low-shadow panels whose hierarchy comes primarily from spacing and color.

Do not copy:

- the car-rental information architecture, sidebar, charts, map illustration,
  card arrangement, data, copy, or automotive imagery,
- the source blue palette as a second product color system,
- the source's negative letter spacing,
- Plus Jakarta Sans as the Korean body typeface,
- mixed Iconly, Vuesax, and unrelated icon families on the same surface,
- exact page composition or downloadable assets without provenance review.

#### Token Mapping

| Reference value | Hypofit adaptation |
| --- | --- |
| Primary `#3563E9` | Keep `--color-hypo-brand: #176B5D`; use it wherever the reference uses primary blue. |
| Primary white `#FFFFFF` | Keep `--color-hypo-surface` and white foreground text. |
| Main text `#1A202C` | Keep `--color-hypo-text: #1D2522`. |
| Muted blue-gray `#90A3BF` | Derive a neutral green-gray icon/metadata token with accessible contrast instead of importing blue-gray directly. |
| Page gray near `#F6F7F9` | Keep `--color-hypo-bg: #F6F7F8`. |
| Information blue `#54A6FF` | Keep semantic information blue separate from the brand color. |
| 8px-class corner treatment | Keep the current 4/6/8px radius scale and normalize unsupported radius aliases. |
| Plus Jakarta Sans 500/600/700 | Keep Spoqa Han Sans Neo and reproduce the weight hierarchy with 500/600/700. |
| Negative tracking | Keep repository-standard `letter-spacing: 0`. |

#### Component Mapping

- Primary buttons: solid Hypofit green, white 600-weight label, 40-48px control
  height, 8px radius, no decorative gradient or default drop shadow.
- Secondary buttons: white or transparent surface, one-pixel neutral border,
  dark text, and a restrained neutral hover state.
- Search: use the reference's pill treatment only for global search. Ordinary
  form fields remain moderately rounded rather than pill-shaped.
- Utility controls: 40-44px circular controls, light border, stable icon size,
  and visible hover/focus/pressed states.
- Panels: white on near-white background, 8px radius, 24px default desktop
  padding, and either a hairline border or the existing low panel shadow, not
  both by default.
- Typography: page titles map to 22-24px/700, section titles to 18-20px/700,
  row titles to 15-16px/600, body to 14-15px/400-500, and metadata to
  12-13px/500. Korean line height remains more generous than the source.
- Icons: adopt the reference's Iconsax/Vuesax linear visual family for web
  navigation and shared utility actions only after package/license review.
  Prefer the official React package over extracting arbitrary vectors. Use one
  shared wrapper and an explicit Lucide-to-Iconsax mapping; do not mix families
  within one navigation or control group. Selected navigation may use the
  matching filled/bold variant when available.

The first implementation slice is tokens and shared primitives, not page
recomposition. Existing route structure, page layout, list-detail ownership,
map behavior, chat behavior, data fetching, and business logic remain intact.

## 11. Target Web Design Direction

The web product should feel like a modern research-recruitment workspace, not
a generic admin dashboard.

### 11.1 Public Landing

- Lead with participant recruitment across interviews, surveys, and beta tests.
- Show the three formats near the first viewport.
- Explain one common loop: define purpose -> recruit matching people -> manage
  participation.
- Use real product UI proof rather than decorative analytics charts.
- Keep separate organizer and participant value statements.
- Preserve corporate, privacy, terms, support, and store links.

### 11.2 Authenticated Shell

- Keep the current top navigation and account/notification controls unless the
  selected pattern produces a demonstrated improvement.
- Use one constrained workspace grid and stable page rhythm.
- Avoid excessive KPI cards, charts, gradients, and AI-dashboard decoration.
- Make recruitment type, status, deadline, and next action scannable.

### 11.3 Home

- Greeting and one concise orientation line.
- `내 진행 상황`: interviews, surveys, and beta-test participation requiring
  action.
- `새로 올라온 모집`: compact mixed-type list.
- `맞춤 추천`: one bounded recommendation, without claiming AI matching.
- Avoid duplicated summary counters already visible in activity lists.

### 11.4 Recruitment Discovery

- Use compact type tabs and restrained filters.
- Desktop uses a stable list-detail workspace.
- Rows show title, organizer, type, reward, expected time, deadline, and concise
  target conditions.
- Detail changes primary action and fields by recruitment type.
- Empty and loading states remain inside the owning region, not duplicated in
  both list and detail panes.

### 11.5 Creation

- Use a clear three-type selection at the start.
- Render only relevant fields after selection.
- Use a single responsive form column with grouped sections on compact widths
  and an optional summary rail on wide desktop.
- Keep submit state and validation close to the affected field.

### 11.6 Mobile Web Boundary

- Public mobile web remains a landing/store-acquisition surface.
- Authenticated product usage remains app-first on phone.
- Desktop template work must not be stretched into the mobile browser or used
  as a replacement for Expo React Native screens.

## 12. Spring Implementation Shape

Keep the feature-first Spring MVC modular monolith:

```text
interviewpost/
  controller/
  dto/
  service/
  repository/
  entity/

survey/
  controller/
  dto/
  service/
  repository/
  entity/
```

- Post services own type validation and post transactions.
- Survey services own survey-participation transitions and transactions.
- Existing application services accept interview and beta-test posts.
- Existing session services reject non-interview posts.
- Controllers remain thin.
- Repositories do not own workflow policy.
- Replace founder-role checks with ownership checks before enabling roleless
  creation.

Do not introduce a generic workflow engine, DDD command/result layer, or
polymorphic entity hierarchy for three known types.

## 13. Privacy, Safety, And Store Review

- Survey and beta-test posts are user-generated content and retain report,
  block, support, moderation, and removal paths.
- Require a plain-language survey data notice before publishing.
- State clearly that external-form data is collected by the organizer through
  the external provider.
- Do not log external URL query parameters.
- Do not publicly expose private beta distribution links or credentials.
- Do not promise identity verification, response validity, attendance, reward
  payment, or test quality unless the corresponding feature exists.
- Update privacy policy, terms, App Privacy, Google Play Data safety, reviewer
  notes, screenshots, and store descriptions before enabling the new types.
- Preserve enough native value around discovery, screening, status, organizer
  identity, moderation, and account management so the app is not merely a link
  collection.

## 14. Delivery Plan

### Phase 0: Authority And Design Source Freeze

- [x] Consolidate roleless, survey, beta-test, and web-template decisions into
  this document.
- [x] Approve the public positioning and three recruitment types.
- [x] Freeze field names, capability header, statuses, and error codes.
- [ ] Select the exact free blocks to adapt and record license provenance.
- [x] Record the Pickolab Figma frame, visual patterns, exclusions, token
  mapping, and license constraints.
- [x] Lock the Iconsax source reference to `iconsax-react@0.0.8`, inventory the
  required glyphs, and retain only the selected linear paths in the shared web
  icon wrapper to avoid shipping every package variant.
- [ ] Capture current web screenshots for before/after comparison.

Exit gate: one approved product model and one licensed UI-source list exist.

### Phase 1: Remove Role As Authorization

- [x] Replace Spring interview-post, application, and session customer role
  gates with active-account, ownership, and participation checks.
- [x] Normalize new/synchronized users to compatibility role `both`.
- [x] Remove role-onboarding requirements from social auth while preserving the
  existing legal-consent checkpoint.
- [x] Remove role onboarding and role settings from web and mobile.
- [x] Make create and participate actions available to every user.
- [x] Update role-dependent tests and OpenAPI fixtures.

Exit gate: one account can create and participate without changing a role.

2026-08-21 authorization checkpoint:

- Spring no longer requires a `founder`, `respondent`, or `both` role value to
  create and manage an owned interview post, apply to another user's post, or
  act as the actual post owner/application participant in a session workflow.
- Deleted and deactivated account checks, self-application prevention,
  ownership checks, application membership, block checks, and status
  transitions remain enforced.
- Existing `founder_id`, `respondent_id`, actor/reviewer relation labels, role
  fields, and response contracts remain for compatibility. These labels
  describe workflow relationships and are no longer customer authorization.
- A new verified social identity without an application profile receives
  `legal_consent_required`, completes the consent-only screen, and is then
  synchronized with compatibility role `both`.
- Existing role values and the `role_onboarding_required` contract enum remain
  readable for released-client compatibility, but current server flows do not
  use them as customer authorization or present a role picker.
- Web and mobile expose create, participate, and owned-post management actions
  to every active account. Hidden role routes remain compatibility aliases only.
- The post owner alone creates or changes an interview session, including its
  final time, place, and external online-meeting link. The selected applicant
  can coordinate through chat and complete the participant-side session steps,
  but cannot overwrite the confirmed session details.

### Phase 2: Contract, Schema, And Compatibility

- [x] Add the `recruitment_type` discriminator through Flyway with an
  `interview` default and constrained initial values.
- [x] Add the survey and beta-test conditional fields through Flyway.
- [x] Add survey participation schema and indexes.
- [x] Thread `recruitment_type` through Spring DTOs, entities, repositories,
  services, OpenAPI, and shared TypeScript contracts.
- [x] Implement request-capability filtering for interview-post list and detail
  reads.
- [x] Protect iOS `1.0.0` and other unsupported clients from discovering or
  directly opening future non-interview posts.
- [x] Add server enablement flags before permitting survey or beta-test writes.

2026-08-21 compatibility checkpoint:

- Existing create requests that omit `recruitment_type` remain interview posts.
- Survey and beta-test field validation and backend workflows exist, but their
  creation flags default to `false`. A disabled type returns
  `recruitment_type_not_supported`; interview behavior remains enabled.
- New web and mobile interview-post API modules advertise
  `recruitment-types-v1`; unrelated API requests do not send the header.
- Legacy list filtering happens in SQL before pagination. Legacy direct detail
  access to a future non-interview post returns HTTP 426 with
  `client_upgrade_required`.
- Role-based customer authorization is removed under Phase 1; the compatibility
  filtering described here is independent of account role values.
- Flyway `V0027` owns the new post fields and `survey_participations`. It must
  pass a Docker/Testcontainers clean-database migration check before deployment.

Exit gate: existing interview regression passes and unsupported clients only
see interview posts.

### Phase 3: Survey API

- [x] Implement Google Forms URL validation.
- [x] Implement open, submit, withdraw, confirm, and participant-list routes.
- [x] Add ownership, self-participation, idempotency, and state-transition tests.
- [ ] Add admin/moderation visibility without logging sensitive URL details.

Exit gate: authenticated API smoke completes the full survey lifecycle.

### Phase 4: Beta-Test Recruitment API

- [x] Allow beta-test creation and conditional validation.
- [x] Permit applications and selection for beta tests.
- [x] Create chat only after selection.
- [x] Reject session, attendance, no-show, reward-confirmation, and interview
  review actions for beta tests.

Exit gate: organizer can recruit, select, and privately coordinate testers
without interview-only state leakage.

2026-08-21 backend checkpoint:

- Survey open/submit use database-backed idempotency and enforce post status
  and deadline; organizer confirmation and participant listing are owner-only.
- Google Forms responder URLs are restricted to HTTPS `docs.google.com/forms/`
  and `forms.gle` hosts, and external response contents are not stored.
- Beta-test applications do not create chat until selection, and all existing
  interview session/reward/review entry points reject non-interview posts.
- Targeted backend tests pass. The full 353-test API run has 352 passing tests;
  only the Testcontainers migration-startup test is blocked because Docker is
  unavailable in the current local environment.

### Phase 5: Web Template Adoption And Web UX

The public landing implementation within this phase is detailed in
`brainwave-inspired-landing-visual-reconstruction-plan.md`; this plan continues
to own the product-type capability and template-provenance boundaries.

- [x] Add the template provenance record and selected-source notices.
- [x] Add Pickolab Studio/Figma Community attribution to the repository's
  third-party notice location before shipping adapted source assets or icons.
- [x] Apply the approved color, typography, radius, surface, button, and icon
  mappings to tokens and shared primitives before feature-level restyling.
- [x] Adapt approved shell, filter, list-detail, form, and settings visual
  patterns across the authenticated web experience.
- [ ] Update landing positioning and type presentation.
- [ ] Update home, discovery, detail, creation, my activity, notifications, and
  profile role removal.
- [ ] Keep map interview-only and chat type-aware.
- [ ] Verify phone landing, compact/tablet fallback, laptop, and wide desktop.

2026-08-20 visual implementation checkpoint:

- Shared tokens, buttons, fields, badges, avatars, state surfaces, shell
  navigation, utility controls, and the selected Iconsax-derived icon subset
  now use the approved Pickolab-inspired visual language.
- Home, interview discovery/detail/creation/activity, map, chat, profile and
  settings, notifications, support/report, and account-deletion surfaces have
  received the feature-level visual pass.
- Ordinary content surfaces are opaque and border-led. Blur and floating
  shadows remain limited to true overlays such as popovers.
- This checkpoint covers presentation only. Multi-format recruitment behavior,
  role removal, type-aware chat, landing copy migration, and the canonical
  viewport matrix remain separate unchecked work in this plan.

Exit gate: the web product is visually coherent, branded, responsive, and
functionally type-aware without template-owned business logic.

### Phase 6: Mobile UX

- [ ] Port approved type selection and type-specific flows to Expo RN.
- [ ] Update lists, detail, creation, activity, notification, and profile copy.
- [ ] Complete released-client type selection and creation flows for Expo RN.
- [ ] Release-smoke the survey system-browser flow and explicit return state.
- [ ] Release-smoke beta-test privacy and interview-only control isolation.
- [ ] Verify native safe area, keyboard, permissions, and store-sensitive paths.

2026-08-28 local mobile checkpoint:

- Mobile post detail recognizes `survey` and uses the existing external-form
  lifecycle: fetch own participation state, idempotently record an open, open
  the approved URL through the system browser, then let the participant declare
  submission. A missing own state is the normal `204 No Content` first-visit
  result.
- Search and map keep surveys out of the interview application path by routing
  to detail. Beta-test detail retains application/chat behavior and hides
  interview session controls.
- Targeted Spring survey tests and mobile type checking pass in the current
  local checkout. This checkpoint does not enable writes, publish a client, or
  replace the Phase 7 release gate.

2026-08-29 participation-boundary checkpoint:

- The existing `entry_mode` database column is now represented in Spring and
  shared TypeScript contracts. Existing rows preserve their migration default;
  new requests default to `application_required`.
- Application-required surveys reuse `applications` for request and selection,
  without creating an apply-time or selection-time chat room. Direct surveys
  keep the established idempotent browser-open flow.
- Standard post responses now mask `external_url`. A verified `survey/open`
  action is the only mobile client path that receives the form URL, and rejects
  unselected users of application-required surveys.
- Mobile detail derives the sticky CTA from entry mode and application status:
  apply, review pending, or survey participation. Creation type/mode controls
  remain behind the existing extended-recruitment creation release gate.

2026-08-29 posting-flow stabilization checkpoint:

- Mobile resolves detail CTA priority in one selector: owner management, post
  closure, completed application, pending application, selected interview/beta
  chat, and direct or selected-survey external participation.
- `POST .../survey/open` remains the sole URL-bearing action. A normal pending
  survey application is a non-error state: it shows review copy and never
  requests or renders the external URL.
- Public post data exposes only `external_action_available`, never the URL, so
  a missing external link resolves to a disabled `설문 링크 준비 중이에요` CTA
  instead of a failed open request.
- Survey detail uses `온라인 · 외부 설문`; list metadata omits unknown/zero
  duration and renders a real participation deadline when it exists. The
  sticky detail action reserves its control height plus native bottom inset.
- Direct beta-test external launch remains unsupported because the current
  posting model has no beta distribution URL. Selected beta testers continue
  through the existing chat workflow; no fabricated test-start CTA is shown.

Exit gate: supporting mobile builds complete all three workflows.

### Phase 7: Legal, Store, Release, And Enablement

- [ ] Update service docs, privacy, terms, store worksheets, metadata, and
  reviewer instructions.
- [ ] Run Spring, contract, web, mobile, release, and authenticated smoke tests.
- [ ] Release capability-aware clients before enabling new types.
- [ ] Enable survey and beta test separately through server flags.
- [ ] Monitor invalid links, reports, support contacts, applications, and survey
  declarations before expanding providers or workflow depth.

## 15. Validation Matrix

### Authorization

- Any signed-in user can create a post.
- A user cannot participate in their own post.
- Only owners can manage posts and inspect participants.
- Existing role values do not change access.

### Interview Regression

- Offline/online validation remains correct.
- Application, selection, chat, schedule, session, attendance, reward, and
  review flows remain unchanged.
- Map only includes eligible in-person interviews.

### Survey

- Only supported HTTPS Google Forms URLs publish.
- Duplicate opens/submits are idempotent.
- Invalid state transitions are rejected.
- No application, chat, session, attendance, or review is created.
- URL query parameters do not appear in logs or notifications.

### Beta Test

- Beta post requires platform, test period, expected effort, and target.
- Users can apply and organizers can select.
- Chat is created only for selected testers.
- Interview session and no-show endpoints reject beta posts.
- Public responses do not expose private test links.

### Compatibility

- Unsupported clients only list interview posts.
- Unsupported direct detail receives a stable upgrade error.
- Existing contracts remain readable for released clients.

### Web UI

- Type filters and CTAs are correct.
- Template-derived components retain keyboard and focus behavior.
- Loading, empty, error, and selected states stay in the correct region.
- No template mock data, theme, auth, routing, or analytics remains.
- License notices and provenance are complete.

## 16. Success Criteria

This plan is complete when:

- customer roles no longer control product access,
- users can recruit for interviews, surveys, and beta tests,
- each type follows its own valid workflow without interview-state leakage,
- released clients are protected from unsupported post types,
- web and mobile use consistent type-aware language,
- the web design visibly benefits from licensed template patterns while
  retaining Hypofit architecture and brand identity,
- privacy, moderation, store, and legal surfaces match actual behavior,
- automated checks and authenticated release smoke pass.

## 17. Research Sources

Product-pattern references:

- [User Interviews - Recruit survey participants](https://www.userinterviews.com/recruit-survey-participants): survey recruitment, screening, participant communication, and follow-up research patterns.
- [Respondent - Research participant recruitment](https://www.respondent.io/): participant recruitment across multiple research methodologies.
- [Maze Panel](https://maze.co/features/research-panel/): targeted participant recruitment for moderated and unmoderated research.

Template and licensing references:

- [shadcn/ui Blocks](https://ui.shadcn.com/blocks): free open-source React-compatible UI blocks.
- [Flowbite license](https://flowbite.com/docs/getting-started/license/): MIT licensing for released open-source code.
- [Flowbite React Admin Dashboard](https://github.com/themesberg/flowbite-react-admin-dashboard): React and Tailwind dashboard reference.
- [Preline UI blocks](https://www.preline.co/blocks/): responsive Tailwind blocks; use only after per-source license review.
- [GitHub - Reusing other people's code](https://docs.github.com/en/get-started/learning-to-code/reusing-other-peoples-code-in-your-projects): verify and preserve source licensing before reuse.
- [Pickolab Studio Car Rent Figma frame](https://www.figma.com/design/E0zReee8AEmMWCMwD9BAtb/Car-Rent-Website-Design---Pickolab-Studio--Community-?node-id=44-16499&m=dev): approved visual-language reference, not a layout blueprint.
- [Figma Community copyright and licensing](https://help.figma.com/hc/en-us/articles/360042296374-Figma-Community-copyright-and-licensing): free Community files use CC BY 4.0 and require attribution unless additional terms apply.
- [Iconsax React](https://github.com/premier213/iconsax-react): official React implementation of the Vuesax/Iconsax family; package and license must be locked before adoption.

These references inform patterns only. They do not authorize unsupported claims,
copying unlicensed assets, or replacing Hypofit's product architecture.
