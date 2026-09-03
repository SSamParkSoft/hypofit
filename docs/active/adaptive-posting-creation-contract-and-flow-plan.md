# Adaptive Posting Creation Contract And Flow Plan

Status: active

Last updated: 2026-09-01

## Purpose

Make Expo mobile posting creation a type-aware, draft-safe five-step task
without allowing UI fields, server capability, stored data, or detail rendering
to drift apart.

The product goal is not a generic form builder. A creator should only see
fields relevant to the chosen recruitment type and entry mode, and every value
that can be entered must either be durably preserved and rendered back or not
be shown yet.

This plan owns the creation-flow data contract and its mobile UX. It does not
replace the existing plans:

- `production-reliability-and-posting-create-stabilization-plan.md` owns
  authenticated deployment smoke, idempotency, timeout budgets, and release
  observability.
- `multi-format-participant-recruitment-and-web-template-adoption-plan.md`
  owns recruitment-type workflows, participant authorization, external-form
  access, released-client compatibility, and type enablement.
- `mobile-calm-emerald-native-redesign-plan.md` owns the visual language and
  broader Expo screen work.

## Scope

In scope:

- mobile create flow and a future shared edit-flow adapter;
- canonical posting draft, serialization, draft migration, validation, and
  review rendering;
- posting-create API/DB fields needed to preserve already-visible creation
  inputs;
- server-owned creation capability read model;
- type-specific conditional fields only when their type workflow is actually
  supported;
- round-trip persistence and phone-sized creation QA.

Out of scope:

- post list/detail redesign, home, map, chat, profile, auth, or bottom-tab
  redesign;
- new external survey providers before they are supported and secured by the
  API;
- a generic application-question builder;
- a generic JSON form engine, a microservice split, or a schema registry.

## Current Verified Baseline

The current local Expo screen is already a five-step root-stack task route:

```text
1. type + entry mode
2. content
3. delivery method
4. recruitment conditions + compensation
5. review + publish
```

It intentionally sits outside `/(tabs)`, so the tab bar is not shown during
creation. The footer is a sibling of the scroll view, not an overlay, and uses
the native safe-area inset. AsyncStorage stores one debounced draft with a
persisted `clientSubmissionId`; the existing reliability plan owns its
idempotent create semantics.

The client currently exposes these recruitment types:

```text
interview, survey, beta_test,
usability_test, research_experiment, focus_group, other
```

The server accepts the same discriminator but enables writes independently:

```text
interview: always enabled
survey: SURVEY_RECRUITMENT_CREATION_ENABLED
beta_test: BETA_TEST_RECRUITMENT_CREATION_ENABLED
extended types: EXTENDED_RECRUITMENT_CREATION_ENABLED
```

Those flags default to `false`. A client must not let a user spend five steps
on a type that the current server will reject.

## Non-Negotiable Invariants

1. A visible editable field is persisted, returned, and rendered after create.
   Otherwise it is hidden until its contract is implemented.
2. A selectable type is currently creatable according to a server-owned
   capability response. Disabled types are either absent or explicitly marked
   `준비 중` before selection; they never fail only at publish time.
3. New canonical fields are the source of truth. Legacy fields remain derived
   compatibility values during the `/api/v1` support window.
4. `entry_mode` means workflow admission (`application_required` or `direct`).
   `participation_mode` means how participation is delivered
   (`online`, `offline`, or `hybrid`). Do not overload either name.
5. Review must show every meaningful persisted creation value.
6. Server validation remains authoritative. Mobile validation presents the
   same rule near the field and does not replace server enforcement.
7. External URLs remain masked from normal post responses. Survey open remains
   the only URL-bearing participant action for the currently supported Google
   Forms workflow.

## Current Field Audit

| Creation input | Current create payload / persistence | Required action |
| --- | --- | --- |
| title, description, target participant | Persisted | Keep; split target lines into `participant_requirements` only as an additive read aid. |
| compensation, including multiple values | Persisted in `compensations` with legacy `reward_amount` | Keep; improve formatting only after contract work. |
| recruitment limit UI | UI distinguishes limited/unlimited; wire still emits `recruit_count = 0` for unlimited | Add canonical mode; retain `0` only in the legacy adapter. |
| duration value/unit | Serializer derives `duration_minutes`; API limits it to 10-240 | Add canonical value/unit and preserve legacy minutes as a derived compatibility value. |
| fixed slots / recurring windows | Both become `schedule_options: string[]` | Preserve mode and structured slot data; keep legacy strings derived. |
| schedule note | Not serialized | Hide until persisted or add the contract before keeping it visible. |
| interview mode/location | Persisted only for interview; non-interview normalization clears them | Do not expose extended-type delivery/location fields before their contract is supported. |
| survey provider/url/data notice/deadline | Google Forms only, persisted; URL stays masked in normal responses | Keep Google Forms as the only provider for this phase. |
| general deadline | UI collects it for all types; serializer persists it only for survey | Make deadline generic before showing it for other enabled types, or limit its UI to survey. |
| beta platforms/start/end | Persisted | Keep. |
| beta environment/workflow note | Draft/UI only; not serialized | Add explicit persistence before exposing them for an enabled beta flow. |

## Canonical Model

The mobile draft remains a UI model, not a direct API DTO. It is explicitly
mapped to a versioned additive `/api/v1` request.

```text
PostingCreationDraft v2
  recruitmentType
  entryMode
  title, description, targetParticipant, participantRequirements[]
  participationMode
  duration { value, unit }
  schedule { mode, fixedSlots[], recurringWindows[], note }
  location
  recruitmentLimit { mode, count? }
  deadline?
  compensations[]
  survey { provider, url, dataNotice }?
  beta { platforms[], environment?, workflowNote?, startsAt?, endsAt? }?
```

The API/DB model should use already-migrated columns where they express the
same meaning (`entry_mode`, `participation_mode`, `schedule_mode`,
`duration_mode`, `compensations`). Add fields only where the current columns
cannot recover user intent:

- `duration_value` and `duration_unit`;
- structured schedule slots and an optional schedule note;
- recruitment-limit mode and nullable count;
- generic participation deadline where supported;
- beta environment and workflow instructions.

PostgreSQL JSONB is acceptable for a bounded, versioned schedule-slot shape;
do not create a generalized form-answer store. Fixed slots and recurring
windows must remain structurally distinct.

Legacy behavior:

```text
duration_minutes = derive(duration.value, duration.unit)
schedule_options = derive(schedule)
recruit_count = 0 only when recruitmentLimit.mode = unlimited
```

When reading, canonical values win. Existing rows without them retain current
minutes/string-list/zero-sentinel presentation through a legacy adapter.

## Server-Owned Creation Capability

Add a small read-only capability response under the posting API. It must be
derived from the same Spring properties and type rules that guard writes, not
from a duplicated mobile flag.

Illustrative response shape:

```json
{
  "types": {
    "interview": { "enabled": true, "direct_entry": false },
    "survey": {
      "enabled": false,
      "direct_entry": true,
      "external_providers": ["google_forms"]
    },
    "beta_test": { "enabled": false, "direct_entry": false }
  }
}
```

This endpoint does not expose secrets, external URLs, or a feature-flag
management surface. Its only purpose is to make creation UI truthful. The
server remains authoritative if capability configuration changes between read
and submit; mobile must still present a calm `준비 중` result for that race.

## Execution Plan

### P0-A: Stop Data Loss

1. Create a field matrix from mobile control through draft, serializer,
   request parser, command, entity/repository, response, and detail/review.
2. Remove or hide every current field that fails the full path until its
   persistence work lands.
3. Connect existing `V0028` fields that already represent the needed meaning.
4. Add narrowly scoped Flyway migrations for fields that cannot be represented
   without losing intent. Preserve `B0024` and previous migrations unchanged.
5. Add create -> read -> mobile read-model fixtures for interview, survey, and
   beta test. A `201 Created` alone is insufficient evidence.

Exit gate: every visible input in an enabled type round-trips without losing
meaning.

### P0-B: Make Type Selection Truthful

1. Implement Spring capability DTO/controller/service using the write-service
   rules as its source.
2. Add a shared TypeScript contract and a cached mobile query.
3. Build Step 1 from server capability. Do not rely on client-only
   `allowsDirect()` for availability.
4. Keep the current release flags off until each type passes its own workflow
   and release smoke.

Exit gate: a disabled type cannot lead to a late publish rejection from normal
   UI navigation.

### P0-C: Put Validation at the Field

1. Preserve the API error envelope and `field_errors` array; do not replace it
   with a breaking object map.
2. Introduce mobile `FormErrors` keyed by canonical draft field names.
3. Run local validation on blur and step transitions, render the message below
   the related control, and announce it accessibly.
4. Translate server snake_case errors into the same field keys.
5. Scroll to and focus the first invalid visible field after a failed step or
   publish. Do not show only a generic 422 sentence.

Exit gate: every known server validation error identifies an actionable field
in the creation UI.

### P0-D: Migrate Drafts Safely

1. Set the new schema to `PostingCreationDraft v2` only after the canonical
   field shape is finalized.
2. Implement explicit `v1 -> v2` normalization with fixture coverage.
3. Preserve recoverable v1 values; never send unknown stale fields to the API.
4. If a draft is irrecoverable, retain the raw data until the user explicitly
   starts over, and present calm recovery copy instead of silently deleting it.
5. Define one-draft policy clearly: `계속 작성` restores it; `새 공고 만들기`
   starts fresh without immediately restoring old content; explicit discard is
   the only destructive action.

Exit gate: current devices with v1 drafts can reopen, migrate, and submit a
valid v2 draft without duplicate-create risk.

### P1: Complete Canonical Create/Read Contract

1. Map duration, schedule, recruitment limit, deadline, and type detail data
   through Spring DTO/parser/commands/entity/repository/read model/response.
2. Preserve API compatibility by making additions optional in `/api/v1`.
3. Update review and detail formatters to prefer canonical fields with legacy
   fallbacks.
4. Extend serializer fixtures and Spring PostgreSQL integration tests for
   legacy and canonical requests.

Exit gate: new post data renders as entered after restart and legacy interview
posts still create, read, and display unchanged.

### P2: Enable Types Incrementally

1. Interview remains the baseline fully enabled flow.
2. Survey remains Google Forms only until provider expansion has an explicit
   security and external-access plan.
3. Beta test is enabled only after platforms, period, environment, and
   instructions round-trip and the selected-tester workflow is release-smoked.
4. Usability test, research experiment, focus group, and other remain hidden
   or marked unavailable until their participation/detail/CTA behavior is
   separately implemented. Do not present an interview workflow as theirs.

Exit gate: each enabled type has a complete creation, read, detail, and
participant next-action path.

### P3: UX And Accessibility QA

1. Keep the root-stack, tab-free focused flow and sibling sticky footer.
2. Verify 320/360/390/430 phone widths, Dynamic Type, VoiceOver, iOS and
   Android date controls, keyboard visibility, and back/draft behavior.
3. Maintain 44 pt interactive targets, including compact chips and calendar
   controls.
4. Verify review rows reflow at larger text sizes rather than relying on a
   fixed label column.

## Implementation Checkpoint: 2026-09-01

Completed locally in this checkout:

- The existing five-step root-stack flow remains tab-free and draft-backed.
- Step 1 now reads a Spring-owned `creation-capabilities` response. It shows
  only types the current mobile write contract can complete; interview is the
  safe fallback, and direct participation is offered only when the server
  returns that type.
- Survey capability follows the existing server flag. Beta is deliberately not
  advertised to mobile yet, even if its broad write flag is set, until the
  persisted environment/workflow data receives full round-trip and release
  smoke coverage.
- Mobile uses server `field_errors` to return a failed publish to the relevant
  step. Content, duration, survey URL/notice, beta platform/dates, location,
  schedule, compensation, recruitment count, and deadline errors render next
  to the matching control. The generic error remains only for unknown API
  fields that cannot safely be located.
- Title, description, and participant criteria now reject placeholder-only
  text that contains no completed Korean syllable, Latin letter, or number.
  This narrowly prevents observed keyboard-smash posts without attempting to
  infer content quality.
- The draft is now persisted as schema v2. The v1-shaped storage record is
  normalized explicitly and retains recoverable fields and its stable
  `clientSubmissionId`.

Completed locally after the checkpoint:

- A failed step transition or mapped server validation response now scrolls to
  the first visible invalid control and focuses it when that control accepts
  text. Selection-only controls scroll into view without opening the keyboard.
- The Node fixture now migrates a v1-shaped draft into v2 while preserving its
  `clientSubmissionId`, selected fixed/recurring schedule values, and selected
  beta platforms. Missing v2-only text fields receive their safe empty values.

Still active:

- survey and beta creation device/participant-flow proof after their release
  flags are intentionally enabled; and
- release smoke before enabling survey or beta creation in production.

### Interview Device QA: 2026-09-02

The interview creation flow passed interactive QA in the current mobile app:
the five-step flow completed, the review/publish path worked, and the creator
confirmed the resulting interview posting behavior. This closes the
device-facing interview creation gate. It does not enable survey or beta
creation, which remain separately gated by their flags and release smoke.

This checkpoint is local implementation evidence only. It does not enable a
server flag, deploy the endpoint, or claim a store release.

### P1 Contract Progress: 2026-09-01

The canonical create/read contract is now wired locally as an additive `/api/v1`
extension:

- `duration_value` / `duration_unit` are persisted as the source value/unit;
  `duration_minutes` remains a derived legacy value for released clients.
- `schedule_mode`, fixed slots, recurring windows, and schedule note persist
  separately. Legacy `schedule_options` remains available for old detail/list
  clients.
- `recruitment_limit_mode` persists separately; `recruit_count = 0` remains
  only the legacy wire representation of unlimited recruitment.
- `participation_deadline_at` is preserved for all supported types rather than
  being cleared solely because a post is not a survey.
- beta-test environment and workflow notes persist and are returned to mobile.
- Mobile serializer tests and Spring parser/service tests cover the additive
  payload. The Docker-backed PostgreSQL integration test verifies canonical
  read-back for duration, schedule, recruitment limit, beta environment, and
  beta workflow note.

The write capability response still deliberately hides beta creation from the
mobile UI until this persistence path receives the required full round-trip and
release smoke. No creation feature flag or deployment changed.

## Test Matrix

| Case | Required proof |
| --- | --- |
| Interview / online / review required | create -> fetch -> detail preserves duration, schedule, reward, count. |
| Interview / offline / fixed slots | selected location and each fixed slot persist. |
| Survey / review required | URL remains masked before approval; deadline and notice persist. |
| Survey / direct | enabled capability permits direct entry and survey open is the only URL-bearing action. |
| Beta test | platforms, period, environment, instructions, compensation round-trip. |
| Disabled type | unavailable before form completion; direct API still rejects correctly. |
| Unlimited recruiting | UI displays unlimited; legacy wire uses zero only through adapter. |
| v1 draft | migration produces a valid v2 draft or an explicit recoverable state. |
| Server field error | mobile focuses and announces the matching visible field. |
| Retry after timeout | stable `clientSubmissionId` returns one post. |

Run targeted Spring parser/service/PostgreSQL integration tests, mobile
typecheck, serializer/draft fixtures, and Expo simulator/device checks. Do not
claim deployment, feature enablement, or store release from local validation.

## Completion Criteria

This plan is complete only when:

1. no enabled creation field is silently dropped;
2. selection availability reflects the actual server write capability;
3. duration, schedule, recruitment limits, and deadlines retain their intended
   meaning across creation and readback;
4. client and server validation identify the same actionable field;
5. v1 drafts migrate safely;
6. type-specific creation is enabled only after its full participant workflow
   is release-smoked; and
7. the existing interview create flow remains compatible with released clients.
