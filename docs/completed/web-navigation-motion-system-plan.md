# Web Navigation Motion System Plan

Status: completed - code implementation complete; manual browser checks belong to release QA

Last updated: 2026-08-08

Owner surface: `apps/web`

Related routes: `/`, `/app`, `/interviews`, `/map`, `/chat`, `/profile`,
`/notifications`, `/legal/*`, `/support`, `/account-deletion`, `/admin`

Related plans:

- `landing-page-and-store-creative-production-plan.md`
- `desktop-web-service-ui-advancement-plan.md`
- `responsive-web-auth-entry-experience-plan.md`

## 2026-07-13 구현 진행 요약

### 2026-07-16 route manifest consolidation

- `apps/web/src/shared/navigation/appRoutes.ts`에 route matcher, access, title,
  shell-active destination metadata를 모아 두고,
  `apps/web/src/app/routing/RouteRenderer.tsx`가 이 metadata를 기준으로 public,
  shell, admin route를 렌더링하도록 정리했다.
- `apps/web/src/app/routing/useNavigationCoordinator.ts`가 document click
  interception, popstate 처리, title/scroll/focus 적용을 묶어 현재 custom
  history/motion contract를 유지한 채 `App.tsx` 분기를 줄였다.
- 상위 탭 href와 shell nav item source를 route metadata와 같은 destination
  정의에서 파생하도록 바꿔 `/app`, `/interviews`, `/map`, `/chat`, `/profile`
  drift 위험을 줄였다.
- `shared/ui/notification-button.tsx`는 presentational + injected-state 형태로
  바뀌고, 실제 unread query 연결은 `app/shell/ConnectedAppShell.tsx`에서만
  수행하도록 이동했다.
- route/navigation shell 관련 targeted test와 TypeScript typecheck는 통과했고,
  real-browser motion QA 범위는 기존 Phase 6 대기 항목을 그대로 유지한다.

### 2026-07-14 랜딩 헤더 앵커 이동 보완

- SPA 내부 링크 가로채기가 같은 pathname의 hash 링크를 브라우저
  기본 동작에만 맡기던 계약 누락을 수정했다.
- `anchor` scroll policy를 추가해 랜딩 헤더의 네 개 섹션 링크가
  URL hash, history metadata, 실제 section scroll을 하나의 navigation transaction으로
  처리한다.
- 일반 환경에서는 smooth scroll, `prefers-reduced-motion` 환경에서는 즉시
  scroll을 사용하며, 이미 같은 hash인 링크를 다시 눌러도 대상 섹션으로
  돌아간다.

### 2026-07-17 문의 list-detail history 보완

- desktop 문의함의 row 선택은 독립 화면 push가 아니라 같은 workspace의 URL
  state replace로 처리한다. 따라서 상단 뒤로가기는 선택 해제를 한 단계 거치지
  않고 이전 profile route로 복귀한다.
- compact 문의함은 목록과 상세가 독립 화면이므로 기존 push/back 계약을 유지해
  상세의 뒤로가기가 문의 목록으로 돌아간다.

- `apps/web/src/shared/navigation/appNavigation.ts`를 공통 navigation
  coordinator로 재구성했다. history entry에 namespaced index, key, intent,
  origin, scroll 좌표를 저장하고 push, replace, back, forward 방향을 구분한다.
- `App.tsx`, app shell tab, 인증 완료, 채팅방 query, 인터뷰 검색 query,
  모집글 생성 화면의 직접 history 처리를 공통 API로 통합했다.
- synthetic `PopStateEvent`를 제거하고 일반 navigation event와 실제 browser
  `popstate`를 분리했다.
- push는 top, browser back/forward는 저장된 위치 복원, same-route state는 현재
  scroll 유지 정책을 적용했다.
- `navigationMotion.ts`에 View Transitions API progressive enhancement,
  reduced-motion fallback, 빠른 연속 이동의 이전 transition skip, focus handoff,
  live announcement를 구현했다.
- app shell의 `#app-content`만 named transition surface로 두고 tab, push,
  back/forward의 방향과 duration을 공통 CSS token으로 정의했다.
- 랜딩에서는 해당 화면이 열린 동안만 smooth anchor scroll을 사용하고 navigation
  restoration 중에는 비활성화한다. 모바일 역할 선택은 semantic tab과 keyboard
  arrow 이동, `160ms/4px` local transition을 사용한다.
- 인증 mode/step 전환에는 `160ms/4px` local transition과 mode별 document title을
  적용했다.
- navigation/history/motion/auth/App/landing 테스트를 포함한 web 전체 `100`개
  테스트가 통과했다.
- web TypeScript lint와 Vite production build가 통과했다.
- 현재 세션에는 in-app browser control이 제공되지 않아 실제 Chrome/Safari
  transition 캡처, canonical viewport 시각 QA, real browser reduced-motion QA는
  완료하지 않았다.
- Figma 동기화와 Vercel 배포는 수행하지 않았다.

### 문서 책임 경계

이 문서는 공통 웹 navigation transaction, browser history, 방향 판별,
scroll restoration, focus handoff, reduced-motion fallback, route-level motion
primitive의 구현 백로그를 소유한다.

다른 active 문서의 책임은 유지한다.

- 랜딩의 정보 구조, 카피, 반응형 구성, store creative는
  `landing-page-and-store-creative-production-plan.md`가 소유한다.
- 인증 화면의 form hierarchy, auth bootstrap, 오류·복구 UI는
  `responsive-web-auth-entry-experience-plan.md`가 소유한다.
- 인증 후 desktop shell, list-detail layout, 화면별 정보 구조는
  `desktop-web-service-ui-advancement-plan.md`가 소유한다.

따라서 이 문서의 surface별 절은 새 레이아웃을 다시 설계하는 작업 목록이 아니라
공통 navigation/motion primitive를 어느 이동에 적용할지 정의하는 integration
contract다. 충돌이 생기면 화면 내용과 레이아웃은 surface별 계획을 따르고,
history·scroll·focus·motion 동작은 이 문서를 따른다.

## 1. 목적

Hypofit 웹에서 랜딩 내부 이동, 랜딩에서 로그인 진입, 인증 화면 전환,
인증 후 서비스 탭 이동, 목록에서 상세 화면 진입, 브라우저 뒤로가기까지 하나의
일관된 내비게이션·모션 시스템으로 만든다.

이 계획의 목표는 화면마다 애니메이션을 많이 넣는 것이 아니다. 사용자가 다음을
자연스럽게 이해하도록 필요한 변화만 짧게 보여주는 것이다.

- 같은 페이지 안에서 위치만 이동했는지
- 새로운 작업 화면으로 들어갔는지
- 이전 화면으로 돌아왔는지
- 상위 서비스 탭만 바뀌었는지
- 팝오버나 모달처럼 현재 맥락 위에 임시 UI가 열린 것인지

완료 결과는 다음 원칙을 만족해야 한다.

```text
navigation intent
  -> history and scroll policy
  -> React route state update
  -> progressive motion when supported and allowed
  -> focus and accessibility handoff
```

모션은 라우팅을 보조해야 하며 라우팅, 인증, 데이터 로딩, 브라우저 history를
대체하거나 지연시키면 안 된다.

## 2. 범위

### 2.1 포함

- 랜딩 헤더의 섹션 링크와 로고의 페이지 상단 이동
- 랜딩 CTA에서 `/app` 로그인 화면으로 이동
- 랜딩 역할 탭과 제품 미리보기 캐러셀의 상태 전환
- 로그인·회원가입·비밀번호 찾기 화면 내부 전환
- 로그인 성공 후 요청했던 서비스 경로 진입
- 상위 서비스 탭 이동
- 목록에서 상세 화면 진입과 상세 화면에서 뒤로가기
- 알림, 프로필 하위 설정, 문의·신고 등 push-style 화면 이동
- 팝오버, 드롭다운, 모달, 지도 패널의 공통 모션 원칙
- 브라우저 뒤로가기·앞으로가기 방향 판별
- 새 경로와 복귀 경로의 스크롤 정책
- route 변경 후 focus 이동과 화면 읽기 지원
- `prefers-reduced-motion` 대응
- View Transitions API 미지원 브라우저의 즉시 전환 fallback
- unit, integration, browser, visual QA 기준

### 2.2 제외

- React Native 앱의 native stack transition 변경
- Expo Router 또는 웹 router 프레임워크 도입
- React Canary 전용 `<ViewTransition>` API 도입
- React 버전 업그레이드
- cross-document MPA 전환을 위한 `@view-transition` 설정
- parallax, scroll-jacking, 긴 reveal sequence
- 실제 로딩량과 무관한 진행률 애니메이션
- 사용자의 행동을 기다리게 만드는 인위적 transition delay
- 모든 요소를 shared-element animation으로 연결하는 작업
- Figma motion prototype 동기화. 구현 승인이 끝난 뒤 사용자가 명시적으로
  요청할 때만 진행한다.

## 3. 현재 상태

### 3.1 경로 변경 책임이 분산돼 있다

현재 `apps/web/src/app/App.tsx`는 다음을 직접 수행한다.

- document 수준의 내부 링크 click interception
- `window.history.pushState()` 호출
- `currentPath` React state 갱신
- `window.scrollTo(0, 0)` 호출
- 실제 `popstate` 구독

`apps/web/src/shared/navigation/appNavigation.ts`도 별도로 다음을 수행한다.

- `pushState()` 호출
- synthetic `PopStateEvent` dispatch
- top scroll
- history length 기반 뒤로가기 fallback

이 구조에서는 같은 이동이 호출 위치에 따라 다른 경로를 지나간다. route motion을
각 호출부에 개별 추가하면 다음 문제가 생길 수 있다.

- 한 번의 이동에 transition이 두 번 시작된다.
- synthetic popstate가 실제 back/forward처럼 처리된다.
- 뒤로가기 방향을 알 수 없다.
- history state를 덮어써 scroll restoration 정보가 사라진다.
- query만 바뀌는 chat/map 상태도 전체 페이지 전환으로 보인다.

### 3.2 현재는 route-level motion이 없다

버튼 hover, focus color, carousel indicator, auth skeleton pulse 등
component-level transition은 존재한다. 그러나 경로 변경은 DOM이 즉시 교체되고
항상 top으로 이동한다.

따라서 랜딩에서 로그인, 목록에서 상세, 상세에서 복귀가 모두 같은 갑작스러운
변화로 보인다. 반대로 컴포넌트마다 임의의 transition duration을 추가하면 제품
전체의 속도와 방향 언어가 일관되지 않게 된다.

### 3.3 기존 active 계획과 계약을 유지해야 한다

`responsive-web-auth-entry-experience-plan.md`는 이미 다음을 정의한다.

- landing -> auth cross-fade `160-220ms`
- form mode opacity/translate `140-180ms`
- native navigation을 흉내 낸 full-page slide 금지
- fake progress와 logo scale launch 금지
- reduced motion에서 translate/scale 제거

이 문서는 위 계약을 대체하지 않는다. route, history, scroll, focus 구현까지 범위를
넓혀 하나의 실행 가능한 시스템으로 구체화한다.

## 4. 조사 근거와 선택

### 4.1 플랫폼 View Transitions API를 점진적으로 사용한다

MDN의 [`Document.startViewTransition()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)은
같은 document 안에서 DOM 상태를 바꾸면서 이전/새 화면 snapshot 사이의 transition을
만드는 플랫폼 API다. Hypofit 웹은 현재 custom history 기반 SPA이므로 이 방식이
라우팅 구조와 맞는다.

적용 원칙:

- 지원 여부를 feature detection으로 확인한다.
- 미지원 시 같은 state update를 즉시 실행한다.
- API 지원 여부가 기능 동작의 조건이 되지 않게 한다.
- animation이 실패해도 URL, React state, focus, scroll은 정상이어야 한다.
- React Canary의 `<ViewTransition>`은 사용하지 않는다. React 공식 문서에서 해당
  API는 Canary 대상으로 안내되므로 현재 안정 버전과 Expo/Web 의존성을 흔들 이유가
  없다.

참고:

- [Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using)
- [View transition types](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using_types)
- [SPA view transitions](https://web.dev/learn/css/view-transitions-spas)
- [React ViewTransition](https://react.dev/reference/react/ViewTransition)

### 4.2 transform과 opacity만 route animation의 기본으로 사용한다

web.dev의 [animation performance guidance](https://web.dev/articles/animations-and-performance)에
따라 route-level motion은 compositor 친화적인 `transform`과 `opacity`를 중심으로
한다.

금지:

- route animation 중 width, height, top, left를 frame마다 변경
- 큰 blur 값의 연속 애니메이션
- 전체 화면 box-shadow 확대
- DOM measurement를 매 frame 반복
- transition 완료를 기다리기 위한 timer 기반 상태 지연

### 4.3 reduced motion은 선택 기능이 아니라 기본 계약이다

W3C의 [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)와
[CSS reduced motion technique](https://www.w3.org/WAI/WCAG21/Techniques/css/C39.html)을
따라 사용자가 reduced motion을 요청하면 상호작용으로 발생하는 불필요한 움직임을
제거한다.

reduced motion에서도 유지할 것:

- URL과 history 변경
- 화면 내용 변경
- focus 이동
- live region 안내
- active state와 color change

제거할 것:

- translate
- scale
- smooth scrolling
- carousel의 animated scroll
- route cross-fade를 포함한 의도적 지연

## 5. 모션 원칙

### 5.1 빠르게 끝낸다

대부분의 전환은 `120-220ms` 안에 끝낸다. 사용자가 다음 작업을 시작할 수 있는
시점을 늦추지 않는다.

### 5.2 거리는 짧게 사용한다

route 방향을 나타내더라도 이동 거리는 `4-8px`로 제한한다. 화면 전체가 밀리는
native imitation보다 hierarchy를 살짝 암시하는 정도로 사용한다.

### 5.3 같은 수준은 fade, 깊이가 바뀌면 짧은 방향을 사용한다

- 상위 탭 간 이동: shell은 유지하고 content만 fade
- 목록 -> 상세: 새 content가 오른쪽에서 `8px` 이내로 진입
- 상세 -> 목록: 반대 방향으로 복귀
- 랜딩 -> auth: 브랜드 연속성을 가진 cross-fade
- 팝오버: trigger 근처에서 opacity와 작은 scale

### 5.4 모션은 상태를 속이지 않는다

- 네트워크 요청이 끝나기 전에 성공 화면을 보여주지 않는다.
- 로딩을 감추기 위해 transition을 길게 늘리지 않는다.
- progress percentage를 임의로 만들지 않는다.
- navigation 직후 실패하면 해당 목적지의 실제 error state를 보여준다.

### 5.5 반복 노출을 줄인다

- 랜딩 scroll reveal은 기본적으로 사용하지 않는다.
- hero product preview의 최초 1회 fade/translate만 선택적으로 허용한다.
- 목록 row가 viewport에 들어올 때마다 순차 등장시키지 않는다.
- 사용자가 탭을 반복 전환해도 긴 enter animation을 반복하지 않는다.

## 6. 모션 토큰

구현 시 임의 숫자를 화면마다 추가하지 않고 공통 token을 사용한다.

| Token | 값 | 용도 |
|---|---:|---|
| `motion.instant` | `0ms` | reduced motion, unsupported fallback |
| `motion.fast` | `120ms` | hover, press, popover |
| `motion.standard` | `160ms` | form/tab/content change |
| `motion.route` | `180ms` | 일반 push/back route |
| `motion.emphasis` | `220ms` | landing/auth, modal처럼 경계가 큰 변화 |
| `distance.subtle` | `4px` | form mode, local content |
| `distance.route` | `8px` | list/detail hierarchy |
| `scale.popover` | `0.98` | popover enter 시작점 |

권장 easing:

```text
enter: cubic-bezier(0.2, 0, 0, 1)
exit:  cubic-bezier(0.4, 0, 1, 1)
state: cubic-bezier(0.2, 0, 0, 1)
```

구현 위치 후보:

- CSS custom properties: `apps/web/src/index.css`
- TypeScript duration constants: `apps/web/src/shared/navigation/navigationMotion.ts`

CSS와 TypeScript가 같은 숫자를 각각 독립적으로 가지지 않게 한다. JS에서 duration이
필요하지 않다면 CSS를 source of truth로 둔다.

## 7. 이동 유형 분류

모든 경로 변경은 명시적인 `NavigationIntent`를 가진다.

```ts
type NavigationIntent =
  | "public"
  | "auth"
  | "tab"
  | "push"
  | "back"
  | "forward"
  | "replace"
  | "state";
```

의미:

- `public`: 랜딩, 법적 문서, support 등 public surface 간 이동
- `auth`: landing/auth/protected route gate 경계 이동
- `tab`: 홈·인터뷰·지도·채팅·프로필 상위 목적지 변경
- `push`: 목록에서 상세, 프로필에서 하위 설정 등 깊이 증가
- `back`: 기존 history entry로 깊이 감소
- `forward`: browser forward로 기존 entry 재방문
- `replace`: redirect, canonicalization처럼 history를 추가하지 않는 변경
- `state`: 같은 route의 query, 선택 row, sheet, chat room 등 local state 변경

### 7.1 이동별 표현 계약

| 이동 | old content | new content | shell | 시간 |
|---|---|---|---|---:|
| landing -> auth | fade out | fade in | 교체 | `180-220ms` |
| auth form mode | fade | fade + Y `4px` | 유지 | `140-160ms` |
| auth -> requested app | fade | fade in | app shell 등장 | `180ms` |
| top-level tab | 빠른 fade | fade in | 고정 | `140-160ms` |
| list -> detail | fade/left `4px` | right `8px` -> 0 | 가능하면 유지 | `180ms` |
| detail -> list | fade/right `4px` | left `8px` -> 0 | 가능하면 유지 | `180ms` |
| profile -> setting | fade | right `8px` -> 0 | 유지 | `180ms` |
| popover/dropdown | 없음 | opacity + scale `.98` | 유지 | `120ms` |
| modal | backdrop fade | opacity + Y `4px` | 유지 | `160-220ms` |
| map bottom panel | 현재 gesture 계약 유지 | translateY | 지도 유지 | 약 `200ms` |
| query/local state | 기본적으로 없음 | local component만 | 유지 | `0-140ms` |

## 8. 랜딩페이지 인터랙션 계약

### 8.1 헤더 섹션 링크

헤더에서 같은 랜딩 안의 섹션으로 이동할 때:

- URL hash를 유지할 수 있는 semantic anchor를 사용한다.
- sticky header 높이를 `scroll-margin-top`으로 보정한다.
- 일반 환경은 native smooth scroll을 사용한다.
- reduced motion은 즉시 이동한다.
- 이동 후 해당 section heading을 강제로 focus하지 않는다. 단, skip link와
  keyboard 전용 section navigation은 별도 focus 정책을 적용할 수 있다.
- route-level View Transition을 시작하지 않는다.

CSS `scroll-behavior`는 사용자 navigation에만 사용하고 앱 초기 load나 back
restoration에는 강제하지 않는다. 참고:
[MDN scroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-behavior).

### 8.2 로고

- 랜딩에서 누르면 페이지 최상단으로 이동한다.
- 다른 route에서 public logo가 제공된다면 `/` push navigation으로 처리한다.
- 같은 페이지 top 이동은 route transition이 아니다.

### 8.3 로그인 CTA

- `/app`으로 push한다.
- landing과 auth의 배경·wordmark 연속성을 유지하는 cross-fade를 사용한다.
- mobile native slide처럼 전체 화면을 수평 이동시키지 않는다.
- auth bootstrap이 실제로 지연될 때만 최종 auth layout geometry의 skeleton을
  보여준다.

### 8.4 App Store CTA

- 외부 링크 이동에는 page transition을 사용하지 않는다.
- hover/focus/pressed 피드백만 `120ms` 안에 제공한다.
- 새 창 여부와 보안 속성은 링크 목적에 맞게 유지한다.

### 8.5 역할 탭

- 선택 즉시 label, `aria-selected`, panel을 함께 갱신한다.
- panel은 opacity와 Y `4px` 이내로 `160ms` 전환한다.
- tab indicator가 layout shift를 일으키지 않게 한다.
- keyboard arrow navigation을 지원한다.
- reduced motion에서는 panel을 즉시 교체한다.

### 8.6 제품 미리보기 캐러셀

- mobile은 native horizontal scroll + CSS scroll snap을 유지한다.
- dot 또는 step control은 현재 active slide를 정확히 반영한다.
- programmatic move는 reduced motion에서 `auto`, 그 외에는 `smooth`다.
- desktop은 자동 재생 carousel로 만들지 않는다.
- 사용자의 scroll과 programmatic scroll이 동시에 경쟁하지 않게 한다.
- scroll event는 requestAnimationFrame 또는 적절한 passive handling으로 제한한다.

## 9. 인증 전환 계약

### 9.1 랜딩에서 로그인

```text
click login
  -> push /app with intent=auth
  -> route state update
  -> cross-fade when allowed
  -> auth bootstrap result
  -> login form or requested protected surface
```

- transition은 auth API 응답을 기다리도록 길어지지 않는다.
- session 확인이 즉시 끝나면 app/auth 최종 화면이 곧바로 나타난다.
- session 확인이 지연되면 skeleton이 transition의 새 화면이 될 수 있다.
- error가 발생하면 skeleton을 무한 유지하지 않는다.

### 9.2 로그인·회원가입 내부

- URL 또는 auth mode가 바뀌더라도 전체 화면 route slide를 사용하지 않는다.
- form heading과 fields의 opacity/Y `4px` 전환만 허용한다.
- 입력 중인 값과 focus를 불필요하게 잃지 않는다.
- validation error는 field 근처에 즉시 나타나며 transition 완료를 기다리지 않는다.
- OTP countdown, resend 상태, submit loading은 route motion과 분리한다.

### 9.3 로그인 성공

- 사용자가 직접 요청한 protected path와 query/hash를 우선한다.
- 요청 경로가 없을 때만 `/app`을 기본값으로 사용한다.
- auth -> app 전환은 `replace` 또는 정책상 필요한 history operation을 사용해
  로그인 화면으로 잘못 되돌아가는 history를 만들지 않는다.
- app shell과 첫 content가 준비되면 focus를 main heading으로 이동한다.

## 10. 인증 후 서비스 전환 계약

### 10.1 상위 탭

`홈 / 인터뷰 / 지도 / 채팅 / 프로필` 이동은 hierarchy 깊이가 바뀌지 않는다.

- desktop sidebar/top nav와 phone web bottom nav shell은 유지한다.
- main content만 짧은 fade를 사용한다.
- 수평 slide를 사용하지 않는다.
- 같은 active tab을 다시 누르면 history를 추가하지 않는다.
- 같은 tab 재선택의 scroll-to-top은 별도 명시 행동으로만 제공한다.
- map/chat의 local selection을 무조건 초기화하지 않는다.

### 10.2 목록에서 상세

- 인터뷰 row -> 인터뷰 상세
- 알림 row -> 연결된 상세
- 프로필 row -> 계정 정보·설정·문의·신고·법적 문서
- 채팅 메뉴 -> 인터뷰 상세

위 이동은 `push`로 분류한다.

- 데스크톱 split view에서 같은 route의 selected row만 바뀌면 full route
  transition을 사용하지 않는다.
- phone/narrow layout에서 전체 상세 화면으로 진입하면 `push` motion을 사용한다.
- browser back은 정확히 이전 목록과 scroll 위치로 돌아온다.
- 상세에서 다른 상위 탭을 누르면 `back`이 아니라 `tab` 이동이다.

### 10.3 채팅

- 채팅 목록에서 room open은 viewport 구조에 따라 `push` 또는 `state`다.
- desktop split pane: room query 변경과 detail panel 교체만 수행한다.
- narrow web: thread 전체 화면 진입은 `push`다.
- thread의 인터뷰 상세 열기는 thread를 origin으로 기록한다.
- 상세에서 back하면 인터뷰 탭이 아니라 원래 thread로 돌아와야 한다.
- message append, unread update, typing state는 route transition 대상이 아니다.

### 10.4 지도

- 지도 pan/zoom, marker selection, cluster selection, bottom panel 높이 변경은
  route transition 대상이 아니다.
- map -> interview detail 전체 화면 진입만 `push`로 처리한다.
- 상세에서 back하면 지도 viewport, 선택 marker, sheet 상태를 복원한다.
- 지도 canvas snapshot을 View Transition 대상으로 강제하지 않는다.

### 10.5 public/legal/support

- 랜딩 footer에서 법적 문서로 이동할 때는 짧은 public fade를 허용한다.
- 법적 문서 간 링크는 content fade만 사용한다.
- 긴 정적 문서를 뒤로가기로 복귀하면 기존 scroll을 복원한다.
- account deletion 같은 위험 작업의 confirmation modal은 route transition과
  독립된 modal motion을 사용한다.

## 11. History와 방향 모델

### 11.1 history entry 메타데이터

각 Hypofit navigation entry에는 기존 `history.state`를 보존하면서 namespace된
메타데이터를 병합한다.

```ts
type HypofitHistoryState = {
  __hypofit?: {
    index: number;
    key: string;
    intent: NavigationIntent;
    originPath?: string;
    scrollX?: number;
    scrollY?: number;
  };
};
```

규칙:

- 기존 state를 spread한 뒤 `__hypofit`만 갱신한다.
- 최초 load entry에 index/key가 없으면 `replaceState`로 보강한다.
- push 시 index를 증가시킨다.
- popstate의 이전 index와 새 index를 비교해 back/forward를 판별한다.
- 외부 코드가 state를 덮어썼거나 index가 없으면 방향 없는 fade로 fallback한다.
- `history.length > 1`만으로 앱 내부 back 가능 여부를 판단하지 않는다.

### 11.2 직접 URL 진입

- direct entry는 앱 내부 이전 화면이 없을 수 있다.
- UI back button은 route별 명시 fallback을 가진다.
- 브라우저 history에 외부 페이지가 있더라도 사용자를 의도치 않게 외부로 보내지
  않는 현재 product policy를 route metadata로 결정한다.
- fallback push는 `back`처럼 위장하지 않고 `replace` 또는 명시된 push로 처리한다.

### 11.3 빠른 연속 이동

사용자가 transition 중 다른 링크를 누를 수 있다.

- navigation lock으로 입력을 막지 않는다.
- 진행 중 transition이 있으면 가능한 경우 finish/skip하고 최신 navigation을
  commit한다.
- 오래된 transition callback이 최신 route state를 덮어쓰지 않게 sequence id를
  사용한다.
- URL과 React state는 항상 같은 navigation transaction에서 갱신한다.

## 12. Scroll 계약

### 12.1 push

- 새로운 full-page route는 기본적으로 top으로 이동한다.
- DOM update가 commit된 후 scroll을 적용한다.
- hash destination은 해당 element 위치로 이동한다.
- desktop split pane local selection은 목록 scroll을 유지한다.

### 12.2 back/forward

- 떠나기 직전 현재 entry의 scroll 좌표를 history state에 저장한다.
- popstate commit 후 저장된 좌표를 복원한다.
- browser native restoration과 custom restoration이 경쟁하지 않게
  `history.scrollRestoration` 정책을 한곳에서 관리한다.
- 복원 대상 content가 lazy-loaded라면 무한 timer 대신 bounded retry 또는 layout
  readiness signal을 사용한다.

### 12.3 top-level tab

- 새 탭은 해당 탭의 마지막 scroll을 유지할지 top으로 시작할지 surface별로
  명시한다.
- MVP 기본값은 새 탭 top, browser back은 복원이다.
- home internal feed와 map viewport처럼 제품 가치가 큰 상태는 후속 단계에서
  keyed restoration을 적용할 수 있다.

## 13. Focus와 접근성 계약

### 13.1 route 완료 후 focus

- mouse/touch navigation에서 무조건 visible focus ring을 만들지 않는다.
- keyboard 또는 assistive navigation에서는 새 화면의 `h1` 또는 `main` landmark로
  focus를 이동한다.
- focus target은 `tabIndex={-1}`을 사용할 수 있다.
- app shell navigation 자체의 focus를 불필요하게 빼앗지 않는다.
- modal close는 trigger로 focus를 돌려준다.
- popover close도 trigger로 focus를 복원한다.

### 13.2 화면 변경 안내

- SPA route title을 경로별로 갱신한다.
- 필요한 경우 짧은 `aria-live="polite"` region으로 새 화면 제목을 알린다.
- 같은 문구를 transition start/end에 두 번 읽지 않게 한다.
- loading과 navigation announcement를 중복하지 않는다.

### 13.3 keyboard

- transition 중에도 Tab, Escape, browser shortcuts를 막지 않는다.
- focus 가능한 old snapshot이나 숨겨진 DOM이 keyboard 대상이 되지 않게 한다.
- role tabs와 carousel control은 semantic button/tab pattern을 유지한다.

## 14. 구현 아키텍처

### 14.1 권장 파일 구조

```text
apps/web/src/shared/navigation/
  appRoutes.ts
  appNavigation.ts
  navigationHistory.ts
  navigationMotion.ts
  navigationFocus.ts
  navigationTypes.ts
  __tests__/

apps/web/src/shared/ui/motion/
  MotionPreferences.tsx   # 실제 필요할 때만 추가
```

새 abstraction은 다음 책임이 실제로 분리될 때만 추가한다.

- `appNavigation.ts`: public navigation API
- `navigationHistory.ts`: index/key/scroll metadata와 pop direction
- `navigationMotion.ts`: View Transition feature detection과 intent -> motion mapping
- `navigationFocus.ts`: title, focus, live announcement
- `navigationTypes.ts`: shared intent/options types

작은 구현이라면 `navigationMotion.ts`와 `appNavigation.ts`로 시작하고 파일을
과도하게 늘리지 않는다.

### 14.2 단일 navigation API

모든 호출부는 다음과 유사한 API를 사용한다.

```ts
navigate({
  to: "/interviews/123",
  intent: "push",
  scroll: "top",
  focus: "page-heading",
  originPath: currentRequestedPath,
});
```

별도 API:

```ts
navigateBack({ fallback: "/interviews" });
replaceRoute({ to: requestedPath, intent: "auth" });
```

금지:

- component에서 직접 `pushState` 후 별도 state 갱신
- synthetic `PopStateEvent`로 일반 push를 흉내 내기
- component마다 `scrollTo(0, 0)` 호출
- `setTimeout`으로 route update를 늦추기
- route path 문자열로 방향을 추측하기

### 14.3 React state commit 위치

`App.tsx`가 현재 route renderer의 source of truth이므로 첫 단계에서는 여기의
`setCurrentPath`를 navigation coordinator가 호출한다.

중요한 순서:

```text
save old scroll
write URL/history metadata
startViewTransition(() => commit React route state)
wait for React DOM update through transition callback contract
apply new scroll or restoration
update document title and focus
```

View Transition을 helper와 `popstate` handler 양쪽에서 동시에 시작하지 않는다.
push/replace는 coordinator가 시작하고, real popstate는 popstate coordinator만
시작한다.

### 14.4 View Transition name과 type

초기 구현은 root content transition 하나로 시작한다.

- app shell: transition 밖에 두거나 stable name으로 유지
- page content: intent별 root transition
- shared-element는 실제 가치가 검증되기 전 추가하지 않는다.
- duplicate `view-transition-name`이 생기지 않게 한다.
- transition types가 안정적으로 지원되는 환경에서는 intent type을 전달할 수 있다.
- type API 미지원 시 `document.documentElement.dataset.navigationIntent`를
  transition 동안만 설정하는 fallback을 허용한다.

예상 CSS 구조:

```css
::view-transition-old(page-content) { ... }
::view-transition-new(page-content) { ... }

html[data-navigation-intent="push"]::view-transition-new(page-content) { ... }
html[data-navigation-intent="back"]::view-transition-new(page-content) { ... }
```

실제 selector/API 지원 범위는 구현 시 현재 target browser에서 다시 확인한다.

## 15. 데이터 로딩과 Suspense

### 15.1 transition은 network boundary가 아니다

- route transition은 `120-220ms` 시각 변화만 담당한다.
- data fetch 완료를 기다리며 snapshot을 유지하지 않는다.
- lazy chunk가 아직 없으면 목적지 geometry에 맞는 fallback이 새 화면으로 나타난다.
- fallback -> real content는 local fade를 선택적으로 적용할 수 있지만 route
  transition을 다시 시작하지 않는다.

### 15.2 flash 방지

- 랜딩, auth, app shell fallback의 배경 token을 최종 화면과 맞춘다.
- 최소 높이를 유지해 transition 직후 layout collapse가 생기지 않게 한다.
- skeleton은 실제 content 구조와 비슷하게 하되 fake data처럼 보이지 않게 한다.
- loading indicator 때문에 document title/focus가 여러 번 바뀌지 않게 한다.

### 15.3 오류

- navigation 자체 실패와 API fetch 실패를 구분한다.
- URL은 이동했지만 data가 실패한 경우 목적지 error state를 보여준다.
- unknown route는 현재 route policy에 따른 not-found/fallback으로 처리한다.
- Sentry breadcrumb에는 path pattern, intent, direction, duration, fallback 여부만
  기록하고 query의 개인정보는 기록하지 않는다.

## 16. 성능 예산

- route transition 총 duration: 기본 `<= 220ms`
- main thread long task를 만드는 JS animation loop 금지
- 동시에 animation하는 large full-screen layer는 old/new snapshot 두 장으로 제한
- map canvas, large video, fixed background를 shared transition 대상으로 만들지 않는다.
- `will-change`를 상시로 남발하지 않는다.
- animation 완료 후 temporary dataset/class/name을 제거한다.
- transition 중 API 요청, analytics, Sentry가 render commit을 block하지 않게 한다.
- low-end Android browser와 iOS Safari fallback에서도 즉시 navigation 가능해야 한다.

## 17. 분석·관측

운영 관측은 motion 자체의 미세 성능을 과도하게 수집하지 않고 navigation 오류를
찾을 수 있는 수준으로 제한한다.

권장 breadcrumb:

```text
web_navigation_start
  from_route_pattern
  to_route_pattern
  intent
  view_transition_supported
  reduced_motion

web_navigation_complete
  intent
  elapsed_bucket
  focus_target_found
  scroll_policy

web_navigation_fallback
  reason=unsupported|reduced_motion|transition_rejected|unknown_direction
```

금지:

- raw email, chat room name, interview title 기록
- URL 전체 query 기록
- 모든 hover/scroll frame event 전송
- motion duration을 analytics 전송 때문에 늦추기

## 18. 테스트 계획

### 18.1 unit tests

- [ ] navigation intent -> motion preset mapping
- [x] reduced motion -> instant preset
- [x] unsupported API -> immediate updater exactly once
- [x] supported API -> updater inside `startViewTransition` exactly once
- [x] history state merge preserves unrelated state
- [x] push increments internal index
- [x] pop lower index resolves `back`
- [x] pop higher index resolves `forward`
- [x] missing index resolves direction-neutral fallback
- [x] push scroll policy is top
- [x] pop restores saved scroll
- [ ] hash navigation bypasses route transition
- [ ] external link bypasses internal navigation

### 18.2 integration tests

- [x] landing login click pushes `/app` once
- [ ] browser back from auth returns `/` once
- [ ] authenticated top tab change preserves app shell
- [ ] list -> detail -> back restores list path and scroll
- [ ] chat thread -> interview detail -> back restores same room
- [ ] profile setting -> back restores profile
- [x] direct detail entry uses defined fallback
- [ ] rapid double navigation leaves URL and React route synchronized
- [ ] reduced motion still updates title and focus
- [x] failed View Transition promise does not block navigation
- [ ] Suspense fallback does not create blank white flash

### 18.3 browser matrix

최소 확인:

| 환경 | 너비 | 확인 |
|---|---:|---|
| iPhone-class mobile web | `390px` | landing anchor, auth, narrow push/back |
| compact/tablet browser | `768px` | shell breakpoint, content transition |
| laptop | `1280px` | desktop shell, split-view local state |
| wide desktop | `1440px+` | content max-width, snapshot bounds |
| reduced motion | all | no translate/scale/smooth scroll |
| unsupported mocked browser | all | immediate navigation fallback |

브라우저:

- current Chrome/Edge
- current Safari
- current Firefox
- iOS Safari or installed web fallback where relevant

### 18.4 visual QA

- [ ] old/new background color가 달라 flash가 보이지 않는다.
- [ ] sticky header, sidebar, bottom nav가 불필요하게 함께 움직이지 않는다.
- [ ] long page에서 back scroll restoration이 정확하다.
- [ ] scrollbar 출현/소멸로 horizontal jump가 생기지 않는다.
- [ ] modal/popover가 trigger와 무관한 위치에서 출현하지 않는다.
- [ ] active transition 중 click/keyboard가 막히지 않는다.
- [ ] 200% zoom에서도 focus target과 content가 잘리지 않는다.

## 19. 구현 단계

### Phase 0. 계약 고정

- [x] 현재 direct `pushState`, synthetic popstate, scroll 호출 위치 조사
- [x] 기존 auth motion 계약과 중복·충돌 확인
- [x] 공식 View Transitions, reduced motion, animation performance 근거 정리
- [ ] 실제 target browser 지원 범위를 구현 직전에 다시 확인
- [x] motion token과 route intent 이름 최종 승인

### Phase 1. navigation core 정리

- [x] `NavigationIntent`와 navigation options 정의
- [x] history state namespace, index, key 도입
- [x] 최초 history entry를 안전하게 보강
- [x] push/replace/back/forward를 단일 coordinator로 통합
- [x] document anchor interceptor를 coordinator에 연결
- [x] `navigateToDestination`을 coordinator에 연결
- [x] synthetic popstate 제거
- [x] direct `pushState` 호출 전수 정리
- [x] route별 fallback back destination 정의

완료 조건:

- URL과 React state가 한 transaction으로 갱신된다.
- 같은 click에 history entry가 한 번만 추가된다.
- browser back/forward 방향을 판별할 수 있다.
- 아직 motion을 꺼도 기존 기능이 동일하게 동작한다.

### Phase 2. scroll·focus·title

- [x] 떠나는 entry의 scroll 좌표 저장
- [x] push/top, hash, pop/restore 정책 구현
- [x] app split-view local state 예외 정의
- [x] route별 document title mapping 구현
- [x] keyboard-aware page heading focus 구현
- [x] SPA route live announcement 필요 범위 구현
- [ ] modal/popover focus return 회귀 점검

완료 조건:

- 목록 -> 상세 -> back 시 경로와 scroll이 복구된다.
- screen reader가 새 화면을 한 번만 인지한다.
- mouse 사용자의 불필요한 focus ring이 줄어든다.

### Phase 3. route motion progressive enhancement

- [x] `navigationMotion.ts` feature detection 구현
- [x] reduced motion preference 처리
- [x] root content View Transition 적용
- [x] public/auth/tab/push/back/forward preset 연결
- [x] app shell 고정 범위 설정
- [x] transition reject/skip fallback 구현
- [x] 빠른 연속 navigation race 방어
- [x] temporary intent dataset/class cleanup 보장

완료 조건:

- 지원 브라우저에서 이동 유형이 짧고 일관되게 보인다.
- 미지원/reduced 환경에서 기능 차이가 없다.
- transition이 navigation latency를 체감상 늘리지 않는다.

### Phase 4. 랜딩 내부 인터랙션 정리

- [x] sticky header offset과 section anchor 점검
- [x] logo top navigation 정리
- [x] login CTA auth transition 연결
- [x] external App Store CTA 예외 확인
- [x] 역할 탭 semantics와 local motion 적용
- [x] mobile carousel reduced motion 적용
- [ ] hero 최초 motion의 필요성 시각 QA 후 결정
- [x] 반복 scroll reveal이 없는지 점검

완료 조건:

- 랜딩은 정적인 마케팅 페이지가 아니라 반응이 명확한 제품 진입 화면으로 느껴진다.
- mobile에서 웹 화면을 축소한 느낌 없이 touch scroll과 tap이 자연스럽다.
- 모션이 콘텐츠를 읽는 속도를 방해하지 않는다.

### Phase 5. 인증과 app surface 적용

- [x] landing -> auth
- [x] auth form mode
- [x] auth success -> requested path
- [x] top-level app tab
- [x] interview list/detail/back
- [x] chat list/thread/detail/back
- [x] profile/settings/back
- [x] notification/detail/back
- [x] legal/support public routes
- [x] map local state와 route push 구분

### Phase 6. 검증과 정리

- [x] unit/integration tests 통과 (`17` files, `100` tests)
- [x] web lint/typecheck 통과
- [x] Vite production build 통과
- [ ] canonical viewport browser QA
- [ ] reduced motion real-browser QA (unit fallback test는 통과)
- [x] unsupported API fallback unit QA
- [x] `git diff --check`
- [x] 관련 active 문서의 motion/navigation 항목 최신화
- [x] 사용자 승인 전 Figma sync와 Vercel 배포는 수행하지 않음

## 20. 완료 기준

다음을 모두 만족해야 구현 완료로 판단한다.

1. 모든 내부 route 변경이 단일 navigation API를 사용한다.
2. component-level direct `pushState`와 synthetic popstate가 제거된다.
3. back/forward 방향과 scroll restoration이 테스트로 보장된다.
4. 랜딩 anchor, external link, query/local state가 route animation과 구분된다.
5. landing/auth/tab/push/back 이동이 각 계약에 맞게 표현된다.
6. reduced motion에서 movement와 smooth scroll이 제거된다.
7. View Transitions API가 없어도 모든 기능이 동일하게 동작한다.
8. app shell이 상위 탭 이동마다 불필요하게 재등장하지 않는다.
9. route 완료 후 title, focus, screen-reader 안내가 올바르다.
10. transition이 auth/data 요청을 지연시키지 않는다.
11. canonical viewport와 주요 브라우저에서 blank flash, layout jump,
    duplicate navigation이 없다.
12. 테스트, lint/typecheck, production build 결과가 문서에 기록된다.

## 21. 위험과 대응

### 위험 1. custom history와 React state 불일치

대응:

- animation보다 navigation core 통합을 먼저 한다.
- 한 함수가 URL write와 React commit을 소유한다.
- sequence id와 updater exactly-once 테스트를 둔다.

### 위험 2. 브라우저 지원 차이

대응:

- feature detection을 사용한다.
- CSS와 JS 모두 fallback을 기본 경로로 유지한다.
- API 지원을 제품 기능 조건으로 사용하지 않는다.

### 위험 3. animation이 느리거나 과해짐

대응:

- 최대 `220ms`, 최대 `8px` 원칙을 지킨다.
- 상위 탭은 fade만 사용한다.
- visual QA에서 motion을 추가하는 것뿐 아니라 제거하는 판단도 한다.

### 위험 4. map, chat, split view 상태 손실

대응:

- route와 local selection을 먼저 분류한다.
- query 변경에 full transition을 적용하지 않는다.
- origin path와 scroll/selection restoration을 테스트한다.

### 위험 5. 접근성 회귀

대응:

- reduced motion, focus, title, announcement를 Phase 2에서 먼저 구현한다.
- visual effect와 accessibility handoff를 같은 완료 조건으로 본다.

## 22. 문서 종료 조건

다음이 모두 끝나면 이 문서를 `docs/completed/`로 이동한다.

- Phase 1-6 구현 완료
- 자동화 검증과 browser QA 결과 기록
- 관련 auth/desktop/landing active 계획의 중복 task 정리
- 배포 여부와 배포된 commit 기록
- Figma sync 여부를 최종 보고에 명시

브라우저 QA, 배포 승인, Figma 동기화만 남고 코드 구현이 모두 끝난 경우에는 실제
남은 실행 작업이 있는지 판단한다. 단순 참고·회귀 체크 목록만 남았다면 active에
두지 않고 completed 또는 reference로 이동한다.
