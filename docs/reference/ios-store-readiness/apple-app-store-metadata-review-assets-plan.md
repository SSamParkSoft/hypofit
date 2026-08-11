# Apple App Store Metadata and Review Assets Plan

Status: reference - parked until Apple App Store work is scheduled

Last updated: 2026-06-01

## Purpose

Prepare the App Store Connect metadata, screenshots, App Review notes, and demo
account package needed for Hypofit's first iOS submission.

This document is execution-focused. Use
`docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md` for the broader
iOS launch checklist and `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md` for
App Privacy answers.

## Source Basis

Official Apple sources checked on 2026-05-31:

- App Store Connect screenshot specifications:
  https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Upload app previews and screenshots:
  https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots
- App review information:
  https://developer.apple.com/help/app-store-connect/reference/app-review-information
- App Store review details API:
  https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details

Current Apple implications:

- Each app version can provide 1 to 10 screenshots per supported display set.
- Screenshots must be `.png`, `.jpg`, or `.jpeg`.
- For modern iPhone-first submission, prepare the 6.9-inch iPhone set first.
- Current 6.9-inch accepted portrait sizes include:
  - `1260 x 2736`
  - `1290 x 2796`
  - `1320 x 2868`
- App Review information should include contact details, sign-in/demo account
  information when login is required, and notes that help the reviewer exercise
  the app.

## Current Hypofit App Surface

Primary mobile tabs:

- `홈`
- `인터뷰`
- `지도`
- `채팅`
- `프로필`

Relevant secondary screens:

- Login and signup.
- Interview detail and application.
- Create interview post.
- My interviews.
- Chat thread and counterpart profile/report/block surface.
- Notifications.
- Account information.
- Account deletion.
- Support inquiry.
- Report.
- Terms and privacy policy.

## Screenshot Strategy

Principles:

- Do not use only splash or login screenshots.
- Show real product value: finding interviews, map discovery, applying,
  chatting, and managing profile/safety settings.
- Use seeded demo data that looks real but is clearly non-sensitive.
- Avoid exposing private real-user names, phone numbers, email addresses, raw
  IDs, debug labels, or internal environment markers.
- Avoid copy that implies Hypofit, Apple, or Google guarantees 사례비.
- If overlay text is added later, keep it short and consistent with the current
  Korean product tone.

Recommended first iPhone screenshot set:

1. Home
   - Route: `/(tabs)/home`
   - Goal: show the app's main value immediately.
   - Capture state:
     - logged in
     - realistic active progress
     - recent interview rows
   - Avoid:
     - empty feed
     - mock/debug labels
     - overly personal account details

2. Interview Discovery
   - Route: `/(tabs)/interviews`
   - Goal: show detailed search/browsing of paid customer interviews.
   - Capture state:
     - multiple rows visible
     - mode/reward/location filters in a normal state
     - enough row detail to understand service, target, reward, and format
   - Avoid:
     - no-result state unless intentionally creating a second asset

3. Interview Detail / Application
   - Route: `/interviews/[postId]`
   - Goal: show that users can inspect a request and apply.
   - Capture state:
     - realistic founder request
     - target customer and schedule/reward sections
     - application CTA visible
   - Avoid:
     - duplicate application/error state
     - placeholder founder profile wording

4. Map Discovery
   - Route: `/(tabs)/map`
   - Goal: show location-based interview discovery.
   - Capture state:
     - map visible
     - nearby markers or selected marker preview
     - bottom list/sheet in stable position
   - Avoid:
     - permission error state for primary screenshot
     - "map failed" or service-area fallback messages

5. Chat List
   - Route: `/(tabs)/chat`
   - Goal: show interview coordination after application.
   - Capture state:
     - multiple conversations
     - unread count or status badges if available
     - clean row layout
   - Avoid:
     - empty chat state for primary screenshot

6. Chat Thread
   - Route: `/chat/[roomId]`
   - Goal: show the real coordination flow.
   - Capture state:
     - both-side message bubbles
     - input composer
     - interview context reachable via menu
   - Avoid:
     - raw internal message ids
     - unmoderated or unsafe example text

7. Profile and Safety Settings
   - Route: `/(tabs)/profile`
   - Goal: show trust, support, legal, and account control.
   - Capture state:
     - profile page with support/report/legal/account deletion visible or close
       to visible
   - Avoid:
     - showing a real phone number or private email if not a demo account

8. Account Deletion / Support
   - Route: `/profile/delete-account` or `/support`
   - Goal: provide review evidence that account deletion and support are
     reachable.
   - Capture state:
     - in-app account deletion request entry
     - or inquiry list/create support flow
   - Avoid:
     - using this as the first screenshot; it is a compliance support asset.

Optional extra screenshots:

- Signup role selection with 19+ confirmation.
- Notification center with non-empty events.
- My interviews showing founder/respondent lifecycle states.
- Report flow showing abuse/safety entry point.

## Screenshot Capture Requirements

Primary required capture:

- Device/display class:
  - iPhone 6.9-inch set.
- Orientation:
  - portrait.
- Export sizes to prepare:
  - `1260 x 2736`
  - `1290 x 2796`
  - or `1320 x 2868`
- File format:
  - `.png` preferred for lossless UI capture.

Recommended local simulator source:

- Use the newest available Pro Max simulator that matches Apple's current
  accepted 6.9-inch screenshot set.
- If simulator output size does not match App Store Connect requirements, make
  export resizing a deliberate asset step and keep original captures.

Working asset folders:

```text
docs/store-assets/apple/screenshots/source/
docs/store-assets/apple/screenshots/export/
docs/store-assets/apple/review-notes/
```

Do not commit screenshots containing real personal data or secrets. If
screenshots are generated from seeded data and are intended as store assets,
commit only after they are reviewed.

## App Metadata Draft

App name:

- `Hypofit`

Subtitle draft options:

- `고객 인터뷰를 빠르게 연결`
- `창업자를 위한 고객 인터뷰`
- `사례비 기반 인터뷰 매칭`

Recommendation:

- Use `고객 인터뷰를 빠르게 연결`.

Reason:

- It states the core value without overclaiming automation, payment guarantee,
  or research-platform scope.

Category candidates:

- Business
- Productivity
- Lifestyle, only if Apple category fit later looks better

Recommendation:

- Start with Business.

Short product description draft:

```text
Hypofit은 예비창업자와 초기 창업자가 실제 타깃 고객을 찾아 인터뷰를 조율할 수 있도록 돕는 인터뷰 매칭 앱입니다. 창업자는 모집글을 만들고, 응답자는 경험, 위치, 시간, 사례비를 확인한 뒤 신청할 수 있습니다.
```

Long description requirements:

- Founder creates interview posts.
- Respondent browses by target, location, format, and reward.
- Application leads to chat-based coordination.
- Account deletion, report, block, support, privacy, and terms are available.
- 사례비 is coordinated between users in the MVP.
- Do not claim automated escrow, payment guarantee, AI matching, recording, or
  transcription.

Prohibited metadata claims:

- `결제를 보장합니다`
- `사례비를 안전하게 예치합니다`
- `AI가 자동으로 완벽 매칭합니다`
- `노쇼를 완전히 방지합니다`
- `인터뷰 수익을 보장합니다`

## Demo Account Plan

Use dedicated App Review accounts, not a personal account.

Submitted reviewer account:

```text
review-both@hypofit.demo
```

Helper fixture accounts, not submitted unless App Review explicitly asks for
additional credentials:

```text
review-founder@hypofit.demo
review-respondent@hypofit.demo
```

Review password:

```text
<STORE_REVIEW_PASSWORD>
```

Before submission:

- [ ] Run `apps/api/scripts/seed_store_review_data.py` with
      `ALLOW_STORE_REVIEW_SEED=true` against the deployed review backend.
- [ ] Create one official reviewer auth user plus helper fixture auth users.
- [ ] Mark email-confirmation state so App Review can log in without inbox
      access, or document the verification path if email confirmation is active.
- [ ] Seed both-role, founder, and respondent profiles with safe demo identity.
- [ ] Seed interview posts near the current map demo region.
- [ ] Seed applications across:
  - applied
  - selected
  - rejected
  - completed
  - no-show
- [ ] Seed chat rooms and messages.
- [ ] Seed at least one notification.
- [ ] Seed support/report examples if reviewer needs to see history.
- [ ] Confirm account deletion is visible but do not ask reviewer to actually
      delete the only demo account unless a reset path exists.

Fallback existing demo dataset:

- `docs/demo-seed.md` defines founder/respondent demo users and the rich account
  seed script.
- Existing seeded fallback accounts:
  - `founder1@hypofit.demo` through `founder4@hypofit.demo`
  - `respondent1@hypofit.demo` through `respondent4@hypofit.demo`
  - shared temporary password: supply `DEMO_PASSWORD` with at least 8 characters,
    one English letter, and one special character
- The existing seeded dataset includes founder/respondent profiles, 14
  interview posts, 14 applications, lifecycle states across applied, selected,
  rejected, completed, and no-show, chat rooms/messages, sessions, and viewed
  post rows.
- Current smoke has used `sehyeon73@gmail.com`, but App Store review should use
  dedicated review accounts instead of a personal email.

Decision:

- Use dedicated `review-both` as the only submitted App Review account.
- Use `review-both` as the primary account because it exposes most screens
  without forcing account switching.
- Keep role-specific accounts as internal helper fixture accounts and fallback
  accounts only.
- Keep `founder1` / `respondent1` as fallback local/staging demo accounts only.

## App Review Notes Draft

Use plain English or Korean. English is safer for Apple Review.

Draft:

```text
Hypofit is an interview matching app for early-stage founders and respondents.
The app requires login because interview posts, applications, chat rooms,
support tickets, reports, and account deletion requests are tied to user
accounts.

Demo account:
- review-both@hypofit.demo / <STORE_REVIEW_PASSWORD>

Suggested review flow:
1. Sign in with the primary demo account.
2. Open Home to see recent interview opportunities and current activity.
3. Open Interviews to browse interview posts, then open a detail page.
4. Open Map to see nearby interview opportunities. Location permission is used
   only for nearby discovery; the app remains usable if permission is denied.
5. Open Chat to review interview coordination messages.
6. Open Profile to find account settings, support, report, terms, privacy
   policy, and account deletion.
7. The same account includes both founder and respondent flows, so no account
   switching is required.

Reward/case-fee note:
Hypofit currently shows interview case fees as post information only. The app
does not process payment, escrow, settlement, subscription, boost, credit, or
in-app purchase.

Safety and account controls:
Users can report issues through Profile > 신고하기 and chat/profile report
surfaces. Users can block chat counterparts. Users can request account deletion
from Profile > 계정 삭제 and can also use the public deletion page:
https://hypofit.bukae.co.kr/account-deletion

Backend:
The review build uses the production API at https://hypofit-api.bukae.co.kr.
```

Before submission:

- [ ] Replace draft demo credentials with the actual review credentials.
- [ ] Confirm the accounts work immediately before submission.
- [ ] Confirm the API and public URLs remain live during review.
- [ ] Keep a reset script or runbook ready in case the reviewer changes account
      state.

## Review Contact Information

Open:

- [ ] App Review contact first name.
- [ ] App Review contact last name.
- [ ] Contact phone number.
- [x] Contact email:
      `ssamso8282@gmail.com`

Current confirmed service provider/legal contact name is `박종인`.
Current confirmed public support/privacy email is `ssamso8282@gmail.com`.

## Public URL Checklist

Confirm HTTP 200 before submission:

- [ ] Privacy policy URL:
  - `https://hypofit.bukae.co.kr/legal/privacy`
- [ ] Terms URL:
  - `https://hypofit.bukae.co.kr/legal/terms`
- [ ] Support URL:
  - `https://hypofit.bukae.co.kr/support`
- [ ] Account deletion URL:
  - `https://hypofit.bukae.co.kr/account-deletion`
- [ ] API readiness:
  - `https://hypofit-api.bukae.co.kr/api/v1/health/ready`

## Metadata QA Checklist

- [ ] App name matches app icon/home screen name.
- [ ] Subtitle does not overclaim payment, AI, or no-show prevention.
- [ ] Description explains founder/respondent roles.
- [ ] Description explains interview application and chat coordination.
- [ ] Description avoids guaranteed rewards or payment processing claims.
- [ ] Keywords avoid competitor trademarks and misleading terms.
- [ ] Support URL works without login.
- [ ] Privacy URL works without login.
- [ ] Review notes include working credentials.
- [ ] Screenshots show real app surfaces, not only auth screens.
- [ ] Screenshots use demo data only.
- [ ] Screenshots do not expose private phone/email unless intentionally demo.
- [ ] Screenshots fit App Store Connect accepted pixel sizes.
- [ ] iPhone-only positioning is consistent with `supportsTablet: false`.

## Capture Runbook

Before capture:

1. Deploy API and seed review data.
2. Install the iOS build or run the simulator against the same API.
3. Sign in with the review account.
4. Disable unrelated simulator overlays.
5. Confirm font, icons, map, and images render correctly.
6. Confirm no visible debug text or crash warning remains.

Capture order:

1. Home.
2. Interviews list.
3. Interview detail.
4. Map.
5. Chat list.
6. Chat thread.
7. Profile.
8. Account deletion or support.

After capture:

1. Save original source screenshots.
2. Export accepted App Store sizes.
3. Review for personal data and policy-sensitive claims.
4. Keep a note mapping each screenshot file to route/account/data state.

## Current Blockers

- [ ] Dedicated App Review accounts are not created or documented as final.
- [ ] Screenshot assets are not captured.
- [ ] Store subtitle/description/category are not final.
- [ ] App Review contact information is not final.
- [x] Public support email/operator identity is confirmed for the current
      launch track.
- [ ] Public URL smoke has not been rerun immediately before submission.
- [ ] iOS build/TestFlight path has not been verified.
- [ ] Real iPhone capture has not been done.

## Documentation Links

Keep aligned with:

- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/completed/api-operations-readiness-plan.md`
- `docs/completed/legal-pages-implementation-plan.md`
- `docs/reference/ui-final-qa-checklist.md`
- `docs/demo-seed.md`
