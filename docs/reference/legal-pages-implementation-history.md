# Hypofit Legal and Support Pages Plan

Status: reference - implementation history

Last updated: 2026-06-01

## Purpose

Hypofit needs profile menu links that open real service information pages:

- Terms of Service.
- Privacy Policy.
- Support.

The web app, installed-web fallback, and Expo mobile app can share the same
legal content where the data handling is the same. Platform-specific wording
must still be added when native permissions, Play Console declarations, or App
Store privacy labels require it.

## Reference Basis

- Personal Information Protection Act Article 30 requires a privacy policy that
  includes processing purpose, retention period, third-party provision when
  applicable, destruction procedures, outsourcing when applicable, and user
  rights.
- The Personal Information Protection Commission privacy policy writing
  guidance emphasizes that policies should be easy to find, understandable, and
  consistent with actual data handling.
- The current PWA already requests browser current-location permission in
  location-based flows. Privacy wording must cover this current use, even
  before native app permissions exist.
- Google Play wording is now active work because Hypofit is preparing the Expo
  Android app first. Native permissions, Data safety, public account deletion,
  and processor wording must stay aligned with the Google Play readiness docs.

## MVP Routes

```text
/legal/terms
/legal/privacy
/support
/account-deletion
```

These pages are public so users can read them before or after login.

## Terms Content Scope

The MVP terms should cover:

- service purpose
- service roles: founder, respondent, interview post, application, session,
  reward, no-show
- account registration and user responsibilities
- founder responsibilities
- respondent responsibilities
- interview post and application rules
- reward/payment notice
- prohibited behavior
- content and account restrictions
- service change or suspension
- liability limits
- dispute handling
- terms changes
- effective date

Important current limitation:

Hypofit does not yet provide automated payment, escrow, or reward guarantees.
The terms must not imply that Hypofit is currently a payment intermediary.

## Privacy Content Scope

The MVP privacy policy should cover:

- controller/service name
- processing purposes
- collected data fields
- automatically generated service data
- retention and destruction
- third-party provision
- processor/outsourcing list
- international transfer review note for Supabase/Vercel
- user rights
- security measures
- cookies/local storage/session storage
- browser current-location permission for the map tab and `내 근처` filter
- stored interview location coordinates for offline-capable posts
- profile image storage and visibility
- chat, support ticket, report ticket, and account deletion request data
- public `/account-deletion` web resource for users without the app installed
- children under 14
- privacy contact
- policy changes
- effective date

## 2026-05-28 Legal Copy Update

The web and Expo mobile legal pages now read the same static legal content from
`@hypofit/contracts`.

The current draft is written for Hypofit's actual MVP behavior:

- operator name: `contentruck팀`
- current support/privacy contact: `ssamso8282@gmail.com`
- no automated payment, escrow, subscription, advertising SDK, or reward
  guarantee
- covered user-generated content surfaces: interview posts, applications,
  profile images, chat, support tickets, reports, no-show/dispute records
- covered location behavior: current-location search and stored interview
  post place/address/coordinates
- covered store-readiness behavior: in-app account deletion path and public web
  account deletion path

The draft intentionally avoids copying paid stock/community app clauses that do
not match Hypofit, such as investment information, subscription billing,
personalized advertising SDKs, and community finance-content disclaimers.

## 2026-05-28 Legal Risk Review and Hardening Plan

### Review Result

The current legal copy is acceptable as an MVP/internal-test draft because it
describes Hypofit's real feature surface and avoids unsupported claims.

It is not yet production-final for public Google Play launch. The main gaps are
not the overall direction of the text, but the level of specificity required
for a public privacy policy and app-store review:

- operator identity is still a team name, not a finalized legal/business name
- support/privacy email is a temporary team email
- retention periods are partly policy-level and not fully field-by-field
- outsourcing and international transfer details are not yet tied to confirmed
  provider regions and contracts
- account deletion text should include the public deletion URL directly before
  store submission
- location, public profile images, chat review, and in-person interview safety
  need slightly tighter wording

### Current Temporary Values

Use these values during MVP development and closed testing:

- operator display name: `contentruck팀`
- support/privacy contact email: `ssamso8282@gmail.com`
- account deletion web path:
  `https://hypofit.bukae.co.kr/account-deletion`
- privacy policy web path:
  `https://hypofit.bukae.co.kr/legal/privacy`
- terms web path:
  `https://hypofit.bukae.co.kr/legal/terms`

These are intentionally temporary. Do not block UI/API development on changing
them, but treat them as launch-blocking before public store submission.

### Production-Final Values To Replace Before Launch

Before public Google Play release, confirm and replace:

- legal operator name:
  - individual, team, corporation, or registered business name
  - must match or clearly correspond to the Google Play developer/store listing
    name
- privacy/contact email:
  - current temporary value is `ssamso8282@gmail.com`
  - production-preferred value is a domain email such as
    `support@bukae.co.kr` or a future Hypofit/contentruck domain email
- privacy officer or privacy contact label:
  - if no formal privacy officer is appointed, use a clear 담당 부서/담당자
    label instead of implying a nonexistent corporate officer
- public legal page URLs:
  - must be reachable without login
  - must not be a PDF
  - must not be geofenced
  - must return a normal browser page on mobile and desktop

### Privacy Policy Hardening Tasks

#### 1. Make Retention Periods Concrete

Current risk:

- Several sentences use broad wording such as "필요한 기간 동안" or "법령에서 정한
  기간".
- That is acceptable as a placeholder, but weak for a final public privacy
  policy.

Target direction:

- Replace broad retention wording with service-defined retention rules.
- Keep statutory retention wording only where a real law applies.
- Avoid claiming payment/e-commerce retention periods until Hypofit actually
  processes payments or subscriptions.

Proposed retention matrix:

```text
account and auth profile
  retention: until account deletion
  deletion: delete or de-identify after deletion request is processed

profile fields
  examples: name, role, phone number, bio, profile image URL
  retention: until account deletion or direct user edit/delete

interview posts
  retention: until post deletion, account deletion, or service policy expiry
  launch decision needed: whether completed/closed posts remain as history

applications
  retention: until account deletion or interview record retention expiry
  launch decision needed: how long selected/rejected application records remain

chat messages
  retention: until room deletion/account deletion or dispute retention expiry
  launch decision needed: whether both parties lose access when one user deletes
  an account

support tickets and reports
  retention: 3 years from receipt, unless longer retention is needed for a
  pending dispute or legal request

no-show, abuse, and restriction records
  retention: 6 months to 1 year after account deletion or restriction end
  launch decision needed: exact period

access/security logs
  retention: 3 months by default
  launch decision needed: whether API logs contain IP/device/user identifiers

location current-position search
  retention: not stored as profile information by default
  caveat: API/server logs may temporarily contain request metadata

interview post place/address/coordinates
  retention: same as interview post
```

Implementation note:

- Once final periods are chosen, update `packages/contracts/src/legal.ts`.
- If the database implements hard/soft deletion differently, update the policy
  to match the implementation, not the desired behavior.

#### 2. Clarify Password Handling

Current risk:

- "비밀번호 인증 정보" can sound like Hypofit stores raw passwords.

Target wording:

- State that password authentication is handled by Supabase Auth or the
  configured auth provider.
- State that Hypofit does not store password plaintext.
- Do not overclaim encryption details unless verified from the provider docs.

Suggested wording:

```text
회원가입과 로그인: 이메일, 이름, Supabase Auth 사용자 식별자, 로그인 상태
유지를 위한 인증 토큰을 처리합니다. 비밀번호는 인증 제공자의 보안 방식에 따라
처리되며, 운영팀은 비밀번호 원문을 저장하지 않습니다.
```

#### 3. Make Location Use Review-Safe

Current risk:

- Location use is described, but Play review also checks runtime permission
  context and Data safety consistency.

Target wording:

- Policy: current location is used only for nearby interview search and map
  display.
- UI: permission prompt should be preceded by clear in-app rationale.
- Data safety: declare precise/approximate location only if the shipped build
  actually requests it.

Required UI alignment:

- Map tab entry: explain that current location is used to show nearby
  interviews.
- Interview filter future "nearby" behavior: request permission only when the
  user uses the feature.
- Do not claim background location. Hypofit should not collect location in the
  background.

#### 4. Clarify Profile Image Visibility

Current risk:

- The current text says a public URL may be created. This is directionally
  correct, but the consequence should be clearer because `profileimage` is a
  public Supabase bucket.

Target wording:

```text
프로필 사진을 등록하면 서비스 내 상대방에게 표시됩니다. 현재 프로필 이미지
저장소가 공개 접근 방식으로 운영되는 경우, 이미지 URL을 아는 사람은 해당
이미지에 접근할 수 있습니다.
```

Future improvement:

- If profile images should not be publicly reachable, switch to signed URLs and
  update the policy accordingly.

#### 5. Limit Chat/Report Review Wording

Current risk:

- "운영팀이 채팅 관련 기록을 확인" can sound too broad.

Target wording:

- Restrict review to reports, disputes, legal requests, safety incidents, abuse
  prevention, and service security.
- Avoid implying routine manual monitoring of all chats.

Suggested wording:

```text
운영팀은 신고, 분쟁, 법령 준수, 서비스 안전 확보에 필요한 경우에 한해
관련 채팅 기록과 신고 자료를 확인할 수 있습니다.
```

#### 6. Clarify Third-Party Disclosure vs Service Display

Current risk:

- "제3자 제공" and "서비스 내 상대방에게 표시" can be legally and
  intuitively different.

Target direction:

- Separate "service display to counterpart" from "external third-party
  provision".
- For Hypofit, counterpart display is core service functionality.
- External provision should remain limited to law, consent, service providers,
  or future payment providers.

#### 7. Add Automated Decision / Profiling Stance

Current risk:

- Hypofit does not appear to use automated decisions now, but modern privacy
  guidance increasingly expects clarity where recommendation/matching may be
  perceived.

Target wording:

```text
현재 Hypofit은 회원에게 법적 또는 중대한 영향을 미치는 완전 자동화된
결정을 제공하지 않습니다. 향후 자동 추천, 자동 심사, AI 매칭 기능을 도입하는
경우 처리 기준과 이의제기 방법을 별도로 안내합니다.
```

### Terms of Service Hardening Tasks

#### 1. Tighten Liability Limitation

Current risk:

- "고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다" can be too broad if
  read as excluding legally non-excludable liability.

Target wording:

```text
운영팀은 관련 법령상 허용되는 범위에서, 천재지변, 네트워크 장애, 외부
서비스 장애, 회원의 귀책사유로 발생한 손해에 대해 책임을 부담하지 않습니다.
다만 운영팀의 고의 또는 중대한 과실로 발생한 손해에 대해서는 관련 법령에
따릅니다.
```

#### 2. Add In-Person Interview Safety Clause

Reason:

- Hypofit explicitly supports face-to-face interviews.
- A safety clause is important for user trust and store review context.

Target coverage:

- use public/safe places for first meeting
- do not request unnecessary sensitive information
- use chat/report if uncomfortable
- users are responsible for agreeing on place/time, but Hypofit can act on
  reports

Suggested clause:

```text
대면 인터뷰를 진행하는 회원은 안전한 공개 장소를 선택하고, 인터뷰 목적과
무관한 개인정보나 민감정보를 요구하거나 제공하지 않아야 합니다. 위험하거나
부적절한 요청을 받은 경우 즉시 인터뷰를 중단하고 신고할 수 있습니다.
```

#### 3. Clarify Case Fee Risk Without Overreaching

Current state:

- The text correctly says Hypofit does not provide payment, escrow, or reward
  guarantee.

Hardening direction:

- Keep this position until payment is implemented.
- Add that members should confirm payment amount, method, and timing in chat
  before the interview.
- Avoid wording that suggests Hypofit can fully adjudicate payment disputes.

#### 4. Make User Restrictions More Procedural

Current risk:

- It says service use can be restricted, but the sequence is lightweight.

Target direction:

- Add normal process: report received, review, temporary restriction if urgent,
  final action, inquiry/appeal path.
- Keep emergency action for severe safety/security cases.

#### 5. Clarify Minor Policy

Decision:

- MVP only allows users aged 19+.

Reason:

- Hypofit includes paid incentives, chat-based coordination, current-location
  based discovery, and face-to-face interviews.
- Allowing 14+ users would require guardian-consent flows, minor-safe
  interview restrictions, stronger moderation, and additional operational
  procedures that are outside the current MVP.

Terms and privacy policy wording:

```text
Hypofit은 원칙적으로 만 19세 이상 회원을 대상으로 제공됩니다.
```

Required product follow-up:

- Add an age confirmation step or checkbox in signup/onboarding.
- Block or review accounts identified as under 19.
- Do not market the MVP as a teen/minor interview recruiting service.
- If the team later wants 14+ users, create a separate minor-safety plan before
  enabling it.

### Google Play Readiness Tasks

Before production submission:

- Ensure Play Console privacy policy URL is:
  `https://hypofit.bukae.co.kr/legal/privacy` or final custom-domain equivalent.
- Ensure account deletion URL is:
  `https://hypofit.bukae.co.kr/account-deletion` or final custom-domain
  equivalent.
- Ensure both URLs:
  - load without login
  - mention Hypofit
  - mention the developer/operator name
  - provide contact method
  - are not PDFs
  - are not editable public docs
  - are not blocked by geography or auth
- Ensure Play Data safety answers match actual behavior:
  - email/name/profile data collected
  - user-generated content collected
  - photos/files collected if profile image upload ships
  - location collected if map/current-location ships
  - messages collected if chat ships
  - app activity/diagnostics only if analytics/crash tools are actually added
  - no advertising ID unless an ad/analytics SDK collects it
- Ensure in-app profile/settings includes:
  - 개인정보처리방침
  - 이용약관
  - 문의하기
  - 신고하기
  - 계정 삭제

### Implementation Order

#### Phase 1: Now, Before More UI Polish

- [x] Keep temporary operator/contact values.
- [x] Update legal copy for low-risk accuracy:
  - password plaintext clarification
  - account deletion URL direct mention
  - profile image public URL clarity
  - chat review limitation wording
  - liability limitation wording
  - in-person safety clause
  - background location non-collection statement
  - automated decision non-use statement
- [x] Keep wording static and plain, not card-like UI.

#### Phase 2: Before Closed External Testing

- [x] Decide whether the MVP is 19+ only.
- [x] Add signup/onboarding age confirmation UI and enforcement for the 19+
  policy.
- [x] Decide and reflect provisional retention periods for:
  - support/report records
  - no-show/restriction records
  - chat/application records
  - access/security logs
- [x] Confirm the account deletion page clearly says how requests are processed.
- [x] Confirm location permission UI has a clear pre-permission explanation for
  map-tab entry and interview distance filters.

#### Phase 3: Before Google Play Production Submission

- Replace operator/contact temporary values if needed.
- Confirm Supabase/Vercel/Expo/Kakao provider details and regions.
- Update privacy policy with production provider table if required.
- Check Google Play Data safety form against the final policy.
- Run public URL smoke tests for privacy, terms, support, and account deletion.
- Have a human legal/operator review the final copy.

### Acceptance Criteria

Legal content is ready for public launch only when:

- the privacy policy includes the app name and operator name
- the privacy policy includes a working contact method
- collected data, purpose, retention, deletion, third-party disclosure,
  processors, international transfer, user rights, security, children/minors,
  and policy changes are covered
- account deletion is available inside the app and outside the app
- the terms clearly explain Hypofit's role as an interview matching service
- the terms do not imply payment/escrow guarantees before those features exist
- face-to-face interview safety and reporting paths are covered
- the Play Console Data safety answers do not conflict with the privacy policy

## Support Content Scope

Support should expose simple routes and forms for:

- account/login issues
- interview post issues
- application/session issues
- reward and no-show disputes
- abuse or inappropriate conduct reports
- privacy rights requests

Current implementation uses structured in-app forms:

- `/support` for normal inquiry tickets.
- `/report` for abuse, chat, privacy, no-show, and other report tickets.
- Email remains a fallback for unauthenticated users or urgent contact.

The support form writes durable `support_tickets` records through the API.
Object-specific report entry points should continue to be added from interview,
chat, user profile, and my-interview surfaces.

The Expo RN app now has matching native screens for:

- `/legal/terms`
- `/legal/privacy`
- `/support`
- `/support/report`
- `/profile/delete-account`

The mobile legal screens use the same MVP content scope as web, but the final
production legal copy still needs a legal/operator review before store release.

## Implementation Notes

- Avoid adding a full router package only for three static pages.
- Handle the legal/support paths in `apps/web/src/app/App.tsx`.
- Keep the pages public and outside `AppShell`.
- Add Vercel SPA fallback config so direct URL refresh works.
- Link the profile menu rows to the real paths.
- `/account-deletion` is implemented as a public route in `apps/web` and
  currently returns HTTP 200 at
  `https://hypofit.bukae.co.kr/account-deletion`.

## Open Items

- Confirm whether `contentruck팀` is sufficient as the public operator name or
  whether a registered business/legal entity name must be used before launch.
- Confirm whether `ssamso8282@gmail.com` remains the production privacy/support
  contact or will be replaced by a domain email.
- Confirm whether Supabase/Vercel and any Kakao SDK/API data transfer wording
  needs full international transfer details before wider release.
- Run final legal/operator review before Google Play submission.
- Complete iOS and Android visual QA for the native legal/support screens.
