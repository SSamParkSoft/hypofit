# Responsive Web Auth Entry Experience Plan

Status: completed - core auth entry implementation complete; obsolete password work is not current backlog

Last updated: 2026-08-08

## 2026-07-19 문서·구현 상태 대조

- shared navigation layer의 View Transitions progressive enhancement 구현을
  이 계획의 완료 항목으로 반영했다.
- Vercel manual production deployment 완료를 반영했다.
- PII-free auth telemetry와 비밀번호 문자 조합의 서버 측 완전 강제 방식은
  아직 결정·구현되지 않았으므로 문서 상태가 이를 명시하도록 고쳤다.
- 실제 로그인 계정이 필요한 production landing -> login -> app smoke와
  canonical viewport, keyboard, zoom, cross-browser, Figma 항목은 열어 두었다.

Owner surface: `apps/web`

Related routes: `/`, `/app`, protected customer routes, `/auth/callback`,
`/auth/reset-password`, `/legal/*`, `/support`, `/account-deletion`

Shared web history, scroll, focus, and route-level motion implementation is
tracked in `web-navigation-motion-system-plan.md`. This plan continues to own
auth bootstrap, form hierarchy, auth errors, and recovery behavior.

The public login-recovery support URL and the authenticated inquiry inbox are
specified in `public-support-and-authenticated-inquiry-experience-plan.md`.
This auth plan owns requested-path restoration into those protected inquiry
routes, while the support plan owns their UI and support-ticket behavior.

## 2026-07-14 단일 인증 카드 간소화

- 랜딩에서 이미 서비스 가치와 기능을 설명하므로 desktop 로그인의
  `AuthProductContext`, 더미 인터뷰 작업 공간, 상태 배지, 기능 설명을 제거했다.
- 데스크톱은 중앙의 단일 인증 카드, compact web은 같은 폼을 테두리
  없이 표시한다. 두 구성은 동일한 `440px` 최대 너비와 폼 계층을 공유한다.
- 로그인 제목을 `로그인`으로 단순화하고 반복 기능 설명을 제거했다.
- 브랜드 마크와 이름은 랜딩 복귀 동작을 겸하며, 별도의 `랜딩으로`
  유틸리티 링크를 제거했다.
- 회원가입, OTP, 역할 선택, 비밀번호 복구, 오류 feedback, password-manager
  semantics, 법적 링크는 같은 인증 카드 안에서 기능을 유지한다.
- auth bootstrap skeleton도 같은 중앙 카드 geometry를 사용해 최종 폼으로
  전환될 때 layout shift가 생기지 않게 했다.

## 2026-07-14 반응형 법적 문서 셸 고도화

- 약관 데이터는 `packages/contracts` 단일 소스를 유지하고 React web과
  Expo mobile이 각자의 플랫폼 문서 셸로 표시한다.
- compact web은 단일 열과 접을 수 있는 목차, medium web은 읽기 너비를
  제한한 단일 열, `1200px` 이상은 본문과 우측 sticky 목차를 사용한다.
- 목차는 실제 `h2` 제목과 동일한 문구를 사용하고, anchor navigation과
  Intersection Observer로 현재 조항을 표시한다.
- 웹 상단의 `이전 화면`은 고정 랜딩 링크가 아니라 history-aware back을
  사용하며, 직접 접근일 때만 랜딩을 fallback으로 사용한다.
- Expo 문서는 기존 `returnTo` 계약을 유지하고 본문을 `14px/23px`, 조항
  제목을 `15px/23px`로 조정해 긴 문서 가독성을 높였다.

## 1. 목적

랜딩 헤더의 `로그인`을 누른 사용자가 모바일 앱 스플래시를 웹에서 다시
보는 느낌 없이, 웹 환경에 맞는 인증 진입과 로그인 화면으로 자연스럽게
이동하게 한다.

이 계획은 두 문제를 함께 해결한다.

1. `/app` 진입 시 강제로 표시되는 앱형 스플래시와 가짜 진행률을 제거한다.
2. 로그인·회원가입 화면을 phone UI 확대판이 아니라 responsive web auth
   experience로 재구성한다.

완료 결과는 다음과 같아야 한다.

```text
landing
  -> login link
  -> real auth bootstrap only when needed
  -> unauthenticated: responsive web login
  -> authenticated: requested customer web route
```

## 2. 현재 문제

### 2.1 모든 비랜딩 경로가 같은 앱형 스플래시를 거친다

현재 `apps/web/src/app/App.tsx`는 `/`을 제외한 경로에서
`isSplashVisible`을 먼저 확인한다. 그 결과 다음 공개 경로도 인증과 무관한
앱 스플래시를 거친다.

- `/legal/terms`
- `/legal/privacy`
- `/support`
- `/account-deletion`
- `/install`
- `/auth/callback`
- `/notifications`
- `/app` 및 customer web routes

이 구조는 route intent와 auth bootstrap을 분리하지 못한다.

### 2.2 진행률이 실제 작업량을 나타내지 않는다

현재 `SplashScreen.tsx`는 다음 동작을 가진다.

- 최소 1,350ms 표시
- 8%에서 시작
- 72%까지 빠르게 증가
- 90% 부근에서 느리게 증가
- auth loading이 끝나면 100%로 이동
- 추가 exit delay 적용

이 진행률은 네트워크 단계나 처리량을 측정하지 않는다. 따라서 determinate
progress bar처럼 보이지만 실제로는 시간 기반 연출이다. Carbon은 실제
진행량을 계산할 수 있을 때만 determinate progress를 사용하도록 안내한다.
인증 세션 확인에는 실제 백분율이 없으므로 현재 표현은 부정확하다.

### 2.3 웹 로그인 화면이 모바일 앱 화면과 데스크톱 SaaS 템플릿 사이에 있다

현재 `AuthScreen.tsx`는 phone form을 중심으로 만든 뒤 desktop에서 왼쪽에
MVP 설명 카드와 signal cards를 추가한다.

문제는 다음과 같다.

- 모바일과 desktop 모두 동일한 floating form card 인상이 강하다.
- 큰 화면의 왼쪽 영역이 실제 제품 화면이 아니라 기능 설명 카드로 채워져
  generic SaaS/AI mockup처럼 보인다.
- `회원가입`과 `비밀번호 찾기`가 로그인 CTA 아래에서 동일한 버튼 무게를
  가져 행동 우선순위가 약하다.
- form card가 자체 `max-height`와 scroll을 가져 page scroll/keyboard
  ownership이 복잡하다.
- 랜딩에서 로그인으로 이동할 때 브랜드·배경·레이아웃 연결이 끊긴다.
- 로그인 완료 후 이동할 requested path와 auth state가 명시적으로 모델링돼
  있지 않다.

### 2.4 빠른 인증에도 의도적 지연이 발생한다

세션 확인이 즉시 끝나도 최소 스플래시 시간이 적용된다. 이는 native launch
branding을 흉내 내지만 웹에서는 불필요한 대기다. 웹에서는 가능한 한 기존
페이지를 유지하거나 최종 layout skeleton을 보여주고, 실제 지연이 있을 때만
wait feedback을 제공해야 한다.

### 2.5 session bootstrap과 profile synchronization이 한 화면에 가려진다

`AuthProvider`는 `isLoading`과 `isSyncing`을 별도로 관리한다. 이는 다음 두
작업이 다르다는 뜻이다.

- Supabase session과 auth user 확인
- FastAPI/Supabase profile 동기화

현재 global splash는 이 차이를 사용자와 route orchestration에서 숨긴다.
새 구조에서는 session 판정에만 route gate를 사용하고, profile sync는 가능한
경우 authenticated shell을 먼저 보여준 뒤 profile-dependent 영역만 localized
loading 상태로 처리한다. profile sync 실패를 다시 full-screen splash로
되돌리지 않는다.

## 3. 외부 리서치 요약

### 3.1 반응형 layout

[web.dev responsive design guidance](https://web.dev/articles/responsive-web-design-basics)는
기기 이름에 맞춘 breakpoint보다 콘텐츠가 깨지는 시점에 layout을 바꾸고,
작은 화면에서 시작해 필요한 시점에 확장하라고 안내한다.

Hypofit 적용:

- iPhone, iPad, desktop 같은 기기명으로 auth layout을 결정하지 않는다.
- form과 product context가 동시에 읽히는 최소 폭을 기준으로 split layout을
  연다.
- narrow/compact에서는 product context panel을 숨기고 단일 form에 집중한다.

### 3.2 2025년 대형 서비스 인증 화면 변화

[Microsoft의 2025 consumer authentication redesign](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/new-user-experience-for-consumer-authentication/3822035)은
화면당 개념 수를 줄이고, centered design으로 distraction을 줄이며, 같은
인증 흐름이 다양한 form factor에 대응하도록 단순화했다.

Hypofit 적용:

- 한 화면의 주 작업은 하나로 제한한다.
- 로그인 화면에서는 로그인 form이 시각적 중심이다.
- product context는 desktop에서만 보조 역할을 하며 form보다 강해지지 않는다.
- 로그인, 가입 1단계, 역할 선택을 각각 명확한 단계로 유지한다.

### 3.3 loading indicator와 skeleton

[Fluent 2 Spinner guidance](https://fluent2.microsoft.design/components/web/react/core/spinner/usage)는
spinner를 1초 이상 걸리는 처리에 사용하고, 3초 이상 예상되면 무엇을 처리
중인지 label을 함께 제공하도록 안내한다.

[Carbon loading guidance](https://carbondesignsystem.com/components/loading/usage/)는
점진적으로 표시할 수 있는 content에는 full-screen spinner보다 skeleton을
선호하고, 알려진 구조가 있는 full-screen load에도 skeleton이 더 매끄럽다고
설명한다.

[Carbon progress bar guidance](https://carbondesignsystem.com/components/progress-bar/usage/)는
실제 진행 비율을 계산할 수 있을 때 determinate progress를 사용하고, 알 수
없는 작업에는 백분율을 제공하지 않도록 구분한다.

Hypofit 적용:

- fake 0-100 progress bar를 삭제한다.
- 빠른 auth bootstrap에는 움직이는 loader를 표시하지 않는다.
- 지연되면 최종 auth layout과 같은 geometry를 가진 skeleton 또는 작은
  indeterminate indicator를 사용한다.
- 장시간 지연에는 retry와 landing 복귀를 제공한다.

### 3.4 motion과 status accessibility

[W3C `prefers-reduced-motion` technique](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)는
사용자가 reduced motion을 요청하면 interaction animation을 억제하는 방법을
제시한다.

[WCAG status messages guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)는
waiting, progress, error 같은 상태 변화가 focus를 강제로 옮기지 않아도
보조기술에 전달돼야 한다고 설명한다.

Hypofit 적용:

- auth entry fade/translate는 `prefers-reduced-motion`에서 제거한다.
- bootstrap delay, login error, signup success는 `role=status` 또는
  `role=alert`로 의도에 맞게 전달한다.
- focus는 loader에 옮기지 않고 최종 form의 첫 유효 입력으로 이동한다.

### 3.5 SPA transition

[Chrome same-document View Transition guidance](https://developer.chrome.com/docs/web-platform/view-transitions/same-document)는
View Transition을 progressive enhancement로 다루고, network fetch를
transition callback 안에서 기다리지 않으며, 브라우저가 이미 back transition을
제공한 경우 중복 animation을 피하라고 안내한다.

Hypofit 적용:

- landing -> auth transition은 지원 브라우저에서만 짧은 cross-fade를 쓸 수
  있다.
- 인증 요청 완료를 animation이 막아서는 안 된다.
- browser back/swipe에는 별도 page slide를 중복 적용하지 않는다.
- transition 실패가 route 변경을 실패시키면 안 된다.

### 3.6 form과 security

[MDN password input guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/password)는
로그인 비밀번호에 `autocomplete="current-password"`, 신규 비밀번호에
`autocomplete="new-password"`를 사용해 browser/password manager가 의도를
알 수 있게 한다.

[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)는
로그인 실패에서 이메일 존재 여부를 구분해 노출하지 않는 일반화된 메시지를
권장한다.

[Supabase password auth documentation](https://supabase.com/docs/guides/auth/passwords)는
email/password sign-in과 email confirmation 여부에 따른 signup 흐름을
구분한다.

Hypofit 적용:

- native input semantics와 autocomplete를 유지한다.
- 비밀번호 관리자 동작을 깨는 임의 multi-page email/password 분리는 하지
  않는다.
- 로그인 실패 copy는 계정 존재 여부를 노출하지 않는다.
- Supabase Auth 응답 코드는 observability에 보존하되 사용자 copy와 분리한다.

## 4. 제품 작업 정의

### 4.1 returning user

```text
For an existing founder or respondent,
this entry experience helps them enter the web workspace quickly
without waiting through app-style launch branding.
```

### 4.2 new user

```text
For a new user arriving from the landing page,
this auth experience helps them understand they are still in Hypofit,
create an account, choose a role, and continue without losing context.
```

### 4.3 public-document visitor

```text
For a visitor opening a legal/support/deletion URL,
the web app opens the requested public page directly
without an unrelated auth splash.
```

## 5. 핵심 결정

### Decision 1. `SplashScreen`을 web bootstrap gate로 대체한다

새 컴포넌트의 가칭은 `WebEntryGate` 또는 `AuthBootstrapGate`다.

`SplashScreen`의 앱 launch 역할은 제거한다. 웹에서는 다음 정보만 표현한다.

- Hypofit wordmark
- 현재 요청한 route를 유지하는 안정된 layout
- 실제 지연 시 짧은 상태 문구
- timeout 시 recovery action

표시하지 않는 것:

- full-screen Hypofit green
- 앱 아이콘 확대 표현
- fake progress percentage
- 영문 slogan
- 의도적 minimum duration
- 완료를 위한 강제 exit delay

### Decision 2. route와 auth gate를 분리한다

route를 세 그룹으로 분류한다.

#### Public immediate routes

- `/`
- `/legal/terms`
- `/legal/privacy`
- `/support`의 public mode
- `/account-deletion`
- `/install`
- `/auth/callback`

이 경로는 global auth splash 없이 즉시 해당 route shell을 렌더링한다.
필요한 route 자체 loading state만 사용한다.

#### Auth entry route

- `/app`

`/app`는 auth bootstrap 결과에 따라 다음으로 이동한다.

- authenticated: default customer destination
- unauthenticated: responsive login screen
- auth unavailable: recovery state

#### Protected customer routes

- `/interviews`
- `/map`
- `/chat`
- `/profile`
- `/my-interviews`
- `/notifications`
- 기타 protected detail/create routes

직접 URL로 들어온 경우 requested path를 잃지 않는다.

- authenticated: requested path
- unauthenticated: login form + post-login return path
- auth unavailable: requested path를 보존한 recovery state

### Decision 3. fast path에는 loader를 보이지 않는다

권장 timing contract:

| 경과 시간 | 사용자 경험 |
| --- | --- |
| `0-300ms` | 최종 layout geometry의 정적 shell만 표시 |
| `300-1000ms` | subtle skeleton 또는 static brand state 유지 |
| `1-3s` | 작은 indeterminate indicator + `계정을 확인하고 있어요` |
| `3-8s` | 같은 화면에서 상태 문구 유지, layout 이동 금지 |
| `8s+` | `다시 시도`, `랜딩으로`, 필요 시 지원 링크 제공 |

이 숫자는 강제 지연 시간이 아니다. 작업이 끝나면 즉시 다음 상태로 이동한다.

### Decision 4. desktop은 제품 맥락 + 집중 form, compact/mobile은 단일 form

선택한 방향은 `product-context split + focused auth form`이다.

다른 방향과의 비교:

| 방향 | 장점 | 문제 | 결정 |
| --- | --- | --- | --- |
| 모든 폭 centered card | 단순하고 안정적 | 웹 고유성 약함, 현재와 유사 | compact fallback |
| 장식 이미지 split | 시각적 임팩트 | stock/AI template 인상, 기능과 무관 | 제외 |
| 실제 product context split | 웹다운 밀도, 제품 신뢰 | 구현 정밀도 필요 | desktop 채택 |

desktop context panel은 기능 설명 카드나 가짜 지표를 사용하지 않는다.

- 실제 interview row/detail pattern 일부
- 실제 상태 badge와 founder/respondent 흐름
- 짧은 brand statement
- 현재 design token
- 실제 앱/웹 화면을 추상화한 product visual

이는 marketing hero가 아니라 auth 화면에서 제품 연속성을 만드는 보조 영역이다.

## 6. Responsive layout 계약

breakpoint는 현재 web shell과 맞춘다.

### Narrow: `< 768px`

- single-column full-page form
- page background와 form surface를 같은 계열로 유지
- floating card border/shadow 제거 또는 최소화
- top row: wordmark + `랜딩으로` link
- form width: `100%`
- horizontal padding: `20px`, 360px 이하 `16px`
- primary action min-height: `48px`
- page owns vertical scroll
- keyboard가 열려도 submit과 secondary links 접근 가능
- safe-area top/bottom 반영
- product context visual 숨김

### Compact web: `768-1199px`

- centered form column
- form content max-width: `420-440px`
- page max-width: `720px`
- top wordmark와 landing back 유지
- side illustration/context panel 없음
- viewport가 짧으면 vertical centering을 풀고 top padding 기반으로 배치
- form card는 필요할 때만 subtle border를 사용하고 과한 shadow 금지

### Desktop: `1200-1599px`

- two-column auth workspace
- product context: `minmax(0, 1.08fr)`
- auth form: `minmax(400px, 0.82fr)`
- outer max-width: `1240px`
- form max-width: `420px`
- form column은 시각적 중앙이되 viewport가 짧으면 top aligned
- context와 form 사이 divider 또는 background band 사용
- nested card 금지

### Wide desktop: `>= 1600px`

- outer max-width를 `1360-1440px` 범위로 제한
- form은 420-440px를 넘겨 늘리지 않는다.
- 남는 공간은 context visual의 호흡으로 사용한다.
- headline을 hero-scale로 확대하지 않는다.

### Short-height contract

`height < 720px`에서는:

- vertical center 강제 해제
- context secondary copy 축소 또는 숨김
- form header 간격 축소
- page scroll 허용
- card 내부 scroll 금지

## 7. WebEntryGate 상세 설계

### 7.1 상태 모델

```ts
type WebEntryState =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "profile-syncing"
  | "recoverable-error"
  | "offline";
```

UI state와 Supabase session state를 같은 boolean으로 표현하지 않는다.

필요 정보:

- `requestedPath`
- `startedAt`
- `hasDelayedFeedbackStarted`
- `isProfileSyncing`
- `retryCount`
- normalized error code
- network online/offline state

### 7.2 geometry

gate는 최종 auth screen과 같은 outer shell을 사용한다.

- desktop: context region + auth column skeleton
- compact/mobile: auth column skeleton
- wordmark 위치 고정
- 최종 form이 나타날 때 layout shift 최소화
- skeleton은 input 전체를 세밀하게 복제하지 않고 heading, 2 fields, CTA의
  큰 구조만 나타낸다.

### 7.3 status copy

기본:

- `계정을 확인하고 있어요`

offline:

- `인터넷 연결을 확인해 주세요`
- action: `다시 시도`

timeout/recoverable:

- `로그인 상태를 확인하지 못했어요`
- actions: `다시 시도`, `랜딩으로`

사용자에게 노출하지 않는 것:

- Supabase
- JWT
- refresh token
- request ID 원문
- stack trace

### 7.4 accessibility

- gate root에 `aria-busy="true"`
- 1초 이후 문구는 polite `role="status"`
- error recovery는 `role="alert"`
- skeleton은 `aria-hidden="true"`
- retry button에 focus를 강제로 보내지 않는다.
- final login form이 처음 렌더링될 때 email field autofocus는 desktop에서만
  검토하고 mobile에서는 keyboard 자동 표시를 피한다.

## 8. 로그인 화면 상세 설계

### 8.1 header

- Hypofit wordmark는 `/`으로 이동
- 별도 app icon tile 사용 금지
- `랜딩으로`는 compact/mobile에서 명시적 text link
- desktop context panel에서는 wordmark를 panel 상단에 배치

### 8.2 form hierarchy

```text
다시 만나서 반가워요
계정으로 로그인해 인터뷰를 이어가세요.

이메일
[ input ]

비밀번호
[ password input + eye ]

[ 로그인 ]

회원가입     비밀번호 찾기
```

결정:

- `로그인`만 full-width primary button
- 비밀번호 입력 다음에 `로그인`을 바로 배치해 필수 입력과 primary action의
  흐름을 끊지 않는다.
- `회원가입`과 `비밀번호 찾기`는 로그인 버튼 아래의 한 보조 action row에
  나란히 배치한다.
- 두 보조 action은 button 형태가 아닌 동일한 무게의 quiet text action으로
  표시하고, 정상 상태에서는 Hypofit primary CTA와 색상 경쟁을 만들지 않는다.
- 회원가입과 비밀번호 찾기를 동일한 secondary button 두 개로 만들지 않는다.
- 로그인 feedback은 로그인 버튼 아래에 표시해 정상 상태에서 비밀번호 입력과
  로그인 CTA 사이에 빈 영역을 예약하지 않는다.
- `로그인 후 신청, 모집, 채팅을 관리할 수 있습니다` 같은 기능 설명 footer는
  제거한다.

### 8.3 form fields

- label은 placeholder와 분리
- email `autocomplete="email"`
- login password `autocomplete="current-password"`
- signup password `autocomplete="new-password"`
- Enter submit 지원
- password visibility icon은 44px 이상 hit area
- error text가 나타나도 CTA와 layout이 크게 이동하지 않도록 message region
  최소 높이 검토
- browser validation과 domain error를 중복 표시하지 않는다.

### 8.4 login error

사용자 copy:

- `이메일 또는 비밀번호를 다시 확인해 주세요`
- network: `인터넷 연결을 확인하고 다시 시도해 주세요`
- rate limit: `잠시 후 다시 시도해 주세요`
- unverified email: 현재 OTP/email verification contract에 맞는 다음 행동 제공

내부 telemetry:

- normalized auth error code
- route
- elapsed time
- retry count
- build/version
- request correlation id where available

이메일, 비밀번호, OTP, access token은 Sentry breadcrumb에 기록하지 않는다.

## 9. 회원가입·역할 선택 설계

### 9.1 단계 구조

```text
1. 계정 정보
2. 역할 선택
3. 현재 email verification contract
4. requested/default route 진입
```

현재 backend/auth 계약을 UI redesign 과정에서 임의로 바꾸지 않는다. OTP 또는
confirmation 동작 변경이 필요하면
`docs/completed/email-otp-verification-transition-plan.md`를 함께 검토한다.

### 9.2 step indicator

- `1/2`, `2/2` badge만 띄우지 않는다.
- text label `계정 정보`, `역할 선택`과 짧은 progress line을 함께 사용한다.
- 역할 단계 제목은 `역할을 골라 주세요`처럼 짧게 유지하고, 시작 역할과 변경
  가능 여부는 설명문에서 안내한다.
- 실제 user-completed 단계만 determinate progress로 표현한다.
- back은 browser history가 아니라 signup internal step만 되돌린다.
- login으로 돌아갈 때 입력값 보존 정책을 명시한다.

### 9.3 role selection

- radio semantics 유지
- founder/respondent/both의 차이를 한 줄로 설명
- 선택 상태는 border, check, text를 함께 사용
- role 선택 카드가 과도하게 크지 않게 desktop에서도 한 column 유지
- long Korean copy와 200% zoom에서 reflow 확인

### 9.4 legal consent

회원가입 제출 직전 다음 공개 route가 접근 가능해야 한다.

- 이용약관
- 개인정보처리방침

copy는 동의 사실과 링크를 명확히 하고, required consent가 실제 auth contract에
없다면 체크박스를 장식으로 추가하지 않는다.

## 10. Product context panel

### 10.1 목표

desktop에서 빈 공간을 장식하는 것이 아니라 다음을 전달한다.

- 사용자가 로그인 후 도착할 실제 제품의 성격
- Hypofit의 인터뷰 workflow
- 랜딩과 customer web 사이의 시각 연속성

### 10.2 구성

권장 구조:

```text
Hypofit wordmark

실제 고객과 만나
가설을 확인하는 가장 빠른 방법

[real product preview]
interview row -> selected detail -> chat coordination

짧은 trust line
```

제외:

- `MVP 검증 루프` badge
- 가짜 metric
- signal card 3개
- gradient orb
- generic startup illustration
- testimonial fabrication
- App Store hero 반복

product preview는 실제 code component 또는 캡처 자산을 기반으로 한다. 가짜
데이터를 쓰더라도 현재 domain field와 상태를 사용한다.

## 11. Motion 계약

허용:

- landing -> auth root cross-fade: `160-220ms`
- form mode 전환 opacity/translate: `140-180ms`
- password icon, focus ring, button state transition

금지:

- full-page slide that imitates native navigation
- fake progress fill
- logo scale-up launch animation
- auth request 완료 후 추가 대기
- browser back animation과 중복되는 custom transition

`prefers-reduced-motion: reduce`에서는:

- translate/scale 제거
- duration을 사실상 0에 가깝게 줄임
- route와 focus behavior는 동일하게 유지

## 12. Navigation·history 계약

### Landing -> login

- `/`에서 `/app` push navigation
- 로그인 화면에서 browser back은 `/`로 복귀
- Hypofit wordmark도 `/`로 이동

### Direct protected URL

예: `/chat?room=...`

- auth check 중 query 포함 URL 보존
- 미로그인 시 login render
- 로그인 성공 후 원래 URL로 복귀
- 실패 시 URL을 `/app`으로 덮어쓰지 않는다.

### Authenticated `/app`

- 기본 customer route를 하나만 canonical로 정의
- redirect loop 금지
- landing history를 불필요하게 여러 번 쌓지 않는다.

### Public route

- legal/support/delete route는 auth gate와 독립
- public route lazy-loading fallback은 해당 document geometry를 사용
- 앱형 splash 금지

## 13. 컴포넌트 구조

권장 구조:

```text
apps/web/src/features/auth/
  AuthEntry.tsx
  AuthLayout.tsx
  AuthProductContext.tsx
  AuthBootstrapGate.tsx
  SignInForm.tsx
  SignUpFlow.tsx
  PasswordField.tsx
  authEntryState.ts
  authEntryTelemetry.ts
```

현재 `AuthScreen.tsx`를 한 번에 거대하게 유지하지 않는다.

책임:

- `AuthEntry`: auth state에 따른 orchestration
- `AuthLayout`: narrow/compact/desktop geometry
- `AuthProductContext`: desktop-only real product context
- `AuthBootstrapGate`: delayed/recovery UI
- `SignInForm`: login fields and action hierarchy
- `SignUpFlow`: account/role/verification steps
- `PasswordField`: shared semantics and visibility toggle
- `authEntryState`: pure state transition helpers
- `authEntryTelemetry`: PII-free timing/error breadcrumbs

`App.tsx` 책임은 route 분류와 high-level composition으로 제한한다.

## 14. Design token 계약

새 one-off color를 다량 추가하지 않는다.

재사용:

- `--hypo-bg`
- `--hypo-surface`
- `--hypo-text`
- `--hypo-text-muted`
- `--hypo-brand`
- `--hypo-brand-soft`
- `--hypo-border`
- existing radius/focus/shadow tokens

추가가 필요한 경우 semantic token만 허용한다.

- `--auth-context-bg`
- `--auth-form-max-width`
- `--auth-layout-max-width`

금지:

- auth page 전용 임의 hex 반복
- 지나친 green monochrome
- purple/blue gradient
- oversized radius
- floating card shadow 중첩

## 15. 상태 matrix

### Entry

- session check < 300ms
- session check 1-3s
- session check > 8s
- offline before entry
- network disconnect during check
- invalid/expired refresh token
- authenticated user
- unauthenticated user
- deleted/deactivated account response
- direct protected deep link
- browser back to landing

### Login

- empty default
- browser autofill
- password manager fill
- password show/hide
- invalid credential
- unverified email
- rate limit
- network error
- request timeout
- double submit prevention
- login success

### Signup

- account default
- password mismatch
- role selection
- back to account step
- existing email response
- verification required
- success
- retry/resend if current contract supports it

### Responsive/accessibility

- 320px minimum support check
- 360x740
- 390x844
- 768x1024
- 1024x768
- 1280x800
- 1440x900
- 1920x1080
- short-height desktop
- 200% zoom
- long Korean text
- keyboard-only
- VoiceOver/screen reader status
- reduced motion
- high contrast/forced colors smoke

## 16. Observability

추가 event 후보:

- `web_auth_entry_started`
- `web_auth_gate_visible`
- `web_auth_session_resolved`
- `web_auth_entry_recovery_shown`
- `web_auth_entry_retry`
- `web_auth_form_submitted`
- `web_auth_form_failed`
- `web_auth_form_succeeded`

필드:

- route family
- authenticated outcome boolean
- elapsed bucket
- normalized error code
- online state
- retry count
- app version

금지 필드:

- email
- name
- password
- OTP
- token
- raw Supabase response containing identity data

기존 `docs/reference/error-observability-contract.md`와
`docs/completed/mobile-auth-failure-observability-hardening-plan.md`의 error
normalization을 재사용한다. web-only error taxonomy를 따로 만들지 않는다.

## 17. 구현 단계

### Phase 0. 계약 고정

- [x] public/auth/protected route manifest를 확정한다.
- [x] post-login return path 계약을 테스트로 고정한다.
- [ ] 현재 splash/auth canonical viewport를 캡처한다.
- [x] landing -> `/app` link behavior를 테스트로 고정한다.
- [x] auth error normalization 재사용 범위를 확인한다.

### Phase 1. App route gate 분리

- [x] `isSplashVisible` global boolean을 제거한다.
- [x] route visibility와 auth requirement를 분리한다.
- [x] public routes가 auth splash 없이 열리게 한다.
- [x] protected deep-link requested path를 보존한다.
- [x] `/app` authenticated/unauthenticated 결과를 명시한다.
- [x] session bootstrap과 profile sync loading 책임을 분리한다.
- [x] 사용되지 않는 legacy `AuthPanel`과 `SplashScreen`을 제거한다.

### Phase 2. WebEntryGate 구현

- [x] fake progress와 minimum duration을 제거한다.
- [x] auth layout geometry 기반 skeleton을 구현한다.
- [x] delayed status threshold를 구현한다.
- [x] 8초 recovery state와 retry를 구현한다.
- [x] offline state를 구현한다.
- [x] `aria-busy`, status/alert semantics를 구현한다.
- [ ] PII-free timing/error telemetry를 구현한다.

### Phase 3. Responsive AuthLayout

- [x] narrow single-column layout을 구현한다.
- [x] compact centered layout을 구현한다.
- [x] desktop product-context split을 구현한다.
- [x] wide/short-height constraints를 구현한다.
- [x] card-internal scrolling을 제거하고 page scroll ownership을 확정한다.
- [x] landing과 동일한 wordmark/header continuity를 적용한다.

### Phase 4. 로그인 form 고도화

- [x] primary/secondary action hierarchy를 재구성한다.
- [x] password reset을 quiet link로 이동한다.
- [x] 회원가입을 inline link로 이동한다.
- [x] autocomplete/password manager semantics를 유지한다.
- [x] error/status live region을 구현한다.
- [x] form submit과 loading 중 중복 제출 방지를 구현한다.

### Phase 5. 회원가입 flow 고도화

- [x] account/OTP/role step indicator를 구현한다.
- [x] internal back과 browser back 책임을 분리한다.
- [x] 입력 보존/reset 규칙을 확정한다.
- [x] 만 19세 확인과 legal links를 가입 흐름에 배치한다.
- [x] current email OTP verification contract와 UI를 정렬한다.
- [x] role radio accessibility를 구현한다.

### Phase 6. Transition과 responsive QA

- [x] optional View Transition progressive enhancement를 구현한다.
- [x] bootstrap motion에 reduced motion fallback을 구현한다.
- [ ] canonical viewport screenshots를 비교한다.
- [ ] 200% zoom과 text spacing을 확인한다.
- [ ] mobile keyboard와 short-height desktop을 확인한다.
- [ ] Chrome, Safari, Edge smoke를 진행한다.
- [ ] browser back/swipe animation 중복이 없는지 확인한다.

### Phase 7. 승인·Figma·배포

- [ ] 로컬 웹에서 사용자 시각 승인을 받는다.
- [ ] 승인된 auth/entry frames만 Figma에 동기화한다.
- [x] web typecheck, targeted tests, full test, production build를 실행한다.
- [x] manual Vercel preview 또는 production deploy를 수행한다.
- [ ] production landing -> login -> app 흐름을 smoke한다.
- [ ] 완료 후 `docs/completed/`로 이동한다.

## 18. 자동화 테스트 계획

### Pure state tests

- public route classification
- protected route classification
- requested path preservation
- elapsed threshold calculation
- retry state transitions
- normalized error -> user copy mapping

### Component tests

- fast auth resolution does not show progress UI
- delayed auth shows status without fake percentage
- timeout exposes retry and landing actions
- login action hierarchy
- password show/hide accessibility label
- signup internal back
- legal links
- role radiogroup semantics

### Integration tests

- `/` -> `/app` unauthenticated
- `/` -> `/app` authenticated
- direct `/chat?room=id` unauthenticated -> login -> original route
- public legal route without splash
- expired session -> login
- auth unavailable -> recovery -> retry success

## 19. 완료 기준

다음을 모두 만족해야 완료다.

- landing `로그인`에서 green app splash가 나타나지 않는다.
- 빠른 session check는 의도적 지연 없이 완료된다.
- fake percentage progress가 없다.
- 공개 legal/support/delete routes는 auth splash와 독립적이다.
- unauthenticated user는 responsive login form으로 이동한다.
- authenticated user는 requested/default customer route로 이동한다.
- desktop login은 실제 product context를 사용하고 generic signal cards를 쓰지
  않는다.
- compact/mobile login은 single-column이며 phone app card를 억지로 확대한
  인상이 없다.
- login, signup, password reset, legal links가 keyboard로 접근 가능하다.
- browser/password manager autocomplete가 유지된다.
- reduced motion과 status announcements가 적용된다.
- timeout/offline에서 복구 action을 제공한다.
- canonical viewport와 200% zoom QA가 완료된다.
- 테스트·typecheck·production build가 통과한다.
- 사용자 승인 전 Figma와 production 배포를 진행하지 않는다.

## 20. 비범위

이번 계획에서 하지 않는다.

- OAuth/social login 신규 도입
- passkey 도입
- Supabase Auth provider 교체
- mobile Expo splash/auth redesign
- desktop customer app shell 재설계
- landing 전체 재설계
- 결제/구독 auth gate
- dark mode 전체 구현
- Figma 선반영

## 21. 문서 연계

구현 시 함께 확인한다.

- `docs/service/09-design-and-copy-principles.md`
- `docs/service/14-design-system-and-screen-patterns.md`
- `docs/service/15-ai-assisted-design-workflow.md`
- `docs/active/desktop-web-service-ui-advancement-plan.md`
- `docs/reference/error-observability-contract.md`
- `docs/completed/mobile-auth-failure-observability-hardening-plan.md`
- `docs/completed/email-otp-verification-transition-plan.md`
- `docs/reference/mobile-safe-area-viewport-hardening-plan.md`

Figma는 코드 구현과 로컬 시각 승인 이후 동기화한다.

## 22. 2026-07-13 구현 결과

완료한 코드 범위:

- public/auth-entry/protected route manifest와 `/app` product root
- 전역 앱형 splash와 가짜 진행률 제거
- 1초 지연 안내, 8초 복구, offline/retry를 제공하는 auth bootstrap gate
- query/hash를 보존하는 protected deep-link 로그인 복귀
- narrow/compact/desktop으로 분리된 responsive auth layout
- 실제 Hypofit 모집·신청·채팅 흐름을 사용하는 desktop product context
- 로그인, 비밀번호 찾기, 새 비밀번호 저장 흐름
- `계정 정보 -> 이메일 OTP -> 역할` 회원가입 흐름
- OTP 6자리 제한, 90초 재전송 cooldown, 다른 이메일 사용 시 입력 보존
- 역할 완료 전 product route 진입과 자동 profile sync 차단
- 만 19세 및 약관·개인정보처리방침 동의
- 미사용 `AuthPanel.tsx`, `SplashScreen.tsx` 제거

검증 결과:

- web TypeScript lint/typecheck 통과
- web 전체 테스트 `75 passed`
- Vite production build 통과
- `git diff --check` 통과
- 로컬 `http://127.0.0.1:5175/app` HTTP 200 확인

재점검에서 보완한 항목:

- 늦게 끝난 초기 `getSession()`이 최신 로그인·OTP 세션을 덮지 않도록 세션 최신성 가드 추가
- 역할 메타데이터가 없는 기존 사용자의 API 프로필을 먼저 읽어 이름·소개·전화번호 보존
- 회원가입 역할 완료와 비밀번호 재설정 뒤 protected query/hash 딥링크 복귀
- offline에서 online으로 돌아왔을 때 bootstrap timeout 상태와 타이머 초기화
- 일시적 bootstrap 실패 후 랜딩을 거쳐 로그인 화면에 다시 진입 가능하도록 오류 latch 해제
- 약관 동의 checkbox와 법률 문서 링크의 interactive semantics 분리
- 역할 선택을 native radio group으로 전환하고 OTP·역할 단계 focus 이동과 단계 announcement 보강
- 짧은 desktop viewport에서 상단 정렬과 context 간격 축소
- Supabase `PASSWORD_RECOVERY` 이벤트를 별도 상태로 추적해 일반 로그인 세션의
  reset-password 직접 접근과 비밀번호 변경 차단
- 복구 링크 진입 시 초기 session hydration이 끝날 때까지 reset form 노출 차단
- 만료·재사용·직접 접근한 복구 링크에는 안전한 오류 상태와 로그인 복귀 action 제공

아직 남은 실행 항목:

- canonical viewport screenshot 비교와 200% zoom QA
- Chrome/Safari/Edge 및 keyboard/short-height 수동 smoke
- PII-free auth entry telemetry
- 사용자 시각 승인
- 승인 후 Figma 동기화
- 명시적 요청 후 Vercel 배포와 production smoke

## 23. 2026-07-14 비밀번호 정책 강화

신규 비밀번호는 웹과 Expo 모바일에서 동일한 공용 계약을 사용한다.

- 최소 8자
- 영문 대문자 또는 소문자 1자 이상
- Supabase Auth가 허용하는 특수문자 1자 이상
- 숫자는 선택 사항
- 로그인은 기존 비밀번호 입력을 임의로 차단하지 않고, 회원가입·재설정·변경 시점에 정책을 강제한다.
- 화면 검증과 Auth provider 호출 직전 검증을 함께 적용한다.
- Supabase Auth의 Password Security 설정은 최소 길이 8을 서버 측에서 강제한다.
- Supabase Management API의 required-character 설정은 정해진 프리셋만 허용하며,
  `영문 1자 + 특수문자 1자, 숫자 선택` 조합은 지원하지 않는다. 따라서 현재
  문자 조합은 웹·모바일 공용 계약에서 강제한다. Supabase 직접 호출까지 같은
  규칙으로 막으려면 더 강한 Supabase 프리셋을 채택하거나 가입·재설정·변경을
  FastAPI 검증 경계로 이동한다. Password Verification Hook은 비밀번호 원문을
  받지 않는 로그인 시도용 기능이므로 이 요구사항의 대안으로 사용하지 않는다.

운영 설정 상태:

- [x] `packages/contracts` 공용 검증 계약
- [x] 웹 회원가입·재설정·비밀번호 변경 검증
- [x] Expo 모바일 회원가입·비밀번호 변경 검증
- [x] 데모·심사 계정 시드와 스모크 스크립트의 약한 기본 비밀번호 제거
- [x] Supabase Auth `password_min_length=8` 적용 및 7자 가입 요청의
  `weak_password(length)` 거절 확인
- [ ] 문자 조합의 서버 측 완전 강제 방식 결정: FastAPI 인증 변경 경계 또는
  `소문자+대문자+숫자+특수문자` Supabase 프리셋 중 선택
