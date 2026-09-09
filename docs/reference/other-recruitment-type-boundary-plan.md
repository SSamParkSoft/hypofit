# Other Recruitment Type Boundary Plan

Status: reference

Lifecycle review: 2026-09-06. This is a non-enablement policy, not a generic
posting implementation project. O-01/O-02 verification is delegated to the
active adaptive creation plan; no pending test is marked passed by this move.
Last updated: 2026-09-06
Owner: Product model governance

## 1. Decision

`OTHER` must remain hidden. It is a taxonomy escape hatch, not a release-ready
generic posting type. Exposing it before its workflow is defined would let an
organizer create public tasks whose participation, privacy, compensation,
schedule, and support rules are unknowable to both participants and the API.

## 2. Current Rule

The following named types must be selected whenever they match the activity:

| User intent | Required type |
| --- | --- |
| Conversation about experience/opinion | `INTERVIEW` |
| External questionnaire | `SURVEY` |
| Product/service trial over a period | `BETA_TEST` |
| Guided product evaluation | `USABILITY_TEST` |
| Low-risk research procedure | `RESEARCH_EXPERIMENT` |
| Multi-participant discussion | `FOCUS_GROUP` |

The mobile creation screen must not expose `OTHER` merely to make every
possible label selectable. Capabilities remain the release source of truth.

## 3. Why a Generic Form Is Unsafe

### Research Synthesis And Concrete Guard, 2026-09-06

The provider/workflow references in the survey, beta, usability and focus-group
plans describe different admission and completion boundaries. They do not
define a universal catch-all task. Keeping OTHER unexposed is a Hypofit scope
decision, not an external standard.

The immediate implementation unit is the shared client guard:

1. Recover the saved type and content unchanged, including `other`.
2. Intersect server creation capability with implemented client workflows.
3. Prevent step advancement/publish for unsupported types or entry modes.
4. Offer a supported explicit choice; never rewrite type on capability fetch.
5. Preserve the existing draft on network failure or disabled capability.

Test with all four unimplemented types, survey/beta disabled after draft save,
missing capability response, and direct mode revoked. These negative tests are
implementation evidence; they do not constitute delivery of four new types.

A generic "other" form cannot answer core product questions:

- Does the participant apply, join directly, or receive a private action?
- Is selection or chat required?
- Is time a one-off appointment, a recurring window, or a multi-day period?
- Does the organizer need a location, a provider URL, credentials, or group
  capacity?
- Which information is public versus selection-only?
- What does completion mean?

Putting all optional fields on one generic form would recreate the long,
interview-shaped form this project is explicitly removing.

## 4. Future Exception Process

When a real use case does not fit a named type, do not enable `OTHER` first.
Instead create a short type proposal containing:

1. participant-facing label and one-sentence purpose;
2. eligibility and decision-critical summary fields;
3. participation mode(s) and exact state flow;
4. required/optional creation fields and validation;
5. public/private data boundary;
6. selection, chat, session, external-action, and completion behavior;
7. compensation, deadline, capacity, and cancellation rules;
8. backend contract, migration, capability gating, and mobile detail plan;
9. create -> fetch -> render and state-transition test cases.

If the proposal maps cleanly to an existing type, improve that type instead of
adding a duplicate taxonomy value.

## 5. Enablement Criteria

### Verification Ownership

The active adaptive creation plan owns the following negative capability and
draft checks. These remain pending there and are retained here as policy context:

- [x] O-01 (local API tests, 2026-09-06): extend the capability/write-guard tests to prove `other` remains
  absent and rejected even when the broad extended-types flag is true.
- [x] O-02 (local guard and Node fixtures, 2026-09-06): verify `CreateInterviewScreen` capability filtering and draft
  restoration cannot let an unsupported saved `other` draft reach publish.
  Preserve its text and offer selection of a supported type; do not silently
  serialize it as interview or delete it.
- [x] O-03: move the policy to reference and transfer O-01/O-02 to the active
  adaptive creation plan (2026-09-06). This completes document classification
  only. O-01/O-02 now have local API/Node fixture evidence; actual native
  draft-recovery interaction remains a release QA check.

The guard currently returns false for extended types in
`InterviewPostWriteService.isRecruitmentTypeCreationEnabled`. Do not change
that guard in this task. The immediate work is evidence and a usable recovery
path for unsupported drafts if the test exposes a gap.

`OTHER` can be reconsidered only if it becomes a specifically bounded,
supported workflow with a truthful user-facing label. At that point it should
normally graduate into a named recruitment type rather than remain `OTHER`.

Until then:

- server creation capabilities omit `other`;
- API write validation rejects it consistently;
- mobile does not display an unavailable row as a selectable option;
- existing persisted enum support remains additive for future compatibility.
