# Research Experiment Recruitment Plan

Status: reference-deferred

Lifecycle review: 2026-09-06. Deferred product/contract proposal, not a shipped
feature or current implementation backlog. R-01 through R-07 are preserved
for later planning. Reactivate only with a concrete supported research use
case and a settled participant-data boundary, then update the active roadmap.
Shared implementation authority: MainVault `adaptive-posting-creation-contract-and-flow-plan.md`.
Last updated: 2026-09-06
Owner: Future recruitment-type release track

## 1. Purpose

Define a constrained future path for `RESEARCH_EXPERIMENT`. This type is
hidden until the product can truthfully communicate research context, effort,
location/schedule, and participant preparation. It must not imply ethical
approval, institutional review, medical safety, or participant compensation
guarantees that Hypofit cannot verify.

## 2. P0 Boundary

### Research-Informed Disclosure Design, 2026-09-06

[GOV.UK informed-consent guidance](https://www.gov.uk/service-manual/user-research/getting-users-consent-for-research)
calls for understandable information about the research and voluntary continued
participation. Use this as research-design guidance, not a statement of Korean
legal compliance or institutional approval.

Before R-01 is closed, record one concrete study and answer:

- What exactly does the participant do, for how long, and with what preparation?
- What data does the organizer collect outside Hypofit, and who receives it?
- Is participation recorded? How is consent obtained and withdrawal handled?
- Who is accountable for questions, discomfort, cancellation and compensation?
- Which statements can be stored and shown accurately by the current model?

The current application submission is NOT study consent. Do not add a generic
mandatory consent checkbox that claims to solve an undefined study protocol.
Any dedicated disclosure fields require additive request/readback validation,
review of storage/retention, and owner edit behavior before UI exposure.

Candidate vertical-slice fixture remains a low-risk adult study with a
60-minute in-person procedure, location and preparation. This is a proposed
example, not approval to run a study. Missing location, deleted organization,
changed preparation and participant withdrawal need explicit expected states.
The shared unsupported-draft guard can ship independently while R-01 remains
unresolved. No new study creation flag is enabled by this documentation pass.

The proposed first release is low-risk, non-clinical research with adult
participants. This proposal is not a claim about existing moderation or legal
classification. Decide its enforceable product scope in R-01. The following
are excluded from the proposed first release:

- medical, clinical, diagnostic, or treatment studies;
- studies involving minors;
- sensitive biometric, health, financial, or identity data collection;
- mandatory recording or consent-document workflows not supported by the API;
- institutional approval verification claims.

If any excluded category is needed, product, legal, privacy, and moderation
requirements must be defined before a recruitment type is exposed.

## 3. Workflow

P0 proposes `entry_mode=application_required`:

1. Organizer publishes a plain-language study description.
2. Candidate reviews eligibility, participation effort, and preparation.
3. Candidate applies.
4. Organizer selects participants.
5. Selection authorizes schedule coordination and any existing chat/session
   workflow that is actually compatible with the experiment.

No direct participation, consent capture, data-upload flow, or experiment
completion state is assumed in P0.

## 4. Proposed Creation Fields

| Field | Required | Rule |
| --- | --- | --- |
| Title and plain-language description | Yes | Explain purpose without deceptive claims |
| Target participant | Yes | Natural language eligibility |
| Organizer/organization disclosure | Optional until model supports it | Never fake institution verification |
| Mode | Yes | In-person, online, or mixed only when supported |
| Duration | Yes | Positive minute/hour/day value |
| Schedule mode | Yes for real-time | Typed canonical schedule |
| Location | Required for in-person | Actual location text; map action only if supported |
| Preparation | Optional | What participants should bring/prepare |
| Recording/privacy disclosure | Hidden until persisted policy exists | Never hardcode assurances |
| Compensation, limit, deadline | Existing | Reuse common model |

## 5. Contract and Validation

- Use additive type configuration, DTO fields, and Flyway migration.
- Validate mode/location and real-time schedule relationships server-side.
- Preserve a typed duration unit rather than forcing minutes.
- Keep organizer verification as a factual data field only if the backend has
  a source of truth. No UI-only badges.
- Specify how excluded study categories are handled before enabling creation.
  Free-text validation cannot establish clinical risk, consent, or approval;
  do not invent an automatic keyword classifier or claim this is enforced now.

## 6. Detail and Participant Trust

The detail page must put eligibility, time/format, preparation, and organizer
identity before secondary metadata. Participation flow must state only known
steps. It must not claim that data is not recorded, anonymous, or approved by
an institution unless fields and policy support those statements.

## 7. Implementation Sequence

1. Product/legal review of permitted low-risk category and copy.
2. Define the type-specific config and persistence contract.
3. Implement API validation, capability flag, and safe public projection.
4. Implement mobile creation/detail fields and owner selection state.
5. Add integration tests for in-person and online low-risk examples.
6. Conduct controlled non-production operational review.
7. Enable only after support/moderation and rollback procedures exist.

## 8. Release Gate

### Work Packages And Evidence, 2026-09-06

- [ ] R-01: document the initial supported study with the product owner, which
  participant data is collected, and the existing reporting/moderation path.
  Resolve any category requiring a new consent/data flow before public release.
- [ ] R-02: create a field-to-storage matrix. Reuse `service_summary`,
  `target_description`, canonical duration/schedule, location and compensation.
  Preparation is proposed additional data; select a distinct field only if the
  existing description cannot meet the real display requirement.
- [ ] R-03: inspect the server and mobile non-interview location normalization.
  An in-person form must persist address/coordinates and return safe location
  data; never enable it on the strength of a visible location input alone.
- [ ] R-04: trace application -> selection -> chat -> scheduled participation
  through existing service transactions. Add type support where needed and
  retain ownership checks, limits and notification atomicity.
- [ ] R-05: implement DTO/persistence/readback before the mobile form. Reuse
  actual `entry_mode`, `duration_unit`, `schedule_mode` values; do not ship
  uppercase planning labels as new enum values.
- [ ] R-06: verify a low-risk 60-minute in-person fixture, future fixed slot,
  real test location and preparation text. Include missing location, long
  preparation, owner profile unavailable and legacy interview regression.
- [ ] R-07: record type-specific test commands and device results, check public
  disclosure text, then enable this type independently. A flag rollback must
  stop new writes while preserving existing participant state.

Source starting points are the shared contract, `postingCreationPayload.ts`,
`InterviewPostWriteService`, and the applicant/session workflow. This planning
audit does not certify legal compliance or introduce a medical-study platform.

Do not expose `research_experiment` until all copy can be supported by stored
facts, the limited category boundary is enforceable, and the participant
workflow does not depend on unsolved consent, recording, or sensitive-data
handling.
