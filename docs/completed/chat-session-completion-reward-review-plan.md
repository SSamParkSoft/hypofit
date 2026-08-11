# Chat Session Completion, Reward Confirmation, and Review Plan

Status: completed - implementation shipped, follow-up QA notes retained

Last updated: 2026-06-25

## Purpose

Add a production-grade post-selection workflow to the chat thread so founders
and respondents can move from selected interview application to meeting
confirmation, completion, reward confirmation, and review without turning chat
into an ambiguous manual process.

This document is retained as an implementation record. The backend state model,
mobile UI, workflow APIs, tests, and GPU deployment have been implemented. Any
new changes to the workflow should start from a new `docs/active/` plan instead
of reactivating this historical plan.

## Source Basis

Official and product-pattern references to keep in mind:

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
  - UGC apps need reporting, blocking, timely moderation response, and public
    contact information.
  - App review requires complete metadata, reviewer access, and live backend
    services.
  - Real-time person-to-person services may use payment methods other than IAP,
    but the business model must be clear and not misleading.
- Google Play User Generated Content policy:
  https://support.google.com/googleplay/android-developer/answer/9876937
  - 1:1 chat and UGC flows need in-app report/block handling and appropriate
    moderation.
- Stripe Connect marketplace payment docs:
  https://docs.stripe.com/connect/marketplace/tasks/accept-payment
  - Marketplace payments commonly separate service delivery from fund transfer.
    Hypofit does not yet process payments, so MVP copy must avoid implying
    escrow, guarantee, or platform-controlled settlement.
- Airbnb-style marketplace review pattern:
  - Two-sided reviews are usually available only after the real-world service
    happened, and are often hidden until both sides submit or a review window
    closes. Hypofit should start with internal trust records before public
    reputation exposure.

Repository references:

- `docs/reference/app-store-play-store-review-readiness.md`
- `docs/reference/google-play-data-safety-worksheet.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/operator-support-moderation-runbook.md`
- `docs/completed/db-concurrency-chat-transaction-hardening-plan.md`
- `docs/completed/chat-state-transition-hardening-plan.md`
- `docs/completed/native-push-notification-apns-fcm-plan.md`
- `docs/reference/error-observability-contract.md`

## Original Code State

At the start of this plan, backend session APIs were:

- `POST /api/v1/sessions/`
- `PATCH /api/v1/sessions/{session_id}`
- `POST /api/v1/sessions/{session_id}/complete`
- `POST /api/v1/sessions/{session_id}/cancel`
- `POST /api/v1/sessions/{session_id}/no-show`

Current database/session model:

- `interview_sessions.status` supports:
  - `scheduled`
  - `completed`
  - `canceled`
  - `no_show`
- `attendance_records` already exists with:
  - `founder_confirmed`
  - `respondent_confirmed`
  - `no_show_party`
  - `completed_at`

Important original limitation:

- Completion was one-step. `complete_session` immediately changed the session to
  `completed`, marks both founder and respondent as confirmed, updates the
  application to `completed`, sends notifications, and closes the chat room.
- There was no separate reward confirmation state.
- There was no review state.
- The mobile chat thread only had founder-side pre-session actions:
  `답변 보기`, `선정`, `반려`.

## Product Decision

Do not implement this as a single "완료" button.

The workflow must keep these concerns separate:

1. Real-world meeting happened.
2. Interview session is complete.
3. Founder says reward was paid.
4. Respondent confirms reward was received.
5. Each side can leave a review.
6. Either side can report no-show, non-payment, or another issue.

For MVP, Hypofit records self-reported completion and reward confirmation. It
does not guarantee reward payment, process escrow, or settle funds.

Required copy rule:

- Use `표시`, `확인`, and `기록` for reward-related actions.
- Do not use `정산 완료`, `지급 보장`, `Hypofit이 지급`, or similar wording
  until Hypofit actually processes payments.

## Target Workflow

### Happy Path

```text
application.applied
  -> founder selects respondent
application.selected
chat_room.selected
  -> founder creates or confirms schedule
interview_session.scheduled
  -> scheduled time passes or either side opens completion action
attendance pending
  -> founder confirms meeting happened
  -> respondent confirms meeting happened
interview_session.completed
application.completed
chat_room.closed or completed-readonly
  -> founder marks reward paid
reward.founder_marked_paid
  -> respondent confirms reward received
reward.respondent_confirmed
  -> founder and respondent can write reviews
reviews submitted
```

### MVP-Reduced Happy Path

If full mutual confirmation is too much for the first cut, use this reduced
workflow:

```text
selected
  -> scheduled
  -> founder marks interview complete
  -> respondent receives "만남 확인" prompt
  -> respondent confirms
  -> founder marks reward paid
  -> respondent confirms reward received
  -> both can review
```

Do not close the chat completely until reward confirmation or dispute decision
is settled. If the chat room becomes completed-readonly, allow system actions
and support/report entry points.

### Problem Paths

No-show:

```text
scheduled
  -> either participant reports no-show
  -> no_show recorded with reported party and reporter role
  -> system message added
  -> notification sent
  -> support/report route available
```

Reward not received:

```text
completed
  -> founder has not marked paid
  -> respondent can request payment status or report issue
  -> founder marks paid
  -> respondent can dispute instead of confirming
```

Dispute:

```text
reward.founder_marked_paid
  -> respondent disputes
  -> reward.disputed
  -> support ticket/report created or linked
  -> operator can inspect audit events and chat context
```

## Backend Plan

### 1. Expand Session Completion Semantics

Add explicit confirmation timestamps to attendance records.

Proposed migration:

```text
attendance_records
  founder_confirmed_at timestamptz null
  respondent_confirmed_at timestamptz null
  completed_by uuid null references app_users(id)
  completion_source text null
  no_show_reason text null
  disputed_at timestamptz null
  dispute_reason text null
```

Keep existing booleans for backward compatibility during migration, or replace
them only after all reads are migrated.

State transition rule:

- `confirm-attendance` creates or updates one attendance record per session.
- If both sides have confirmed, session becomes `completed`.
- If one side confirms, session remains `scheduled` but workflow read model
  reports `attendance_pending_counterpart`.
- Existing `complete` endpoint should become either:
  - compatibility wrapper around `confirm-attendance`, or
  - founder-only complete request that still waits for respondent confirmation.

Do not keep the current behavior where one user action sets both confirmations.

### 2. Add Reward Confirmation Model

Create a separate table instead of overloading session status.

Proposed table:

```text
reward_confirmations
  id uuid primary key
  session_id uuid not null references interview_sessions(id)
  application_id uuid not null references applications(id)
  founder_id uuid not null references app_users(id)
  respondent_id uuid not null references app_users(id)
  amount integer not null
  status text not null
    check in (
      'pending',
      'founder_marked_paid',
      'respondent_confirmed',
      'disputed',
      'canceled'
    )
  founder_marked_paid_at timestamptz null
  respondent_confirmed_at timestamptz null
  disputed_at timestamptz null
  dispute_reason text null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Uniqueness:

```text
unique(session_id)
```

Rules:

- Reward row is created when session completes.
- Founder can call `mark-paid` only after session completion.
- Respondent can call `confirm` or `dispute` only after founder marked paid.
- Do not expose payment method fields in MVP unless actually needed.
- Do not ask users to upload payment evidence in the first cut; this increases
  privacy and moderation scope.

### 3. Add Review Model

Create internal trust reviews first.

Proposed table:

```text
interview_reviews
  id uuid primary key
  session_id uuid not null references interview_sessions(id)
  reviewer_id uuid not null references app_users(id)
  reviewee_id uuid not null references app_users(id)
  reviewer_role text not null check in ('founder', 'respondent')
  rating integer not null check (rating between 1 and 5)
  tags jsonb not null default '[]'
  comment text null
  visibility text not null default 'private'
    check in ('private', 'public_later', 'hidden', 'removed')
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Uniqueness:

```text
unique(session_id, reviewer_id)
```

Rules:

- Reviews are allowed after session completion.
- For MVP, reviews are not publicly displayed by default.
- Reviews should feed future trust signals after moderation policy is clearer.
- Do not incentivize positive reviews.
- Do not ask for App Store / Play Store ratings inside this flow.

### 4. Add Workflow Read Model

Add an API read model so mobile does not infer workflow state from many
entities.

Endpoint:

```text
GET /api/v1/chat-rooms/{room_id}/workflow
```

Response shape:

```ts
type ChatWorkflowStep =
  | "application_review"
  | "selected"
  | "schedule_needed"
  | "scheduled"
  | "attendance_confirmation_needed"
  | "attendance_counterpart_pending"
  | "completed"
  | "reward_payment_needed"
  | "reward_confirmation_needed"
  | "reward_confirmed"
  | "review_needed"
  | "closed"
  | "problem_reported";

interface ChatWorkflowRead {
  step: ChatWorkflowStep;
  title: string;
  description?: string;
  primary_action?: WorkflowAction;
  secondary_action?: WorkflowAction;
  danger_action?: WorkflowAction;
  session?: Session | null;
  reward?: RewardConfirmation | null;
  my_review?: InterviewReview | null;
  counterpart_review_submitted?: boolean;
}
```

Workflow actions should be server-derived:

```ts
type WorkflowAction =
  | "open_application_answers"
  | "select_application"
  | "reject_application"
  | "create_schedule"
  | "confirm_attendance"
  | "mark_no_show"
  | "mark_reward_paid"
  | "confirm_reward_received"
  | "dispute_reward"
  | "write_review"
  | "open_support_report";
```

### 5. Add Mutation APIs

New endpoints:

```text
POST /api/v1/sessions/{session_id}/confirm-attendance
POST /api/v1/sessions/{session_id}/reward/mark-paid
POST /api/v1/sessions/{session_id}/reward/confirm
POST /api/v1/sessions/{session_id}/reward/dispute
POST /api/v1/sessions/{session_id}/reviews
GET  /api/v1/sessions/{session_id}/reviews
```

Optional compatibility:

```text
POST /api/v1/sessions/{session_id}/complete
```

If retained, update it so it does not falsely set both confirmations unless the
actor is an admin/operator.

### 6. Notifications and System Messages

Add notification types:

```text
attendance_confirmation_requested
attendance_confirmed
session_completed
reward_marked_paid
reward_confirmed
reward_disputed
review_requested
review_received
```

Chat system messages:

```text
상대가 인터뷰 만남을 확인했어요.
인터뷰가 완료됐어요.
창업자가 사례비 지급을 완료했다고 표시했어요.
사례비 수령이 확인됐어요.
후기가 등록됐어요.
문제가 접수됐어요.
```

Keep messages factual and short. Do not imply the platform verified payment
unless it did.

### 7. Authorization and Concurrency

Authorization:

- Only founder and respondent of the session can mutate workflow state.
- Founder-only:
  - mark reward paid
  - select/reject application
- Respondent-only:
  - confirm reward received
- Either participant:
  - confirm attendance
  - mark no-show/report issue
  - write review

Concurrency:

- Use row locks or conditional updates for session and reward transitions.
- Duplicate taps must be idempotent where possible.
- If state already changed, return current workflow read model or `409` with
  a normalized error code.
- Do not create duplicate reward rows or duplicate reviews.

Audit:

- Record actor role, before/after state, target ids, reason, and metadata for:
  - attendance confirmation
  - completion
  - no-show
  - reward mark paid
  - reward confirm
  - reward dispute
  - review create/update/remove

## Mobile Plan

### 1. Replace Founder-Only Action Strip

Current `FounderApplicationActionStrip` should remain only for pre-selection
founder review.

Add a new component:

```text
ChatWorkflowActionStrip
```

Placement:

- In `ChatThreadScreen`, directly above the message composer.
- Keep it compact: one status line and up to two action buttons.
- Do not make it a large card.
- It should scroll with neither the message list nor the keyboard; it belongs
  to the composer area.

### 2. Role-Based UI States

Founder examples:

```text
신청자 답변을 확인해 주세요.
[답변 보기] [선정] [반려]

인터뷰 일정을 확정해 주세요.
[일정 확정]

인터뷰가 끝났나요?
[완료 처리] [문제 신고]

사례비를 지급했나요?
[지급 완료로 표시]

후기를 남겨주세요.
[후기 작성]
```

Respondent examples:

```text
선정됐어요. 채팅에서 일정을 조율해 주세요.
[인터뷰 상세정보]

인터뷰가 끝났나요?
[만남 확인] [문제 신고]

창업자가 사례비 지급을 완료했다고 표시했어요.
[받았어요] [문제 신고]

후기를 남겨주세요.
[후기 작성]
```

### 3. Modals and Screens

Use lightweight confirmation modals:

- Attendance confirmation modal:
  - Title: `인터뷰를 진행했나요?`
  - Primary: `만남 확인`
  - Secondary: `문제 신고`
- Founder reward modal:
  - Title: `사례비 지급을 완료했나요?`
  - Body: `지급 완료로 표시하면 상대에게 확인 요청이 보내져요.`
  - Primary: `지급 완료로 표시`
- Respondent reward modal:
  - Title: `사례비를 받았나요?`
  - Primary: `받았어요`
  - Secondary: `문제 신고`
- Review modal/screen:
  - Rating
  - 3 to 5 quick tags
  - Optional short comment
  - Primary: `후기 남기기`

Use a full screen only if the review form feels too tall for a modal.

### 4. Menu Integration

Chat thread `...` menu should keep:

- `인터뷰 상세정보`
- `문제 신고`
- `차단하기` if available in the current chat settings flow

Do not hide core workflow actions only inside the `...` menu. Completion,
payment confirmation, and review should be visible as contextual actions above
the composer.

### 5. Empty, Error, and Loading Copy

Examples:

```text
진행 상태를 불러오지 못했어요.
잠시 후 다시 시도해 주세요.

이미 처리된 단계예요.
현재 상태를 다시 불러올게요.

상대 확인을 기다리고 있어요.
확인되면 다음 단계가 열려요.
```

## API Contract Plan

Update `packages/contracts` with:

```text
RewardConfirmationStatus
RewardConfirmation
ReviewRating
InterviewReview
ChatWorkflowRead
ChatWorkflowAction
ConfirmAttendanceInput
MarkRewardPaidInput
ConfirmRewardReceivedInput
DisputeRewardInput
CreateInterviewReviewInput
```

Do not let mobile define local-only copies of these enums.

## Tests

Backend tests:

- Founder cannot confirm attendance for unrelated session.
- Respondent cannot mark reward paid.
- Founder can mark reward paid only after completion.
- Respondent can confirm reward only after founder marked paid.
- Duplicate reward confirmation is idempotent or returns normalized conflict.
- Duplicate review by same user is rejected or updates existing review by
  explicit endpoint.
- No-show and reward dispute cannot both silently close the same session without
  audit events.
- Completion sends notification and chat system message.
- Reward mark paid sends notification and chat system message.
- Review creation sends notification where appropriate.

Mobile tests or targeted checks:

- Chat thread shows correct action strip for:
  - founder before selection
  - founder after selection
  - respondent after selection
  - scheduled session before completion
  - one-sided attendance confirmation
  - completed session before reward
  - reward marked paid
  - reward confirmed
  - review submitted
- Buttons are disabled while mutation is pending.
- Conflict refreshes workflow state.
- Composer remains keyboard-safe on iPhone small and Pro Max sizes.

## Store and Legal Notes

Before native store submission:

- Privacy policy must mention:
  - interview completion records
  - reward confirmation records
  - reviews
  - reports/disputes
  - chat/system messages
- App Privacy / Data Safety answers must include any new user content or
  support/dispute data.
- Review notes should clarify:
  - Hypofit helps coordinate paid interviews.
  - Hypofit MVP does not process, hold, guarantee, or settle interview rewards.
  - Users self-report reward completion in-app.
- Keep report/block paths reachable from chat and participant profile surfaces.

## Implementation Checklist

### Backend

- [x] Add migration for attendance confirmation timestamps.
- [x] Add `reward_confirmations` table.
- [x] Add `interview_reviews` table.
- [x] Add SQLAlchemy models.
- [x] Add Pydantic schemas.
- [x] Add repository functions with conditional updates and uniqueness guards.
- [x] Add service functions for attendance confirmation.
- [x] Add service functions for reward mark paid, reward confirm, and reward
      dispute.
- [x] Add service functions for review creation.
- [x] Add `GET /api/v1/chat/rooms/{room_id}/workflow` read model.
- [x] Add route handlers.
- [x] Add audit events.
- [x] Add notification events.
- [x] Add chat system messages.
- [x] Add backend tests for changed session service behavior.
- [x] Add dedicated backend tests for reward/review routes.
- [x] Add dedicated backend tests for workflow read model edge cases.

### Contracts

- [x] Add session workflow contract types.
- [x] Add reward confirmation contract types.
- [x] Add review contract types.
- [x] Update notification type union if needed.

### Mobile

- [x] Add workflow API client.
- [x] Add workflow query and mutations.
- [x] Add `ChatWorkflowActionStrip`.
- [x] Keep `FounderApplicationActionStrip` only for pre-selection application
      review.
- [x] Add attendance confirmation prompt.
- [x] Add reward mark-paid prompt.
- [x] Add reward received/dispute prompt.
- [x] Add review form.
- [x] Add conflict/error refresh behavior through query invalidation.
- [x] Connect `create_schedule` workflow action to a session creation screen.
- [x] Connect `mark_no_show` workflow action to the no-show API.
- [x] Add push/notification routing for new session/reward/review events if
      needed.
- [ ] Verify keyboard-safe composer layout after adding action strip on device
      or simulator.

### Data and Demo

- [ ] Add demo seed cases:
  - selected but not scheduled
  - scheduled
  - one side confirmed
  - completed waiting reward
  - reward marked paid waiting respondent
  - review needed
  - no-show/problem case
- [ ] Ensure reviewer/demo account can exercise at least one complete happy path.

### Deployment

- [x] Apply migrations through the documented GPU API deployment path.
- [x] Deploy FastAPI through blue/green API deploy.
- [ ] Build local iOS IPA only if native release verification is requested.
- [ ] Do not use EAS cloud build unless the user explicitly re-enables it.

## Implementation Notes - 2026-06-17

Implemented in code:

- Backend migration `0019_chat_completion_reward_reviews`.
- Expanded `AttendanceRecord`, added `RewardConfirmation` and
  `InterviewReview`.
- Added session APIs for attendance confirmation, reward paid/received/dispute,
  and reviews.
- Added chat workflow read model at
  `GET /api/v1/chat/rooms/{room_id}/workflow`.
- Kept completed chat rooms messageable for reward/review follow-up instead of
  immediately closing them.
- Added push-eligible notification copy for attendance/reward/review events.
- Added shared contract types.
- Added mobile workflow query, mutations, contextual chat action strip, and
  review modal.
- Added chat schedule confirmation screen and connected `create_schedule` to
  `POST /api/v1/sessions/`.
- Connected chat `mark_no_show` workflow action to
  `POST /api/v1/sessions/{session_id}/no-show`.
- Added route-level tests for attendance confirmation, reward dispute, and
  review creation.
- Changed session/reward/review workflow notifications to target the related
  chat room when one exists, so existing mobile push routing opens the chat
  workflow instead of the generic interview list.
- Added workflow read-model edge tests for reward payment needed, reward
  confirmation needed, and review needed states.

Verified:

- `apps/api`: targeted pytest for sessions, chat service, and push copy passed.
- `apps/api`: Python compile passed.
- `apps/mobile`: TypeScript typecheck passed.
- `apps/api`: deployed to GPU through blue/green deploy. Active color is
  `green`, active SHA is `1105dbd348a60abd3a0f7f236270dc1645b1020c`.
- `apps/api`: production readiness check passed at
  `https://hypofit-api.bukae.co.kr/api/v1/health/ready`.

Follow-up notes:

- Rich workflow seed data now exists in
  `apps/api/scripts/seed_sehyeon_workflow_data.py`.
- The official store-review smoke remains narrower than the full workflow seed.
- Simulator/device UX QA for the chat action strip and review modal should be
  repeated before a store build that materially changes this screen.
- If a separate `review_requested` notification is required later, open a new
  active plan; the current implementation focuses on review submission/received
  and chat-room workflow routing.

## Open Decisions

- Should session completion require both sides to confirm, or can founder
  completion plus respondent non-objection after a time window complete the
  session?
- Should chat remain writable after session completion until reward is
  confirmed?
- Should reviews be visible to the other party immediately, after both submit,
  or remain private until a future trust-score release?
- Should reward disputes create a support ticket automatically or only route the
  user to the report form?
- Should no-show affect any visible trust score in MVP, or remain an internal
  operator signal?

## Recommended MVP Cut

Implement in this order:

1. Workflow read model and mobile action strip.
2. Mutual attendance confirmation.
3. Manual reward paid/received confirmation.
4. Internal private reviews.
5. Dispute/report integration.

Do not implement escrow, automatic payout, public ratings, penalties, or
review-score ranking in this pass.
