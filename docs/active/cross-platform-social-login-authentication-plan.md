# Cross-Platform Social Login and Identity Governance Plan

Status: active - sole authentication authority for social-login-only public entry

Last updated: 2026-08-08

> Runtime note (2026-08-11): GPU/API blue-green deployment statements in
> the observed-status sections below are historical evidence only. The school
> GPU has been returned. Provider configuration and interactive smoke must be
> re-verified against the Spring runtime on Lightsail before any provider is
> considered production-ready.

Owner surfaces: `apps/api`, `apps/web`, `apps/mobile`, `packages/contracts`,
Supabase Auth, Apple Developer, Google Auth Platform, Kakao Developers,
Naver Developers

Implementation checkpoints:

- On 2026-08-11 the public provider-capability endpoint and its client loading
  gates were removed. Web and mobile now render the approved platform provider
  registry immediately, including account-link choices. Attempt creation
  remains the server-side boundary that rejects an invalid, unsupported, or
  operationally unavailable provider configuration with an actionable error.
- On 2026-08-08 the public auth surface was reduced to social login only.
  Web and mobile email/password login, signup, signup-email-OTP, password
  recovery/change, and legacy email callback routes were removed. Provider
  contact email and the separate account-deletion email OTP flow remain.
- Post-cleanup verification passed: web coverage `75 files / 299 tests`, web
  typecheck, lint and architecture boundaries, production build, bundle budget,
  browser smoke, mobile TypeScript typecheck, and Expo Doctor `18/18`.

- historical commit `7e96157` was deployed to the former GPU API blue slot and
  Alembic revision `0022_social_auth_identity` was applied. The public
  capability endpoint mentioned in that historical deployment has since been
  removed from the canonical Spring API.
- the API social-auth master switch and both server-side peppers are
  configured. Google and Naver are `available`; Apple web and iOS are
  `available` through platform overrides; Kakao is `disabled` until its consent
  items are configured, while Android Apple remains `unsupported_platform`.
- shared contracts, additive database schema, API attempt/complete,
  authenticated link-attempt, identity inventory/reconciliation, and readiness
  reporting are implemented.
- web and mobile have static platform-approved login entry, Supabase
  PKCE/browser callback handling, API completion, return-path restoration, and
  read-only linked-login visibility. Authenticated users can also start an
  explicit provider link flow from account settings; the API link attempt is
  bound to the current Supabase/App User before provider authorization begins.
- iOS uses native Sign in with Apple. Google/Kakao/Naver currently use the
  approved system-browser fallback path; official Google web/native adapters
  remain follow-up work.
- remaining provider dashboard work, interactive unlink, provider revocation,
  policy updates, and release-build smoke are still open. All provider feature
  flags remain safe to ship disabled.
- the Google web OAuth client and Supabase Google provider are configured.
  Supabase authorize returns HTTP 302 to Google Accounts with the production
  callback, and the production API capability reports Google as
  `available`.
- the Supabase Apple provider is enabled for native client ID
  `com.contentruck.hypofit`. The Apple client-secret JWT generated from Key ID
  `SCF7NT6L7G` was locally signature-verified and accepted by Apple's token
  endpoint; an intentional invalid authorization code returned `invalid_grant`,
  not `invalid_client`. Apple web credential/configuration work is complete and
  its production capability is `available`; iOS remains `disabled` until
  interactive device smoke passes.
- current targeted verification passes: API social-auth tests `20 passed`,
  web social-auth/callback tests `17 passed`, web typecheck, and mobile
  TypeScript typecheck. Kakao/Naver callback/session completion remains
  pending.
- on 2026-08-07 the native auth and social callback routes were hardened so an
  `AuthProvider` session update does not cancel and restart the callback effect.
  An Android API 36 preview APK built from the current source completed a valid
  session restore through `hypofit://auth/social-callback` and rendered all five main
  tabs without fatal or auth-bootstrap errors. Provider-consent interactive
  smoke remains separate and open where listed below.
- Kakao Developers team account and app credentials are configured. The
  built-in `kakao` browser OAuth path, callback bridge, capability gate, account
  linking, and provider normalization are implemented. Supabase authorize
  reaches the Kakao Account login page for production, local, and native return
  paths; interactive smoke remains pending.
- Naver uses Supabase Custom OIDC identifier `custom:naver`. The official
  discovery document advertises `openid` and `profile`, but Naver's authorize
  contract requires one `scope` parameter and its official OIDC example uses
  `scope=openid`. Interactive smoke showed that Supabase serialized multiple
  configured scopes as `scope=openid&scope=profile`, which Naver rejected at
  the consent-confirm step. The provider and mobile request therefore use the
  single scope `openid`; profile fields remain controlled by the Naver
  application consent settings. PKCE stays enabled and `email_optional=false`.
- Kakao/Naver MVP rollout requires a provider-verified email. Do not enable
  Supabase's email-optional setting for either provider. A separate social
  account email-completion flow remains deferred until an actual blocked-user
  case justifies it.
- on 2026-07-30 the Kakao app was converted to a Biz App. Kakao consent items
  are configured as required `account_email` and optional
  `profile_nickname`/`profile_image`. Supabase authorization probes for both
  web and native return paths reach the Kakao Account login page without
  `KOE205`. Web now exposes the Kakao button, and mobile relies on the built-in
  Supabase Kakao scopes instead of duplicating them through `options.scopes`.
- `SOCIAL_AUTH_KAKAO_STATE=available` is applied to the GPU runtime after
  backing up `.env`. The existing API SHA `daa94a1` was switched from blue to
  green through the blue/green deployment script. Public health/readiness are
  HTTP 200, Kakao capabilities are `available` on web/iOS/Android, and
  unauthenticated login-attempt creation returns HTTP 201 on all three
  platforms. Interactive callback, account creation/linking, and repeat-login
  smoke remain the release gate.
- on 2026-07-29 the GPU `.env` was backed up before enabling Kakao, Naver, and
  the iOS Apple platform override. The current API SHA was redeployed through
  blue/green from blue to green. Public health/readiness return HTTP 200, and
  provider attempt creation returns HTTP 201 for every supported web, iOS, and
  Android provider using the platform's canonical return path. Interactive
  provider consent, callback, session, API completion, logout, and repeat
  login remain the release gate.

Related documents:

- `docs/completed/responsive-web-auth-entry-experience-plan.md`
- `docs/reference/mobile-auth-failure-observability-hardening-plan.md`
- `docs/reference/error-observability-contract.md`
- `docs/completed/public-support-and-authenticated-inquiry-experience-plan.md`
- `docs/completed/account-deletion-retention-reregistration-plan.md`
- `docs/reference/ios-store-readiness/apple-app-store-first-launch-readiness-plan.md`
- `docs/reference/google-play-first-launch-readiness-plan.md`
- `docs/reference/ios-store-readiness/apple-app-privacy-label-worksheet.md`
- `docs/reference/google-play-data-safety-worksheet.md`

Authoritative scope:

- This is the single current product and implementation authority for public
  sign-in methods, provider rollout, linked-identity policy, onboarding gates,
  reviewer/internal-tester auth guidance, and provider rollback.
- Provider email/contact handling and dedicated account-deletion email OTP
  confirmation are supporting policies here. Neither revives public
  email/password login.
- Removed email/password, signup email OTP, password recovery, and phone-login
  entry must not reappear as release fallback without a new active plan.

## 2026-07-29 Google rollout checkpoint

- Google Auth Platform web client creation and Supabase Google provider
  configuration are complete.
- Production authorization probe:
  - provider: `google`
  - final app return URL:
    `https://hypofit.bukae.co.kr/auth/social/callback`
  - provider callback:
    `https://rpmddtobulnagpdzdkbl.supabase.co/auth/v1/callback`
  - result: HTTP 302 to `accounts.google.com`
- `SOCIAL_AUTH_GOOGLE_STATE=available` was applied to the GPU runtime after
  backing up `.env`.
- The existing API release SHA was restarted through the blue/green deployment
  path. The active slot changed from green to blue without changing application
  code.
- Public readiness returns HTTP 200 and reports:
  - Google: `available`
  - Apple, Kakao, Naver: `disabled` at this initial Google checkpoint
- Interactive web smoke reached the Google consent callback and
  `POST /api/v1/auth/social/complete` returned HTTP 200. The following
  `GET /api/v1/me` correctly returned `profile_missing` for the new social
  account, but the web client incorrectly inspected the error message for a
  literal `403` instead of reading `ApiError.code/status`. The profile-missing
  predicate now recognizes the stable `profile_missing` and
  `role_onboarding_required` codes while keeping deleted/deactivated-account
  errors out of the profile-creation path.
- Web login renders its approved provider set immediately from the frontend
  registry instead of showing or replacing it with a capability-loading
  response. Account settings use the same registry, and attempt creation
  remains the server-side enforcement boundary.
- Local Vite development uses a same-origin `/api` proxy configured through
  `VITE_API_PROXY_TARGET`. The production API CORS allowlist remains limited to
  public web origins instead of admitting localhost solely for development.
- Remaining Google gate is interactive production E2E:
  role onboarding completion, final app entry, logout, and repeat login after
  the web fix is deployed.

## 2026-07-29 Apple native credential checkpoint

- Apple App ID and native client ID: `com.contentruck.hypofit`
- Apple Team ID: `B98D4AXX5L`
- Sign in with Apple Key ID: `SCF7NT6L7G`
- Supabase Apple provider reports `external.apple=true`.
- Supabase authorization probe returns HTTP 302 to `appleid.apple.com` with
  the Supabase callback.
- The generated client-secret JWT expires on 2027-01-25. Rotate it before
  expiry if it remains in use for OAuth/token exchange.
- Apple's token endpoint accepted the client credentials and rejected only the
  intentionally invalid authorization code with `invalid_grant`.
- Production capability remains:
  - iOS/web: `disabled`
  - Android: `unsupported_platform`
- Remaining native gate is an interactive iOS test covering first consent,
  Hide My Email, Supabase session creation, API completion, role onboarding,
  logout, and repeat login.
- Apple web work was completed after this native checkpoint. The current
  Services ID, notification endpoint, and Services-ID client secret state is
  recorded in section 23.

## 2026-07-29 Kakao/Naver provider preparation checkpoint

- Kakao Developers team account, app REST API key, active client secret, Kakao
  Login, Supabase callback registration, and Supabase built-in provider storage
  are configured. `Allow users without an email` remains off.
- Supabase authorize probes return HTTP 302 to
  `https://kauth.kakao.com/oauth/authorize` for production web, local web, and
  the native `hypofit://auth/social-callback` return path. Kakao accepts the app
  and callback and returns the Kakao Account login page with HTTP 200.
- Naver OIDC discovery endpoint
  `https://nid.naver.com/.well-known/openid-configuration` returns HTTP 200.
  Its current contract includes:
  - issuer: `https://nid.naver.com`
  - authorization endpoint: `https://nid.naver.com/oauth2/authorize`
  - token endpoint: `https://nid.naver.com/oauth2/token`
  - userinfo endpoint: `https://openapi.naver.com/v1/nid/me`
  - response type: `code`
  - grant type: `authorization_code`
  - PKCE: `S256`
  - supported scopes: `openid`, `profile`
- Web and mobile both map product provider `naver` to Supabase identifier
  `custom:naver`; Kakao remains the built-in identifier `kakao`.
- Supabase Custom OIDC provider `custom:naver` was created with issuer
  `https://nid.naver.com`, the single requested scope `openid`, PKCE `S256`, and
  `email_optional=false`. The client secret is stored only in Supabase and is
  not committed to the repository.
- Supabase authorize probes return HTTP 302 to
  `https://nid.naver.com/oauth2/authorize` for production web, local web, and
  the native `hypofit://auth/social-callback` return path. The generated request
  uses the Supabase provider callback and includes `state` and PKCE `S256`.
- Automated coverage now explicitly verifies login entry, account linking,
  capability independence, and API provider normalization for both
  providers.
- Naver remains temporarily `available` for controlled interactive smoke.
  Kakao interactive smoke exposed `KOE205` because the requested email,
  nickname, and profile-image consent items were not configured, so its
  production capability was returned to `disabled` until that provider-console
  work resumes.

## 0. 2026-07-22 운영 설정·검증 감사

### 0.1 현재 관측 상태

| 대상 | 관측 결과 | 판정 |
| --- | --- | --- |
| 운영 API capability | web/iOS: Apple, Google, Naver `available`, Kakao `disabled`; Android: Google/Naver `available`, Kakao `disabled`, Apple `unsupported_platform` | Kakao consent 설정 전 비노출, 나머지 provider controlled smoke |
| Supabase Apple authorize | HTTP 302 to Apple, native App ID client configured | 자격 증명 검증 완료, interactive iOS smoke 대기 |
| Supabase Google authorize | HTTP 302 to Google | 자격 증명 검증 완료, interactive E2E 대기 |
| Supabase Kakao authorize | production/local/native return path 모두 HTTP 302 to Kakao, Kakao Account 로그인 화면 HTTP 200 | 자격 증명·callback 라우팅 완료, interactive E2E 대기 |
| Supabase `custom:naver` authorize | production/local/native return path 모두 HTTP 302 to Naver, PKCE S256 | 자격 증명·OIDC 라우팅 완료, interactive E2E 대기 |
| production web | `/`, `/app`, `/support` HTTP 200 | public route 정상 |
| API targeted tests | `tests/test_social_auth.py`: 20 passed | facade/attempt/complete와 Kakao/Naver 정규화 정상 |
| web targeted tests | social auth + callback: 17 passed | provider identifier, callback, 복귀 경로 정상 |
| mobile validation | TypeScript typecheck passed | adapter와 route contract 정합 |

자동 테스트는 공급자와 실제 authorization code를 주고받는 E2E를 대신하지
않는다. 각 provider는 dashboard 저장만으로 완료 처리하지 않고 실제 계정으로
로그인, callback 복귀, Supabase session 발급, API complete, 로그아웃 후
재로그인까지 통과해야 `available`로 전환한다.

### 0.2 callback 계약

소셜 인증에는 서로 다른 두 callback 단계가 있다. 공급자 console에 Hypofit
페이지 URL을 직접 넣지 않는다.

```text
provider console
  -> https://rpmddtobulnagpdzdkbl.supabase.co/auth/v1/callback
  -> Supabase Redirect URLs allowlist
  -> web: https://hypofit.bukae.co.kr/auth/social/callback
     local web: http://127.0.0.1:5173/auth/social/callback
     native: hypofit://auth/social-callback
```

- Apple, Google, Kakao, Naver provider console의 redirect/callback URL은
  Supabase callback을 사용한다.
- Supabase Redirect URLs에는 Hypofit이 최종 복귀할 web/local/native URL을
  exact URL로 등록한다.
- `https://hypofit.vercel.app/auth/social/callback`은 기존 Vercel 도메인을 실제
  fallback으로 유지할 때만 남긴다. 신규 기준 도메인은
  `https://hypofit.bukae.co.kr`이다.
- 현재 모바일 release 계약은 Expo `scheme: hypofit`을 사용하는 custom
  scheme이다. universal link/app link는 더 나은 UX를 위한 후속 개선이며,
  현재 공급자 rollout의 필수 차단 조건으로 만들지 않는다.

### 0.3 공급자별 console 작업과 실제 smoke

| 순서 | 공급자 | 운영자가 설정할 곳 | 필수 설정 | 완료 smoke |
| --- | --- | --- | --- | --- |
| 1 | Google web | Google Auth Platform, Supabase Auth | External audience, production 상태, `openid email profile`, web client, Supabase callback, Hypofit web/local origin | production web 신규/기존 계정 로그인, 취소, 재로그인 |
| 2 | Apple iOS | Apple Developer, Supabase Auth | App ID capability, Sign in with Apple key, native bundle ID client, Supabase Apple secret | TestFlight 실기기 최초 승인, 반복 로그인, 이름 null, Hide My Email |
| 3 | Apple web | Apple Developer, API, Supabase Auth | Services ID, Supabase domain/return URL, 한국 개발자 계정용 server-to-server notification endpoint, Services ID를 Apple client ID 목록의 첫 항목으로 설정 | Apple notification signed payload smoke, production web 로그인과 iOS 동일 계정 연결 확인 |
| 4 | Google mobile | Google/Supabase 기존 web provider | 현재는 system-browser fallback이므로 별도 native SDK client는 필수 아님 | iOS/Android release build callback, cold/warm 복귀 |
| 5 | Kakao | Kakao Developers, Supabase Auth | Kakao Login ON, REST API key/client secret, Supabase callback, 최소 동의 항목 | web/iOS/Android 로그인, email 동의/거부 가능한 상태 확인 |
| 6 | Naver | Naver Developers, Supabase Custom OIDC | issuer `https://nid.naver.com`, client ID/secret, callback, 단일 `openid` scope, 최소 프로필 제공 동의항목, 검수용 계정 | custom OIDC 생성 smoke, web/mobile 로그인, 검수 전 tester 제한 |

현재 Google/Kakao/Naver mobile은 native provider SDK가 아니라 승인된 system
browser OAuth 경로다. 따라서 iOS URL scheme, Android SHA-1, native platform
client를 지금 모두 만들 필요는 없다. native Google Credential Manager 또는
Kakao/Naver SDK를 실제 도입할 때 해당 설정을 추가한다.

### 0.4 현재 구현과 rollout 전 남은 기능 간극

- 공통 complete 요청은 현재 `attempt_id`와 `attempt_secret`만 받는다. provider,
  platform, 복귀 경로는 서버 attempt를 신뢰한다.
- complete 응답이 실제로 내는 next step은 현재 `signed_in`,
  `email_required`, `role_onboarding_required`다. legal/profile 전용 상태는
  contract에는 있으나 현재 service가 반환하지 않는다.
- provider email이 없는 신규 사용자의 `email_required` 후속 OTP 연결은 아직
  실제 E2E가 완성되지 않았다. MVP에서는 Kakao/Naver를 provider-verified email
  필수 동의로 제한하고 Supabase email-optional 설정을 끈다. 실제 tester에서
  이 정책으로 차단되는 유효 사용자가 관측되면 별도 continuation을 구현한다.
- identity 조회·연결·reconcile은 구현됐지만 사용자 unlink와 provider token
  revocation adapter는 없다. 로그인 MVP를 막지는 않되, 소셜 전용 계정 탈퇴를
  공개 활성화하기 전에는 provider별 탈퇴 계약을 확인해야 한다.
- 신규 소셜 가입은 API 앱 사용자 생성보다 Supabase identity 생성이 먼저
  끝날 수 있다. 웹·모바일 계정 정보 화면은 단순 inventory 조회 대신 reconcile
  API로 실제 Supabase identity를 동기화한 뒤 연결 상태를 표시한다.
- Apple entitlement와 `expo-apple-authentication`은 local release build에서
  검증됐다. 이는 Apple provider credential과 실제 로그인 성공을 의미하지
  않는다.
- Apple은 2026년 1월부터 대한민국 소재 개발자가 새 Services ID를 등록하거나
  기존 Services ID를 수정할 때 server-to-server notification endpoint를
  요구한다. 현재 API에 해당 endpoint가 없으므로 Apple web Services ID
  설정의 실제 blocker다. native iOS Apple 로그인 자체와는 별도다.
- Apple notification endpoint는 Apple JWS signature, issuer, audience,
  expiration을 검증하고 `email-enabled`, `email-disabled`,
  `consent-revoked`, `account-deleted`를 provider subject 기준으로 idempotent하게
  처리해야 한다. raw signed payload와 email을 일반 로그에 남기지 않는다.
- Google Identity Services와 Apple JS 전용 adapter는 후속 최적화다. 현재 web
  Supabase browser OAuth가 E2E를 통과하면 MVP 출시 차단 조건이 아니다.

### 0.5 활성화 원칙

1. provider console과 Supabase 설정을 저장한다.
2. API provider 상태는 아직 `disabled`로 유지한다.
3. 내부 tester 환경에서 provider authorization을 직접 확인한다.
4. provider별 web/native target smoke를 통과한다.
5. 개인정보처리방침과 store data disclosure가 실제 수집 항목과 맞는지 확인한다.
6. 해당 provider만 `available`로 전환하고 운영 오류율을 관찰한다.

여러 provider를 한 번에 켜지 않는다. Google web, Apple iOS, Google mobile,
Kakao, Naver 순서로 범위를 넓히면 console 설정 오류와 client 회귀를 분리할
수 있다.

### 0.6 console 입력값 worksheet

공통 Supabase:

- `Authentication > URL Configuration > Site URL`은
  `https://hypofit.bukae.co.kr`로 둔다.
- Redirect URLs는 0.2의 production/local/native exact URL을 등록한다.
- `Authentication > Providers`에서 Apple, Google, Kakao를 각각 설정한다.
- Naver는 `Add provider > Custom OAuth/OIDC`에서 identifier
  `custom:naver`, issuer `https://nid.naver.com`으로 만든다.
- provider별 저장 후 API flag를 먼저 켜지 말고 Supabase authorize 응답이
  공급자 로그인 페이지로 302 이동하는지 확인한다.

Apple:

- primary App ID는 `com.contentruck.hypofit`이고 Sign in with Apple capability가
  이미 release entitlement에 포함돼 있다.
- web은 별도 Services ID를 만들고 primary App ID에 묶는다. Services ID의
  domain은 `rpmddtobulnagpdzdkbl.supabase.co`, return URL은 Supabase provider
  callback으로 등록한다.
- Sign in with Apple key의 `.p8`, Key ID, Team ID로 client secret을 생성한다.
  client secret은 최대 6개월이므로 만료 전에 교체할 운영 일정을 둔다.
- 대한민국 소재 개발자 계정이므로 Services ID 저장 전에 API public HTTPS
  endpoint를 구현하고 primary App ID의 Sign in with Apple 구성에 등록한다.
  제안 URL은
  `https://hypofit-api.bukae.co.kr/api/v1/auth/social/apple/notifications`다.
  이 URL은 Supabase OAuth callback과 다른 목적이다.
- Supabase Apple client IDs에는 web Services ID를 첫 번째, native bundle ID를
  두 번째로 넣어 web과 iOS가 같은 Supabase provider를 사용하게 한다.
- Apple relay email 발송 domain/SPF/DKIM을 등록하고 기존
  `privaterelay.appleid.com`, `icloud.com`과 2026년 신규
  `private.icloud.com` 주소를 email validation/allowlist가 모두 수용하게 한다.

Google:

- Google Auth Platform의 Branding, Audience, Data Access를 먼저 완료한다.
- Audience는 External이고, 내부 확인 중에는 test user를 등록한다. 일반
  사용자 공개 전에는 production 상태로 전환한다.
- Web application OAuth client를 하나 만들고 authorized JavaScript origins에
  `https://hypofit.bukae.co.kr`와 `http://127.0.0.1:5173`을 등록한다.
- authorized redirect URI는 Supabase provider callback 하나를 등록한다.
- Supabase Google provider에는 web client ID와 secret을 넣고 scope는
  `openid email profile`로 제한한다.

Kakao:

- Kakao Developers의 앱 키에서 REST API key를 사용하고 client secret을
  활성화해 Supabase Kakao provider에 등록한다.
- `제품 설정 > 카카오 로그인`을 활성화하고 Redirect URI에 Supabase provider
  callback을 exact 등록한다.
- 동의 항목은 nickname/profile image와 실제 제공 가능한 account email만
  신청한다. account email은 비즈 앱/검수 상태에 따라 사용할 수 없으므로
  dashboard에서 필수 제공 가능 여부를 확인한다.
- Supabase Kakao provider의 `Allow users without an email`은 끈다. 현재
  `email_required` continuation이 없으므로 이메일 없는 신규 계정을 만들지
  않는다.
- 기존 Kakao Map JavaScript key와 Kakao Login REST credential은 다른 용도다.
  지도 키를 로그인 client ID로 재사용하지 않는다.

Naver:

- Naver Developers 애플리케이션의 서비스 URL은
  `https://hypofit.bukae.co.kr`, callback은 Supabase provider callback으로
  등록한다.
- Supabase custom provider에는 issuer `https://nid.naver.com`, Naver client
  ID/secret, scope `openid`만 넣는다. 이름·이메일·프로필 이미지는 Naver
  애플리케이션의 제공 정보 동의 항목으로 관리한다.
- `email_optional`은 `false`로 둔다. Naver 애플리케이션의 제공 정보에서
  이메일을 필수 동의로 설정하고, 실제 ID token/userinfo의 email과
  `email_verified` mapping을 tester 계정으로 확인한다.
- 현재 discovery는 정상 응답하지만 실제 claim과 Supabase identity 모양은
  custom provider 생성 후 tester 계정으로 fixture를 확보해야 한다.
- 검수 전에는 등록된 개발자/tester만 사용하고, web/mobile E2E가 끝난 뒤
  Naver 서비스 적용 검수를 진행한다.

## 1. 목적

Hypofit의 웹과 Expo React Native 앱에 다음 네 가지 소셜 로그인을 추가한다.

- Apple
- Google
- Kakao
- Naver

이 작업의 목표는 로그인 버튼을 추가하는 데 그치지 않는다. 웹과 앱에서
같은 Hypofit 계정으로 이어지고, API가 계정 생성 이후의 공통 정책을
일관되게 집행하며, 계정 연결·탈퇴·재가입·감사·오류 관측까지 운영 가능한
구조를 만드는 것이 목표다.

완료 후의 공통 흐름은 다음과 같아야 한다.

```text
web or native client
  -> provider authorization in approved browser/native UI
  -> Supabase Auth validates provider response and issues Hypofit session
  -> client sends Supabase access token to API
  -> API resolves verified Supabase identities
  -> API synchronizes app user, identity inventory, consent, and onboarding state
  -> client enters role onboarding or the requested product route
```

## 2. 핵심 아키텍처 결정

### 2.1 Supabase Auth를 세션 발급자로 유지한다

현재 웹과 모바일은 Supabase Auth에서 access/refresh token을 받고, API는
Supabase JWT를 검증해 보호 API를 제공한다. 소셜 로그인 도입 때문에 이
구조를 이중 인증 체계로 바꾸지 않는다.

- API가 별도의 Hypofit JWT를 새로 발급하지 않는다.
- 클라이언트가 Supabase 세션과 API 세션을 동시에 관리하지 않는다.
- legacy password/email-OTP identity가 Supabase에 남아 있더라도 public client는
  이를 현재 로그인 방법으로 노출하지 않는다.
- API 보호 API의 `Authorization: Bearer <Supabase access token>` 계약을
  유지한다.

이 결정은 토큰 종류, 갱신 경로, 로그아웃 상태, 캐시 소유권이 이중화되는
것을 막는다.

### 2.2 API는 공통 인증 정책과 계정 수명주기를 소유한다

사용자가 말한 “웹과 앱이 같은 API를 사용한다”는 요구는 다음 경계로
구현한다.

API 책임:

- 플랫폼별 활성 공급자 목록과 안전한 공개 설정 제공
- 소셜 로그인 시도 correlation과 감사 기록
- 성공한 Supabase 세션의 identity 목록을 서버 권한으로 재확인
- `app_users` 생성·복구·비활성 계정 차단·프로필 동기화
- 최초 가입의 약관 동의와 역할 온보딩 상태 반환
- 기존 계정과 소셜 identity 연결·해제 정책
- 계정 탈퇴 시 공급자 연결 해제와 실패 보상 처리
- 공급자·플랫폼·실패 단계별 PII-free 관측

클라이언트 책임:

- 공식 버튼과 플랫폼 승인 인증 UI 표시
- native credential 또는 external browser authorization 실행
- Supabase session 교환 및 안전한 저장
- API 공통 완료 API 호출
- 온보딩 또는 원래 요청 경로로 이동

Supabase Auth 책임:

- OAuth/OIDC authorization code 교환
- 공급자 ID token 검증
- PKCE/state/nonce 중 Supabase가 소유한 흐름의 보안 처리
- identity 자동·수동 연결
- Hypofit access/refresh token 발급과 갱신

### 2.3 공급자별 최적 흐름을 사용하되 완료 API는 하나로 통일한다

모든 플랫폼을 무조건 WebView 기반 OAuth로 맞추지 않는다.

| 플랫폼 | Apple | Google | Kakao | Naver |
| --- | --- | --- | --- | --- |
| web | Supabase browser OAuth | Supabase browser OAuth | Supabase browser OAuth | Supabase Custom OIDC |
| iOS | `expo-apple-authentication` native | system browser OAuth | system browser OAuth | system browser Custom OIDC |
| Android | 노출하지 않음 | system browser OAuth | system browser OAuth | system browser Custom OIDC |

초기 출시의 노출 정책은 다음으로 고정한다.

- web: Apple, Google, Kakao, Naver
- iOS: Apple, Google, Kakao, Naver
- Android: Google, Kakao, Naver
- Android에서는 Apple 로그인 버튼, 메뉴, placeholder를 렌더링하지 않는다.
- 플랫폼별 UI 목록은 native `Platform.OS`와 web entry registry로 결정하고,
  API는 attempt 생성 시 platform/provider 조합을 다시 검증한다.
- 오래된 Android binary가 Apple attempt를 직접 호출해도 API는
  `social_unsupported_platform`으로 거부한다.
- 향후 Android Apple 로그인을 제품 요구로 다시 채택할 때만 feature flag와
  이 매트릭스를 함께 변경한다.

모든 성공 경로는 Supabase session을 얻은 뒤
`POST /api/v1/auth/social/complete`를 호출한다.

### 2.4 네이버는 Custom OIDC를 우선한다

Naver 공식 가이드는 현재 OIDC discovery, JWKS, authorization code, PKCE
S256을 제공한다. Supabase Custom OIDC Provider에 다음을 설정하는 방식을
우선한다.

```text
identifier: custom:naver
issuer: https://nid.naver.com
scope: openid
PKCE: enabled
```

단, 구현 시작 전에 실제 Supabase 프로젝트에서 다음을 검증해야 한다.

- discovery 문서와 issuer가 Supabase Custom OIDC에서 정상 등록되는가
- ID token의 `sub`, audience, email/profile claim이 정상 정규화되는가
- email을 거부한 계정도 Supabase user를 만들 수 있는가
- provider identifier가 session/user identity에 예상대로 남는가
- web, iOS, Android callback이 모두 허용되는가

호환성 spike가 실패하면 임의의 비밀번호나 magic-link 우회 계정을 만들지
않는다. API가 Naver authorization code를 검증한 뒤 표준화된 내부
교환 경로를 제공하는 adapter를 별도 설계하거나 Naver 출시만 feature flag로
보류한다.

## 3. 현재 구현 기준선

### 3.1 web

- `apps/web/src/features/auth/AuthProvider.tsx`가 인증 상태를 제공한다.
- public entry와 auth context에서 legacy password/signup/reset 경로를 제거했고
  provider-only entry만 유지한다.
- 인증 후 API `/api/v1/me/sync`로 profile을 동기화한다.
- Supabase access token이 API 보호 API의 bearer token이다.
- `/auth/social/callback`과 requested-route 복귀 계약이 이미 존재한다.

### 3.2 mobile

- `apps/mobile/src/features/auth/AuthProvider.tsx`가 Supabase session restore,
  social-auth, session restore, role onboarding lifecycle을 소유한다.
- legacy password/signup/email-confirmation route와 context API를 제거했고
  social callback과 role onboarding만 유지한다.
- AsyncStorage 기반 Supabase session persistence를 사용한다.
- 플랫폼별 정적 social provider adapter와 iOS native Apple/system-browser
  fallback이 구현되어 있다.
- Expo Go가 아니라 development/release build가 필요한 native auth 모듈이
  생길 수 있다.

### 3.3 API

- `apps/api/app/core/security.py`가 Supabase JWT/JWKS를 검증한다.
- `/api/v1/me/sync`가 JWT subject와 email을 바탕으로 app user를 맞춘다.
- `app_users`는 Supabase user UUID를 중심으로 소유권을 판정한다.
- 계정 탈퇴는 app data 수명주기와 Supabase Auth user 삭제를 연결한다.
- `social_auth_identities` inventory와 reconciliation, revocation status는
  구현되어 있으며 실제 provider token revocation adapter는 아직 없다.

### 3.4 현재 구조에서 바로 해결해야 할 간극

- 동일 사용자가 legacy email-auth와 여러 social provider를 사용할 때 연결
  상태를 운영 DB에서 확인할 수 없다.
- Apple private relay email이나 provider email 미제공 시 현재 email 중심
  profile sync가 실패할 수 있다.
- social-only 계정과 legacy hidden credential의 UI 경계가 충분히 정리되지
  않았다.
- 탈퇴 시 Apple/Naver/Kakao/Google provider 연결 해제 성공 여부를 추적할
  수 없다.
- web callback과 native deep link의 return path allowlist가 소셜 로그인
  기준으로 구체화돼 있지 않다.
- 공개 계정 삭제 확인과 일부 사용자 조회가 raw email fallback에 의존해,
  다중 identity 환경에서 다른 계정을 잘못 찾지 않는다는 보장이 부족하다.
- 일부 관리자 권한이 email allowlist를 사용하므로 email이 연락처 속성으로
  내려간 뒤에도 권한 식별자로 남지 않게 별도 admin principal로 전환해야 한다.
- reviewer/demo seed는 Supabase Auth user와 `app_users`만 만들며 social
  identity inventory를 생성하지 않는다.

## 4. 공식 표준 및 공급자 조사 결과

### 4.1 OAuth native app 보안 기준

[RFC 8252](https://www.rfc-editor.org/rfc/rfc8252.html)는 native app이 embedded
WebView가 아니라 external user-agent를 사용하고, authorization code flow와
PKCE를 적용하도록 권고한다.

[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)은 authorization code와
PKCE, 정확한 redirect URI, issuer binding, token URL 노출 금지, replay와
mix-up 방어를 OAuth 보안 모범 사례로 정의한다.

Hypofit 적용:

- mobile social OAuth는 system browser/auth session을 사용한다.
- 새 embedded WebView 로그인 화면을 만들지 않는다.
- PKCE S256을 끄지 않는다.
- callback은 등록된 exact URL만 허용한다.
- access token, refresh token, authorization code를 URL, 로그, Sentry,
  analytics payload에 남기지 않는다.

### 4.2 Supabase Auth

[Supabase Social Login](https://supabase.com/docs/guides/auth/social-login)은
Apple, Google, Kakao를 내장 provider로 제공하고, 표준 OAuth/OIDC provider는
[Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)로
추가할 수 있다고 안내한다. Custom Provider는 PKCE가 기본 활성화돼 있고,
multi-platform audience와 email-optional 설정을 제공한다.

[Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)은
검증된 동일 email의 자동 연결과 로그인 상태에서의 명시적 `linkIdentity`
흐름을 제공한다.

Hypofit 적용:

- Apple, Google, Kakao는 built-in provider를 사용한다.
- Naver는 `custom:naver` OIDC를 우선한다.
- 자동 연결만 믿지 않고, 계정 설정에 명시적 연결·해제 UI를 제공한다.
- provider token은 외부 API 호출 목적이 없으므로 기본적으로 저장하지 않는다.

### 4.3 Apple

[Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)의
로그인 서비스 기준과
[Sign in with Apple HIG](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)는
타사 소셜 로그인을 핵심 계정 인증에 사용할 때 Apple 로그인을 동등한
선택지로 제공하고, 승인된 버튼을 다른 로그인 버튼보다 작거나 숨겨진
위치에 두지 않도록 요구한다.

[Supabase Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)는
native Apple login을 Apple 플랫폼의 권장 경로로 제시하며, 사용자 이름은
최초 승인 시에만 제공될 수 있음을 명시한다.

[Apple의 대한민국 개발자 Services ID 공지](https://developer.apple.com/news/?id=j9zukcr6)는
2026년 1월 1일부터 대한민국 소재 개발자가 새 Services ID를 등록하거나
수정할 때 server-to-server notification endpoint를 필수로 요구한다.
[Apple relay domain 변경 공지](https://developer.apple.com/news/?id=sus6t6ab)는
2026년 여름부터 새 Hide My Email 주소가 `private.icloud.com`을 사용한다고
안내한다.

Hypofit 적용:

- iOS는 `expo-apple-authentication` 시스템 버튼과 credential을 사용한다.
- native credential의 ID token과 raw nonce로
  `supabase.auth.signInWithIdToken`을 호출한다.
- 이름은 최초 성공 응답에서 즉시 API에 동기화하되 사용자가 이후
  계정 정보에서 수정할 수 있게 한다.
- Hide My Email relay 주소를 정상 email identity로 취급한다.
- Apple web secret의 6개월 만료를 운영 캘린더와 readiness health에 넣는다.
- 계정 탈퇴 시 Apple token revocation을 수행하고 결과를 audit한다.

### 4.4 Google

[Android Credential Manager Sign in with Google](https://developer.android.com/identity/sign-in/credential-manager-siwg)는
Android의 최신 로그인 경로로 Credential Manager bottom sheet와 명시적
Google 버튼을 함께 제공하고, ID token을 relying-party server에서 검증하도록
안내한다.

[Google Identity Services web guide](https://developers.google.com/identity/gsi/web/guides/display-button)는
공식 렌더러와 popup/redirect UX를 제공한다. Google 버튼은 공식 렌더러나
승인된 자산을 사용한다.

Hypofit 적용:

- web은 Google Identity Services가 반환한 ID token을 Supabase
  `signInWithIdToken`으로 교환하는 방식을 우선한다.
- Android는 Expo SDK와 호환되는 Credential Manager/native bridge를 기술
  spike로 검증한다. 호환되지 않으면 MVP에서는 system browser + Supabase
  PKCE를 사용하고, 임의 native SDK 버전을 Expo managed set 밖에서 넣지 않는다.
- iOS는 Expo SDK와 호환되는 Google native package를 사용하거나 같은
  external browser fallback을 사용한다.
- web/iOS/Android client ID를 분리하고 Supabase acceptable client IDs에
  등록한다.
- scope는 `openid email profile`로 제한한다.
- Google Drive, 연락처 등 제품에 필요 없는 권한은 요청하지 않는다.

### 4.5 Kakao

[Supabase Kakao guide](https://supabase.com/docs/guides/auth/social-login/auth-kakao)는
built-in provider와 OIDC ID token 로그인을 지원한다.
[Kakao REST login guide](https://developers.kakao.com/docs/en/kakaologin/rest-api)는
authorization code 흐름을 제공하며,
[Kakao button design guide](https://developers.kakao.com/docs/ko/kakaologin/design-guide)는
`#FEE500` 컨테이너, 지정 심볼과 문구 등 공식 버튼 규칙을 정의한다.

Hypofit 적용:

- 1차는 web과 mobile 모두 system browser + Supabase built-in OAuth/PKCE를
  사용해 구현 복잡도를 낮춘다.
- Kakao Developers에서 OIDC를 활성화한다.
- REST API key와 client secret은 Supabase/API 비밀 설정에만 둔다.
- mobile JavaScript bundle에 Kakao client secret을 넣지 않는다.
- 동의 항목은 account email, nickname, profile image 중 실제 필요한 항목만
  요청한다.
- Kakao 공식 버튼 자산과 색상 규칙을 따른다.

### 4.6 Naver

[Naver Login development guide](https://developers.naver.com/docs/login/devguide/devguide.md)는
OIDC discovery `https://nid.naver.com/.well-known/openid-configuration`, JWKS,
authorization code, PKCE S256, token revocation을 제공한다. 또한 사용자
식별자를 제외한 email/name/profile은 사용자가 제공을 거부할 수 있고,
실서비스 공개 전 검수가 필요하다고 명시한다.

[Naver button guide](https://developers.naver.com/docs/login/bi/bi.md)는 지정
녹색 `#03A94D`와 공식 버튼 자산 사용을 안내한다.

Hypofit 적용:

- Supabase Custom OIDC Provider를 우선 사용한다.
- OIDC scope와 profile consent는 식별자, email, name/profile 중 최소 범위로
  제한한다.
- email이 없거나 검증 상태를 확신할 수 없으면 소셜 가입을 완료하지 않고,
  연락용 email completion continuation으로 보낸다. removed email/password
  가입 경로를 fallback으로 되살리지 않는다.
- 사용자에게 social login 이후 별도 비밀번호 생성을 강제하지 않는다.
- provider 검수 전에는 allowlisted tester만 활성화한다.
- 탈퇴 또는 연결 해제 시 Naver Token Revocation 결과를 기록한다.

### 4.7 공급자별 실제 제공 정보와 Hypofit 수집 범위

소셜 공급자가 제공할 수 있는 정보와 Hypofit이 실제 요청·저장할 정보는
같지 않다. 공급자 dashboard에서 받을 수 있다는 이유만으로 모든 항목에
동의를 요구하지 않는다.

| 공급자 | 안정적인 계정 키 | email | 이름·nickname | profile image | 추가로 제공 가능한 정보 | MVP 요청 범위와 주의사항 |
| --- | --- | --- | --- | --- | --- | --- |
| Apple | ID token의 `sub`와 native credential의 `user` | 실제 email 또는 Hide My Email relay 주소. 반복 로그인에서는 응답 형태가 달라질 수 있음 | `fullName`은 사용자가 동의한 최초 승인 응답에서만 제공될 수 있음 | 제공하지 않음 | authorization code, identity token, `realUserStatus` 등 인증 응답 정보 | `EMAIL`, `FULL_NAME`만 요청한다. 최초 이름을 즉시 저장하되 사용자가 수정할 수 있게 하고, 이름이 다시 오지 않는 것을 정상 상태로 처리한다. relay email도 유효한 연락 identity로 취급한다. |
| Google | ID token의 `sub` | `email` scope에서 `email`, `email_verified` 제공 가능 | `profile` scope에서 `name`, `given_name`, `family_name` 제공 가능하나 누락 가능 | `picture` 제공 가능하나 누락·변경 가능 | `locale`, Workspace `hd` 등. 별도 API와 추가 scope를 사용하면 더 많은 Google 데이터에 접근 가능 | `openid email profile`만 요청한다. `sub`만 account key로 사용하고 email을 primary key로 사용하지 않는다. Drive, Contacts, Calendar, YouTube 권한은 요청하지 않는다. |
| Kakao | 앱에 종속된 Kakao user ID | Kakao account email, email 검증·유효성 상태를 제공할 수 있으나 권한·동의·계정 상태에 따라 누락 가능 | profile nickname, 별도 검수 항목인 name | profile image URL 제공 가능 | gender, age range, birthday, birth year, phone number, CI, friends, shipping 등 검수·동의 항목 | user ID, account email, nickname, profile image만 요청한다. name, gender, age, birthday, CI, phone, friends, shipping은 MVP에서 요청하지 않는다. provider-verified email이 없으면 가입을 완료하지 않고 dedicated contact-email continuation으로 보낸다. |
| Naver | 애플리케이션에 종속된 고유 user identifier | contact email을 제공할 수 있으나 사용자가 거부할 수 있음 | name과 nickname을 제공할 수 있으나 사용자가 거부할 수 있음 | profile image URL을 제공할 수 있으나 사용자가 거부할 수 있음 | birthday, age range, gender, birth year, mobile phone | identifier, contact email, nickname/name, profile image만 검수 신청한다. identifier 외 모든 profile 항목은 nullable로 처리한다. birthday, age, gender, birth year, phone은 MVP에서 요청하지 않는다. provider email 부재는 contact-email continuation으로 처리하고 public email/password entry는 복원하지 않는다. |

공급자별 원칙:

- Apple은 profile image를 제공하지 않는다. Apple 사용자의 기본 avatar는
  Hypofit 기본 이미지 또는 사용자가 직접 등록한 이미지로 처리한다.
- Apple 이름은 최초 승인 순간에만 받을 수 있으므로 ID token이나 반복 로그인에서
  이름을 복원하려 하지 않는다.
- Google email이 바뀌어도 같은 `sub`이면 같은 Google identity다. 반대로 email이
  같다는 이유만으로 클라이언트에서 account를 병합하지 않는다.
- Kakao와 Naver의 email·nickname·image는 사용자의 동의 거부, 공급자 계정
  상태, 앱 검수 상태 때문에 없을 수 있다.
- provider가 반환한 profile image URL은 사용자 선택 없이 공개 profile에
  자동 반영하지 않는다. onboarding에서 미리 보여주고 적용 여부를 선택하게 한다.

### 4.8 필드 신뢰 수준과 사용 제한

| 정보 | 신뢰 수준 | 허용 용도 | 금지 용도 |
| --- | --- | --- | --- |
| provider subject/user identifier | 높음. issuer와 audience 검증이 전제됨 | `social_auth_identities`의 공급자별 account key | 화면 표시, provider 간 동일인 추정 |
| provider verified email | 중간. 연락 가능한 공급자 account email | verified 상태일 때 연락 email 후보와 제한적인 server-side account linking 판단 | 단독 소유권 증명, 영구 account primary key |
| unverified 또는 상태 불명 email | 낮음 | 연락용 email completion continuation 후보 | 자동 연결, 인증 완료 처리, public email/password 로그인 |
| name/nickname | 낮음 | 초기 display name 제안 | 실명 확인, 소유권 판단 |
| profile image URL | 낮음 | 사용자 승인 후 초기 avatar 제안 | 영구 원본 보장, 본인인증 |
| Kakao age/CI, Naver age/birth data, Apple `realUserStatus` | 본인·성인 인증으로 불충분 | MVP에서 수집하지 않음 | 만 19세 확인, PASS/NICE 대체, 신원 보증 |

Hypofit의 만 19세 이상 정책은 소셜 profile claim만으로 검증하지 않는다.
MVP에서는 별도의 연령 확인 고지·동의를 유지하고, 법적 본인확인이 필요한
시점에는 사업자 준비 이후 승인된 본인확인 수단을 별도 도입한다.

### 4.9 저장·동의 최소화 계약

저장하는 값:

- provider name
- provider subject의 HMAC 또는 동등한 비가역 lookup-safe 표현
- Supabase identity ID
- provider email과 provider가 명시한 검증 상태
- 사용자가 적용을 승인한 display name과 profile image
- identity 연결·해제·로그인·revocation audit 결과

기본적으로 저장하지 않는 값:

- provider access token, refresh token, raw ID token
- 공급자가 반환한 전체 user metadata JSON 복사본
- MVP에 쓰지 않는 birthday, gender, age, CI, phone, friends, shipping 정보
- OAuth callback query, authorization code, nonce, PKCE verifier의 평문 로그

token revocation 때문에 장기 credential 저장이 불가피한 공급자는 Phase 0에서
목적·암호화·접근 권한·TTL·삭제 시점을 별도로 결정한다. 구현 편의를 이유로
provider token을 일반 user/profile table에 넣지 않는다.

공급자 동의 화면의 profile 제공 동의와 Hypofit의 이용약관·개인정보 처리 동의는
별개다. 소셜 인증 성공 후에도 현재 법적 문서 version 동의를 서버에서 확인한다.
미래 기능이 추가 scope를 필요로 할 때는 로그인 시 선제 수집하지 않고 해당 기능을
사용하는 순간 별도 incremental consent를 받는다.

## 5. 목표 인증 흐름

### 5.1 신규 소셜 사용자

```text
login or signup screen
  -> provider button
  -> native/system-browser authorization
  -> Supabase session issued
  -> POST /api/v1/auth/social/complete
  -> app user absent
  -> legal consent gate if current version not accepted
  -> email completion gate only when required
  -> role selection
  -> profile creation
  -> requested route or home
```

소셜 로그인을 선택한 사용자에게 password 생성은 요구하지 않는다.

### 5.2 기존 legacy email-auth 사용자와 동일한 검증 email

```text
provider authorization
  -> Supabase verified-email automatic linking
  -> API reads Supabase identities with server authority
  -> existing app user remains the owner
  -> identity inventory upsert
  -> original profile/history preserved
```

클라이언트가 보낸 email 문자열만으로 계정을 합치지 않는다.

### 5.3 email이 다르거나 Apple relay email인 기존 사용자

자동 병합하지 않는다.

- 사용자가 기존 계정으로 먼저 로그인한다.
- 계정 정보의 `로그인 방법`에서 `계정 연결`을 선택한다.
- reauthentication 후 Supabase `linkIdentity`를 실행한다.
- API complete/link finalization이 identity inventory를 갱신한다.

### 5.4 이미 탈퇴·비활성화된 app user

- Supabase session이 발급돼도 API complete 단계에서 현재 재가입 정책을
  적용한다.
- 재가입 금지 기간이면 `social_account_inactive`를 반환하고 session을 즉시
  정리한다.
- 재가입 가능한 상태라면 기존 재가입 service를 거쳐 새 활성 상태를 만든다.
- 공급자 login이 soft-delete 정책을 우회하지 못하게 한다.

### 5.5 provider email 미제공

- provider subject로 Supabase identity는 확인하되 Hypofit profile completion
  상태를 `email_required`로 반환한다.
- 별도 6자리 contact-email confirmation continuation으로 연락 email을 확인한다.
- 이 확인 절차는 연락처 보강용이며 email/password 로그인으로 복귀시키지
  않는다.
- email 검증 전에는 product data write 권한을 열지 않는다.
- 동일 email의 기존 계정이 발견되면 로그인 후 identity 연결을 요구하고
  자동 병합하지 않는다.

### 5.6 로그인 취소와 실패

- 사용자가 provider 창을 닫은 것은 조용한 취소 상태로 처리한다.
- 로그인 카드에 destructive error를 표시하지 않는다.
- 네트워크, provider 장애, callback 만료, identity conflict만 재시도 가능한
  오류로 구분한다.
- 앱 재실행 시 미완료 attempt는 만료시키고 로그인 화면으로 복귀한다.

## 6. API API 설계

### 6.1 공급자 목록과 서버 검증

- 별도의 provider-capability 조회 API를 두지 않는다.
- web은 Kakao, Apple, Google, Naver를 승인된 순서로 즉시 표시한다.
- iOS는 Kakao, Apple, Google, Naver를, Android는 Kakao, Google, Naver를
  즉시 표시한다.
- 계정 연결 화면도 같은 플랫폼별 정적 목록을 사용한다.
- 실제 로그인·연결 시도 생성 API가 provider, platform, 운영 설정을
  검증한다. 사용할 수 없는 조합은 명시적 오류 코드로 거부한다.
- 따라서 로그인 화면은 서버 조회 때문에 빈 상태나 capability loading
  문구를 표시하지 않는다.

### 6.2 로그인 시도 생성

```http
POST /api/v1/auth/social/attempts
```

요청:

```json
{
  "provider": "kakao",
  "platform": "ios",
  "return_path": "/chat/room-id",
  "flow": "login"
}
```

응답:

```json
{
  "attempt_id": "uuid",
  "attempt_secret": "one-time-secret",
  "expires_at": "2026-07-20T12:10:00Z",
  "flow": "login",
  "platform": "ios",
  "provider": "kakao",
  "return_path": "/chat/room-id"
}
```

규칙:

- `return_path`는 route manifest allowlist에 있는 내부 경로만 허용한다.
- attempt TTL은 10분을 기본으로 한다.
- `attempt_secret`은 callback 완료에 필요한 일회성 correlation secret이며
  URL, Sentry, analytics에 기록하지 않는다.
- IP/device는 raw value 대신 rate-limit용 HMAC fingerprint만 기록한다.
- Supabase가 관리하는 OAuth `state`/PKCE 값을 API가 중복 구현하지 않는다.
- attempt는 product correlation과 replay/idempotency 추적용이다.

### 6.3 공통 완료 API

```http
POST /api/v1/auth/social/complete
Authorization: Bearer <Supabase access token>
```

요청:

```json
{
  "attempt_id": "uuid",
  "attempt_secret": "one-time-secret"
}
```

서버 처리 순서:

1. Supabase JWT를 기존 JWKS 경로로 검증한다.
2. attempt와 일회성 secret이 일치하고 미사용·미만료인지 확인한다.
3. Supabase Admin user lookup으로 identities를 서버에서 조회한다.
4. 요청 provider identity가 실제 Supabase user에 연결됐는지 확인한다.
5. 비활성·탈퇴·재가입 정책을 검사한다.
6. app user와 `social_auth_identities`를 하나의 transaction에서 upsert한다.
7. email, legal consent, role, profile completeness를 계산한다.
8. attempt를 `completed`로 전환하고 audit event를 남긴다.
9. 다음 화면을 machine-readable 상태로 반환한다.

응답:

```json
{
  "identity": {
    "email": "user@example.com",
    "email_verified": true,
    "linked_at": "2026-07-22T12:00:00Z",
    "provider": "google",
    "status": "active"
  },
  "next_step": "role_onboarding_required",
  "return_path": "/app"
}
```

contract의 `next_step` 값:

- `signed_in`
- `email_required`
- `legal_consent_required`
- `role_onboarding_required`
- `profile_completion_required`

현재 service가 실제 반환하는 값은 `signed_in`, `email_required`,
`role_onboarding_required`다. 나머지 두 상태는 후속 gate 구현 전까지
완료로 간주하지 않는다.

### 6.4 identity 조회·연결·해제

```http
GET    /api/v1/auth/social/identities
POST   /api/v1/auth/social/identities/link-attempts
POST   /api/v1/auth/social/identities/reconcile
POST   /api/v1/auth/social/complete
DELETE /api/v1/auth/social/identities/{provider}  # future unlink adapter
```

연결 규칙:

- 로그인된 user만 시작할 수 있다.
- 최근 인증 시간이 정책 기준보다 오래됐으면 reauthentication을 요구한다.
- 다른 app user에 이미 연결된 provider subject는 연결할 수 없다.
- 연결 완료 후 Supabase identity와 DB inventory를 다시 대조한다.

해제 규칙:

- 마지막 로그인 방법은 해제할 수 없다.
- 숨겨진 legacy password credential이 있더라도 이를 public fallback으로
  간주해 마지막 provider 해제를 허용하지 않는다.
- 완료되지 않은 탈퇴·revocation 작업이 있으면 중복 실행을 idempotent하게
  처리한다.
- provider unlink와 local inventory update는 보상 가능한 상태 머신으로
  처리한다.

### 6.5 auth-method 상태 API 보완

```http
GET /api/v1/me/auth-methods
```

반환할 상태:

- `has_password`
- `linked_providers`
- `can_change_password`
- `can_set_password`
- `can_unlink`

프로필 UI는 social-only 사용자에게 현재 비밀번호 입력을 요구하지 않는다.
이 필드들은 숨겨진 legacy credential 상태와 unlink 안전장치 설명용이다.
현재 product UI는 password login, signup, reset, password-creation CTA를
public auth path로 다시 노출하지 않는다.

## 7. 데이터 모델 및 마이그레이션

### 7.1 `social_auth_identities`

제안 필드:

| 필드 | 설명 |
| --- | --- |
| `id` | 내부 UUID |
| `user_id` | `app_users.id` FK |
| `supabase_identity_id` | Supabase identity UUID/ID |
| `provider` | `apple`, `google`, `kakao`, `naver` |
| `provider_subject_hash` | provider subject의 keyed hash |
| `provider_email` | 연결 시점 provider email, nullable |
| `provider_email_verified` | provider/Supabase 검증 상태 |
| `status` | `active`, `revocation_pending`, `revoked` |
| `linked_at` | 최초 연결 시각 |
| `last_used_at` | 마지막 성공 로그인 시각 |
| `revoked_at` | revocation 시각 |

제약:

- `(provider, provider_subject_hash)` unique
- `(user_id, provider)` unique
- `supabase_identity_id` unique
- provider는 허용 enum/check constraint만 허용
- raw access token, refresh token, ID token, authorization code 저장 금지
- provider metadata 전체 JSON dump 금지

### 7.2 `social_auth_attempts`

필드:

- `id`
- `provider`
- `platform`
- `flow`: `login`, `link`
- `return_path`
- `secret_hash`
- `status`: `pending`, `completed`, `cancelled`, `failed`, `expired`
- `auth_user_id` nullable
- `result_next_step`, `result_email`, `result_email_verified`
- `expires_at`, `completed_at`, `created_at`

원문 provider error description은 제한된 길이로 정규화하고 token/code/query
값은 제거한다.

### 7.3 provider revocation credential

원칙은 provider token을 저장하지 않는 것이다. 다만 Apple처럼 탈퇴 시
revocation을 위해 refresh token이 필요한 공급자는 다음 조건을 모두 만족할
때만 별도 encrypted credential vault에 저장한다.

- 실제 provider 문서와 store 정책상 필요성이 확인됨
- application-level envelope encryption 적용
- encryption key는 DB가 아닌 Lightsail 서버 비밀 설정에 보관
- ciphertext, key version, provider, user, expiration만 저장
- API response, audit payload, Sentry에 평문을 남기지 않음
- 탈퇴 성공 후 즉시 폐기
- decrypt 실패와 provider outage를 보상 작업으로 추적

Naver/Kakao/Google도 실제 unlink API 호출에 장기 token이 필요한지 provider
spike에서 확인한다. 필요하지 않으면 credential vault 범위를 확장하지 않는다.

### 7.4 기존 `app_users`

- Supabase user UUID 중심 소유권은 유지한다.
- email이 identity의 영구 primary key가 되지 않도록 한다.
- email nullable 전환이 필요한지는 Phase 0에서 확인한다.
- MVP에서 `app_users.email`을 non-null로 유지한다면 provider email 미제공
  사용자는 contact-email completion 전 app user 생성을 완료하지 않는다.
- unique email 충돌은 서비스 계층의 명시적 account-link-required 오류로
  변환한다.

### 7.5 session/identity revocation version

현재 `deleted_at`/`deactivated_at` 검사와 Supabase Auth user 삭제는 전체
탈퇴 차단에는 유효하지만, 한 identity만 해제하거나 유출된 세션을 즉시
차단하는 공통 primitive는 아니다.

- `app_users.auth_version` 또는 동등한 server-side session cutoff를 추가한다.
- 필요하면 `social_auth_identities.revoked_before`를 provider identity 단위로 둔다.
- `require_current_user()`는 Supabase JWT 발급 시각과 cutoff를 비교한다.
- 계정 전체 로그아웃, legacy password 변경, 위험 identity 해제 시
  version/cutoff를
  갱신한다.
- mobile/web은 401의 안정적 code를 받으면 Supabase local session과 protected
  query cache를 함께 제거한다.

### 7.6 email 기반 보조 기능 정리

- 공개 계정 삭제 OTP가 검증한 email을 그대로 user lookup key로 쓰지 않고,
  검증 시점에 확정한 user/identity reference에 바인딩한다.
- 관리자 권한은 `ssamso8282@gmail.com` 같은 raw email 비교가 아니라
  server-managed admin principal/role table로 이동한다.
- support ticket의 contact email은 문의 회신 목적 데이터로 유지하되 auth
  identity와 혼동하지 않고 retention/redaction 정책을 별도로 적용한다.
- reviewer/demo seed는 provider-backed test account 기준으로 identity
  inventory를 함께 생성한다. Hidden password fallback은 reviewer path의 기준으로
  두지 않는다.

### 7.7 마이그레이션 전략

1. 새 테이블과 nullable 필드를 먼저 추가한다.
2. legacy password/email-OTP identity는 Supabase Auth에 migration data로만
   남길 수 있다. 현재 `social_auth_identities`에 가상의 `email` provider row를
   만들지 않고, public auth surface로 다시 노출하지도 않는다.
3. social provider를 하나씩 활성화하고 실제 Supabase identity를 inventory에
   동기화한다.
4. account deletion lookup과 admin gating을 identity-aware 경로로 전환한다.
5. 충분한 관찰 후 social identity inventory를 운영 조회 기준으로 사용한다.

기존 활성 API와 호환되는 expand/deploy/backfill/contract 순서를 따른다.

## 8. 공급자 설정 계획

### 8.1 Supabase Dashboard

- [x] Apple built-in provider 등록
- [x] Google built-in provider 등록 및 current browser-flow web client 확인
- [x] Kakao built-in provider 등록
- [x] `custom:naver` OIDC provider 생성
- [x] manual identity linking 활성화
- [x] identity 연결·해제 보안 알림 메일 활성화
- [ ] production web exact redirect 등록:
  `https://hypofit.bukae.co.kr/auth/social/callback`
- [ ] local web exact redirect 등록:
  `http://127.0.0.1:5173/auth/social/callback`
- [ ] native custom-scheme exact redirect 등록:
  `hypofit://auth/social-callback`
- [ ] legacy Vercel callback 유지 여부 결정
- [ ] universal/app link는 필요가 관측될 때 별도 도입
- [ ] auth rate limit과 audit log 확인
- [ ] provider별 disable/rollback 절차 기록

### 8.2 Apple Developer / App Store Connect

- [x] `com.contentruck.hypofit` Sign in with Apple capability와 local release
  entitlement 확인
- [x] web Services ID 생성과 client-secret credential 검증
- [x] Services ID website domain/return URL과 primary App ID grouping 최종 저장
- [x] Sign in with Apple key와 `.p8` 운영 위치 확인
- [x] Team ID, Key ID, native client ID를 비밀 설정 inventory에 기록
- [ ] client secret 자동 생성·교체 스크립트 구현
- [ ] 만료 30/14/7일 readiness warning 구현
- [ ] Apple relay email 발송 domain 등록 확인
- [x] 한국 개발자 계정 필수 server-to-server notification endpoint 등록
- [x] Apple notification endpoint와 JWS 검증, 네 account-change event
  deterministic test 구현
- [ ] Apple notification 운영 HTTPS smoke
- [ ] `private.icloud.com` relay domain 허용 확인
- [x] Supabase provider callback을 Services ID return URL로 등록
- [x] web Services ID를 Supabase Apple client IDs의 첫 항목으로 등록
- [ ] 계정 삭제 revocation smoke 수행

### 8.3 Google Auth Platform

- [ ] Audience를 External로 설정하고 production 공개 상태 확인
- [ ] OAuth consent screen과 Hypofit 브랜드 정보 확인
- [ ] web client ID 생성
- [ ] web client ID/secret을 Supabase Google provider에 등록
- [ ] authorized JavaScript origins에 production/local origin 등록
- [ ] authorized redirect URI에 Supabase provider callback exact URL 등록
- [ ] `openid`, `email`, `profile` 최소 scope 확인
- [ ] native Google SDK 도입 시에만 iOS client와 Android
  package/release/debug SHA-1 client 추가

### 8.4 Kakao Developers

- [x] 운영 주체가 사용할 Kakao Developers 팀 계정 준비
- [x] redirect URI에 Supabase callback exact URL 등록
- [x] Kakao Login 활성화
- [x] REST API key와 client secret 설정
- [ ] email/nickname/profile consent를 필요한 범위로 설정
- [ ] 비즈 앱 전환 또는 검수 필요 항목 확인
- [ ] native Kakao SDK 도입 시에만 iOS/Android platform 정보를 추가
- [ ] unlink API 운영 smoke 수행

### 8.5 Naver Developers

- [x] web 서비스 URL과 Supabase callback exact URL 등록
- [x] OIDC discovery/JWKS endpoint 응답 확인
- [x] Supabase `custom:naver` provider 생성 smoke
- [x] Naver authorize 호환성 기준 요청 scope를 단일 `openid`로 확정
- [ ] 공식 버튼 자산 확보
- [ ] 개발 계정 allowlist로 web/mobile smoke
- [ ] 서비스 적용 검수 자료와 화면 준비
- [ ] native Naver SDK 도입 시에만 package/app scheme/bundle ID 환경 추가
- [ ] token revocation과 연결 끊기 callback 검증

## 9. web 구현 계획

### 9.1 모듈 경계

제안 구조:

```text
apps/web/src/features/auth/social/
  api/
    socialAuthApi.ts
  model/
    providerRegistry.ts
    socialAuthMachine.ts
    socialAuthErrors.ts
  ui/
    SocialLoginButtons.tsx
    SocialLoginButton.tsx
  lib/
    googleIdentity.ts
    oauthCallback.ts
    returnPath.ts
```

- page는 버튼과 callback route를 조합만 한다.
- provider-specific SDK loading은 adapter에 격리한다.
- Supabase session과 AuthProvider lifecycle은 기존 auth feature가 소유한다.
- `shared`가 product-specific provider를 import하지 않게 한다.

### 9.2 로그인 UI

- social-only auth surface에는 email/password form, `회원가입`, `비밀번호 찾기`,
  `또는` divider를 두지 않는다.
- 공급자 버튼은 full-width, 52px 고정 높이로 제공해 최소 44px hit target을
  넘기고, loading/disabled 상태에서도 크기를 유지한다.
- 플랫폼·locale별 공식 label을 사용한다.
- Apple/Google/Kakao/Naver 공식 로고, 색상, 여백 규칙을 지킨다.
- 모든 버튼을 임의의 동일 초록색 outline으로 바꾸지 않는다.
- loading 중 누른 provider 하나만 busy 처리하고 나머지 중복 실행을 막는다.
- 취소는 오류 banner를 띄우지 않는다.
- 단일 social-login entry에서 현재 허용된 provider set을 제공한다.

구현 규격:

| 공급자 | 컨테이너·문구 | 자산·배치 |
| --- | --- | --- |
| Apple | black, `Apple로 계속하기`, 12px radius | iOS는 system button, web은 Apple 공식 padded logo image |
| Google | white, `#747775` 1px stroke, `Google로 계속하기` | Google 공식 color G tile, Android/web 12px·iOS 16px leading reserve |
| Kakao | `#FEE500`, `카카오 로그인`, 12px radius | 공식 검정 말풍선 심볼, label은 OS system font |
| Naver | `#03A94D`, `네이버로 로그인`, 12px radius | 공식 white N asset, 표시 로고 16px 이상 확보 |

- letter badge `A/G/K/N`은 공식 심볼로 오인될 수 있어 사용하지 않는다.
- 공급자 이미지는 `apps/web/public/social-auth`와
  `apps/mobile/assets/social-auth`에 출처 README와 함께 보관한다.
- 버튼 텍스트는 전체 폭의 시각 중심에 두고, 로고는 공급자별 leading 여백을
  유지해 로고 폭 차이로 label이 흔들리지 않게 한다.
- 공급자 브랜드 서체가 설치되지 않은 native 환경에서는 임의 브랜드 폰트
  모사가 아니라 OS system font를 사용한다.

### 9.3 callback

- `/auth/social/callback`을 provider callback의 web landing으로 사용한다.
- query에서 `code`, `error`, `error_description`, `state`를 읽은 뒤 즉시 URL을
  정리한다.
- code exchange는 한 번만 실행한다.
- React StrictMode 중복 effect에도 idempotent해야 한다.
- 성공 후 API complete를 호출하고 `next_step`에 따라 이동한다.
- `return_path`는 attempt의 서버 저장 값만 사용한다.
- popup이 차단되거나 storage가 끊긴 경우 redirect fallback을 제공한다.
- callback 실패 시 provider 재시도, support, legal 경로만 제공한다.

### 9.4 Google web 특례

- 현재 MVP는 다른 web provider와 동일한 Supabase browser OAuth를 사용한다.
- Google Identity Services 공식 renderer/FedCM은 전환 가치가 확인될 때의
  후속 최적화이며 provider rollout의 선행 조건이 아니다.
- 향후 ID-token adapter를 도입하면 nonce 원문/해시 계약을 테스트로 고정하고
  ID token은 Supabase 교환 직후 메모리에서 폐기한다.

## 10. mobile 구현 계획

### 10.1 공통 adapter

```text
apps/mobile/src/features/auth/social/
  providerRegistry.ts
  socialAuthService.ts
  socialAuthErrors.ts
  useSocialAuth.ts
  adapters/
    apple.ts
    google.ts
    browserOAuth.ts
```

adapter 결과는 공급자 SDK 응답을 그대로 노출하지 않고 다음 union으로
정규화한다.

```ts
type SocialAuthResult =
  | { status: 'success'; provider: SocialProvider }
  | { status: 'cancelled'; provider: SocialProvider }
  | { status: 'failed'; provider: SocialProvider; code: SocialAuthErrorCode }
```

### 10.2 iOS Apple

- `expo-apple-authentication`을 Expo SDK 호환 버전으로 설치한다.
- `usesAppleSignIn` config와 entitlement를 확인한다.
- cryptographically secure raw nonce와 SHA-256 nonce를 생성한다.
- identity token, authorization code, full name의 null 가능성을 처리한다.
- Apple credential 상태가 revoked면 local session을 종료한다.
- 최초 제공 name은 complete API에서만 사용하고 로그에 남기지 않는다.

### 10.3 Android Google

- 현재 MVP는 system browser + Supabase PKCE를 사용한다.
- Credential Manager native adapter는 로그인 전환율이나 browser UX 문제가
  실제로 관측될 때 별도 spike한다.
- native adapter 도입 시 debug/release signing SHA-1을 분리하고 server client
  ID, nonce, account chooser 계약을 검증한다.
- Expo SDK managed dependency 범위를 깨는 임의 버전 설치는 금지한다.

### 10.4 browser OAuth providers

- `expo-web-browser` AuthSession/system browser를 사용한다.
- Kakao와 Naver는 browser OAuth로 시작한다.
- `openAuthSessionAsync` 종료, 취소, dismiss, timeout을 구분한다.
- 앱이 background/terminated 상태에서 callback을 받아도 복구한다.
- 현재 iOS/Android release callback은 `hypofit://auth/social-callback` custom
  scheme으로 고정한다.
- universal link와 Android app link는 더 나은 도메인 신뢰/UX가 필요해질 때
  별도 도입한다.
- 동일 callback이 warm app과 cold app에서 두 번 처리되지 않게 한다.

### 10.5 secure session storage

- Supabase session persistence는 기존 단일 AuthProvider가 계속 소유한다.
- native credential/provider token을 AsyncStorage에 별도 저장하지 않는다.
- 인증 중 임시 nonce/verifier는 secure memory 또는 제한된 temporary storage에
  두고 완료·실패·만료 시 삭제한다.
- app foreground에서 session refresh와 social completion retry의 경합을
  단일 lifecycle queue로 직렬화한다.

## 11. 역할·약관·프로필 온보딩

### 11.1 social login이 기존 회원가입 단계를 우회하지 않게 한다

필수 단계:

1. provider authentication
2. provider email/contact completeness 판단
3. 만 19세 이상 확인과 현재 약관·개인정보처리방침 동의
4. 역할 선택: 창업자, 인터뷰어, 둘 다
5. 필수 profile 확인
6. 홈 진입

### 11.2 profile 초기값 우선순위

이름:

1. 사용자 입력
2. Apple 최초 credential full name
3. provider verified name
4. provider nickname
5. email local part를 임시 표시명으로 사용하되 확인 요구

프로필 사진:

- provider image는 사용자의 명시적 확인 후에만 Hypofit profile image로
  복사하거나 외부 URL 참조 정책을 결정한다.
- 무조건 원격 provider URL을 영구 공개 profile로 사용하지 않는다.
- 사용하지 않으면 기존 기본 avatar를 표시한다.

### 11.3 약관 동의 증적

- social provider의 동의 화면을 Hypofit 약관 동의로 간주하지 않는다.
- legal document version, accepted timestamp, client platform을 서버에 남긴다.
- 가입 화면에서 약관과 개인정보처리방침 링크를 실제로 열 수 있어야 한다.

## 12. 계정 연결·해제·탈퇴

### 12.1 계정 설정 UI

`계정 정보 > 로그인 방법`에는 provider 연결 상태만 표시한다. 연락 email이
있다면 별도 계정 정보 row에서 마스킹해 보여주되 로그인 방법으로 취급하지
않는다.

- Apple: 연결됨/연결하기
- Google: 연결됨/연결하기
- Kakao: 연결됨/연결하기
- Naver: 연결됨/연결하기

공급자 email 전체를 기본 화면에 노출하지 않는다. 필요한 경우 masking한다.

### 12.2 연결 충돌

- 같은 provider identity가 다른 Hypofit user에 연결돼 있으면 병합하지 않는다.
- 두 계정의 소유권을 각각 재인증할 수 있는 별도 account recovery 절차가
  생기기 전에는 support escalation으로 보낸다.
- application, chat, review, interview ownership을 자동 이동하지 않는다.

### 12.3 탈퇴

탈퇴 service 순서:

1. 요청 user와 최근 인증 상태 확인
2. app data soft-delete/anonymization transaction 준비
3. 연결 provider 목록 snapshot
4. 가능한 provider token revocation/unlink 실행
5. 실패 항목을 retryable outbox/audit 상태로 기록
6. Supabase Auth user 삭제
7. app user 탈퇴 상태 확정
8. 모든 client session과 protected cache 제거

provider outage가 app data 삭제 자체를 영구 차단하지 않도록 보상 작업을
둔다. 다만 revocation 실패는 운영자가 확인할 수 있어야 한다.

## 13. 보안 요구사항

### 13.1 필수

- authorization code + PKCE S256
- OIDC nonce 검증
- OAuth state/CSRF 검증
- exact redirect URI
- provider/issuer binding으로 mix-up 방어
- ID token `iss`, `aud`, `azp`, `exp`, `iat`, nonce 검증
- one-time code와 attempt replay 방지
- login/link/complete rate limit
- open redirect 차단
- secret rotation과 만료 경보
- 로그와 Sentry의 token/code/PII scrubbing
- provider callback에 `Cache-Control: no-store`
- web callback referrer leakage 방지

Supabase가 담당하는 검증을 API에서 불완전하게 재구현하지 않는다.
API가 provider token을 직접 처리하는 제한 경로만 해당 provider 공식
JWKS/issuer/audience 검증을 수행한다.

### 13.2 secret 위치

브라우저/모바일에 노출 가능:

- Supabase URL/publishable or anon key
- Google public client ID
- provider가 명시적으로 public identifier로 정의한 값

서버/Supabase dashboard에만 보관:

- Supabase service role
- Apple `.p8`, private key, generated client secret
- Google client secret
- Kakao client secret
- Naver client secret
- HMAC/envelope-encryption keys

### 13.3 rate limit 초기값

- attempt create: device/IP fingerprint 기준 분당 10회
- complete: attempt 기준 1회 성공, 실패 포함 제한
- link: user 기준 시간당 10회
- unlink: user/provider 기준 시간당 5회
- provider 장애 재시도: exponential backoff + jitter

실제 값은 운영 로그를 보고 조정한다.

## 14. 오류 계약과 관측

### 14.1 안정적인 오류 코드

- `social_provider_disabled`
- `social_provider_review_pending`
- `social_unsupported_platform`
- `social_authorization_cancelled`
- `social_callback_expired`
- `social_state_mismatch`
- `social_nonce_mismatch`
- `social_code_exchange_failed`
- `social_provider_unavailable`
- `social_email_missing`
- `social_email_unverified`
- `social_identity_not_verified`
- `social_identity_conflict`
- `social_account_inactive`
- `social_rejoin_blocked`
- `social_profile_sync_failed`
- `social_legal_consent_required`
- `social_link_requires_reauth`
- `social_last_identity_unlink_forbidden`
- `social_provider_revoke_failed`
- `social_attempt_replayed`

API는 기존 error envelope의 `code`, `message`, `request_id`, `details`,
`retryable`을 유지한다.

### 14.2 phase

- `provider_capability`
- `attempt_create`
- `provider_authorization`
- `provider_callback`
- `supabase_token_exchange`
- `supabase_session_persist`
- `fastapi_identity_resolve`
- `fastapi_profile_sync`
- `legal_gate`
- `role_onboarding`
- `identity_link`
- `provider_revocation`

### 14.3 metric

- attempt, success, cancel, failure by provider/platform
- callback latency and complete latency p50/p95
- email completion rate
- new account versus linked identity rate
- identity conflict count
- provider revoke failure backlog
- return-path restoration failure
- auth crash-free sessions

metric label에 email, provider subject, name, token을 넣지 않는다.

## 15. 개인정보·스토어·정책 반영

### 15.1 개인정보처리방침

실제 출시 전 다음을 반영한다.

- Apple/Google/Kakao/Naver 로그인을 통한 provider identifier 수집
- 선택한 provider가 제공하는 email, name, profile image의 처리 목적
- 계정 인증·연결·부정 이용 방지 목적
- Supabase와 각 provider의 처리 관계
- 연결 해제와 계정 삭제 절차
- 보유 기간과 탈퇴 후 처리

### 15.2 App Privacy / Data safety

새 data category가 생기지 않더라도 다음을 다시 대조한다.

- 이름
- email
- user ID
- profile photo
- diagnostics/auth failure telemetry
- third-party authentication providers

마케팅, 광고, tracking 목적을 사용하지 않으면 해당 목적으로 선언하지 않는다.

### 15.3 App Store Review

- Apple 버튼은 다른 social button과 동등하게 보인다.
- reviewer access는 provider 기반 테스트 계정이나 allowlisted tester 경로로
  안내한다. Hidden email/password fallback에 의존하지 않는다.
- review notes에는 플랫폼별 enabled provider와 tester 제한을 적는다.
- provider 검수 장애가 심사를 막지 않도록 remote feature flag를 둔다.
- social login으로 가입한 계정도 앱 안에서 삭제할 수 있다.

### 15.4 Google Play

- Data safety와 실제 SDK/수집 항목을 일치시킨다.
- 현재 browser fallback은 release build callback을 검증한다. 향후 native
  Google adapter를 도입할 때 release signing SHA-1 client를 추가 검증한다.
- 계정 삭제 URL과 앱 내부 삭제 흐름이 social-only 계정에서도 동작한다.
- 테스트 credential과 provider 테스트 제한을 review instructions에 명시한다.

## 16. 구현 단계

### Phase 0. 공급자와 기존 schema 호환성 spike

- [x] Supabase Custom OAuth/OIDC의 현재 plan 지원 범위 공식 문서 확인
- [x] Naver discovery/JWKS endpoint 응답 확인
- [x] Supabase `custom:naver` provider 생성 및 authorize smoke
- [ ] Naver ID token의 email/profile claim 확인
- [ ] Apple 최초 승인과 반복 로그인의 `fullName`/email 응답 fixture 확보
- [ ] Apple relay email과 profile image 미제공 상태 확인
- [ ] Google `sub`, `email_verified`, nullable profile claim fixture 확보
- [ ] Kakao account email 검증·유효성·동의 거부 응답 fixture 확보
- [ ] Naver identifier 외 모든 profile 항목 동의 거부 fixture 확보
- [ ] Kakao Business/Test app 권한과 실제 승인된 동의 항목 확인
- [ ] Naver 검수 신청 profile 항목을 MVP 최소 범위로 확정
- [ ] Supabase user identities payload를 네 provider별 fixture로 확보
- [ ] `app_users.email` nullable/verification gate 결정
- [x] Expo SDK 53에서 Apple auth package와 release entitlement 호환성 확인
- [x] 현재 Google mobile은 system-browser fallback으로 고정
- [x] 현재 release callback은 `hypofit://auth/social-callback` custom scheme으로
  고정
- [ ] universal link/app link는 실제 필요가 관측되면 별도 계획
- [ ] provider별 unlink/revocation 요구사항 확정
- [ ] spike 결과를 이 문서의 결정표에 반영

Exit gate:

- Naver를 Supabase Custom OIDC로 사용할 수 있는지 결정됐다.
- provider email이 없을 때의 데이터 모델이 결정됐다.
- Expo managed dependency 범위를 깨지 않는 mobile 경로가 결정됐다.

### Phase 1. contracts, schema, migration

- [x] provider/flow/next-step/error enum을 `packages/contracts`에 추가
- [x] `social_auth_identities` migration
- [x] `social_auth_attempts` migration
- [ ] 필요한 경우 encrypted provider credential migration
- [x] repository와 transaction service 구현
- [x] migration upgrade/downgrade 경로와 DB constraint tests 확인

### Phase 2. API social auth facade

- [x] provider/platform validation at attempt creation
- [x] attempt create service
- [x] Supabase Admin identity resolver
- [x] social complete service와 idempotency
- [x] inactive/rejoin 및 role onboarding gate
- [ ] dedicated legal/profile gate와 `email_required` continuation
- [x] identity list/link API
- [ ] identity unlink API와 마지막 로그인 방법 보호
- [ ] session/identity revocation version과 dependency enforcement
- [ ] provider revocation interface와 adapter
- [ ] social provider account deletion/revocation binding
- [x] Apple server-to-server notification endpoint와 idempotent event service
- [x] readiness health에 provider configuration 상태 추가
- [x] social completion/link audit event 추가
- [ ] provider/phase별 PII-free metrics 추가
- [x] OpenAPI와 API tests 갱신

### Phase 3. web

- [x] social auth feature module
- [x] official provider visual buttons and locally versioned assets
- [ ] Google Identity Services adapter는 optional optimization으로 보류
- [ ] Apple web JS adapter는 optional optimization으로 보류
- [x] Kakao/Naver Supabase OAuth adapter
- [x] callback code exchange와 URL cleanup
- [x] complete API와 `signed_in`/role-onboarding routing
- [ ] `email_required` continuation과 dedicated legal/profile routing
- [x] requested path restoration
- [x] identity settings UI
- [x] responsive/keyboard/focus/error automated QA

### Phase 4. mobile

- [x] social provider registry와 common hook
- [x] iOS Apple native flow
- [x] Google native flow 또는 승인된 browser fallback
- [x] Kakao/Naver AuthSession flow
- [x] cold/warm deep-link callback code path
- [x] Supabase session/complete API lifecycle serialization
- [x] signed-in/role-onboarding gate integration
- [ ] `email_required` continuation과 dedicated legal/profile routing
- [x] identity settings UI
- [ ] iOS/Android release-build smoke

### Phase 5. deletion, linking, policy

- [ ] account deletion provider revocation
- [ ] last-login-method unlink guard
- [ ] legacy hidden password-state cleanup policy
- [ ] privacy policy and terms updates
- [ ] App Privacy/Data safety worksheets update
- [ ] operator runbook and revocation retry workflow
- [ ] provider secret rotation runbook
- [ ] Apple notification replay/failure/operator runbook
- [ ] provider별 internal tester와 reviewer 안내 준비

### Phase 6. staged rollout

권장 순서:

1. Google web/internal tester
2. Apple iOS/TestFlight
3. Google Android/internal testing
4. Kakao web/mobile
5. Naver after provider review

각 단계는 provider/platform feature flag로 독립 rollout과 rollback이 가능해야
한다.

## 17. 테스트 계획

### 17.1 API unit/integration

- provider capability platform matrix
- Android capability와 UI에서 Apple 미노출
- Android에서 Apple attempt 직접 호출 시 `social_unsupported_platform`
- expired/replayed attempt
- open redirect rejection
- wrong provider completion
- Supabase identity absent/mismatch
- same verified email automatic link
- same provider subject conflict
- provider email absent
- unverified provider email
- Apple first authorization name present and repeated login name absent
- Apple profile image absent and relay email present
- Google stable `sub` with changed email/profile metadata
- Google optional profile fields absent
- Kakao email absent, consent denied, invalid, and unverified states
- Naver identifier-only response with all optional fields denied
- social age/CI/real-user claims cannot bypass the 19+ gate
- provider profile data cannot overwrite user-edited name or avatar without consent
- inactive/deleted/rejoin-blocked user
- legal/role/profile next-step precedence
- transaction rollback on profile sync failure
- link/unlink last method guard
- revocation timeout/retry/idempotency
- secret/token log redaction

### 17.2 web

- official buttons render and keyboard focus
- provider click duplicate prevention
- popup success/cancel/blocked
- redirect success/error
- callback StrictMode idempotency
- URL token/code cleanup
- requested deep-link restore
- session cache cleared on user change
- narrow/medium/desktop responsive behavior
- screen reader accessible names

### 17.3 mobile

- iOS Apple first login with full name
- repeated Apple login with null name
- Apple Hide My Email
- Android Google authorized account/no account flows
- Kakao app installed/not installed
- Naver app installed/not installed
- browser cancel and app resume
- cold-start callback
- warm callback
- callback process death recovery
- offline before provider, during callback, after Supabase exchange
- concurrent session refresh and complete
- logout then another user social login
- iOS/Android account deletion

### 17.4 account matrix

- new social-only user
- existing legacy email-auth user with same verified email
- existing user linking different provider email
- provider identity already linked to another user
- missing provider email
- unverified provider email
- deleted user during rejoin retention period
- user with all four providers
- user removing providers down to one
- social-only user does not see password-management CTA

### 17.5 운영 smoke

- local web callback
- Vercel production callback
- iOS development build
- TestFlight build
- Android debug build
- Android release-signed internal build
- canonical Spring API social complete
- Supabase dashboard provider state
- provider outage remote disable
- provider secret rotation without app update

## 18. 배포와 rollback

### 18.1 배포 순서

1. backward-compatible schema migration
2. API with all providers disabled
3. web/mobile clients that tolerate disabled providers
4. provider dashboard configuration
5. internal tester enablement
6. one provider/platform at a time
7. privacy/store metadata confirmation
8. broad enablement

### 18.2 rollback

- provider 운영 설정을 비활성화해 신규 attempt 생성을 거부한다.
- 남아 있는 승인된 social provider만 유지하고 removed email/password/OTP
  public entry를 되살리지 않는다.
- 기존 social session은 Supabase session으로 계속 보호 API를 사용할 수 있다.
- 신규 provider authorization만 차단하고 active user를 강제 로그아웃하지 않는다.
- schema는 additive 상태로 남기고 즉시 destructive rollback하지 않는다.
- revocation 실패 backlog는 운영 runbook으로 재시도한다.

## 19. 사용자 또는 운영자가 준비해야 할 항목

구현 시작 전 필요한 값은 문서나 채팅에 평문으로 남기지 않고 각 provider
dashboard, Supabase secret, Lightsail `/opt/hypofit/config/api.env`에 등록한다.

Apple:

- Team ID
- native App ID/bundle ID
- Services ID
- Sign in with Apple Key ID와 `.p8`
- verified web domain/return URL
- Supabase Apple client IDs는 web Services ID를 첫 항목, native bundle ID를
  다음 항목으로 등록

Google:

- OAuth consent screen
- web client ID/secret
- production/local JavaScript origin
- Supabase provider callback redirect URI
- native client ID와 Android SHA-1은 native Google adapter를 도입할 때만 준비

Kakao:

- REST API key
- client secret
- Supabase provider callback URL
- approved consent items
- native platform registration은 native Kakao SDK를 도입할 때만 준비

Naver:

- client ID/secret
- web service URL과 Supabase provider callback URL
- approved profile items
- service review status

Supabase:

- built-in provider configuration
- Custom OIDC provider availability
- redirect allowlist
- manual linking setting

## 20. 제외 범위

- API 자체 OAuth authorization server 구축
- 별도 custom access/refresh token 체계
- PASS/NICE/SMS 본인인증
- provider 친구·연락처·캘린더 데이터 접근
- 광고/마케팅 scope
- 조직 SSO/SAML
- social account 간 자동 데이터 병합 도구
- provider profile 사진의 무조건 자동 공개

## 21. 완료 기준

- [ ] web과 iOS에서 네 provider, Android에서 Google/Kakao/Naver가 승인된
  flow로 동작한다.
- [ ] Android에는 Apple 로그인 UI가 렌더링되지 않고 직접 API 호출도
  거부된다.
- [ ] 모든 성공 경로가 Supabase session과 API complete를 사용한다.
- [ ] 별도 API JWT가 생기지 않았다.
- [x] removed legacy email/password/signup-email-OTP public entry가 재노출되지
  않았다.
- [ ] 동일 사용자의 account history가 provider 추가 후 유지된다.
- [ ] provider email 미제공과 Apple relay email이 안전하게 처리된다.
- [ ] identity 연결·해제와 마지막 로그인 방법 보호가 동작한다.
- [ ] social-only 계정에 password login/change/create CTA가 노출되지 않는다.
- [ ] 탈퇴 시 provider revocation 결과가 추적된다.
- [ ] Apple web rollout 전 server-to-server notification 수신·검증·처리가
  운영 HTTPS endpoint에서 동작한다.
- [ ] callback에서 open redirect, replay, token leakage가 없다.
- [ ] provider별 시도 생성 검증과 운영 오류 처리가 동작한다.
- [x] 현재 API/web/mobile targeted automated tests가 통과한다.
- [ ] iOS TestFlight와 Android release-signed build smoke가 통과한다.
- [ ] 개인정보처리방침, App Privacy, Data safety가 실제 구현과 일치한다.
- [ ] 운영 secret/rotation/revocation runbook이 작성됐다.

## 22. 구현 중 결정 로그

| 날짜 | 결정 | 근거 | 상태 |
| --- | --- | --- | --- |
| 2026-07-20 | Supabase Auth를 세션 발급자로 유지 | 기존 web/mobile/API bearer 계약과 account deletion 경로 보존 | 확정 |
| 2026-07-20 | API는 공통 완료·identity governance를 소유 | 플랫폼별 인증 UX와 공통 product policy 분리 | 확정 |
| 2026-07-20 | Apple/Google/Kakao built-in, Naver Custom OIDC 우선 | Supabase와 provider 공식 지원 상태 | Phase 0 검증 필요 |
| 2026-08-08 | removed email/password/OTP public entry를 fallback으로 되살리지 않음 | provider 장애는 provider별 disable과 잔여 social provider로 처리하고 auth authority를 단일 문서로 유지 | 확정 |
| 2026-07-20 | native OAuth에 embedded WebView 금지 | RFC 8252와 store UX/security | 확정 |
| 2026-07-20 | provider별 단계적 rollout | 네 dashboard/검수/플랫폼 리스크 격리 | 확정 |
| 2026-07-20 | provider별 subject만 account key로 사용 | email·name·profile은 누락·변경·거부될 수 있음 | 확정 |
| 2026-07-20 | 소셜 profile은 MVP 최소 항목만 요청 | 개인정보 최소 수집과 provider 검수 범위 축소 | 확정 |
| 2026-07-20 | 공급자 age/CI/status를 성인·본인 인증으로 사용하지 않음 | 각 claim은 법적 본인확인 수단이 아님 | 확정 |
| 2026-08-11 | provider 목록은 플랫폼별 정적 레지스트리로 즉시 노출하고 capability 조회 API를 제거 | 지원하기로 확정한 로그인 방법을 매 진입마다 조회하지 않고, 실제 시도 생성 API에서 설정과 플랫폼을 검증 | 구현 완료 |
| 2026-07-20 | 기존 계정의 provider 추가는 보호된 link-attempt 이후 Supabase `linkIdentity`로 수행 | public login과 account linking을 분리하고 다른 사용자의 attempt 완료를 차단 | 구현 완료 |
| 2026-07-20 | 소셜 전용 계정은 비밀번호 변경 UI를 노출하지 않음 | 실제 email identity가 없는 계정에 동작하지 않는 비밀번호 기능을 표시하지 않음 | 구현 완료 |
| 2026-07-20 | 공개 attempt는 login만 허용하고 link는 보호 API에서 현재 user에 binding | 타 계정 연결 시도와 callback replay 방지 | 구현 완료 |
| 2026-07-20 | 소셜 identity inventory는 Supabase Admin 결과와 재대조 | 앱 DB를 인증 원본으로 오인하지 않고 제거된 identity를 revoked 처리 | 구현 완료 |
| 2026-07-20 | identity에 직접 포함된 email/email_verified만 공급자 검증 email로 사용 | 다른 로그인 방법의 최상위 email을 잘못 승격하지 않음 | 구현 완료 |
| 2026-07-22 | provider console callback은 Supabase callback, Hypofit 복귀 URL은 Supabase Redirect URLs에 등록 | OAuth code 교환 주체와 최종 client 복귀 단계를 분리 | 확정 |
| 2026-07-22 | mobile callback은 현재 `hypofit://auth/social-callback` custom scheme으로 유지 | 이미 구현·release 검증된 MVP 경로이며 universal/app link는 필수 조건이 아님 | 확정 |
| 2026-07-22 | Google/Kakao/Naver mobile은 system-browser OAuth를 우선 유지 | native SDK와 추가 client/SHA 설정 없이 현재 Expo 계약으로 출시 가능 | 확정 |
| 2026-07-22 | provider flag는 console 저장만으로 상시 노출하지 않고 authorize probe 후 controlled E2E 구간에서만 `available`로 전환 | 실제 계정 검증 전 장기 노출을 피하고 social-only auth surface를 안정적으로 유지 | 확정 |
| 2026-07-22 | Apple web Services ID 전에 API server-to-server notification endpoint를 구현 | 2026년부터 대한민국 소재 개발자의 새/수정 Services ID에 Apple이 endpoint를 요구 | 구현 완료, 운영 등록 대기 |
| 2026-07-29 | Naver OIDC 요청 scope는 단일 `openid`로 고정 | Supabase가 복수 scope를 반복 query parameter로 직렬화해 Naver consent-confirm에서 거부한 실측 오류를 제거하고, email/name/profile 제공은 Naver 앱 동의항목으로 관리 | 구현 완료 |
| 2026-07-29 | Kakao/Naver는 MVP에서 provider-verified email을 필수로 요구 | 미관측 email 보완 플로우를 선행 구현하지 않고 기존 계정 모델과 가입 계약을 유지 | 확정 |
| 2026-07-29 | Kakao/Naver credentials와 authorize probe 완료 후 controlled E2E를 위해 provider flag를 임시 활성화 | public readiness와 attempt 생성 계약 확인 후 실제 consent/callback 검증 진행 | `available`, interactive smoke 진행 중 |

## 23. 2026-07-29 Apple web 준비 체크포인트

완료:

- native App ID `com.contentruck.hypofit`, Team ID, Key ID와 signing key 검증
- Supabase Apple provider 활성화와 native App ID 기준 authorize redirect 확인
- iOS와 web Apple capability를 독립적으로 제어하는 API 설정
- `POST /api/v1/auth/social/apple/notifications` 공개 수신 경로
- Apple JWS issuer, audience, signature, `kid`, `iat`, event type 검증
- `jti` 기반 중복 처리 방지와 provider subject HMAC 저장
- `email-enabled`, `email-disabled`, `consent-revoked`,
  `account-deleted` 처리
- Apple identity만 revoke하며 Hypofit 계정 자체는 삭제하지 않는 경계
- web Apple 로그인과 기존 계정 연결의 Supabase OAuth 자동화 테스트

남은 운영 설정:

1. Apple Developer에서 primary App ID에 다음 endpoint를 등록한다.
   `https://hypofit-api.bukae.co.kr/api/v1/auth/social/apple/notifications`
2. web Services ID `com.contentruck.hypofit.web`를 만들고 primary App ID와
   연결한다.
3. Website domain은 `rpmddtobulnagpdzdkbl.supabase.co`, return URL은
   `https://rpmddtobulnagpdzdkbl.supabase.co/auth/v1/callback`으로 등록한다.
4. Services ID를 subject로 하는 Apple client secret을 생성한다.
5. Supabase Apple Client IDs를
   `com.contentruck.hypofit.web,com.contentruck.hypofit` 순서로 저장하고
   client secret을 교체한다.
6. Supabase authorize redirect의 `client_id`가
   `com.contentruck.hypofit.web`인지 확인한 뒤 web Apple capability를
   `available`로 전환한다.

운영 관측:

- 2026-07-29 Supabase Apple Client IDs를
  `com.contentruck.hypofit.web,com.contentruck.hypofit` 순서로 적용했다.
- Supabase authorize redirect가 `client_id=com.contentruck.hypofit.web`을
  사용하는 것을 확인했다.
- Apple token endpoint는 web client secret에 대해 `invalid_client`가 아닌
  의도한 가짜 code의 `invalid_grant`를 반환해 key, Team ID, Key ID,
  Services ID subject 조합이 유효함을 확인했다.
- 초기 Apple authorize 화면은 `invalid_client`를 반환했다. Apple Developer
  Services ID에 website domain
  `rpmddtobulnagpdzdkbl.supabase.co`, return URL
  `https://rpmddtobulnagpdzdkbl.supabase.co/auth/v1/callback`, primary App ID
  grouping을 다시 저장해 해결했다.
- API SHA `daa94a11b5dda638e8e528ab2a3bc4ba419eba8a`를 blue/green으로
  배포했고 migration `0023_apple_sign_in_notifications`가 적용됐다.
- 운영 HTTPS notification endpoint는 invalid JWS에
  `social_provider_notification_invalid` 400을 반환해 route와 error
  contract가 정상임을 확인했다.
- `SOCIAL_AUTH_APPLE_WEB_STATE`와 `SOCIAL_AUTH_APPLE_IOS_STATE`는
  각각 독립적으로 운영한다.
- 2026-07-29 Apple Developer 설정 저장 후 같은 authorize 요청이
  `client_id=com.contentruck.hypofit.web`으로 Apple 로그인 페이지 HTTP 200을
  반환했고 `invalid_client`가 사라졌다.
- 운영에서 `SOCIAL_AUTH_APPLE_WEB_STATE=available`과 controlled smoke용
  `SOCIAL_AUTH_APPLE_IOS_STATE=available`을 적용했다. web/iOS capability는
  Apple을 노출하며 Android Apple은 `unsupported_platform`을 유지한다.
