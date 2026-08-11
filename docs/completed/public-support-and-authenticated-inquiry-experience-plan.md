# Public Support and Authenticated Inquiry Experience Plan

Status: completed - implementation and production route release complete

Last updated: 2026-08-08

## 2026-07-19 문서·배포 상태 대조

- Vercel production deployment `dpl_H74MQy4BQ9XXH2aSRbLaSZVueUxm`이 `Ready`인
  것을 확인했다.
- 로그아웃 상태에서 공개 `/support` route가 인증 redirect 없이 HTTP 200을
  반환함을 확인했다.
- review account 문의함, 운영자 답변 알림 deep link, store metadata 대조,
  keyboard/zoom/reduced-motion 수동 QA는 아직 남아 있다.

Owner surfaces: `apps/web`, shared support API contracts

Related routes:

```text
/support
/support/inquiries
/support/inquiries/new
/support/inquiries/:ticketId
/report
/account-deletion
```

Related documents:

- `docs/active/desktop-web-service-ui-advancement-plan.md`
- `docs/completed/responsive-web-auth-entry-experience-plan.md`
- `docs/completed/web-navigation-motion-system-plan.md`
- `docs/service/09-design-and-copy-principles.md`
- `docs/service/14-design-system-and-screen-patterns.md`
- `docs/reference/operator-support-moderation-runbook.md`
- `docs/reference/error-observability-contract.md`
- `docs/reference/app-store-play-store-review-readiness.md`

## 1. 목적

현재 웹의 `/support`는 로그인 전 공개 지원 URL, 로그인 후 문의 접수 폼,
신고와 계정 삭제 요청 form responsibility를 하나의 `SupportPage`에 함께
두고 있다. 이 구조를 다음 두 경험으로 분리한다.

```text
로그인 전 또는 계정 접근 불가
  -> public support hub
  -> 운영 이메일을 통한 계정 접근 지원, 계정 삭제 경로, 로그인 진입

로그인 후 서비스 이용 중 문제 발생
  -> authenticated inquiry inbox
  -> 내 문의 목록, 상세, 운영자 답변, 새 문의, 수정·삭제
```

완료 결과는 다음 조건을 만족해야 한다.

- `/support`는 인증 상태와 무관하게 즉시 열리는 실제 공개 지원 URL이다.
- 공개 지원 화면은 App Store와 Google Play에서 연결해도 의미가 완결된다.
- 로그인할 수 없는 사용자가 로그인 뒤에 갇히지 않고 운영팀에 연락할 수 있다.
- 로그인 사용자는 문의를 새로 남기는 것뿐 아니라 처리 상태와 답변을 추적한다.
- 신고, 피드백, 계정 삭제는 일반 문의와 의미와 운영 규칙이 섞이지 않는다.
- desktop web은 mobile form 확대판이 아니라 목록·상세 workspace를 사용한다.
- compact/mobile web은 목록, 상세, 작성을 각각 집중 가능한 route로 보여준다.
- Expo React Native의 현재 `/support` 화면은 이 웹 재설계의 직접 변경 대상이
  아니며, 기능·상태 언어만 일관되게 유지한다.

## 2. 고정 결정

### 2.1 공개 지원과 인증 문의를 분리한다

- 공개 지원 URL: `/support`
- 인증 문의함: `/support/inquiries`
- 새 문의: `/support/inquiries/new`
- 문의 상세: `/support/inquiries/:ticketId`
- 신고: 기존 보호 route `/report` 유지
- 공개 계정 삭제: 기존 `/account-deletion` 유지

`/support`를 인증 여부에 따라 완전히 다른 화면으로 바꾸지 않는다. 같은 URL이
상태에 따라 다른 제품으로 보이면 스토어 심사, 공유 링크, QA, 브라우저 뒤로가기
계약이 불안정해진다. 로그인 상태여도 `/support`는 공개 지원 허브로 유지한다.
인증 문의함은 프로필, 알림, 앱 내부 문의 흐름에서만 진입하며 공개 지원 화면에서
`내 문의 보기`를 중복 노출하지 않는다.

### 2.2 공개 지원은 MVP에서 인증 없는 API 문의 폼을 만들지 않는다

공개 사용자는 다음 경로를 사용한다.

- 운영 이메일: `ssamso8282@gmail.com`
- 로그인하기
- 로그인 없이 사용할 수 있는 신고·안전 이메일 경로
- 공개 계정 삭제

비밀번호 재설정은 로그인 화면의 `비밀번호 찾기`가 담당한다. 공개 지원은 가입
이메일을 기억하지 못하거나 인증·계정 접근 문제로 해당 흐름을 사용할 수 없는
사용자를 운영 이메일로 안내한다.

인증 없는 support ticket 생성 API는 이번 계획에서 추가하지 않는다. 공개 폼은
스팸, 계정 사칭, 타인 이메일 입력, account-existence leakage, 운영량 급증을
동반한다. 공개 API 접수가 실제로 필요해지면 다음을 별도 scope로 설계한다.

- Cloudflare Turnstile client widget
- FastAPI server-side Siteverify validation
- IP·email·device-independent rate limit
- honeypot와 minimum completion time
- abuse logging과 운영 차단
- account existence를 노출하지 않는 동일 응답
- 개인정보 수집 고지와 보유 기간 갱신

Turnstile을 도입할 경우 client token 존재만 확인해서는 안 되며 FastAPI가
Siteverify를 호출해야 한다. secret key는 web bundle에 포함하지 않는다.

### 2.3 로그인 후 일반 문의에는 이메일을 다시 입력시키지 않는다

인증 문의는 현재 사용자의 verified account email을 사용한다. UI에는 답변 경로를
짧게 안내할 수 있지만 같은 이메일을 form field로 반복 입력시키지 않는다.

신고나 계정 접근 불가처럼 별도 연락처가 필요한 흐름은 각 전용 정책에 따라
contact email을 받을 수 있다. 일반 문의와 동일한 form contract로 강제하지 않는다.

### 2.4 운영 응답 시간을 근거 없이 약속하지 않는다

공개 화면에는 실제 운영 체계로 지킬 수 없는 `24시간 내`, `영업일 2일 내` 등의
SLA를 표시하지 않는다. MVP copy는 다음 수준으로 제한한다.

```text
남겨주신 내용은 운영팀이 순서대로 확인해요.
답변은 문의에 사용한 이메일 또는 앱 알림에서 확인할 수 있어요.
```

운영 시간이 확정되면 `docs/reference/operator-support-moderation-runbook.md`와
공개 copy를 함께 갱신한다.

## 3. 현재 구현 감사

### 3.1 route와 auth gate

현재 `apps/web/src/app/App.tsx`는 `/support`를 auth gate보다 먼저 렌더링한다.
`apps/web/src/shared/navigation/appRoutes.ts`도 `/support`를 public immediate
path로 분류한다. 공개 접근 자체는 올바르지만 페이지가 인증 기능까지 동시에
책임지는 문제가 있다.

현재 링크 상태:

| 진입점 | 현재 목적지 | 필요한 목적지 |
| --- | --- | --- |
| 랜딩 footer 문의하기 | `/support` | `/support` 유지 |
| 로그인 화면 문의하기 | `/support` | `/support` 유지 |
| 프로필 문의하기 | `/support` | `/support/inquiries` |
| 프로필 도움말 action | `/support` | `/support/inquiries` |
| 문의 답변 알림 | `/support` | `/support/inquiries/:ticketId` |
| 공개 지원의 로그인 CTA | 없음 | `/app` 또는 requested path가 보존된 auth entry |

### 3.2 UI 책임 혼합

현재 `SupportPage`는 다음 세 mode를 함께 처리한다.

- inquiry
- report
- account deletion

동일 컴포넌트가 공개 페이지, 인증 form, 신고 안내, 삭제 안내, right context panel,
email fallback을 모두 가지면서 화면 hierarchy가 mode condition에 의존한다.

문제:

- 로그인 전 사용자는 먼저 큰 접수 form을 보고 제출 시점에야 로그인이 필요함을 안다.
- 로그인 후 사용자도 기존 문의와 운영자 답변을 볼 수 없다.
- desktop 2열이지만 왼쪽은 단일 mobile-style form, 오른쪽은 긴 안내 card다.
- 제목, 유형, 본문, 이메일, 안내가 반복되어 form dump처럼 보인다.
- 일반 문의와 신고의 privacy·운영 의미가 UI상 충분히 분리되지 않는다.
- 계정 삭제 전용 페이지가 있는데 support query mode도 삭제 요청을 중복 담당한다.

### 3.3 API와 contract

FastAPI는 이미 다음 user support API를 제공한다.

```text
GET    /api/v1/support/tickets
POST   /api/v1/support/tickets
PATCH  /api/v1/support/tickets/{ticket_id}
DELETE /api/v1/support/tickets/{ticket_id}
```

응답에는 다음 데이터가 포함된다.

- kind
- category
- subject
- body
- contact email
- target type/id
- status
- created/updated time
- visible operator replies

`packages/contracts`에도 create, update, ticket, reply contract가 존재한다.
그러나 `apps/web/src/shared/api/support.ts`는 create만 연결한다. 이번 구현은
새로운 backend schema보다 web API client와 query UI 연결이 중심이다.

### 3.4 operator flow

운영자 `/admin`에는 문의 목록, 상세, 상태 변경, user-visible reply 기능이 있다.
따라서 customer web inbox는 새로운 채팅 시스템을 만들지 않고 기존
`support_tickets`와 visible replies를 읽는 read model을 사용한다.

## 4. 공식 요구사항과 리서치

### 4.1 Apple Support URL

Apple App Store Connect의 platform version information은 Support URL을
필수 항목으로 정의한다. URL은 앱 문제, 일반 피드백, 기능 개선 요청을 위해
사용자가 개발자에게 도달할 수 있는 실제 연락처로 연결되어야 한다.

Hypofit 적용:

- `https://hypofit.bukae.co.kr/support`는 로그인 없이 열려야 한다.
- JavaScript auth bootstrap 실패가 공개 support rendering을 막으면 안 된다.
- 이메일은 실제 `mailto:` 링크로 제공한다.
- 운영 주체나 연락처를 임의 값으로 채우지 않는다.
- 현지 법령상 주소·전화번호 공개가 필요해지는 경우 출시 metadata와 페이지를
  함께 갱신한다.

### 4.2 Google Play support

Google Play는 각 앱에 유효한 support email을 요구하고, website·phone을 추가
지원 채널로 권장한다. FAQ, 기본 사용 안내, 문의 수신 확인, 기대 가능한 응답
방식을 공개 지원 자원으로 제공할 것을 권장한다.

Hypofit 적용:

- Play Console support email과 웹 페이지 이메일을 일치시킨다.
- `/support`를 store listing website/support URL로 사용할 수 있게 유지한다.
- 공개 페이지의 FAQ는 실제 구현된 기능만 설명한다.
- 결제나 사례비 보장을 구현하지 않은 상태에서 환불·지급 보장을 약속하지 않는다.

### 4.3 customer portal

Jira Service Management와 Zendesk customer portal은 사용자가 생성한 request를
목록으로 보고 status와 update를 추적하는 구조를 사용한다. 문의가 account와
연결된 뒤에는 새 form보다 `내 요청`의 지속성이 핵심이다.

Hypofit 적용:

- 인증 문의함의 기본 화면은 form이 아니라 문의 목록이다.
- 상태, 최근 업데이트, 답변 여부가 row에서 스캔 가능해야 한다.
- 상세에서는 원문과 운영팀 답변을 시간 순서로 분리한다.
- 문의 작성은 명확한 primary action이지만 항상 열려 있지 않는다.

### 4.4 contact information pattern

GOV.UK contact pattern은 사용 가능한 contact channel, 대응 방식, 운영 시간을
명확하게 표시하고, 사용자가 가장 필요로 하는 순서로 채널을 배치할 것을 권장한다.

Hypofit 적용 순서:

1. 신고·안전 문제 전달
2. 공개 계정 삭제
3. 이메일을 통한 계정 접근 지원
4. 로그인 진입
5. 자주 찾는 도움말

전화와 실시간 채팅은 실제 운영 채널이 아니므로 UI에 노출하지 않는다.

### 4.5 accessible forms

W3C WAI는 form에 필요한 정보만 요청하고, visible label, field-specific error,
submission success/failure notification을 제공하도록 안내한다.

Hypofit 적용:

- placeholder를 label 대신 사용하지 않는다.
- 오류는 상단 summary와 field 인접 메시지에 동일 문구로 제공한다.
- 오류 summary는 `role=alert`를 사용하고 첫 오류 field로 이동할 수 있다.
- 성공 후 form을 그대로 비우는 대신 생성된 문의 상세로 이동한다.
- 작성 중 API 오류가 나도 입력값을 유지한다.

## 5. 정보 구조

### 5.1 공개 지원 `/support`

공개 페이지는 마케팅 landing의 hero를 반복하지 않는다. 사용자가 빠르게 도움을
찾는 support utility page로 구성한다.

```text
sticky public header
  Hypofit brand -> landing
  로그인

support intro
  무엇을 도와드릴까요?
  로그인하지 못하는 상황에서도 도움을 받을 수 있어요.

desktop two-column support area
  left
    support intro
    신고 및 안전 -> 제목과 작성 항목이 채워진 운영 이메일
    계정 삭제 방법과 삭제 후 보관 정보 확인
  right
    로그인이 어려우신가요?
    가입 이메일 또는 인증 문제를 운영 이메일로 문의
    이메일로 도움받기
    비밀번호·인증번호·토큰 전송 금지

compact/mobile
  intro -> 계정 삭제 -> 이메일 지원 순서로 세로 배치

frequently needed help
  이메일 인증
  로그인과 비밀번호 재설정
  역할 설정
  인터뷰 신청·모집 문의 경로
  계정 삭제

```

### 5.2 인증 문의함 `/support/inquiries`

desktop:

```text
page header
  뒤로가기 / 문의하기 / 새 문의

list pane 360px
  문의 row
  상태, 제목, 유형, 최근 업데이트

detail pane minmax(0, 1fr)
  문의 metadata
  내가 남긴 내용
  운영팀 답변 timeline
  open 상태 overflow actions
```

compact/mobile web:

```text
문의 목록
  -> 문의 상세 full route
  -> browser back returns to the same list position/filter

+ 새 문의
  -> 작성 full route
  -> success replaces route with created detail
```

### 5.3 신고 `/report`

신고는 일반 문의 inbox에 섞지 않는다.

- profile의 신고하기 row는 별도 선택 화면을 거치지 않고 `/report` 입력 폼을
  바로 연다. 개인정보 관련 일반 문의는 문의하기 경로에서 접수한다.
- 신고 대상 context를 유지한다.
- target type/id가 있으면 대상 이름과 모집글 context를 보여준다.
- 신고 사유와 상세 내용을 받는다.
- 신고 처리의 민감한 moderation detail은 user inquiry timeline에 노출하지 않는다.
- 제출 성공 후 원래 route로 돌아가거나 명확한 완료 화면을 보여준다.

### 5.4 계정 삭제 `/account-deletion`

계정 삭제는 support ticket composer의 category가 아니다. 공개 account deletion
workflow와 in-app authenticated deletion workflow를 유지한다. `/support`에서는
해당 페이지로 이동하는 링크만 제공한다.

공개 웹 화면은 모바일 설정 화면을 확대하지 않고 다음 구조를 사용한다.

```text
sticky public header
  Hypofit brand
  고객지원

unframed intro
  계정 관리
  Hypofit 계정 삭제
  로그인할 수 없어도 가입 이메일로 요청 가능

deletion process
  가입 이메일 입력 -> 6자리 인증번호 확인 -> 삭제 최종 확인 -> 계정 삭제 처리

desktop two-column workspace
  left
    가입 이메일만 받는 삭제 인증번호 form
    제출 오류와 고객지원 fallback
  right
    삭제되는 정보
    복구되지 않는 기록
    분리 보관 또는 익명화될 수 있는 최소 기록

request and verification states
  인증번호 발송 완료
  인증번호 입력 및 90초 재전송 대기
  이메일 인증 완료와 삭제 최종 확인
  계정 삭제 완료
  만료, 입력 횟수 초과, 이미 처리된 요청
```

- 공개 요청은 이메일 소유 확인이 본인 확인 수단이므로 이름과 삭제 사유를 추가로
  수집하지 않는다.
- API에는 기존 호환성을 위해 `requester_name: null`, `reason: null`을 전달한다.
- 최초 제출 CTA는 `인증번호 받기`를 사용하고, 이메일 인증만으로 계정을 삭제하지
  않는다.
- 숫자 6자리 인증번호는 10분 동안 유효하고, 재전송은 90초 뒤 허용하며, 연속 실패
  5회 이후에는 새 인증번호를 받아야 한다.
- 같은 삭제 요청의 인증번호 발송은 1시간에 최대 5회로 제한하고, 초과 응답에는
  클라이언트가 재시도 시점을 계산할 수 있도록 `Retry-After`를 포함한다.
- 인증 성공 시 5분짜리 일회용 삭제 승인 토큰을 발급하고, 별도의
  `계정 삭제하기` 최종 동작에서만 실제 삭제를 수행한다.
- 로컬 환경은 Resend 없이도 `debug_verification_code`로 수동 테스트할 수 있지만,
  production과 preview 응답에는 인증번호를 포함하지 않는다.
- 기존에 발송된 링크 토큰은 전환 기간 동안 이메일 인증 수단으로만 허용하며,
  링크를 여는 것만으로 삭제하지 않고 최종 확인 화면으로 이동시킨다.
- 완료·오류는 form 위에 작은 banner를 추가하는 대신 독립된 상태 surface로
  전환한다.
- 개인정보처리방침은 `여기` 같은 모호한 label 대신 목적이 드러나는 링크 문구를
  사용한다.
- compact/mobile에서는 동일한 내용을 한 열로 배치하되 모바일 앱 설정 화면의
  카드 스택을 복제하지 않는다.

### 5.5 로컬 계정 삭제 플로우 검증

로컬 테스트는 운영 Supabase 사용자나 실제 메일 발송을 건드리지 않는 별도 Postgres와
`ENV=local` FastAPI를 기준으로 한다.

```bash
docker compose -f infra/docker-compose.yml up -d postgres

cd apps/api
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

웹은 `apps/web/.env.development.local`에서 아래 값을 사용한 뒤 개발 서버를 다시
시작한다. 이 파일은 로컬 전용이며 git에 올리지 않는다.

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

검증 순서는 다음과 같다.

1. `/account-deletion`에서 이메일을 입력하고 `인증번호 받기`를 누른다.
2. 로컬 API 응답에만 포함되는 `debug_verification_code` 6자리를 입력한다.
3. 인증만으로 계정이 삭제되지 않고 최종 확인 단계가 나타나는지 확인한다.
4. `계정 삭제하기`와 브라우저 확인 대화상자를 거친 뒤 완료 상태를 확인한다.
5. 같은 삭제 승인 토큰을 다시 보내면 거절되는지 확인한다.
6. 90초 전 재전송, 10분 지난 코드, 5회 오입력, 시간당 5회 초과가 각각
   `429`, `410`, 잠금, `429`로 처리되는지 확인한다.

로컬 Postgres에 일치하는 앱 사용자가 없더라도 공개 플로우 전체를 검증할 수 있다.
이 경우 최종 결과는 `no_matching_active_account`이며, 이메일 소유 확인 전에는
계정 존재 여부를 응답이나 화면 문구로 노출하지 않는다.

## 6. 공개 지원 시각 설계

### 6.1 전체 톤

- 마케팅 hero보다 작은 typography를 사용한다.
- SaaS dashboard metric card를 사용하지 않는다.
- page background는 white 또는 current neutral background를 사용한다.
- Hypofit green은 로그인, 이메일 문의 등 실제 action에 제한한다.
- 빠른 도움 항목은 독립적인 큰 카드보다 divider 기반 row 또는 낮은 surface를
  사용한다.
- 아이콘은 의미 보조이며 icon만으로 항목을 설명하지 않는다.
- 장식용 gradient, orb, illustration은 사용하지 않는다.

### 6.2 desktop geometry

기준 viewport: `1200px` 이상

- global content max width: `1120px`
- outer gutter: 32px 이상
- header height: 64px
- intro max width: 640px
- top support grid: `minmax(0, 1fr) 340px`
- contact panel은 viewport에 고정하지 않는다. FAQ와 footer를 가리지 않는다.
- section vertical gap: 56–72px
- row min height: 56px
- readable body line length: 약 60–75 characters

desktop top composition:

```text
left  : title, concise explanation, three priority rows
right : email contact and authenticated inquiry CTA
```

right contact surface는 genuinely framed tool이므로 하나의 card를 허용한다. 그
안에 다시 card를 중첩하지 않는다.

### 6.3 compact web

기준 viewport: `768–1199px`

- max width 760px 단일 열
- priority actions는 2열 또는 content width에 따라 1열
- contact surface는 intro 바로 뒤에 배치
- desktop side composition을 억지로 유지하지 않는다.

### 6.4 mobile web

기준 viewport: `320–767px`

- 16–20px horizontal gutter
- sticky header는 brand와 `로그인`만 유지
- title은 28–32px 범위에서 고정하고 viewport width로 font를 scale하지 않는다.
- priority action은 full-width row
- email address가 줄바꿈되거나 overflow하지 않게 한다.
- legal links는 44px touch target을 확보한다.
- page scroll 하나만 사용하며 내부 panel scroll을 만들지 않는다.
- `100vh` 대신 shared `dvh`/safe-area token을 사용한다.

### 6.5 typography

- page title: 32–40px desktop, 28–32px compact/mobile
- section title: 20–24px
- action row title: 15–16px, strong
- body: 14–16px, 1.6–1.75 line height
- metadata: 12–13px
- Spoqa Han Sans Neo를 유지한다.
- brand font와 body font가 섞여 위계가 불안정해지지 않게 한다.

### 6.6 motion

- action row hover는 background/color 120–180ms 정도의 짧은 feedback만 사용한다.
- FAQ는 native `details/summary` 또는 accessible disclosure를 사용한다.
- disclosure content는 opacity-only reveal보다 height/layout과 focus가 일치해야 한다.
- `prefers-reduced-motion: reduce`에서는 smooth scroll과 transition을 제거한다.
- route motion은 `web-navigation-motion-system-plan.md`의 back/forward 방향을 따른다.

## 7. 공개 지원 copy contract

### 7.1 headline

권장:

```text
무엇을 도와드릴까요?
로그인하지 못하는 상황에서도 필요한 도움을 받을 수 있어요.
```

피해야 할 표현:

- `고객 지원 센터에 오신 것을 환영합니다`
- `최고의 고객 경험을 제공합니다`
- `문의 유형을 선택하여 접수 바랍니다`
- `24시간 안에 무조건 답변합니다`

### 7.2 action labels

```text
신고 및 안전
이메일로 도움받기
계정 삭제
```

`확인`, `바로가기`, `제출`처럼 목적이 불명확한 label은 피한다.

### 7.3 이메일 안내

```text
로그인이 어려우신가요?
가입한 이메일이 기억나지 않거나 인증에 문제가 있다면 이메일로 알려주세요.
계정 정보를 확인한 뒤 가능한 방법을 안내해 드릴게요.
ssamso8282@gmail.com
```

메일 작성 시 기본 subject를 제공할 수 있다.

```text
[Hypofit 계정 도움] 로그인이 어려워요
```

본문에 access token, password, OTP를 보내지 말라는 짧은 보안 안내를 제공한다.

### 7.4 FAQ 범위

FAQ는 실제 self-service 해결 경로가 있는 항목만 둔다.

1. 이메일 인증번호가 오지 않아요.
2. 비밀번호를 잊었어요.
3. 로그인했는데 계정 상태를 확인할 수 없어요.
4. 인터뷰 신청이나 모집글 문제는 어디에서 문의하나요?
5. 계정을 삭제하고 싶어요.

답변은 구현과 일치해야 하며 Supabase, FastAPI, OTP provider 같은 내부 용어를
사용자에게 노출하지 않는다.

## 8. 인증 문의함 시각 설계

### 8.1 desktop list-detail

- workspace width는 authenticated web shell content 영역을 사용한다.
- list pane은 340–380px 범위에서 고정한다.
- detail pane은 최소 520px를 확보한다.
- list와 detail은 card 두 개가 아니라 하나의 workspace surface와 divider로
  구분한다.
- 선택된 row는 background와 left marker 또는 font weight 중 두 가지로 표현한다.
- hover만으로 선택 가능성을 표현하지 않는다.

### 8.2 inquiry row

한 row에 표시할 정보:

- user-facing status
- 제목 또는 category-based fallback title
- category
- 최근 업데이트 시간
- unread reply indicator

row에서 숨길 정보:

- 문의 본문 전체
- contact email
- target UUID
- 운영 내부 event
- 수정·삭제 button 상시 노출

권장 status copy:

| API | 사용자 표시 |
| --- | --- |
| `open` | 접수 |
| `in_review` | 확인 중 |
| `resolved` | 답변 완료 |
| `closed` | 종료 |

색상만으로 status를 구분하지 않고 text label을 항상 표시한다.

### 8.3 inquiry detail

detail order:

1. 제목
2. status, category, submitted/updated time
3. 내가 남긴 문의
4. 운영팀 답변 timeline
5. 관련 서비스 context가 있을 때만 compact reference

운영팀 답변은 message bubble처럼 만들지 않는다. support correspondence임을
명확히 하는 neutral response block과 `Hypofit 운영팀`, 날짜를 사용한다.

### 8.4 open ticket actions

`open` 상태에서만 수정·삭제를 제공한다.

- 수정: overflow menu 또는 detail secondary action
- 삭제: destructive confirm dialog
- `in_review`, `resolved`, `closed`: 수정·삭제 숨김 또는 disabled reason 제공

삭제 성공 후 list로 이동하고 삭제한 row를 cache에서 제거한다. 삭제 실패 시
detail을 유지하고 재시도 가능한 오류를 표시한다.

### 8.5 composer

일반 문의 field:

- 유형
- 제목, 선택 입력
- 문의 내용, 5–2000자

제외:

- 답변 받을 이메일 반복 입력
- 사용자가 알 필요 없는 target ID
- 운영팀 내부 category

제출 성공:

```text
POST success
  -> query cache update/invalidate
  -> replace `/support/inquiries/new`
     with `/support/inquiries/:createdTicketId`
  -> detail에서 `접수` 상태 확인
```

## 9. route와 navigation contract

### 9.1 route access

| Route | Access | Rendering priority |
| --- | --- | --- |
| `/support` | public immediate | auth bootstrap 이전 |
| `/support/inquiries` | protected | auth gate 이후 |
| `/support/inquiries/new` | protected | auth gate 이후 |
| `/support/inquiries/:ticketId` | protected | auth gate 이후 |
| `/report` | protected | auth gate 이후 |
| `/account-deletion` | public immediate | auth bootstrap 이전 |

### 9.2 return path

보호 support route를 비로그인 상태로 직접 열면 generic `/app`이 아니라 원래
support route를 requested path로 보존한다. 로그인 후 해당 문의함/상세로 돌아온다.

### 9.3 browser history

- public support -> login -> back: public support로 돌아간다.
- compact inquiry list -> detail -> back: list의 filter와 scroll을 복원한다.
- desktop list-detail workspace의 row 선택은 현재 history entry를 URL detail
  state로 replace한다. 상단 page back은 중간의 selection-clear 단계를 만들지 않고
  실제 이전 profile route로 돌아간다.
- inquiry list -> new -> cancel/back: list로 돌아간다.
- inquiry new -> success: `replace`로 created detail로 이동하여 back 시 빈 form이
  다시 나타나지 않는다.
- notification -> ticket detail -> back: notification 또는 실제 이전 route로 돌아간다.

### 9.4 deep links

문의 답변 알림은 ticket id가 있을 때 다음 route를 사용한다.

```text
/support/inquiries/{ticketId}
```

ticket이 없거나 권한이 없으면 account existence나 타인 ticket existence를
구분하지 않고 `문의를 찾지 못했어요`와 inquiry list action을 제공한다.

### 9.5 compatibility

- 기존 public `/support` 링크는 깨뜨리지 않는다.
- 프로필·알림의 내부 링크만 protected route로 이동한다.
- 과거 `/support?kind=account_deletion`은 `/account-deletion`으로 명시적으로
  교체한다.
- old support notification target은 ticket id가 없으면 inquiry list로 fallback한다.

## 10. component와 file architecture

목표 구조:

```text
apps/web/src/pages/
  PublicSupportPage.tsx
  SupportInboxPage.tsx
  SupportTicketDetailPage.tsx
  SupportTicketComposerPage.tsx
  ReportPage.tsx

apps/web/src/features/support/
  supportCopy.ts
  supportStatus.ts
  useSupportTickets.ts
  SupportTicketList.tsx
  SupportTicketRow.tsx
  SupportTicketDetail.tsx
  SupportTicketComposer.tsx
  PublicSupportTopics.tsx

apps/web/src/shared/api/
  support.ts
```

원칙:

- 공개 페이지는 `useAuth`와 support ticket query에 의존하지 않는다.
- inbox page는 auth token 없이는 query를 시작하지 않는다.
- `SupportPage`의 mode branching을 계속 확장하지 않는다.
- 신고 form의 공통 field component는 공유할 수 있지만 route와 copy contract는
  분리한다.
- server-state는 TanStack Query로 관리한다.
- selected ticket id는 URL에서 읽고 local state only로 숨기지 않는다.
- API status와 user-facing Korean label mapping은 한 파일에 둔다.
- category label은 web/mobile contract wording과 일치시킨다.

## 11. API client와 query plan

`apps/web/src/shared/api/support.ts`에 추가:

```text
listSupportTickets(kind?)
createSupportTicket(input)
updateSupportTicket(ticketId, input)
deleteSupportTicket(ticketId)
```

query keys:

```text
["support-tickets", userId, "inquiry"]
["support-ticket", userId, ticketId]
```

현재 GET list가 replies를 포함하므로 MVP에서는 list response로 detail을 표시할 수
있다. 데이터량이 커지기 전에는 별도 user ticket GET endpoint를 추가하지 않는다.
문의량이 늘면 list summary/detail endpoint 분리를 별도 최적화로 진행한다.

mutation behavior:

- create: list invalidate 또는 created item prepend
- update: item cache replace + list invalidate
- delete: optimistic removal은 rollback contract가 준비된 뒤 사용
- auth expiry: common API client의 auth error contract 사용
- request id: support error display와 Sentry breadcrumb에 포함 가능

## 12. privacy와 security

### 12.1 공개 페이지

- 계정 존재 여부를 확인하는 UI를 제공하지 않는다.
- 로그인 문제 copy는 특정 email 가입 여부를 노출하지 않는다.
- password, OTP, access token을 이메일로 보내지 말라고 안내한다.
- 운영 email을 실제 text와 `mailto:`로 제공해 browser와 assistive technology가
  인식할 수 있게 한다.
- 이메일 주소를 이미지로 숨기지 않는다.

### 12.2 인증 문의함

- FastAPI bearer token 검증을 유지한다.
- frontend ticket id를 ownership claim으로 신뢰하지 않는다.
- 타인 ticket 접근은 backend authorization으로 차단한다.
- support body와 replies를 error telemetry에 원문으로 기록하지 않는다.
- Sentry에는 ticket id, status, request id 같은 최소 metadata만 기록한다.
- contact email, body, reply message를 analytics event property로 보내지 않는다.

### 12.3 delete behavior

현재 open user ticket 삭제는 backend policy를 따른다. UI에서 삭제 가능 상태를
임의 확장하지 않는다. 운영 처리 중인 문의를 frontend만으로 삭제 가능하게 만들지
않는다.

## 13. accessibility contract

- page마다 하나의 `h1`을 사용한다.
- public support sections는 순서가 있는 `h2` hierarchy를 사용한다.
- icon-only controls에는 Korean accessibility label을 제공한다.
- action row가 navigation이면 실제 link semantics를 사용한다.
- custom clickable `div`를 만들지 않는다.
- selected inquiry row에는 `aria-current` 또는 `aria-selected`를 적용한다.
- desktop list와 detail 간 keyboard focus 이동 규칙을 정의한다.
- detail route 진입 시 `h1` 또는 detail heading으로 focus를 이동한다.
- form error summary는 focusable하고 각 field error로 link한다.
- field에 `aria-invalid`, `aria-describedby`를 연결한다.
- success·error async feedback은 `role=status`와 `role=alert`를 구분한다.
- FAQ disclosure는 keyboard Enter/Space, expanded state, heading structure를
  지원한다.
- status는 색상 외 text를 항상 제공한다.
- 200% zoom에서 horizontal page scroll이 생기지 않게 한다.
- touch target은 mobile web에서 최소 44px를 확보한다.
- reduced-motion에서 route/accordion animation을 제거한다.

## 14. SEO, metadata, store 연결

### 14.1 public support

- title: `고객지원 | Hypofit`
- description: `Hypofit 로그인, 계정, 인터뷰 이용 문제에 대한 도움과 문의 방법을 확인하세요.`
- canonical: `https://hypofit.bukae.co.kr/support`
- index 허용
- open graph는 landing marketing image를 강제하지 않고 brand identity만 유지

### 14.2 authenticated inquiry

- title: `내 문의 | Hypofit`
- `noindex` 적용
- ticket title/body를 social metadata에 포함하지 않는다.

### 14.3 store checklist

- App Store Connect Support URL이 `/support`를 가리키는지 확인
- Google Play store listing support website/email과 페이지 내용 일치 확인
- logout/incognito에서 200 response와 실제 content 확인
- auth/Supabase 장애 상태에서도 public page가 렌더링되는지 확인
- privacy policy, terms, account deletion links production smoke
- public email `mailto:` production smoke

## 15. loading, empty, error states

### 15.1 public support

public content는 local static copy이므로 full-page loading spinner를 사용하지 않는다.
lazy chunk loading fallback은 최종 layout geometry를 유지하는 neutral skeleton 또는
plain background를 사용한다.

### 15.2 inquiry list

- loading: 3–5개 row skeleton
- empty: `아직 문의한 내역이 없어요` + `새 문의` action
- error: 상황 + `다시 불러오기`
- auth expired: login recovery action with requested path
- offline: cached list가 있으면 유지하고 stale state 표시

### 15.3 detail

- no selection desktop: 도움 문구와 새 문의 action
- not found/forbidden: 동일한 user-safe state
- reply empty: `운영팀에서 확인 중이에요` only when status supports that meaning
- resolved: answer block와 completion status

### 15.4 composer

- submit pending: button size를 유지하고 duplicate submit 차단
- validation failure: input state 유지
- network failure: input state 유지 + retry
- success: created detail route로 이동

## 16. responsive QA matrix

필수 viewport:

| Class | Width x Height | 확인 항목 |
| --- | --- | --- |
| small phone | 320 x 568 | 긴 email, FAQ, 44px target, no overflow |
| modern phone | 390 x 844 | header, action order, safe bottom |
| large phone | 430 x 932 | single-column rhythm |
| compact web | 768 x 900 | contact ordering, form width |
| laptop | 1280 x 720 | short-height clipping, split view |
| desktop | 1440 x 900 | 1120 container, list/detail balance |
| wide desktop | 1728 x 1117 | line length, excessive whitespace |

각 viewport에서 확인:

- public header와 login action
- email wrapping/copy
- FAQ disclosure
- legal footer
- inquiry list/detail transition
- composer keyboard and browser zoom
- selected row visibility
- no nested page scrolling
- browser back/forward

## 17. 테스트 계획

### 17.1 unit/component

- public `/support`는 auth provider loading과 무관하게 content 표시
- public support 주요 action href 확인
- mailto address 확인
- FAQ accessible name/expanded state 확인
- route access: `/support` public, `/support/inquiries*` protected
- route title metadata 확인
- profile support links protected inbox로 이동
- landing/auth support links public support로 이동
- notification support target가 ticket detail로 이동
- status/category label mapping
- open ticket만 edit/delete action 표시
- support form validation과 error focus
- create success detail replace navigation
- update/delete cache behavior

### 17.2 web integration

- unauthenticated `/support` direct load
- unauthenticated `/support/inquiries` -> login -> original route return
- authenticated inquiry list load
- ticket detail and visible reply rendering
- open ticket update/delete
- in-review/resolved edit lock
- support reply notification deep link
- logout 후 protected support data가 DOM/cache에 남지 않음

### 17.3 backend regression

새 backend behavior를 추가하지 않더라도 다음 existing tests를 유지한다.

- ownership enforcement
- create/list/update/delete status rules
- admin reply visible event
- support reply notification
- deleted/disabled user policy

### 17.4 accessibility

- keyboard-only public support flow
- keyboard-only inquiry list/detail/composer
- automated axe or equivalent component checks
- VoiceOver/NVDA smoke for heading, disclosure, status, errors
- 200% zoom and text spacing
- reduced-motion

### 17.5 production smoke

```text
GET https://hypofit.bukae.co.kr/support
open in signed-out browser
open mailto action
open login action and return
open privacy/terms/delete links
sign in with review account
create inquiry
operator reply from /admin
receive notification
open exact ticket detail
```

## 18. 구현 단계

### Phase 0. route contract와 copy 확정

- [x] `/support` public, `/support/inquiries*` protected route를 manifest에 반영한다.
- [x] public support와 inquiry inbox page ownership을 분리한다.
- [x] public copy와 FAQ가 실제 기능과 일치하는지 확인한다.
- [x] support email source를 한 곳으로 통일한다.
- [x] 기존 account deletion support query mode 제거 경로를 확정한다.

### Phase 1. public support page

- [x] `PublicSupportPage`를 구현한다.
- [x] public header, intro, 신고·안전 이메일, 계정 접근 이메일 지원, 계정 삭제, FAQ를 구현한다.
- [x] desktop/compact/mobile web layout을 분리한다.
- [x] auth bootstrap에 의존하지 않는지 확인한다.
- [x] metadata/canonical을 반영한다.
- [x] public route component tests를 추가한다.

### Phase 2. web support API client

- [x] list API를 연결한다.
- [x] update API를 연결한다.
- [x] delete API를 연결한다.
- [x] TanStack Query hooks와 query keys를 추가한다.
- [x] auth expiry와 normalized API error를 공용 client 계약으로 처리한다.
- [x] API client tests를 추가한다.

### Phase 3. authenticated inquiry inbox

- [x] desktop list-detail workspace를 구현한다.
- [x] compact/mobile list route를 구현한다.
- [x] ticket detail과 replies를 구현한다.
- [x] loading, empty, error, no-selection state를 구현한다.
- [x] URL ticket selection과 browser history를 연결한다.
- [x] unread/answer status 표현을 현재 notification data 범위에 맞게 구현한다.

### Phase 4. composer와 actions

- [x] 새 문의 full route와 desktop detail-pane mode를 구현한다.
- [x] 일반 문의 email input을 제거하고 verified account email을 사용한다.
- [x] open ticket edit/delete를 구현한다.
- [x] status lock copy를 구현한다.
- [x] create success를 created detail route로 replace한다.
- [x] validation summary, inline errors, focus behavior를 구현한다.

### Phase 5. entry links와 deep links

- [x] landing/footer 문의는 public `/support`를 유지한다.
- [x] login 문의는 public `/support`를 유지한다.
- [x] profile 문의는 `/support/inquiries`로 변경한다.
- [x] notifications support target를 exact detail route로 변경한다.
- [x] public support에서 인증 문의함 중복 진입을 제거하고 앱 내부 경로가 소유하게 한다.
- [x] old account deletion support query link를 제거한다.

### Phase 6. report/account deletion cleanup

- [x] `SupportPage` mode branching을 분리한다.
- [x] profile의 신고하기 진입에서 신고/개인정보 요청 중간 선택 화면을 제거한다.
- [x] report route behavior와 target context를 회귀 테스트한다.
- [x] account deletion은 dedicated route만 사용하게 한다.
- [x] public account deletion을 web 전용 header, form, information rail로 재구성한다.
- [x] 공개 삭제 확인을 6자리 이메일 OTP와 별도 최종 삭제 확인으로 분리한다.
- [x] OTP 10분 만료, 90초 재전송 제한, 5회 실패 잠금, 일회용 삭제 승인 토큰을
      FastAPI와 DB migration에 반영한다.
- [x] 로그인된 모바일 삭제 화면도 request/verify/resend/confirm API 계약을 사용한다.
- [x] 기존 링크 확인은 전환 호환만 유지하고 링크 진입만으로 삭제하지 않게 한다.
- [x] public deletion 입력을 가입 이메일 하나로 최소화한다.
- [x] request/verification success, loading, error를 독립 상태 화면으로 분리한다.
- [x] feedback route와 일반 inquiry inbox가 섞이지 않는지 확인한다.

### Phase 7. QA와 release

- [x] web lint/typecheck/test/build를 통과한다.
- [ ] canonical viewport matrix를 확인한다.
- [ ] keyboard, focus, 200% zoom, reduced-motion을 확인한다.
- [x] public support signed-out production smoke를 진행한다.
- [ ] support inbox review-account smoke를 진행한다.
- [ ] operator reply -> notification -> detail deep link를 확인한다.
- [ ] App Store/Google Play support metadata와 URL을 대조한다.
- [x] Vercel manual deployment를 수행하고 Ready 상태를 확인한다.
- [x] 로컬 Postgres에서 OTP migration과 request -> verify -> confirm API smoke를 통과한다.
- [x] Figma는 UI 승인 후 요청받았을 때만 동기화한다.

## 18.1 2026-07-14 implementation record

구현 완료:

- 공개 `/support`를 인증과 API에 의존하지 않는 support hub로 교체했다.
- public header, 신고·안전 이메일, 계정 접근 이메일 지원, 계정 삭제, FAQ를 반응형으로 구성했다.
- 공개 화면의 `로그인 문제 해결하기`, `내 문의 보기`, legal footer 중복 경로를 제거했다.
- 공개 계정 삭제 화면을 단일 mobile card stack에서 responsive web 2열 구조로 교체했다.
- 공개 삭제 요청은 가입 이메일만 받고 이름·사유는 추가 수집하지 않도록 단순화했다.
- 공개 웹과 로그인 모바일 삭제 흐름을 `이메일 -> 6자리 OTP -> 최종 확인 -> 삭제`
  단계로 통일했다.
- OTP 10분 만료, 90초 재전송 대기, 5회 오입력 잠금, 시간당 5회 발송 제한,
  5분짜리 일회용 삭제 승인 토큰을 FastAPI와 DB에 반영했다.
- 기존 삭제 링크는 이메일 확인 호환 수단으로만 유지하고, 링크 진입만으로 삭제되지
  않도록 최종 확인 단계에서 멈추게 했다.
- 로컬 개발에서는 Resend 없이 DEV 전용 인증번호를 웹과 모바일에서 확인할 수 있고,
  production/preview 응답에는 번호가 노출되지 않게 했다.
- `/support/inquiries`, `/new`, `/:ticketId`를 protected route로 추가했다.
- desktop list-detail과 compact/mobile route-based list/detail/composer를 구현했다.
- 기존 FastAPI support list/create/update/delete와 visible reply를 web TanStack Query에 연결했다.
- 일반 문의는 로그인 계정 email을 사용하고 화면에서 중복 입력을 제거했다.
- open 문의의 수정·삭제와 status lock을 구현했다.
- 신고를 독립 `ReportPage`로 분리하고 기존 mixed `SupportPage`를 제거했다.
- profile 내부 문의 링크, account deletion link, support notification deep link를 새 route 계약으로 교체했다.
- public canonical/description/index와 authenticated inquiry noindex metadata를 반영했다.
- public sitemap에 `/support`를 등록했다.
- route, public support, inquiry list/detail, API client, query cache 테스트를 추가했다.
- support route auth return, account deletion/report access, composer replace, notification deep link 회귀 테스트를 보강했다.
- web 전체 141 tests와 production build를 통과했다.
- FastAPI 전체 `196 passed, 10 skipped`와 계정 삭제 OTP 집중 테스트 16개를 통과했다.
- Alembic 버전 칼럼 길이 문제를 보정하고 빈 Postgres에서 0001부터 0021까지 전체
  migration을 검증했다.
- 로컬 공개 삭제 API에서 인증만으로 삭제되지 않는 점, 최종 확인 후 완료되는 점,
  같은 삭제 승인 토큰 재사용이 `409`로 거절되는 점을 확인했다.

남은 작업:

- canonical viewport, keyboard, focus, zoom, reduced-motion을 실제 브라우저에서 확인한다.
- review account와 운영자 console을 사용해 create -> reply -> notification -> exact detail을 smoke한다.
- 사용자가 명시적으로 web 배포를 요청하면 Vercel manual deployment와 production support URL을 검증한다.

## 19. 완료 기준

다음을 모두 만족할 때 이 문서를 `docs/completed/`로 이동한다.

- `/support`가 logout/incognito에서 즉시 열리고 실제 email/contact path를 제공한다.
- 로그인 문제가 있는 사용자가 auth-only UI에 갇히지 않는다.
- profile의 문의하기는 authenticated inquiry inbox로 이동한다.
- 사용자가 자신의 문의 목록, 상태, 내용, 운영자 답변을 확인할 수 있다.
- open 문의 작성·수정·삭제가 backend policy와 일치한다.
- 답변 알림이 exact ticket detail로 이동한다.
- 신고와 계정 삭제가 일반 문의 flow와 분리되어 있다.
- desktop은 list-detail workspace, mobile web은 route-based single column이다.
- 접근성·반응형·browser history QA가 완료됐다.
- production support URL과 store metadata가 일치한다.
- 구현·검증·배포 결과가 문서에 기록됐다.

## 20. 비목표

- AI chatbot
- 실시간 상담 채팅
- 전화 상담 시스템
- public anonymous ticket API
- attachment upload
- SLA dashboard
- knowledge-base CMS
- support ticket search/ranking engine
- Expo mobile support UI 전체 재설계
- operator admin console 재설계

필요성이 검증되기 전에는 공개 지원 페이지를 새로운 고객센터 제품으로 확장하지
않는다. MVP의 목표는 로그인 전 연락 가능성과 로그인 후 문의 추적을 안정적으로
제공하는 것이다.

## 21. 공식 출처

- Apple App Store Connect platform version information, Support URL:
  https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- Google Play, how to support app users:
  https://support.google.com/googleplay/android-developer/answer/113477
- Google Play, store listing contact details:
  https://support.google.com/googleplay/android-developer/answer/13634081
- Zendesk, submitting and tracking requests:
  https://support.zendesk.com/hc/en-us/articles/4408846805530-Submitting-and-tracking-requests-in-the-help-center-Customer-Portal
- Jira Service Management customer portal requests:
  https://support.atlassian.com/jira/kb/troubleshooting-common-issues-in-jira-service-management-cloud/
- GOV.UK, contact a department or service team:
  https://design-system.service.gov.uk/patterns/contact-a-department-or-service-team/
- W3C WAI forms tutorial:
  https://www.w3.org/WAI/tutorials/forms/
- W3C WAI input validation:
  https://www.w3.org/WAI/tutorials/forms/validation/
- W3C WAI user notification:
  https://www.w3.org/WAI/tutorials/forms/notifications/
- Cloudflare Turnstile server-side validation:
  https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
