# Domain Model

Status: service-source-of-truth

Last updated: 2026-08-21

## Core Entities

### User

Authenticated account in `app_users`.

Important fields:

- email,
- name,
- bio,
- phone,
- compatibility role,
- optional organization type (`team` or `company`) and organization name,
- profile image path/url,
- deletion/deactivation/anonymization timestamps,
- deleted email hash for retention/re-registration policy.

In the current auth policy, `email` is a reachable contact and account-support
field, not a public email/password login authority. `phone` is profile/contact
data when present, not a current authentication key.

Organization fields are optional public profile metadata for users who create
interview posts. They identify the team or company behind a post, but do not
create a tenant, membership, ownership, invitation, or organization-level
authorization boundary. Every active member can maintain this metadata and
create or participate in recruitment without selecting a customer role.

The persisted `role` field is retained only for released-client compatibility.
New and synchronized users are normalized to `both`; Spring authorization uses
active account state, post ownership, and workflow membership instead.

### SocialAuthIdentity

Server-side inventory of a Supabase Auth identity connected to a Hypofit user.

Important fields:

- Hypofit/Supabase user id,
- normalized provider (`apple`, `google`, `kakao`, `naver`),
- HMAC-protected provider subject,
- Supabase identity id,
- provider email and its reported verification state,
- active/revocation status,
- linked, last-used, and revoked timestamps.

Provider email, name, and profile image are mutable profile attributes. They
must not replace the provider subject as the identity key or independently
prove legal identity or adult status.

### SocialAuthAttempt

Short-lived correlation record created before a social authorization flow.
It binds provider, platform, flow, safe return path, expiry, and one-time
completion state without storing OAuth tokens or authorization codes.

### InterviewPost

Member-created recruitment post. Legacy `founder_id` naming remains for
released-client compatibility; ownership is not a customer role.

Important fields:

- founder,
- title,
- service summary,
- target description,
- reward amount,
- duration,
- recruit count,
- recruitment type (`interview`, `survey`, or `beta_test`),
- external survey provider/URL, participation deadline, and data notice when
  the type is `survey`,
- target platforms and test period when the type is `beta_test`,
- interview mode,
- location text/address/place/coordinates,
- location precision/source,
- schedule options,
- status.

Statuses:

- `draft`
- `open`
- `closed`
- `completed`
- `archived`
- `hidden`
- `removed`

`interview_mode`, location, schedule, session, attendance, no-show, reward
confirmation, and interview review semantics apply only to `interview` posts.
Beta tests reuse applications and create chat only after selection. Surveys use
their own participation state and never store external form answers.

### SurveyParticipation

Tracks a member's interaction with an approved external survey without storing
survey questions or answers.

Important fields:

- survey post,
- participant,
- status,
- opened/submitted/confirmed/withdrawn timestamps.

Statuses:

- `opened`
- `submitted`
- `confirmed`
- `withdrawn`

The participant declares submission; the organizer may confirm it. The unique
post/participant pair makes repeated open and submit requests idempotent.

### InterviewPostView

Tracks whether a user has seen a post and from which surface. Used for read
state and discovery polish.

Sources:

- `home`
- `interviews`
- `map`
- `detail`
- `chat`

### Application

Respondent application to a post.

Important fields:

- interview post,
- respondent,
- answers,
- available times,
- status,
- rejection reason,
- moderation status.

Statuses:

- `applied`
- `selected`
- `rejected`
- `canceled`
- `no_show`
- `completed`

### AiSummaryArtifact

Asynchronously generated, source-versioned reading aid for either one
`InterviewPost` or one `Application`. Exactly one target must be present.

Important fields:

- summary type and target foreign key,
- `pending`, `processing`, `ready`, or `failed` status,
- canonical source hash and prompt/work version,
- validated structured result,
- bounded retry state,
- provider/model and token-usage metadata.

Interview-post summaries are returned only on post detail. Application
summaries are returned only to the founder who owns the target post; the
respondent can read their application detail but never receives the AI
summary. The artifact is a reading aid, not a score, rank, recommendation, or
selection decision. Source deletion cascades to the artifact.

### ChatRoom

Conversation created around an application.

Important fields:

- interview post,
- application,
- founder,
- respondent,
- status,
- last message time.

Statuses:

- `open`
- `selected`
- `closed`
- `blocked`

### ChatMessage

User or system message in a chat room.

Types:

- `system`
- `user`
- `application_created`
- `application_selected`
- `application_rejected`
- `schedule_created`

Messages can use `client_message_id` for idempotency.

### InterviewSession

Scheduled interview after selection.

Important fields:

- application,
- scheduled time,
- meeting type,
- meeting URL or place,
- status,
- moderation status.

Statuses:

- `scheduled`
- `completed`
- `canceled`
- `no_show`

### AttendanceRecord

Tracks founder/respondent confirmation, completion time, and no-show party.

### RewardConfirmation

Tracks reward coordination state. This is not an escrow or guaranteed payment
system.

Statuses:

- `pending`
- `founder_marked_paid`
- `respondent_confirmed`
- `disputed`
- `canceled`

### InterviewReview

Post-interview trust signal between founder and respondent. Reviews can later
feed founder trust summaries shown on interview posts.

### Notification

In-app notification and push routing source.

Examples:

- chat message,
- application created/selected/rejected,
- session changed,
- reward status,
- review received,
- no-show,
- support replied.

### SupportTicket

Inquiry, report, privacy request, or account-deletion support case.

Kinds:

- `inquiry`
- `report`
- `privacy`
- `account_deletion`

### ModerationAction

Operator action against a user, post, application, chat room/message, or
session.

### UserBlock

User-to-user block relationship. Must be preserved when changing chat, profile,
report, or moderation flows.

### PushDevice And NotificationPreference

Registered APNs/FCM token plus per-user push preference state.

## Relationship Summary

```text
User(founder)
  -> InterviewPost
  -> Application(respondent)
  -> ChatRoom(founder/respondent)
  -> ChatMessage
  -> InterviewSession
  -> AttendanceRecord
  -> RewardConfirmation
  -> InterviewReview
```

Support, report, moderation, notification, and account deletion records attach
around this core loop.
