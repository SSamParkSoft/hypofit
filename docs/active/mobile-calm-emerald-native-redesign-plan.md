# Mobile Calm Emerald Native Redesign Plan

Status: active

Last updated: 2026-08-28

## Purpose

Redesign `apps/mobile` as a compact, native-feeling participant-recruitment
product without changing the established Expo Router, Spring API, Supabase
session boundary, or released interview workflow. The user-facing product noun
is `공고`; `인터뷰` remains only a recruitment type.

This plan implements the mobile UI portion of
`multi-format-participant-recruitment-and-web-template-adoption-plan.md`. That
plan remains authoritative for API capability gates, type-specific workflows,
and released-client compatibility.

## Audit Baseline

- Expo SDK `53`, React Native `0.79.6`, Expo Router `5.1.11`, NativeWind v4.
- Five primary tabs now render as `홈 / 공고 / 지도 / 채팅 / 프로필`; the
  compatibility route remains `interviews`.
- `AppScreen`, `ListSurface`, `PrimaryButton`, `SearchField`, and `TextField`
  are the reusable UI baseline; screen files still contain repeated legacy
  card, type, and metadata treatments.
- `tokens.ts` is small and mixes legacy warm-neutral values with newer green
  values. It needs a semantic Calm Emerald expansion before screen changes.
- `packages/contracts` already exposes `recruitment_type` and canonical
  `compensations`, while mobile still renders most post metadata through
  `interview_mode` and `reward_amount`.
- Backend capability gates protect released clients. New type-specific mobile
  create/participate controls must use the existing `recruitment-types-v1`
  contract before survey/beta writes are enabled.
- Chat threads intentionally hide the tab bar; map owns an edge-to-edge map
  and internal sheet scroll. Preserve both scroll ownership rules.

## Non-Goals

- No new UI framework or redesign dependency.
- No fake AI recommendations, analytics, trust scores, or synthetic metrics.
- No backend route/schema rename from `interview_posts` in this release.
- No universal application, selection, chat, scheduling, or location flow.
- No tablet-specific redesign beyond avoiding broken phone layout reuse.

## Design Contract

### Vocabulary

Use `공고`, `공고 만들기`, `공고 정보`, `내 공고`, `내 참여`, `참여자`, and
`보상` for product-wide concepts. Retain `인터뷰` only where
`recruitment_type === interview` or an interview-only workflow is explicit.

### Surfaces

- Repeated posts, conversations, and settings are flat rows with whitespace
  and subtle dividers.
- Cards are limited to a focused next action, selected map preview,
  recommendation, or destructive decision.
- Material effects are limited to navigation, map controls, sheets, and
  popovers, never repeated content rows.

### Tokens

| Token             | Value     |
| ----------------- | --------- |
| canvas            | `#F6F7F8` |
| surface           | `#FFFFFF` |
| surface secondary | `#F0F3F1` |
| divider           | `#DCE4DF` |
| text primary      | `#18211C` |
| text secondary    | `#657069` |
| text tertiary     | `#87918B` |
| brand             | `#0F7A4D` |
| brand strong      | `#0B5C3A` |
| brand soft        | `#E8F4EC` |
| accent            | `#B7FF5A` |

## Implementation Order

### P0: Global Foundations

1. Expand semantic color, typography, radius, spacing, and motion tokens.
2. Refresh the bottom tab bar as a restrained floating/material navigation
   layer while preserving tab roots, safe-area reserve, chat-thread hiding, and
   map reselect behavior.
3. Rename the visible `인터뷰` tab to `공고`; keep route/API names stable.
4. Provide reusable post type, compensation summary, row metadata, and status
   primitives only where repeated usage proves the extraction.

Completed in this pass:

- semantic canvas, surface, text, border, and emerald token values;
- floating tab footprint and tab-safe scroll reserves;
- visible `공고` tab label;
- canonical post type, compensation, mode, and location display helpers.

### P1: Primary Screens

1. Replace Home metric-card emphasis with actionable current work and recent
   discovery sourced only from available data.
2. Redesign the post discovery header, search, filter sheet, and flat rows.
3. Preserve the map architecture while replacing `인터뷰` copy, reducing
   competing controls, and aligning markers/sheets with the new row system.
4. Tighten the chat list into a flat conversation list with counterpart, post,
   last message, time, unread, and status hierarchy.
5. Reduce profile density to identity, account, preferences, support, and
   information groups. Keep deletion and logout inside account information.

Completed in this pass:

- Home uses real next-action rows instead of metric-card summaries.
- Home, discovery, map previews, detail, my activity, and creation now render
  `공고`/`참여자`/`보상` vocabulary where the concept is product-wide.
- Chat list explanatory chrome is reduced and its rows use posting context.
- Profile legal links are grouped as information rows; deletion/logout moved to
  account information.
- Map list mode now uses an unframed flat post list rather than a nested card.
- Post-management and counterpart context copy use `공고` where the wording is
  product-wide rather than interview-specific.

### P2: Workflow Surfaces

1. Convert post detail, create, my participation, and post-management copy to
   the new vocabulary while preserving interview-only decisions.
2. Render compensation arrays in new clients; retain legacy cash fallback.
3. Add capability-aware survey and beta-test UI only after their create and
   participation paths are fully mapped to existing API contracts.
4. Retain hidden legacy deep-link routes only as compatibility redirects.

Status: P2 remains active. The mobile create route now uses a local five-step,
draft-safe form shell with type-aware fields, review before publish, a root-stack
route that hides the tab bar, and the existing API adapter for legacy interview
requests. It deliberately preserves the existing server capability gates:
survey, beta-test, and extended-type creation must not be enabled or released
until their type-specific API persistence and release smoke are complete.

2026-08-28 checkpoint: the mobile post detail now branches by recruitment type.
Survey participation uses the existing external-form contract: read own status,
record an idempotent open, launch the approved URL in the system browser, then
let the participant declare submission. It never renders interview application,
session, attendance, no-show, or chat UI. Beta-test posts reuse application and
chat but suppress interview session UI and wording. Spring now exposes the
authenticated participant's survey state at
`GET /api/v1/interview-posts/{postId}/survey/participation`; a normal missing
state returns `204 No Content`, so first-time browsing is not treated as an app
error. Production creation flags remain off and no client or API deployment was
performed in this pass.

### P3: Quality Pass

1. Add only short 120-220ms continuity motion where existing navigation or
   sheet behavior benefits.
2. Verify touch targets, VoiceOver labels, dynamic text safety, contrast, and
   safe-area ownership.
3. Validate small, standard, and large phone viewports; run typecheck, mobile
   lint/test commands when available, Expo config, and runtime smoke.

2026-08-27 checkpoint: shared screen headers, section labels, search fields,
and text fields now use the semantic token values and the compact radius/type
scale. The shared screen reserve accounts for the floating tab bar. Remaining
P3 work is authenticated small/standard/large-device visual QA after a valid
social session is available in the simulator or a real device.

## Acceptance Gates

- Tabs are `홈 / 공고 / 지도 / 채팅 / 프로필` and retain current navigation
  behavior.
- No repeated list becomes a shadow-card grid.
- Existing interview post browsing, details, applications, map, chat,
  notification, profile, and account actions remain functional.
- New compensation renderers support cash, gift, points, product, coupon,
  other, and none without numeric assumptions.
- No released client can discover unsupported recruitment types.
- No new dark-mode-hostile styling is spread through screen files; new code
  uses semantic tokens.

## Validation Record

- 2026-08-29: the `공고` discovery screen moved from inline row expansion to
  a detail-first mobile flow. Flat rows now prioritize title, compensation,
  type/mode, personal participation status, condition, organizer, and
  time/place metadata. Search and filter controls remain in place; the filter
  sheet uses restrained selected states, loading uses row-shaped skeletons,
  and the error state can retry in place. Creation, application, survey, and
  beta-test workflow actions remain owned by their existing full-screen detail
  or creation surfaces.
- 2026-08-29: final discovery polish keeps compensation in primary text rather
  than brand green, lowers organizer and time/place metadata contrast, and
  removes the time icon from combined metadata. The list bottom inset now
  derives from the shared tab-bar height plus a small content clearance so the
  final row and divider remain scrollable above the navigation layer.
- 2026-08-29: discovery rows now omit organizer attribution in the list while
  retaining it on the detail screen. The compact row keeps type/mode/status,
  one-line title and compensation, one-line participation condition, and
  one-line time/place metadata. Type is brand text, modality is neutral text,
  and the status badge remains the only attribute badge.
- 2026-08-29: discovery rows use the existing per-user post-view record to
  distinguish new from read content. A row becomes quietly gray after detail
  open or after an application exists for the current user; the status badge
  remains intact and no new read badge or card treatment is added.
- 2026-08-29: posting detail now uses a document-style taxonomy, title, and
  information table without duplicate summary chips or circular info icons.
  Organizer detail remains compact, participation copy stays recruitment-type
  aware, and the root-stack detail uses a safe-area-aware sticky action only
  for existing application, external survey, post-management, or new
  application actions supported by current state.
- 2026-08-29: final detail polish reduces the detail title from 28px to 26px
  while retaining its two-line hierarchy. Selected participants no longer see
  duplicate `선정` or public `모집 중` status labels; their contextual banner,
  confirmed schedule, submitted application, and chat action remain in the
  existing order. Organizer information is hidden only for the post owner.
  The root-stack detail has no bottom tab bar, so its sticky action continues
  to reserve the native bottom safe area while the flex scroll region ends
  above the CTA; changing a detail route resets that scroll region to its top.
  Participation-method sections render only for the currently
  supported interview and beta-test workflows; survey content remains owned by
  its external-participation section.
- 2026-08-29: detail CTA resolution is state-first rather than screen-local.
  Application-required survey users see pending review copy until selected;
  direct surveys and selected users request the external URL only from the
  protected action endpoint. The root detail scroll reserve includes the sticky
  action height and safe area so the final participation content is reachable.
- 2026-08-29: posting discovery rows use semantic primary, secondary, and
  metadata text tokens. Title and reward remain dark anchors; type is brand
  text, modality is neutral, condition stays readable secondary text, and
  time/place/deadline metadata stays smaller and quieter.
- 2026-08-29: the primary tab bar returned from a floating material footprint
  to an edge-aligned native bar. It now reaches the screen bottom, includes the
  system bottom inset in its height, and uses a subtle top-and-side outline
  with rounded top corners instead of shadow. Chat-thread tab-bar hiding is
  unchanged.
- 2026-08-26: mobile TypeScript check passed.
- 2026-08-26: Expo public config resolved with SDK 53, React Native 0.79.6,
  version 1.0.1, `newArchEnabled: false`, and the updated location rationale.
- 2026-08-26: contract feature node test passed; Node reported the existing
  module-type warning for the standalone test helper.
- 2026-08-26: iPhone 17 Pro simulator captured the unauthenticated entry
  screen with safe-area spacing. Authenticated screen visual QA is blocked by
  the current simulator session receiving `auth_invalid_token` from profile
  bootstrap, so it remains a release-smoke task rather than a UI assumption.
- 2026-08-27: the public web returned Vercel HTTP 200 and the Spring API health,
  readiness, and API health endpoints returned `UP`/`ok`. The local Expo server
  remains connected to the booted iPhone 17 Pro simulator; the auth entry view
  rendered after the latest vocabulary update.
- 2026-08-28: targeted mobile TypeScript validation passed after the
  type-specific survey path was added. The surrounding Spring survey tests
  passed; its complete test suite remains blocked only by the local Docker
  environment required by Testcontainers. This is a local checkout record, not
  a deployed-client or authenticated-device smoke result.

## Validation

- `pnpm --dir apps/mobile typecheck`
- available mobile lint/test commands
- Expo public config inspection
- simulator checks for Home, Posts, Map, Chat, Profile, create, detail,
  search/filter, keyboard, tab switching, and safe areas.
