# Hypofit Support and Report Flow Plan

Status: reference

Last updated: 2026-06-08

## Direction

Hypofit should not use a public 게시판-style customer center for the MVP.
The product handles profiles, interview posts, applications, and chat, so the
safer first implementation is an in-app support/report intake form backed by a
durable database table.

## Current Status Summary

- The backend/API foundation is no longer the main gap. `support_tickets`,
  `support_ticket_events`, admin support endpoints, moderation action storage,
  and user-side edit/delete locking are implemented in `apps/api`.
- Web and mobile support/report flows are wired to the shared support ticket
  API. Mobile account deletion now uses the dedicated
  `account_deletion_requests` API.
- The remaining work is operational and launch-readiness work: support mailbox
  and email delivery, operator guide/runbook, final public support email/domain
  values, and end-to-end QA across web and native mobile flows.

## UX Policy

- `문의하기` is for normal help requests.
- `신고하기` is for higher-risk cases such as abusive posts, chat issues,
  privacy requests, no-show reports, or external contact misuse.
- Email remains a fallback contact channel, not the primary product workflow.
- Users should not have to leave the web or mobile app to submit normal support
  requests.
- Report entry points should continue to be added from object-specific screens.
  Chat room, chat counterpart profile, interview detail, and my-interviews
  problem/no-show surfaces exist.
- Account deletion is currently a request workflow, not immediate self-service
  deletion.
- Users who do not have the app installed can start account deletion from the
  public web page at `https://hypofit.bukae.co.kr/account-deletion`.

## Implemented Backend/API

Support ticket intake and user controls:

- Tables:
  - `support_tickets`
  - `support_ticket_events`
- User APIs:
  - `GET /api/v1/support/tickets`
  - `POST /api/v1/support/tickets`
  - `PATCH /api/v1/support/tickets/{ticket_id}`
  - `DELETE /api/v1/support/tickets/{ticket_id}`
- Auth:
  - requires a synced Hypofit app user through `CurrentAppUser`
- Stored ticket fields:
  - `kind`: `inquiry`, `report`, `privacy`, `account_deletion`
  - `category`: `account`, `interview_post`, `application`, `chat`, `reward`,
    `privacy`, `abuse`, `no_show`, `other`
  - `subject`
  - `body`
  - `contact_email`
  - optional `target_type` and `target_id`
  - `status`: `open`, `in_review`, `resolved`, `closed`
  - JSON `metadata`
- Report target validation is implemented in the API contract for:
  - `interview_post`
  - `application`
  - `chat_room`
  - `chat_message`
  - `user`
  - `session`
- User edit/delete locking is implemented at the service layer:
  - only `open` tickets can be edited or deleted by the author
  - `in_review`, `resolved`, and `closed` tickets reject user edits/deletes
    with API conflicts once support starts handling them
- Ticket event history is persisted for the current workflow:
  - create -> `created`
  - user edit -> `edited`
  - user delete of an open ticket -> `deleted_by_user`
  - operator status change -> `status_changed`
  - operator reply -> `operator_replied`
- Current deletion behavior for open tickets is still a user-triggered hard
  delete after the `deleted_by_user` event is written.

Admin/operator support handling:

- Admin APIs:
  - `GET /api/v1/admin/support/tickets`
  - `PATCH /api/v1/admin/support/tickets/{ticket_id}/status`
  - `POST /api/v1/admin/support/tickets/{ticket_id}/replies`
- Admin ticket reads already include stored per-ticket event history.
- Operator status changes and replies are stored in `support_ticket_events`.
- Support status changes and replies also write audit events.
- Visible operator replies create in-app `support_replied` notifications for the
  ticket owner.
- There is still no dedicated operator web/mobile UI in this repo; the current
  implementation is API-backed, not productized operator tooling.

Report intake and moderation linkage:

- `kind=report` is implemented on the same `support_tickets` flow as normal
  inquiry/privacy/account-deletion intake.
- Admin moderation actions are implemented through:
  - `POST /api/v1/admin/moderation/actions`
- `moderation_actions` storage can link an operator action back to a report via
  `source_ticket_id`.
- Repo-backed moderation effects currently exist for:
  - `user`
  - `interview_post`
  - `application`
  - `chat_message`
  - `session`
- `chat_room` is an allowed report target and moderation action target in the
  contract, but there is no separate chat-room-specific state mutation in the
  current moderation service.

## Implemented User-Facing Flows

Web:

- `/support` renders the user's inquiry list first, then opens an inquiry form
  from a plus/new inquiry action.
- Inquiry rows expose an overflow menu. `open` inquiries can be edited or
  deleted by the author; `in_review`, `resolved`, and `closed` inquiries are
  locked so answered records cannot be changed after support starts handling
  them.
- `/report` renders a report-only in-app form.
- `/report` can receive object context through query parameters for chat-room,
  interview-post, and application/problem reports.
- `/support?kind=account_deletion` renders the account-deletion request flow
  and submits `kind=account_deletion`.
- Contact email defaults to the logged-in account email.
- Unauthenticated users see the support email fallback.
- Current fallback email exposed in the product is the confirmed contact email
  for this launch track: `ssamso8282@gmail.com`.
  A later domain-email migration can still be handled through
  `VITE_SUPPORT_EMAIL`, but it is not the current launch assumption.
- Profile 도움말 uses `문의하기` and `신고하기`.
- Chat menus can open `/report` with `target_type=chat_room`, `target_id`,
  counterpart name, and interview title. Valid UUID targets are stored as
  `target_id`; mock/non-UUID ids are preserved in metadata only.
- Interview detail exposes a report entry point for the selected post.
- My interviews exposes a problem/no-show report entry point for respondent
  applications.
- Account deletion remains a verified request flow; it is not an immediate
  destructive deletion action.
- Public account deletion page is live as an external request path for Google
  Play policy readiness.

Mobile RN:

- `apps/mobile/src/screens/support/SupportScreen.tsx` renders the inquiry list
  first and switches to the inquiry form when the user taps plus or 문의 남기기.
- Each inquiry row has a `...` action menu. The edit form reuses
  `SupportForm`, and answered or reviewing tickets show disabled edit/delete
  actions.
- `apps/mobile/src/screens/support/ReportScreen.tsx` renders the report flow.
- `apps/mobile/src/screens/profile/DeleteAccountScreen.tsx` uses the dedicated
  authenticated account deletion request API instead of support tickets.
- Expo Go smoke on iOS 26.5 / iPhone 17 Pro simulator confirmed the support
  inquiry list, report form, and account deletion request screen render against
  the deployed API.
- Deployed API submit smoke confirmed:
  - `POST /api/v1/support/tickets` for a normal inquiry returned `201`.
  - `POST /api/v1/support/tickets` for a chat-room report returned `201`.
  - the report response preserved `target_type=chat_room`, `target_id`, and
    context metadata.
- Mobile reads the fallback contact through `EXPO_PUBLIC_SUPPORT_EMAIL`, with
  `ssamso8282@gmail.com` as the current default.

## Still Open

Operational support process:

- Operator runbook for using the existing admin APIs and audit trail to triage,
  reply, resolve, and review support/report/account-deletion tickets is now
  documented in `docs/reference/operator-support-moderation-runbook.md`.
- Decide the first real operator workflow surface:
  - direct API client/manual ops guide
  - Supabase/DB query guide
  - later dedicated internal admin UI
- Do not assume staffed production support operations beyond what is explicitly
  documented in that runbook.

Mailbox and delivery:

- Add the real support mailbox flow for newly created tickets and public-facing
  support contact handling.
- Add outbound email delivery/notification where needed.
- Keep this separate from the already implemented in-app `support_replied`
  notification.

Public contact finalization:

- Keep `ssamso8282@gmail.com` as the current support/privacy contact unless
  the team explicitly opens a later domain-email migration task.
- Keep service provider/legal identity aligned with the confirmed provider
  name `박종인` and the team display name `contentruck팀`.

QA and reviewer readiness:

- Run end-to-end web QA for `/support`, `/report`, and
  `/support?kind=account_deletion`, including edit/delete locking and report
  context handoff.
- Run native mobile account-deletion submit QA on the Expo app path. Support
  inquiry and chat-room report submit were already verified against the deployed
  API.
- Verify the reviewer/demo path can reach support/report/account-deletion flows
  without broken auth, missing contact info, or missing legal links.

Future product decisions:

- Add any remaining object-specific report entry points only when new UGC
  surfaces ship; the API contract already supports more target types than the
  current UI uses.
- Decide later whether support needs internal notes, assignment, or richer
  user-visible response history inside the app.
- Later decide whether to add a true self-service deletion endpoint after data
  retention and dispute/no-show policies are final.
