# Focus Group Recruitment Plan

Status: reference-deferred

Lifecycle review: 2026-09-06. Group recruitment is a deferred design. F-01
through F-07 remain pending proposals. Reactivate when the first real group
use case and single-group scheduling/capacity scope are selected; update the
active roadmap before exposing the type.
Shared implementation authority: MainVault `adaptive-posting-creation-contract-and-flow-plan.md`.
Last updated: 2026-09-06
Owner: Future recruitment-type release track

## 1. Purpose

Define the release path for `FOCUS_GROUP` / FGI. A focus group is a group
session, not a collection of independent interview appointments. It remains
hidden until capacity, group scheduling, participant privacy, and organizer
communication are represented accurately.

## 2. P0 Boundary

### Research-Backed Group Semantics, 2026-09-06

[GOV.UK focus-group guidance](https://www.gov.uk/guidance/focus-group-study-qualitative-studies)
distinguishes facilitated group discussion from individual interviews.
[UK Statistics Authority confidentiality guidance](https://uksa.statisticsauthority.gov.uk/publications/ethical-considerations-associated-with-qualitative-research-methods/pages/6/)
warns that rich qualitative data can identify participants even when direct
identifiers are removed. These are design references, not Korean legal advice.

Hypofit implications and planned acceptance cases:

| Concern | Required decision/test before activation |
| --- | --- |
| One shared meeting | Every selected participant sees the same confirmed time; no per-person accidental drift |
| Capacity | One source of truth; select concurrently with one remaining place and prove only one succeeds |
| Schedule edit | Define owner change/cancel behavior once; do not leave old and new times in separate sessions |
| Withdrawal | Change only that participant; do not cancel the entire group |
| Public identity | Applicant/participant DTO must not enumerate other participants |
| Confidentiality | Do not promise anonymity within a live group or control of what others later disclose |
| Completion | Owner/group lifecycle and per-person attendance are different facts |

No hardcoded industry-average group size becomes a DB rule. Use the organizer's
explicit positive capacity. Proposed acceptance fixture remains four people,
90 minutes, one remote slot, individual organizer chat and no group chat.

F-03 must settle confirmed-time/cancellation ownership before F-05 writes code.
Until then, keep the type excluded from creation and preserve its saved draft
without converting it to an interview. The common guard is independently
implementable; group lifecycle is not claimed complete by that guard.

| P0 supports | Deferred |
| --- | --- |
| Organizer-reviewed applicants | Participant-to-participant group chat |
| One group time and place/mode | Multiple cohorts and waitlists |
| Limited participant count | Automated attendance/payment |
| Organizer-to-participant chat after selection | Video meeting provider integration |
| Remote or in-person session | Recording/consent flows |

P0 intentionally uses individual organizer-participant communication. Do not
expose other participants' names, profiles, messages, or contact data merely
because they are selected for the same group.

## 3. Workflow

1. Owner publishes the group topic, eligibility, format, time, and capacity.
2. Participant applies.
3. Owner selects participants while enforcing the group limit.
4. Each selected participant receives individual coordination through the
   existing authorized channel.
5. Owner communicates final group logistics individually.
6. Completion is recorded only when the existing system has a real event for
   it; P0 does not infer attendance.

The proposed P0 uses `entry_mode=application_required`, excluding `direct`.
Group capacity and privacy require
selection before a participant receives joining details.

## 4. Required Creation Fields

| Field | Requirement |
| --- | --- |
| Group topic/title and description | Required; clearly describe discussion theme |
| Target participant | Required |
| Mode | Required; remote or in-person |
| Duration | Required; positive minute/hour value |
| Schedule | Required; a specific group slot in P0 |
| Location | Required for in-person |
| Recruitment limit | Required and greater than zero |
| Preparation | Optional |
| Compensation and deadline | Existing canonical fields |

P0 proposes one fixed group time. Confirm this product assumption in F-01
before making existing scheduling options unavailable for this type.

## 5. Data and State Model

Start by checking whether a single posting's canonical fixed slot and
recruitment limit are sufficient. Add a group-session entity only if an actual
required transition cannot be represented. The design must distinguish:

- group capacity from total recruitment limit;
- selected count from attendance;
- cancelled group from participant withdrawal;
- organizer-private notes from participant-visible logistics.

State transitions must be explicit. Concurrent selection must lock or update
against the single group capacity so two administrators cannot over-select.

## 6. Detail Requirements

Quick summary is group duration, format, and compensation. The detail shows
the group date/time, expected participant count, location or remote format,
and preparation. The participation flow must explain selection and individual
logistics without suggesting that selected participants can see each other.

Do not use "interview" labels for the group session. Do not show a group-chat
CTA until a private group communication model exists.

## 7. API and Security Work

- Add a typed focus-group configuration and additive migration.
- Restrict entry mode to the existing wire value `application_required`.
- Enforce positive limited capacity in API and DB/business validation.
- Authorize individual chat after selection without exposing membership lists.
- Keep meeting links and final location details private until the actual
  selection/logistics policy authorizes disclosure.
- Preserve existing interview and beta selection behavior.

## 8. Test Matrix

| Scenario | Required assertion |
| --- | --- |
| In-person group | Location and fixed slot required |
| Remote group | No location required; remote format shown |
| Capacity one remaining | Concurrent selections cannot exceed limit |
| Selected participant | Sees own logistics, not other member data |
| Public detail | Shows safe group conditions only |
| Cancellation | Existing selected participants retain truthful status/copy |

## 9. Release Sequence and Gate

### Work Packages And Evidence, 2026-09-06

- [ ] F-01: settle one posting/one fixed group time as the initial product
  scope. With one group, reuse `recruit_count` and `recruitment_limit_mode`;
  do not add a second independent capacity counter.
- [ ] F-02: test selection locking in the existing applicant service with a
  remaining capacity of one and concurrent selection requests. The expected
  result is one success and one capacity conflict, never two selected users.
- [ ] F-03: decide where confirmed time, cancellation and per-person attendance
  belong. Inspect current one-to-one session constraints; do not represent
  group completion by completing unrelated interview sessions.
- [ ] F-04: map fixed time/location and proposed preparation to stored fields;
  audit non-interview serializer normalization before allowing in-person mode.
  Private meeting credentials remain in authorized organizer communication.
- [ ] F-05: implement create/read/detail/manage as one tested slice. Selected
  users see only their own application and authorized logistics; owner alone
  sees the participant list. Keep group chat absent.
- [ ] F-06: exercise a four-person 90-minute remote group and an in-person
  group. Check capacity, withdrawn/rejected applicants, time edits and group
  cancellation. Verify both owner and participant copy against stored states.
- [ ] F-07: record backend/fixture/device evidence and enabled client versions;
  enable this type only after F-02/F-03/F-05 pass. Rollback stops new creation
  without erasing participant records or stranding existing chats.

All F-items are pending. Existing enum membership alone does not implement
group recruitment. Follow shared validation commands in the adaptive plan,
adding targeted tests for the chosen group lifecycle rather than a new engine.

1. Define/review group session ownership and capacity locking.
2. Add API persistence, validation, capability flag, and safe detail DTO.
3. Implement mobile staged fields and owner management state.
4. Test create -> fetch -> select -> logistics -> render.
5. Run a controlled internal group session.
6. Enable capability only after privacy and over-selection tests pass.
