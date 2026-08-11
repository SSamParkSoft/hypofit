# Store Review Demo Account and Screenshot Seed Plan

Status: completed - seed implementation and deployed smoke complete

Last updated: 2026-06-18

## Purpose

Prepare stable reviewer accounts and realistic API-backed seed data for:

- Apple App Review.
- Google Play review.
- TestFlight and internal release-build QA.
- App Store and Play Store screenshot capture.

This completed implementation note exists because Hypofit is a login-based interview matching app. Store
reviewers must be able to sign in and inspect the core MVP workflow without
requesting email OTP, waiting for another user, receiving private instructions,
or seeing empty screens.

Manual TestFlight/release-build QA, screenshot capture, and store-console
credential paste are release checklist work, not remaining implementation work.
Track those items through `docs/reference/native-store-submission-readiness-plan.md`.

The goal is not to create frontend mock mode. The goal is to seed Supabase Auth
and Supabase Postgres with deterministic, review-safe data that exercises the
real FastAPI API and the real mobile app.

## Source Basis

Official sources checked on 2026-06-16:

- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
- App Store Connect App Review information:
  https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Google Play Console app review preparation:
  https://support.google.com/googleplay/android-developer/answer/9859455
- Google Play sign-in details requirements:
  https://support.google.com/googleplay/android-developer/answer/15748846

Current implications:

- Apple expects account-based apps to provide App Review with full access
  through an active demo account or fully featured demo mode.
- Apple expects backend services to remain live during review.
- Apple App Review information can include a username/password and review notes.
- Apple says the demo account used for review must not expire.
- Google Play requires sign-in details when app functionality is restricted by
  login, membership, location, authentication, or other access controls.
- Google Play sign-in details must be reusable, valid regardless of reviewer
  location, and maintained without errors.
- Google Play explicitly calls out OTP and 2-step verification: if the app
  normally requires them, provide reusable credentials that can bypass those
  requirements.
- Google Play sign-in details should be provided in English.

## Existing Hypofit Context

Relevant existing files:

- `docs/demo-seed.md`
- `apps/api/scripts/seed_demo_data.py`
- `apps/api/scripts/seed_account_demo_data.py`
- `apps/api/scripts/seed_notification_demo_data.py`
- `apps/api/scripts/store_review_smoke.py`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/api-operations-readiness-implementation-history.md`

Current existing seed assets:

- `seed_demo_data.py` creates founder/respondent demo accounts under
  `hypofit.demo`.
- Existing fallback demo accounts:
  - `founder1@hypofit.demo` through `founder4@hypofit.demo`
  - `respondent1@hypofit.demo` through `respondent4@hypofit.demo`
  - password: `123456`
- Existing seeded data includes users, profiles, interview posts, applications,
  chat rooms/messages, sessions, attendance records, and post views.
- Existing map fixtures are centered around
  `37.296513, 126.837080` near Hanyang University ERICA in Ansan.
- `seed_account_demo_data.py` can seed a rich single account such as
  `sehyeon73@gmail.com`.
- Runtime frontend mock data should remain disabled.

Gap:

- The existing seed scripts are useful but do not yet define one final official
  reviewer credential, screenshot-specific state coverage, review-note copy,
  pre-confirmed OTP-bypass behavior, and a reset/smoke runbook as one
  submission-ready package.

## Principles

### 1. Do Not Use Frontend Mock Mode

Store screenshots and review flows must use the same backend path as a real
release build:

```text
Expo mobile app
  -> https://hypofit-api.bukae.co.kr
  -> FastAPI
  -> Supabase Auth/Postgres
```

Frontend-only mock mode is not acceptable for review because:

- It can diverge from production API behavior.
- It can hide auth, permission, and network issues.
- It may show placeholder or internal-only states.
- It can make screenshots misleading if the shipped app cannot reproduce them.

### 2. Reviewer Accounts Must Be Stable

Reviewer credentials must:

- Work immediately.
- Not require email OTP.
- Not require the reviewer to access a mailbox.
- Not require a phone number or SMS code.
- Not expire during review.
- Work regardless of reviewer location.
- Be resettable by the team before resubmission.
- Avoid personal emails as official reviewer credentials.
- Use a password that is not the shared weak demo password.

### 3. Use Realistic But Synthetic Data

Seeded data should look like a real marketplace/interview workflow, but it must
not contain real private information.

Allowed:

- Synthetic Korean names.
- Synthetic service names.
- Real public place names for map usability.
- Non-sensitive interview examples.
- Safe profile bios.
- Case-fee amounts as post information only.

Forbidden:

- Real private phone numbers.
- Real private email addresses in screenshots.
- Real user profile images without consent.
- `mock`, `test`, `demo`, `internal`, or debug labels visible to reviewers.
- Payment, escrow, settlement, or income-guarantee wording.

### 4. Public Discovery Data and Private Account Data Are Different

Public discovery data can be visible to any logged-in account because interview
posts and map markers are part of the normal product.

Private connected data must be tied to reviewer accounts:

- applications
- my interviews
- chat rooms
- notifications
- support tickets
- reports
- applicant lists
- read/view state

This lets reviewers and screenshot captures see rich states without affecting
ordinary user accounts.

### 5. Review Seed Data Must Be Idempotent

The seed process must be safe to rerun.

Required behavior:

- Reuse existing Supabase Auth users by email.
- Reset reviewer passwords to the expected temporary password.
- Mark reviewer auth users as email-confirmed.
- Clear only deterministic review fixture data.
- Do not clear real user data.
- Recreate connected review rows.
- Write a clear `source` or `metadata` value where tables support it.

Recommended source marker:

```text
store_review_seed
```

## Reviewer Account Strategy

Use one official reviewer account in App Store Connect and Play Console. Create
additional helper fixture accounts only to make the official account's connected
data realistic.

### Official Review Account

```text
Email: review-both@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>
Role: founder and respondent
```

Purpose:

- Only credential entered into App Store Connect and Play Console.
- Lets reviewers inspect most flows without switching accounts.
- Useful for screenshot capture when a single signed-in state is needed.

Expected visible state:

- Home progress.
- Recent interview posts.
- Applied interviews.
- Created interview posts.
- Chat rooms as both founder and respondent.
- Notifications.
- Profile, support, report, legal, account deletion, and settings.

### Helper Founder Fixture Account

```text
Email: review-founder@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>
Role: founder
```

Purpose:

- Create realistic founder-owned posts, applications, and chat counterparts.
- Keep as internal QA/fallback only.
- Do not enter this account into App Store Connect or Play Console unless the
  review console later explicitly allows additional credentials.

Expected visible state:

- 3 to 5 created posts.
- At least one active recruiting post.
- At least one post with multiple applicants.
- At least one post with a selected applicant.
- Chat rooms with respondents.
- Notifications for new application, applicant message, and post lifecycle.

### Helper Respondent Fixture Account

```text
Email: review-respondent@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>
Role: respondent
```

Purpose:

- Create realistic respondent-side applications and chat counterparts.
- Keep as internal QA/fallback only.
- Do not enter this account into App Store Connect or Play Console unless the
  review console later explicitly allows additional credentials.

Expected visible state:

- Interview list and map discovery.
- Applied interviews in multiple states.
- Chat rooms with founders.
- Notifications for application updates and new messages.

### Internal QA Account

```text
Email: sehyeon73@gmail.com
Role: founder and respondent
```

Purpose:

- Internal hands-on QA.
- Not the official store reviewer account.
- Can receive heavier data and repeated mutation testing.

This account should not be listed as the official App Store or Play Console
review credential.

## Auth and OTP Policy

For the official reviewer account:

- Create Supabase Auth users with the final password.
- Set email-confirmation state to confirmed.
- Do not require signup OTP.
- Do not require email link click.
- Do not require password reset.
- Do not require phone verification.

The mobile app may keep normal OTP signup for real users. The review accounts
are pre-created and pre-confirmed so the reviewer signs in through the normal
login screen.

Acceptance criteria:

- [ ] `review-both@hypofit.demo` can log in from a release build without email
      OTP.
- [ ] Incorrect password still fails normally.
- [ ] The reviewer account does not bypass normal authorization after login.
- [ ] The reviewer account is not granted admin/operator privileges.

## Data Model Coverage

### Users and Profiles

Seed:

- `app_users`
- `founder_profiles`
- `respondent_profiles`

For each reviewer account:

- stable `name`
- safe `bio`
- role matching the account strategy
- no real phone number in screenshot-visible areas
- profile image optional; if absent, app should show the default avatar

Recommended synthetic identities:

```text
review-both@hypofit.demo        김하이  official reviewer
review-founder@hypofit.demo     이도윤  helper fixture account
review-respondent@hypofit.demo  박민서  helper fixture account
```

### Interview Posts

Seed 10 to 14 review-safe posts.

Required distribution:

- 4 to 6 near the simulator map region.
- 3 to 4 online-only posts.
- 2 to 3 high case-fee posts.
- 2 to 3 founder-created posts owned by `review-founder` as helper fixture data.
- 2 to 3 posts owned by `review-both`.

Required fields:

- title
- service summary
- target customer description
- reward amount
- duration
- interview mode
- location name for offline/both posts
- latitude/longitude for map posts
- schedule options
- recruit count
- status

Recommended post examples:

```text
ERICA 학생 시간표 관리 인터뷰
캠퍼스 카페 주문 경험 인터뷰
안산호수공원 산책 루틴 인터뷰
한대앞역 통학 동선 인터뷰
1인 가구 장보기 루틴 인터뷰
구독 서비스 정리 경험 인터뷰
외국어 학습 지속 실패 인터뷰
중고거래 약속 조율 인터뷰
운동 루틴 관리 앱 인터뷰
직장인 점심 선택 인터뷰
```

Avoid:

- medical diagnosis claims
- investment advice
- gambling
- sexual content
- alcohol/tobacco/drug topics
- minors as target users
- politically sensitive topics

### Applications

Seed applications across the lifecycle.

Required respondent-side states:

- `applied`
- `selected`
- `rejected`
- `completed`

Optional:

- `no_show` or `absent` only if the UI needs to demonstrate report/attendance
  behavior. Do not use this as a primary screenshot state because it can create
  negative first impression.

Required founder-side states:

- new applicant waiting for review
- selected applicant
- rejected applicant
- completed session

Every application should include:

- short experience answer
- available time answer
- created timestamp spread across recent dates
- linked chat room

### Interview Sessions and Attendance

Seed sessions for selected/completed flows.

Required:

- one upcoming scheduled session
- one completed session

Optional:

- one canceled or absent case for internal QA, not primary screenshot.

### Chat Rooms and Messages

Seed 6 to 8 chat rooms.

Required chat list coverage:

- unread badge visible in at least one room
- status badges visible in at least two states
- recent message timestamp varied across minutes/hours/days
- no empty chat list for reviewer accounts

Required thread coverage:

- both-side message bubbles
- founder and respondent messages
- interview context reachable from menu
- notification toggle menu remains available
- block/report routes remain reachable

Tone:

- short, natural Korean.
- no private contact exchange.
- no off-platform payment instruction.
- no unsafe or objectionable content.

Example messages:

```text
안녕하세요. 신청 내용 확인했습니다.
가능하신 시간은 수요일 저녁이 가장 편하실까요?
네, 수요일 7시 이후 가능합니다.
화상으로 30분 정도 진행해도 괜찮습니다.
인터뷰 전에 간단히 사용 경험만 정리해 주세요.
```

### Notifications

Seed 8 to 12 notifications for the primary account.

Required notification types:

- new application
- application selected
- application rejected
- chat message
- session reminder or schedule update
- support reply if supported

Acceptance criteria:

- [ ] Notification center is not empty.
- [ ] Notification rows route to the relevant tab/screen.
- [ ] Push notification tap routing can be tested separately if needed.

### Support, Report, and Account Deletion

Store review needs these surfaces to be reachable, but the reviewer should not
be forced to mutate the only review account.

Seed:

- one open support inquiry
- one answered support inquiry

Do not seed:

- real account deletion request for the main reviewer account.
- real report against a real user.

Acceptance criteria:

- [ ] Profile shows support route.
- [ ] Profile shows report route.
- [ ] Chat/counterpart profile report and block routes are reachable.
- [ ] Account deletion request route is reachable.
- [ ] Review notes say not to delete the only demo account unless necessary.

### Post View and Read State

Seed enough view/read state so the UI can show:

- previously viewed interview row styling
- unread chat badges
- read notifications
- unread notifications

This is especially useful for screenshots because it makes the UI look lived-in
without relying on manual interaction before capture.

## Screenshot State Matrix

Use the primary `review-both` account for most captures.

| Screenshot | Account | Required state |
| --- | --- | --- |
| Home | `review-both` | non-empty current progress and recent interviews |
| Interview discovery | `review-both` | multiple rows, clean filters, no empty state |
| Interview detail | `review-both` | one not-yet-applied post with CTA visible |
| Map discovery | `review-both` | visible map, markers, bottom sheet/list in stable state |
| Chat list | `review-both` | multiple rooms, unread badge, status badge |
| Chat thread | `review-both` | both-side messages, composer visible |
| My interviews | `review-both` | applied and created sections both meaningful |
| Profile/settings | `review-both` | legal/support/report/account controls reachable |
| Notification center | `review-both` | several notifications, not empty |
| Support inquiry | `review-both` | open and answered examples |

Do not capture:

- blank empty states as primary store screenshots.
- raw debug labels.
- loading spinners.
- permission error states.
- map failure state.
- account deletion final confirmation as primary marketing screenshot.

## Implementation Plan

### Step 1. Add Dedicated Store Review Seed Script

Add:

```text
apps/api/scripts/seed_store_review_data.py
```

The script should reuse helper logic from:

- `apps/api/scripts/seed_demo_data.py`
- `apps/api/scripts/seed_account_demo_data.py`

Required behavior:

- Load API environment the same way existing seed scripts do.
- Require `SUPABASE_URL`.
- Require `SUPABASE_SERVICE_ROLE_KEY`.
- Require `DATABASE_URL`.
- Create or update one official reviewer account and helper fixture accounts.
- Reset passwords to `STORE_REVIEW_PASSWORD`. Do not commit the real review
  password to git.
- Mark auth email as confirmed.
- Upsert `app_users` and role profiles.
- Clear prior `store_review_seed` fixture rows only.
- Seed posts, applications, sessions, chats, notifications, support tickets,
  post views, and read states.
- Print the final review credentials and smoke command, but never print
  service role key or DB URL.

Safety guard:

```text
ALLOW_STORE_REVIEW_SEED=true
```

The script should refuse to run unless this flag is set. This prevents
accidental production fixture changes.

Optional production-specific guard:

```text
STORE_REVIEW_SEED_ENV=production
```

Use this only to make operator intent explicit. Do not hardcode production
values in the script.

### Step 2. Make Seed Data Cleanly Identifiable

Where models support metadata/source fields, use:

```text
source = "store_review_seed"
metadata.seed_source = "store_review_seed"
```

Where models do not support metadata/source, use deterministic ownership:

- reviewer account IDs
- deterministic titles
- deterministic email domain

Do not add visible `[리뷰어]`, `[데모]`, or `[테스트]` prefixes to user-facing
titles. Existing `seed_account_demo_data.py` currently has reviewer-prefixed
titles; official screenshot/review data should avoid that visible prefix.

### Step 3. Add Reset Command

The same script should support a cleanup mode:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_MODE=reset \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

Reset mode should:

- remove connected seeded product data
- preserve or optionally remove review auth users depending on flag

Default reset should preserve auth users and simply clear/reseed product state.

### Step 4. Update Documentation

Update:

- `docs/demo-seed.md`
- `docs/reference/ios-store-readiness/apple-app-store-metadata-review-assets-plan.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`

Minimum doc changes:

- final reviewer credentials
- seed command
- reset command
- smoke command
- App Store Connect review notes
- Play Console sign-in details

### Step 5. Run Local or Deployed Seed

For screenshot preparation against TestFlight/release build, seed the production
review backend:

```bash
ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_ENV=production \
apps/api/.venv/bin/python apps/api/scripts/seed_store_review_data.py
```

Preferred execution location:

- GPU server, using its existing `.env` and DB tunnel.

Alternative:

- Local machine only if production Supabase service role and DB URL are
  available in local env and handled safely.

### Step 6. Run Store Review Smoke

Run smoke for all official accounts.

Example:

```bash
HYPOFIT_API_BASE_URL="https://hypofit-api.bukae.co.kr" \
SUPABASE_URL="https://xxxxx.supabase.co" \
SUPABASE_ANON_KEY="..." \
REVIEW_EMAIL="review-both@hypofit.demo" \
REVIEW_PASSWORD="$STORE_REVIEW_PASSWORD" \
apps/api/.venv/bin/python apps/api/scripts/store_review_smoke.py
```

Acceptance criteria:

- [ ] login succeeds
- [ ] `/me` succeeds
- [ ] interview list is non-empty
- [ ] map/discovery data is non-empty
- [ ] applications are non-empty
- [ ] chat list is non-empty
- [ ] notifications are non-empty
- [ ] support/report/account deletion routes are reachable

### Step 7. Real Device QA

Before screenshot capture:

- [ ] Install latest TestFlight build.
- [ ] Sign out of any personal account.
- [ ] Log in with `review-both@hypofit.demo`.
- [ ] Confirm splash/auth flow does not hang.
- [ ] Confirm no OTP is requested.
- [ ] Confirm home is non-empty.
- [ ] Confirm map loads.
- [ ] Confirm chat list/thread loads.
- [ ] Confirm profile/legal/support/report/account deletion routes open.
- [ ] Repeat minimally with founder and respondent accounts.

### Step 8. Screenshot Capture

Use seeded review accounts only.

Required:

- [ ] No real personal information visible.
- [ ] No debug labels visible.
- [ ] No empty primary screenshots.
- [ ] No payment guarantee claims.
- [ ] No `mock`, `demo`, `test`, or internal markers visible.
- [ ] Case-fee copy stays informational.
- [ ] Public support/legal surfaces are reachable.

## App Store Connect Review Notes Draft

Use English. Replace only if credentials change.

```text
Hypofit is an interview matching app for early-stage founders and respondents.
The app requires sign-in because interview posts, applications, chat rooms,
support tickets, reports, and account deletion requests are tied to user
accounts.

Demo account:
Email: review-both@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>

This demo account has both founder and respondent permissions. It is
pre-verified and does not require email OTP. Seeded demo data is connected to
this account so reviewers can browse interview posts, view
map-based discovery, apply to interviews, open chat rooms, check notifications,
and access profile, support, report, legal, and account deletion screens.

Suggested review flow:
1. Sign in with review-both@hypofit.demo.
2. Open Home to see current activity and recent interview posts.
3. Open Interviews to browse posts and open a detail page.
4. Open Map to view nearby interview posts. Location permission is used only for
   nearby discovery; the app remains usable if permission is denied.
5. Open Chat to review interview coordination messages.
6. Open Profile to access account settings, support, report, terms, privacy
   policy, and account deletion.
7. The same account includes both founder and respondent flows, so no account
   switching is required.

Reward/case-fee note:
Hypofit currently shows interview case fees as post information only. The app
does not process payment, escrow, settlement, subscription, boost, credit, or
in-app purchase.

Backend:
The review build uses the production API at https://hypofit-api.bukae.co.kr.
```

## Google Play Sign-In Details Draft

Use this in Play Console App content > Sign-in details.

```text
Use the following reusable demo account. It is valid regardless of reviewer
location and does not require OTP.

Email: review-both@hypofit.demo
Password: <STORE_REVIEW_PASSWORD>

Suggested flow:
1. Sign in with review-both@hypofit.demo.
2. Open Home to see current activity and recent interview posts.
3. Open Interviews to browse posts and open a detail page.
4. Open Map to view nearby interview posts. Location permission is used only for
   nearby discovery.
5. Open Chat to review interview coordination messages.
6. Open Profile to access support, report, terms, privacy policy, and account
   deletion.
7. The same account includes both founder and respondent flows, so no account
   switching is required.

The app currently does not process payments. Interview case-fee amounts are
shown as recruitment information only.
```

## Operational Runbook

### Before Review Submission

- [x] Run store review seed against the deployed review backend.
- [x] Run store review smoke for `review-both`.
- [ ] Manually sign in on TestFlight/release build.
- [ ] Confirm no OTP is requested.
- [ ] Confirm map, chat, notification, profile, support, report, legal, and
      account deletion surfaces are reachable.
- [ ] Paste final credentials into App Store Connect and Play Console.
- [ ] Keep API, DB tunnel, and reverse SSH tunnel running during review.
- [ ] Monitor Sentry and API logs during review week.

### If Reviewer Changes Data

If a reviewer applies, sends messages, changes profile data, or requests account
deletion:

1. Do not manually edit random DB rows.
2. Rerun the idempotent seed script.
3. Rerun store review smoke.
4. If the app is already in review and the account is broken, reply in the
   review console with the restored credentials and short explanation.

### If Reviewer Deletes the Account

Preferred prevention:

- Review notes should say account deletion is available but the reviewer does
  not need to complete final deletion to inspect the flow.

Recovery:

- Rerun seed script.
- Confirm Supabase Auth user exists and is email-confirmed.
- Confirm app profile rows exist.
- Rerun smoke.

## Risks and Mitigations

### Risk: OTP Blocks Review

Mitigation:

- Pre-create and pre-confirm reviewer accounts.
- Verify release build login before submission.
- Do not ask reviewers to create accounts.

### Risk: Empty Screens

Mitigation:

- Seed all private surfaces connected to reviewer accounts.
- Smoke non-empty states before screenshot capture and review submission.

### Risk: Demo Data Leaks Into Public Product

Mitigation:

- Keep data synthetic and harmless.
- Avoid visible test labels.
- Use deterministic seed ownership/source markers for cleanup.

### Risk: Reviewer Mutates the Only Account

Mitigation:

- Provide one official account, but keep helper fixture accounts available
  internally for reset/reseed and manual QA.
- Keep seed reset script ready.
- Use `review-both` as the only submitted credential.

### Risk: Store Metadata Conflicts With Actual Product

Mitigation:

- Review notes clearly state no payment processing exists.
- Screenshots must not imply payment settlement or guaranteed rewards.
- Privacy labels and Data safety must include actual collection behavior.

## Implementation Checklist

Code implementation:

- [x] Add `apps/api/scripts/seed_store_review_data.py`.
- [x] Implement creation/update for the official reviewer account
      `review-both@hypofit.demo`.
- [x] Implement creation/update for helper fixture accounts
      `review-founder@hypofit.demo` and `review-respondent@hypofit.demo`.
- [x] Implement email-confirmation enforcement for all seeded review accounts.
- [x] Implement public interview/map data seeding.
- [x] Implement account-connected applications.
- [x] Implement account-connected chat rooms and messages.
- [x] Implement account-connected notifications.
- [x] Implement account-connected support inquiry examples.
- [x] Implement post view/read state.
- [x] Add reset mode.
- [x] Update `docs/demo-seed.md`.
- [x] Update iOS review-assets reference with final credential plan.
- [x] Update Google Play readiness reference with final credential plan.

Live execution:

- [x] Create/update `review-both@hypofit.demo` in the deployed review backend.
- [x] Create/update helper fixture accounts in the deployed review backend.
- [x] Ensure the official reviewer account is email-confirmed.
- [x] Ensure the official reviewer account can log in with
      the configured `STORE_REVIEW_PASSWORD`.
- [x] Seed public interview/map data in the deployed review backend.
- [x] Seed account-connected applications in the deployed review backend.
- [x] Seed account-connected chat rooms and messages in the deployed review backend.
- [x] Seed account-connected notifications in the deployed review backend.
- [x] Seed account-connected support inquiry examples in the deployed review backend.
- [x] Seed post view/read state in the deployed review backend.
- [x] Run deployed smoke against `review-both`.
- [ ] Confirm TestFlight/release build login manually.
- [ ] Capture screenshots from seeded data.
- [ ] Paste final review notes into App Store Connect.
- [ ] Paste final sign-in details into Play Console.

## Completion Criteria

This active document can move to `docs/completed/` when:

- The dedicated seed script exists.
- Official reviewer accounts are created and pre-confirmed.
- Reviewer data is seeded in the deployed review backend.
- Store review smoke passes for the primary reviewer account.
- Real-device/TestFlight login works without OTP.
- Screenshots are captured or screenshot readiness is explicitly accepted.
- App Store Connect and Play Console reviewer instructions are filled with the
  final credentials.
