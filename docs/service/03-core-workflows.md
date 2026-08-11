# Core Workflows

Status: service-source-of-truth

Last updated: 2026-08-08

## Sign-In And Onboarding

```text
user opens app
  -> native splash
  -> app splash/auth readiness
  -> chooses an enabled social provider
  -> provider authorization and callback
  -> existing account returns home
     or new account accepts legal terms and selects roles
  -> home
```

The current public release is social-login only. Web and iOS can expose the
enabled Kakao, Apple, Google, and Naver providers; Android does not expose Apple.
Removed email/password, signup email-OTP, password recovery, and phone-login
entry must not reappear in the public auth surface. Provider email is mutable
contact data, not a standalone account key. The remaining email OTP flow is
the dedicated account-deletion confirmation path, not signup/login auth.

## Founder Creates Interview Post

```text
founder opens interviews
  -> create post
  -> enter service, target customer, reward, duration, recruit count
  -> choose mode and location where needed
  -> enter schedule options
  -> publish
```

The post should make the target customer and interview terms clear enough that
respondents can self-screen before applying.

## Respondent Discovers Interviews

Discovery surfaces:

- Home: recent interviews and personal progress.
- Interviews tab: structured search/filter and full list.
- Map tab: location-based exploration.
- Chat: already-applied or selected opportunities.
- Notifications: event-driven return path.

Discovery should avoid showing irrelevant dashboards. The respondent needs to
understand "Is this for me?" quickly.

## Respondent Applies

```text
respondent opens post detail
  -> checks founder, target, reward, mode, schedule, location
  -> applies with relevant experience and available times
  -> application creates or updates chat context
  -> application status appears in My Interviews and Chat
```

Duplicate applications should be prevented. Once applied, the UI should avoid
asking the user to apply again.

## Founder Reviews Applications

```text
founder opens my interviews
  -> opens a post
  -> sees applicant list
  -> opens applicant information
  -> continues chat, selects, or rejects
```

Selection/rejection can happen from chat because chat is where the founder and
applicant coordinate. The post management screen should focus on post status,
post information, editing, previewing, and opening applicant chats.

## Chat And Coordination

```text
application exists
  -> chat room exists
  -> users exchange messages
  -> founder selects/rejects or schedules
  -> session state becomes the workflow driver
```

Chat is not a generic messenger. It is an interview coordination surface. It
needs unread counts, time ordering, mute/hide, profile/report/block, and
workflow actions.

## Session Completion And Reward Signal

```text
selected application
  -> session scheduled
  -> attendance confirmation
  -> completed or no-show/problem
  -> reward marked/confirmed/disputed where supported
  -> review can be recorded
```

Hypofit does not currently provide escrow or guaranteed payment. Reward-related
state is a coordination and trust signal, not a settlement guarantee.

## Support, Report, And Moderation

Users must be able to:

- send an inquiry,
- report a user/post/chat/session problem,
- block another user,
- delete account,
- view legal documents.

Operators must be able to see and process support/report state.

## Account Deletion And Re-registration

Account deletion should:

- deactivate/redact user-visible account data,
- preserve legally or operationally necessary records,
- clean up Supabase Auth where appropriate,
- allow same-email re-registration after cleanup when policy permits,
- avoid exposing deleted user information in ordinary product surfaces.

The public web and authenticated in-app deletion flows use a dedicated email
OTP confirmation bound to the deletion request. That OTP does not restore
email/password login or signup behavior.
