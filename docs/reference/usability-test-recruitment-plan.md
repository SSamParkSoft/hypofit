# Usability Test Recruitment Plan

Status: reference-deferred

Lifecycle review: 2026-09-06. Deferred design, not current implementation work.
U-01 through U-06 remain unexecuted proposals. Reactivate with an approved
initial use case after the active survey/beta contracts are stabilized; update
the roadmap and create or move a bounded implementation plan at that time.
Shared implementation authority: MainVault `adaptive-posting-creation-contract-and-flow-plan.md`.
Last updated: 2026-09-06
Owner: Future recruitment-type release track

## 1. Purpose

Define the smallest safe path for `USABILITY_TEST`. This type remains hidden
from released clients until its persisted contract and participation workflow
exist. It is not an alias for interview or beta test.

The proposed first implementation targets moderated remote usability tests only.
This is a planning assumption to settle at U-01, not a shipped restriction. It avoids
unverified direct task links, screen recording uploads, prototype hosting, and
in-person facility logistics.

## 2. Product Boundary

### Research-Backed Vertical Slice, 2026-09-06

[GOV.UK moderated usability guidance](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing)
describes observing participants attempt realistic tasks and recommends avoiding
leading task instructions. This supports a task-oriented type rather than
renaming an interview form. It does not prescribe Hypofit's backend or release
scope.

Proposed first fixture: a Web prototype, 40 minutes, remote moderator,
application-required entry, negotiated appointment, one named device requirement.

| Information | Proposed ownership | Release assertion |
| --- | --- | --- |
| Test purpose and broad task context | `service_summary` | Candidate understands what they will do without being coached toward success |
| Prior experience | `target_description` | No invented eligibility chips |
| Effort | Canonical duration | Minutes/hours render consistently |
| Appointment | Canonical schedule | Selection is not a confirmed appointment |
| Platform/device | New contract only after field audit | Never stored under `beta_test_*` |
| Prototype credentials | Selected private communication | Absent from public detail/push |
| Recording | No current supported field | No claim that recording is off or consent obtained |

Implementation checkpoints after U-01 approval: schema/parser readback first,
then session/chat authorization, then draft serializer and conditional UI.
Do not enable by adding the type to a capability list alone. Reject direct
entry until asynchronous tasks have their own supported completion semantics.

Acceptance includes cancelled appointments, pending/unselected access denial,
capability removal during draft recovery, and retention of task/device text.
This pass implements the common unsupported-draft guard, not this new workflow.

| P0 supports | Deferred |
| --- | --- |
| Organizer-reviewed participants | Unmoderated direct tasks |
| Remote live test | Screen/audio recording storage |
| Platform and device eligibility | Figma/prototype provider integrations |
| Duration and fixed/flexible schedule | Automated task completion evidence |
| Chat after selection | In-app research notes/analytics |

The participant joins a guided product test, not a generic interview. Detail
copy and creation labels must preserve that distinction.

## 3. Entry and Participation Model

P0 proposes `entry_mode=application_required` (the existing wire value).

1. Owner publishes test context and participant requirements.
2. Candidate applies.
3. Owner selects participants under the posting limit.
4. Selection authorizes chat for joining instructions.
5. Owner and participant agree a schedule when needed.
6. A confirmed appointment may reuse session infrastructure only after an
   explicit audit shows it has no interview-only assumptions.

`entry_mode=direct` is deferred. It requires an explicit task access,
expiry, authorization, and completion model before it can be exposed.

## 4. Proposed Creation Fields

| Field | Required in P0 | Notes |
| --- | --- | --- |
| Title, description, target participant | Yes | Reuse canonical posting fields |
| Test style | Yes | `MODERATED_REMOTE` only in P0 |
| Target platforms | Yes | One or more: iOS, Android, Web, Other |
| Participation modality | Yes | Remote/online label; no fake in-person option |
| Duration | Yes | Positive minute/hour value |
| Schedule mode | Conditional | Fixed slots, recurring availability, or after-selection negotiation |
| Device/environment | Optional | E.g. iPhone iOS 17+ |
| Task context | Yes | What participant will evaluate, without credentials |
| Location | No | Hidden in remote-only P0 |
| Compensation, limit, deadline | Existing | Reuse canonical recruitment controls |

Fields must become an explicit type configuration and API contract before the
mobile form exposes them. Do not store them in an overloaded free-text field.

## 5. Data and API Plan

- Add an additive, typed configuration for usability-test-specific values.
- Keep `recruitment_type=usability_test` server-disabled until API validation,
  detail projection, and owner/participant workflow tests exist.
- Capabilities expose the type only when P0 configuration is live.
- Keep prototype URLs, credentials, and recording links private. P0 should not
  accept such secrets as creation fields.
- Return stable field errors for missing platform, invalid duration, and
  schedule/location contradictions.

## 6. Detail Experience

Quick summary is duration, test format, and compensation. Detail prioritizes
target participant, platform/device requirements, task context, and real
participation flow. A selected participant sees confirmed time and joining
instructions before general posting metadata.

Do not show interview terminology such as "interview completed". Do not show
recording assurances unless an actual persisted recording policy exists.

## 7. Validation and Privacy

- Require at least one platform.
- Require task context that tells participants what category of product is
  being evaluated.
- Reject zero/negative duration.
- Require schedule information only for real-time moderated tests.
- Prevent public storage of credentials or unpublished product URLs.
- Do not collect sensitive accessibility, health, or demographic information
  as an implicit part of P0 eligibility.

## 8. Implementation Sequence

1. Audit session model for interview-only naming/constraints.
2. Define API DTO, persistence columns/configuration, and additive migration.
3. Implement server validation and detail projection.
4. Add capability support behind a disabled flag.
5. Implement mobile type configuration and staged fields.
6. Implement owner selection/chat and selected participant context.
7. Run create -> fetch -> render and state-transition integration tests.
8. Run a controlled non-production moderated remote test before production
   capability enablement.

## 9. Release Gate

### Work Packages And Evidence, 2026-09-06

The shared enum currently declares this type, but the write service does not
enable it. Existing prototype form controls are not proof of persistence.

- [ ] U-01: record whether remote-only moderated testing meets the first real
  organizer use case. `MODERATED_REMOTE` is a proposed concept, not an existing
  wire enum. If there is only one style, derive it rather than add a selector.
- [ ] U-02: map each proposed field to an existing column first. Use
  `service_summary` for task context when it already expresses the requirement;
  add distinct platform/environment fields only where semantic preservation
  needs them. Do not write usability data into `beta_test_*` fields.
- [ ] U-03: audit normalization in `InterviewPostWriteService` and
  `postingCreationPayload.ts`; non-interview delivery/location handling must
  not clear this type's data. Keep wire names/units from the adaptive plan.
- [ ] U-04: prove selection, authorized chat, scheduling, cancellation and
  completion with the existing services. Record exactly which session checks
  need a type-aware extension before exposing any schedule CTA.
- [ ] U-05: implement a vertical slice: API validation/readback, canonical
  draft migration, serializer, staged form, detail, owner management. Add a
  migration only for fields U-02 cannot represent. Preserve prior draft fields
  during type switching until the user deliberately clears them.
- [ ] U-06: run a Web-platform 40-minute remote test fixture with task context,
  negotiated schedule and cash reward. Test owner, pending, selected, closed,
  long criteria and large-font states. Reuse the adaptive plan commands and add
  only the missing type-specific regression tests.

Dependencies: shared creation contract -> explicit workflow compatibility ->
field persistence -> UI exposure -> internal smoke -> capability enablement.
Disabling creation must preserve already-created posting and participant reads.
Do not claim completion from the test's planned date passing.

Release only after the workflow has no interview-only side effects, all
visible inputs round-trip, private test access remains private, and a real
moderated test can be completed using owner/participant devices.
