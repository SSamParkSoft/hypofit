# Desktop Web Service UI Advancement Plan

Status: active

## 2026-07-19 문서·구현 상태 대조

- 랜딩의 로그인 진입이 `/app`에 연결되고 관련 테스트가 존재함을 확인했다.
- 공용 `PageToolbar` 구현을 확인하고 아직 없는 `FilterPopover`를 별도 잔여
  항목으로 분리했다.
- 공개 지원 계획에서 문의 목록·상세·작성 흐름이 구현 완료됐음을 반영했다.
- Vercel production deployment가 `Ready`이고 `/`, `/app`, legal, support,
  delete-account 공개 경로가 HTTP 200임을 확인했다.
- canonical viewport, 실제 브라우저, 키보드, 확대, 모바일 웹 E2E, Figma
  항목은 확인 근거가 없으므로 완료 처리하지 않았다.

## 2026-07-16 추가 진행

- 인터뷰와 채팅 목록의 초기 로딩 상태가 목록 바깥의 독립 카드처럼 보이던
  문제를 제거했다. 각 목록의 실제 row 구조와 동일한 스켈레톤을 목록 내부에
  렌더링하고, 기존 로딩 문구는 스크린리더용 상태 정보로 유지한다.
- 지도 캔버스는 Kakao SDK 로딩·실패만 소유하도록 단순화했다. 모집글
  로딩·API 오류·빈 결과는 데스크톱 결과 패널 또는 모바일 바텀시트 한 곳에서만
  표시하며, 모바일 바텀시트는 결과가 0개여도 유지한다. 지도 이동 때 잠깐
  나타나던 검색 진행 문구와 선택 전 사용 안내는 제거해 상단 패널 높이를
  안정적으로 유지한다.

## 2026-07-13 구현 진행 요약

- 공통 web app shell, route manifest, safe-area/viewport 변수, skip link를 구현했다.
- 홈, 인터뷰, 내 인터뷰, 모집글 생성, 지도, 채팅, 프로필, 알림 화면의
  desktop 정보 구조를 업무형 list/detail 또는 workspace 구조로 재구성했다.
- 홈은 viewport 높이를 넘기지 않는 작업 화면으로 고정하고 브랜드·알림 header가
  아닌 최근 인터뷰 목록만 내부 스크롤을 소유하게 했다.
- 1200px 이상 desktop shell은 rail과 main의 grid 위치를 명시하고 compact top
  navigation을 강제로 숨겨 breakpoint utility 충돌이 본문을 다음 행으로 미는
  문제를 방지했다.
- 인터뷰 검색·필터·선택 상태와 채팅방 선택 상태를 URL에 반영했다.
- phone web fallback은 기존 단일 화면·bottom navigation·map sheet 흐름을
  유지하고, 768px 이상 compact web과 1200px 이상 desktop layout을 분리했다.
- `pnpm --dir apps/web lint`, 전체 39개 테스트, Vite production build가
  통과했다.
- 현재 세션에서 in-app browser 연결을 사용할 수 없어 canonical viewport
  캡처, 실제 브라우저 시각 QA, 모바일 웹 E2E는 아직 완료 처리하지 않았다.
- Figma 동기화는 사용자 승인 이후 수행한다. Vercel production 배포와 공개
  route 확인은 이후 요청에 따라 완료했다.

Last updated: 2026-07-19

Shared web history, scroll restoration, focus handoff, and route-level motion
implementation history is recorded in
`docs/completed/web-navigation-motion-system-plan.md`. This plan
continues to own the authenticated web shell, screen information architecture,
and responsive layout.

Production visual-quality remediation for the implemented authenticated web
surface history is recorded in
`docs/completed/authenticated-web-ui-ux-quality-remediation-plan.md`.
That plan owns single brand placement, semantic typography and spacing, surface
reduction, route-by-route visual backlog, and visual acceptance gates. This
document remains the information-architecture and responsive-layout contract.

Public signed-out support and the authenticated inquiry inbox are specified in
`docs/completed/public-support-and-authenticated-inquiry-experience-plan.md`.
That document is
the detailed execution contract for `/support`, `/support/inquiries`, support
ticket list/detail/composer behavior, and store-facing support URL verification.

## 1. 목적

`apps/web`의 인증 후 서비스 영역인 `/app`과 그 하위 화면을 데스크톱 웹에
맞는 운영형 제품 경험으로 고도화한다.

현재 Hypofit에서 가장 성숙한 제품 경험은 `apps/mobile`이다. 모바일 앱은
홈, 인터뷰 탐색, 지도, 채팅, 프로필, 신청과 모집 관리의 상태 구조와 문구,
사용자 흐름을 가장 최신 상태로 담고 있다. 웹은 모바일의 제품 결정을 기준으로
삼되, 모바일 화면을 넓게 늘리는 방식으로 구현하지 않는다.

웹의 목표는 다음과 같다.

- 창업자가 모집글, 지원자, 채팅, 진행 상태를 넓은 화면에서 빠르게 비교하고
  처리할 수 있게 한다.
- 인터뷰어가 인터뷰를 검색하고 조건을 비교하며 신청 상태와 채팅을 빠르게
  오갈 수 있게 한다.
- 모바일에서 검증된 상태 언어, 주요 CTA, 정보 우선순위, 안전 기능을 유지한다.
- 데스크톱의 장점인 목록·상세 병렬 보기, 고정 내비게이션, 키보드 조작,
  넓은 검색·필터 영역을 활용한다.
- 랜딩 `/`과 서비스 `/app`의 역할을 분명히 나누고 랜딩의 `로그인` 진입을
  서비스 인증 흐름에 연결한다.

이 계획은 단순한 색상·여백 수정이 아니라 고객용 웹 서비스의 레이아웃 시스템,
내비게이션, 공용 컴포넌트, 핵심 화면을 단계적으로 재구성하는 실행 계획이다.

## 2. 범위

### 2.1 포함

- `/app` 고객용 웹 앱 셸과 데스크톱 내비게이션
- 로그인·회원가입 및 인증 완료 후 진입 흐름
- 홈
- 인터뷰 검색과 필터
- 인터뷰 상세와 신청
- 내 인터뷰와 모집글 관리
- 모집글 만들기와 수정
- 지도
- 채팅 목록과 채팅방
- 알림 센터
- 프로필과 설정 하위 화면
- 문의, 신고, 약관, 개인정보처리방침, 계정 삭제로 이어지는 고객 흐름
- 로딩, 빈 상태, 오류, 권한 없음, 긴 텍스트, 많은 데이터 상태
- 데스크톱·노트북·좁은 브라우저·모바일 웹 fallback 반응형
- 접근성, 키보드 조작, 성능, 자동화된 시각 QA 기반

### 2.2 제외

- 공개 랜딩 `/`의 전체 재설계
- App Store·Google Play 스크린샷 제작
- Expo React Native 모바일 UI 재설계
- 운영자 전용 `/admin`의 정보 구조 재설계
- 새로운 API 기능, 결제, 에스크로, AI 매칭
- iPad 전용 UI
- 모바일 바텀시트와 제스처를 데스크톱에 그대로 복제하는 작업

랜딩과 스토어 이미지는
`landing-page-and-store-creative-production-plan.md`에서 계속 관리한다.
`/admin`은 고객용 웹의 토큰과 접근성 개선을 공유할 수 있지만 별도의 운영 도구로
취급한다.

## 3. 제품 원칙

### 3.1 모바일은 제품 계약의 기준이다

모바일에서 다음을 웹으로 가져온다.

- `홈 / 인터뷰 / 지도 / 채팅 / 프로필`의 상위 정보 구조
- 창업자·인터뷰어·둘 다 역할에 따른 기능 노출
- 인터뷰 상태와 신청 상태의 용어
- 검색 → 상세 확인 → 신청 → 채팅 → 일정 → 완료 흐름
- 읽음 상태, 안 읽은 메시지, 상태 배지, 신고·차단·지원 경로
- 짧고 자연스러운 한국어 문구
- row 중심의 비교 가능한 목록
- 카드가 필요한 경우와 필요하지 않은 경우의 구분

다음은 웹으로 그대로 가져오지 않는다.

- 하단 탭 내비게이션
- 드래그 가능한 바텀시트
- 화면 전체를 덮는 모바일 전용 상세 전환
- 안전 영역을 위해 사용한 모바일 전용 여백
- 44px 터치 중심의 모든 밀도 결정
- 한 번에 한 작업만 보이게 하는 작은 화면 제약
- 지도 위에 겹치는 모바일 플로팅 버튼 배치

### 3.2 웹은 운영형 작업 공간이다

웹은 대시보드처럼 지표 카드를 늘어놓는 화면이 아니라, 실제 인터뷰 업무를
더 빠르게 수행하는 작업 공간이어야 한다.

- 반복 목록은 row와 구분선을 우선한다.
- 선택한 항목의 상세는 같은 화면의 오른쪽 패널에 보여줄 수 있다.
- 사용자가 비교 중인 목록을 상세 진입 때문에 잃지 않게 한다.
- 페이지 제목보다 현재 할 일과 상태가 먼저 읽히게 한다.
- 넓은 화면에서 무의미한 여백이 생기지 않게 하되 모든 영역을 카드로 채우지
  않는다.
- 전체 화면을 사용하는 지도·채팅은 일반 문서형 페이지와 다른 레이아웃을 쓴다.

### 3.3 모바일과 웹은 기능 계약은 같고 조작 방식은 다르다

같아야 하는 것:

- 데이터와 상태
- 주요 사용자 작업
- 권한과 역할
- 문구 의미
- 신고, 차단, 삭제, 약관 등 안전 기능

달라도 되는 것:

- 한 화면에 동시에 보이는 패널 수
- 내비게이션 위치
- 상세 정보가 열리는 방식
- 필터와 검색의 배치
- 행 높이와 정보 밀도
- 보조 동작의 노출 위치

## 4. 현재 코드 진단

### 4.1 강점

- `AppShell`에 모바일 하단 탭과 데스크톱 왼쪽 rail이 이미 분리돼 있다.
- `/app`, `/interviews`, `/map`, `/chat`, `/profile`의 상위 경로가 존재한다.
- `PageFrame`, `PageHeader`, `Button`, `Field`, `StatusBadge`, 상태 컴포넌트
  등 기본 공용 UI가 있다.
- 홈과 인터뷰는 넓은 화면에서 목록·상세 분할을 일부 지원한다.
- 지도는 데스크톱에서 지도와 오른쪽 목록 패널을 분리한다.
- 채팅은 모바일 목록/방 전환과 데스크톱 병렬 보기를 이미 구분한다.
- 실제 API와 Supabase 데이터를 사용하며 mock UI에 의존하지 않는다.
- Tailwind CSS 4 토큰에 Hypofit 색, radius, shadow가 정의돼 있다.

### 4.2 구조적 문제

- 데스크톱 rail은 기능적으로만 존재하고 브랜드·계정·알림·보조 작업의 셸
  계약이 충분하지 않다.
- 데스크톱에서도 페이지마다 헤더, 최대 너비, 여백, 카드 사용 방식이 다르다.
- 홈이 큰 카드 안에 목록을 넣어 모바일 구조를 확대한 인상을 준다.
- 일부 화면은 `max-w-[1480px]`, 일부는 `860px`, 일부는 자체 전체 화면을
  사용하지만 이를 결정하는 페이지 유형이 문서화돼 있지 않다.
- 검색·필터·페이지 작업 버튼이 화면별로 다른 크기와 위치를 사용한다.
- 목록 선택, 상세 패널, 전체 상세 페이지의 책임이 중복된다.
- `App.tsx`가 큰 path switch와 인증·공개 경로·앱 경로를 함께 소유한다.
- 내비게이션 상태와 URL 상태가 완전히 일치하지 않을 가능성이 있다.
- 필터와 선택 상태가 URL에 남지 않아 새로고침·공유·브라우저 뒤로가기가
  데스크톱 사용 기대와 다를 수 있다.
- 모바일 대응 클래스가 같은 파일에 많이 섞여 데스크톱 의도를 읽기 어렵다.
- 실제 고객용 웹과 운영자 `/admin`의 UI 밀도 기준이 명확히 분리되지 않았다.

### 4.3 시각적 문제

- 페이지 섹션마다 흰 카드와 테두리를 반복해 화면 전체가 카드 모음처럼 보일 수
  있다.
- 따뜻한 배경색과 흰 표면의 차이가 모든 화면에서 같은 의미로 사용되지 않는다.
- 데스크톱에서 제목·설명문이 모바일보다 크게 늘어나 작업 정보보다 먼저 보이는
  화면이 있다.
- 넓은 화면에서 row가 과도하게 늘어나거나 반대로 중앙에 좁게 갇히는 화면이
  혼재한다.
- 선택 상태, 읽음 상태, 신청 상태가 한 row에서 경쟁할 수 있다.
- 빈 상태와 오류 상태가 넓은 화면에서 지나치게 작은 블록으로 보일 수 있다.

## 5. 외부 기준과 적용 원칙

이 계획은 다음 기준을 구현 검토의 근거로 사용한다.

- W3C WCAG 2.2:
  https://www.w3.org/TR/WCAG22/
- W3C 최소 포인터 target 24×24 CSS px와 충분한 간격:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WAI-ARIA Authoring Practices의 tabs, dialog, menu button, combobox:
  https://www.w3.org/WAI/ARIA/apg/patterns/
- web.dev responsive design의 content-driven breakpoint, reflow, grid,
  pointer capability 기준:
  https://web.dev/articles/responsive-web-design-basics
- web.dev CLS와 INP 최적화:
  https://web.dev/articles/optimize-cls
  https://web.dev/articles/optimize-inp
- Carbon UI shell의 header, left panel, optional right panel 구조:
  https://carbondesignsystem.com/patterns/global-header/
- Carbon grid influencer와 작업 중 참고 정보를 유지하는 side panel 원칙:
  https://carbondesignsystem.com/elements/2x-grid/usage/
- Atlassian layout/navigation system의 navigation/content 영역 구분:
  https://atlassian.design/components/navigation-system/layout

적용 규칙:

- breakpoint는 특정 기기 이름이 아니라 콘텐츠가 무너지는 지점으로 정한다.
- 320 CSS px까지 가로 스크롤 없이 핵심 작업이 reflow되어야 한다.
- 기본 클릭 target은 최소 32px, 주요 버튼과 아이콘 버튼은 36~40px를
  권장하고 WCAG 최소 24px 아래로 내려가지 않는다.
- 키보드 focus는 2px 이상 외곽선 또는 동등한 가시성을 유지한다.
- menu, tabs, dialog, combobox는 자체 div 조합보다 native HTML 또는 검증된
  Radix primitive를 우선한다.
- 목록·상세 병렬 화면의 상세 패널은 선택한 목록을 가리지 않고 레이아웃을
  재분배하는 방식을 기본으로 한다.
- 이미지, 지도, 패널, skeleton은 안정적인 크기를 예약해 CLS를 줄인다.

## 6. 목표 정보 구조

```text
/                         public landing
/app                      web home
/interviews               interview discovery
/interviews/:postId       shareable full detail
/interviews/new           create interview
/my-interviews            applications and owned posts
/map                      location discovery
/chat                     inbox
/chat/:roomId             shareable conversation
/notifications            notification center
/profile                  profile overview
/profile/*                account and settings
/support                  support tickets
/report                   report flow
/legal/*                  public legal documents
/account-deletion         public deletion information
/admin                    separate operator console
```

현재 동적 상세가 query parameter나 컴포넌트 상태에 의존한다면 구현 단계에서
경로 계약을 먼저 감사한다. URL 변경은 기존 링크, 알림 deep link, 모바일 링크,
심사 URL을 깨지 않도록 호환 경로를 유지한다.

## 7. 반응형 레이아웃 모델

수치는 초기 구현 토큰이며 실제 콘텐츠 QA로 조정한다.

### 7.1 Compact: 320–767px

- 모바일 웹에서도 MVP 핵심 흐름을 끝까지 사용할 수 있게 한다.
- 하단 탭과 단일 열 흐름을 사용한다.
- 네이티브 모바일의 모든 고급 제스처를 복제하지 않는다.
- 로그인, 인터뷰 탐색·상세·신청, 채팅, 내 인터뷰, 프로필, 약관, 삭제,
  지원 흐름을 우선 보장한다.
- 고객용 모바일의 주 배포 대상은 계속 Expo 앱이다.

### 7.2 Medium: 768–1199px

- 축소 가능한 navigation rail 또는 상단 메뉴를 사용한다.
- 기본은 단일 본문과 overlay/detail drawer 조합이다.
- 채팅과 지도는 두 개 영역까지 허용한다.
- iPad 전용 최적화가 아니라 좁은 노트북·태블릿 fallback이다.

### 7.3 Desktop: 1200–1599px

- 224–240px 고정 왼쪽 navigation rail을 사용한다.
- 본문은 페이지 유형에 따라 1열, 2열 split view, full workspace 중 하나를
  선택한다.
- 인터뷰·홈은 목록과 상세를 병렬 표시한다.
- 채팅은 목록과 대화를 병렬 표시하고 컨텍스트 패널은 접을 수 있게 한다.

### 7.4 Wide: 1600px 이상

- 본문을 무조건 끝까지 늘리지 않는다.
- 일반 페이지는 1440–1600px 안에서 제한한다.
- 지도, 채팅처럼 공간이 데이터 가독성을 높이는 작업 화면만 추가 너비를 쓴다.
- 세 번째 컨텍스트 패널은 실제 참고 작업이 있을 때만 노출한다.

### 7.5 높이와 zoom

- 1280×720과 1366×768에서 주요 CTA가 접히지 않아야 한다.
- 브라우저 200% zoom에서 핵심 기능이 가로 스크롤 없이 reflow되어야 한다.
- 고정 헤더와 footer가 keyboard focus를 가리지 않아야 한다.
- 작은 높이에서는 page 전체보다 내부 목록이 scroll owner가 되도록 한다.

### 7.6 모바일 웹 경험 계약

모바일 웹은 네이티브 앱의 대체 배포물이 아니지만, 앱 설치 전 탐색과 링크 공유,
일시적인 브라우저 이용, 지원·법적 흐름을 수행할 수 있는 완전한 웹 클라이언트로
취급한다. 단순히 데스크톱 화면을 좁혀서 보여주는 fallback으로 만들지 않는다.

#### 기능 범위

- 비로그인: 랜딩, 소셜 로그인, 소셜 콜백, 약관,
  개인정보처리방침, 계정 삭제 안내
- 로그인: 홈, 인터뷰 검색·필터·상세·신청, 내 인터뷰, 지도 결과, 채팅,
  알림, 프로필·설정, 문의·신고, 계정 삭제
- 네이티브 권장: 카메라 촬영, 정교한 지도 제스처, 푸시 알림 설정처럼 브라우저별
  차이가 큰 기능은 지원 가능한 범위에서 제공하고 앱 열기/설치 경로를 함께 둔다.
- 브라우저에서 지원하지 않는 기능은 조용히 사라지게 하지 않고 대체 행동과 이유를
  짧게 안내한다.

#### shell과 navigation

- `<768px`에서는 desktop sidebar와 top bar를 제거하고 모바일 전용 app shell을
  사용한다.
- 상위 탭은 모바일 앱과 같은 `홈 / 인터뷰 / 지도 / 채팅 / 프로필` 순서를 유지한다.
- 상세·작성·채팅방에서는 하단 탭을 숨길 수 있지만, 명시적인 뒤로가기와 원래 탭
  복귀 경로를 보존한다.
- 하단 탭 높이와 콘텐츠 reserve는 공용 CSS 변수로 관리하고 페이지별 margin
  숫자로 보정하지 않는다.
- iOS standalone/PWA와 Safari에서는 `env(safe-area-inset-top)`과
  `env(safe-area-inset-bottom)`을 반영한다.

#### viewport와 browser chrome

- app-height surface는 `100vh` 대신 `100dvh`와 안전한 fallback을 사용한다.
- iOS Safari 주소창과 Android Chrome toolbar가 접히고 펼쳐져도 header, CTA,
  composer, bottom navigation이 겹치지 않아야 한다.
- `viewport-fit=cover` 사용 여부는 safe-area 적용과 함께 검증한다.
- standalone PWA, Safari tab, Chrome tab의 높이 차이를 같은 고정 offset으로
  처리하지 않는다.
- 홈·지도·채팅은 page와 내부 panel 중 하나만 scroll owner가 되도록 명시한다.

#### 입력과 키보드

- 로그인, OTP, 신청, 모집글 form, 채팅 composer는 키보드가 열린 상태에서도
  현재 입력과 primary action이 접근 가능해야 한다.
- 모바일 Safari의 자동 확대를 막기 위해 form control의 실제 입력 글자 크기를
  16 CSS px 아래로 내리지 않는다.
- keyboard open 상태를 고정 높이 추정으로 처리하지 않고 visual viewport 또는
  자연스러운 reflow를 우선한다.
- submit 후 키보드를 닫아야 하는 검색·OTP·채팅 행동을 화면별로 명시한다.

#### 상호작용 변환

- hover에만 존재하는 정보나 action을 만들지 않는다.
- desktop popover/menu는 모바일에서 viewport를 벗어나면 dialog 또는 anchored
  sheet로 전환한다.
- list-detail 화면은 단일 목록 → full detail route로 전환하며 URL과 browser back을
  유지한다.
- desktop right panel은 compact에서 inline expansion 또는 full route 중 하나로
  바꾸고 같은 정보를 두 번 렌더링하지 않는다.
- map bottom sheet를 제공할 경우 discrete snap과 버튼 대안을 함께 제공하고,
  drag gesture가 map pan이나 row click과 동시에 처리되지 않게 한다.

#### 앱 유도 원칙

- 모바일 웹의 핵심 기능을 막고 앱 설치만 강제하지 않는다.
- 앱 설치 banner는 콘텐츠와 primary CTA를 가리지 않는 dismissible 보조 UI로 둔다.
- 앱이 설치된 환경에서는 universal/app link가 준비된 뒤에만 `앱에서 열기`를
  제공한다.
- 웹 로그인 상태와 네이티브 앱 로그인 상태가 자동으로 공유된다고 가정하지 않는다.

## 8. 공용 Web App Shell

### 8.1 DesktopSidebar

구성:

- 실제 Hypofit 아이콘과 wordmark
- 홈, 인터뷰, 지도, 채팅, 프로필
- 현재 위치를 색과 indicator로 함께 표현
- 읽지 않은 채팅·알림 count는 필요한 항목에만 표시
- 하단 계정 요약 또는 설정 진입
- 역할이 `founder` 또는 `both`일 때만 접근 가능한 만들기 동작은 인터뷰
  화면의 page action으로 유지

금지:

- `H` 문자만 표시하는 임시 로고
- nav item마다 큰 카드 배경
- hover에서만 알 수 있는 기능
- 페이지마다 다른 rail 너비

### 8.2 AppTopBar

데스크톱 본문 상단에 다음 계약을 둔다.

- 현재 페이지 이름 또는 breadcrumb
- 선택적인 통합 검색 진입
- 알림 아이콘
- 프로필 메뉴
- page-specific action slot

모든 페이지에 무조건 큰 헤더를 넣지 않는다. 지도와 채팅은 compact top bar를
사용하고, 홈과 인터뷰는 toolbar와 결합할 수 있다.

### 8.3 PageLayout variants

공용 variants:

- `document`: 프로필, 약관, 지원처럼 읽기 중심
- `list-detail`: 홈, 인터뷰, 내 인터뷰
- `workspace`: 지도, 채팅
- `form`: 모집글 생성·수정, 계정 정보
- `auth`: 로그인·회원가입

각 variant는 최대 너비, padding, scroll owner, header 위치를 중앙화한다.
페이지 파일이 임의 `max-w`, `h-dvh`, `p-7` 조합을 새로 만들지 않게 한다.

## 9. 화면별 설계

### 9.1 랜딩 → 로그인 → 서비스

- 랜딩 데스크톱 오른쪽 위에 보조 `로그인` 링크를 추가한다.
- `로그인`은 `/app`으로 이동한다.
- 세션이 없으면 로그인 화면, 세션이 있으면 웹 홈을 보여준다.
- `앱 다운로드`는 계속 primary CTA이며 로그인과 같은 시각 강도로 만들지 않는다.
- 모바일 랜딩에서도 `로그인`은 text action, `앱 받기`는 primary action으로 둔다.
- 추후 세션 확인 비용과 깜빡임이 해결되면 로그인 상태에서 `서비스 열기`로
  바꿀 수 있다.

### 9.2 인증

- 데스크톱에서도 폼은 420–480px의 읽기 가능한 너비를 유지한다.
- 폼을 화면 전체 크기 카드로 만들지 않는다.
- 브랜드, 제목, 입력, primary action, 보조 링크 순서를 모바일과 맞춘다.
- 회원가입 OTP와 역할 선택의 단계와 문구는 모바일 계약을 따른다.
- password manager, autocomplete, Enter submit, visible label을 지원한다.
- 오류는 필드 오류와 전역 오류를 구분하고 Sentry code를 사용자 문구에 노출하지
  않는다.
- 인증 성공 시 history를 정리해 뒤로가기로 OTP 화면에 돌아가지 않게 한다.

### 9.3 홈

목표 질문:

- 새로 올라온 인터뷰는 무엇인가?
- 내가 이어서 처리할 일은 무엇인가?
- 다음 행동은 어디에서 시작하는가?

Desktop 구성:

- 상단 compact greeting 또는 서비스 상태, 알림
- 주 영역: 최근 인터뷰 목록
- 오른쪽: 선택한 인터뷰 preview/detail
- 창업자에게 처리할 신청·채팅이 있을 때만 compact activity section 표시
- 지표 카드는 사용하지 않는다.
- 인터뷰 전체 검색 기능은 인터뷰 탭에 남기고 홈은 최근성과 진행성에 집중한다.

### 9.4 인터뷰 탐색

- 상단 한 줄 toolbar에 검색, 진행 방식, 사례비, 지역, 결과 count를 배치한다.
- 상세 조건은 `필터` 버튼의 popover/dialog에 넣되 선택된 조건은 toolbar 아래
  removable chip으로 표시한다.
- 데스크톱은 55–65% 목록, 35–45% 상세 패널을 기본으로 한다.
- row는 제목, 타깃, 방식, 지역, 사례비, 예상 시간, 상태 중 비교에 필요한 값만
  보여준다.
- 선택 row와 읽은 row를 다른 상태로 구분하고 색만 사용하지 않는다.
- 검색어·필터·선택은 URLSearchParams에 반영해 새로고침과 공유를 지원한다.
- 모바일 inline expansion은 compact/medium에서만 사용하고 desktop은 detail
  panel을 우선한다.

### 9.5 인터뷰 상세와 신청

- 공유 가능한 full detail route를 유지한다.
- 본문은 서비스/타깃/진행 방식/시간/장소/사례비/모집자 정보 순으로 읽힌다.
- 신청 전에는 신청 조건과 관련 경험·가능 시간 입력을 보여준다.
- 신청 후에는 중복 신청 폼 대신 현재 상태와 `채팅 보기`를 보여준다.
- primary action은 오른쪽 context rail 또는 sticky bottom action area 중 화면
  높이에 맞는 한 곳만 사용한다.
- 신고는 본인 모집글에서 숨기고 타인 글에서만 접근 가능하게 한다.

### 9.6 내 인터뷰

- `신청한 인터뷰`와 `내 모집글`을 명확한 tabs로 나눈다.
- 역할이 respondent이면 내 모집글 tab을 렌더링하지 않는다.
- tab은 WAI-ARIA tabs pattern과 keyboard 이동을 지원한다.
- row는 번호나 avatar 같은 불필요한 장식을 넣지 않는다.
- 신청 목록은 인터뷰 제목, 창업자, 신청 상태, 최신 변경 시각을 중심으로 한다.
- 모집글 목록은 제목, 모집 상태, 지원자 수, 최근 활동을 중심으로 한다.
- row 선택은 오른쪽 preview 또는 full management route로 연결한다.

### 9.7 모집글 관리·생성·수정

- 생성과 수정은 같은 field primitive와 validation contract를 공유한다.
- 넓은 화면은 main form 720–840px + 오른쪽 preview/작성 상태 영역을 사용할 수
  있다.
- form section을 카드 안에 다시 넣지 않고 제목·구분선·필드 그룹으로 나눈다.
- 사례비, 예상 시간, 모집 인원은 숫자와 단위를 분리해 읽고 입력할 수 있게 한다.
- 대면이 포함되면 장소 검색과 상세 주소, 공개 범위를 연속된 그룹으로 둔다.
- 날짜 선택과 자유 일정 문구의 관계를 명확히 한다.
- 저장 중, 성공, validation, API conflict 상태를 모두 정의한다.
- 완료 상태에서는 수정·삭제 가능 여부를 API 정책과 맞춘다.

### 9.8 지도

- 데스크톱에서는 지도 canvas + 380–440px 검색/목록 panel을 기본으로 한다.
- 지도 canvas와 목록 panel은 하나의 workspace frame 안에서 같은 높이와
  위아래 inset을 공유하고, 두 영역 사이는 세로 구분선으로 나눈다.
- 데스크톱 workspace는 viewport에서 상하 24px을 확보한다. 중간 화면의
  상단 navigation reserve가 1200px 이상 desktop 높이 계산에 남지 않게 한다.
- 모바일 bottom sheet 코드를 데스크톱에서 재사용하지 않는다.
- 검색, 현재 위치, 지도 범위 재검색, mode filter를 panel 상단에 둔다.
- marker 선택 결과는 목록 panel의 선택 row와 상세 preview에 동기화한다.
- marker cluster는 count와 선택 상태를 명확히 보여준다.
- 지도 이동 중 자동 검색은 debounce하고 진행 상태가 화면을 계속 덮지 않게 한다.
- 위치 권한 거부, 검색 실패, 지도 SDK 실패, 결과 없음 상태를 panel 안에서
  해결한다.
- 지도 영역과 목록 영역의 scroll/zoom gesture를 분리한다.

### 9.9 채팅

Desktop 기본:

```text
conversation list 320–360px
  + flexible thread
  + optional interview context 300–360px
```

- conversation row는 모바일의 이름, 인터뷰 제목, 마지막 메시지, 시간, unread,
  상태 구조를 유지한다.
- 목록 row를 카드로 만들지 않고 구분선과 선택 indicator를 쓴다.
- thread header에는 상대, 알림, 더보기, 인터뷰 상세 진입을 둔다.
- interview context panel은 일정, 신청 상태, 모집글 요약처럼 대화 중 참고해야 하는
  정보만 담는다.
- 작은 desktop에서는 context panel을 닫을 수 있다.
- composer는 thread 하단에 고정하고 메시지 목록만 scroll한다.
- 긴 대화는 measured need가 생길 때 virtualization을 도입한다.
- polling, active window, unread, optimistic message, retry 상태를 시각적으로
  구분한다.
- 날짜 separator와 system message는 일반 사용자 message bubble과 다르게 한다.

### 9.10 알림

- 데스크톱 header의 bell은 최근 알림 right panel을 열 수 있다.
- `모두 보기`는 `/notifications` 전용 페이지로 이동한다.
- deep link와 브라우저 뒤로가기를 위해 전용 route를 제거하지 않는다.
- 읽음/안 읽음은 배경, marker, font weight 중 두 가지 이상으로 표현한다.
- 알림 클릭 결과가 원래 탭과 상세 context로 돌아가도록 route contract를 보존한다.

### 9.11 프로필과 설정

- 데스크톱은 220–260px 설정 navigation + 640–760px content 구조를 사용한다.
- 모바일의 구분선 row 스타일과 아이콘 의미를 유지한다.
- 프로필 요약은 하나의 compact identity section으로 제한한다.
- 계정 정보, 역할 설정, 알림 설정, 보기 설정, 문의, 신고, 공지, 피드백을 그룹화한다.
- 약관, 개인정보처리방침, 계정 삭제, 로그아웃은 보조 영역에 두되 접근 가능성을
  낮추지 않는다.
- destructive action은 confirm dialog와 명확한 결과를 사용한다.

### 9.12 문의·신고·법적 문서

- 문의는 목록 + 상세 또는 목록 + 작성 panel을 사용한다.
- 답변된 문의는 답변, 날짜, 상태가 명확히 분리된다.
- 신고는 문의와 별도 흐름을 유지한다.
- 개인정보처리방침과 이용약관은 장식 카드 없이 정적 문서 typography를 쓴다.
- keyboard와 browser find가 정상 동작하도록 실제 text DOM을 유지한다.

### 9.13 화면별 모바일 웹 변환

| 화면 | 데스크톱 웹 | 모바일 웹 |
| --- | --- | --- |
| 랜딩 | 넓은 hero와 제품 화면, 우측 상단 로그인 | 모바일 전용 콘텐츠 순서, 앱 받기 primary, 로그인 text action |
| 인증 | 중앙 정렬된 420–480px form | 단일 열 full-height form, keyboard-safe CTA |
| 홈 | 최근 목록 + 선택 상세 | 최근 목록 단일 열, row 선택 시 inline 요약 또는 상세 route |
| 인터뷰 | 검색 toolbar + 목록·상세 split | 검색 field + compact filter, 목록 단일 열, 상세 full route |
| 내 인터뷰 | tabs + 목록·preview | tabs + 목록, 선택 시 management/detail route |
| 모집글 form | main form + optional preview | 단일 열 section form, 하단 action은 키보드와 nav를 침범하지 않음 |
| 지도 | map + 고정 결과 panel | full map + 최소 결과 sheet/list route, 현재 위치와 검색 control 유지 |
| 채팅 | conversation list + thread + context | 채팅 목록과 채팅방을 별도 route로 분리, 채팅방에서는 하단 탭 숨김 |
| 알림 | bell panel + full page | full page list, 알림 target 방문 후 browser back 복원 |
| 프로필 | settings navigation + content | 구분선 row 목록 + full subpage |
| 문의 | 목록 + 상세/작성 panel | 목록 → 상세 또는 작성 full route |
| 법적 문서 | 제한된 읽기 너비 | 화면 너비 text document, browser find와 link 접근 보장 |

각 화면 구현 PR은 `desktop`, `mobile web`, `shared behavior` 세 항목으로 변경
영향을 기록한다. 모바일 웹에서 의도적으로 제외한 기능은 코드에서 우연히 사라진
상태로 두지 않고 계획과 사용자 대체 경로를 함께 기록한다.

## 10. 공용 컴포넌트 계획

신규 또는 재정의 대상:

- `WebAppShell`
- `DesktopSidebar`
- `AppTopBar`
- `PageLayout`
- `PageToolbar`
- `SplitView`
- `ContextPanel`
- `ResponsiveDrawer`
- `ListSurface`
- `ListRow`
- `RowMeta`
- `RowActions`
- `FilterToolbar`
- `FilterPopover`
- `SearchCombobox`
- `Tabs`
- `StatusBadge`
- `EmptyState`
- `ErrorState`
- `SkeletonRow`
- `FormSection`
- `StickyActionBar`
- `ConfirmDialog`
- `ToastRegion`

규칙:

- 공용 컴포넌트는 실제 두 화면 이상에서 같은 문제를 해결할 때 만든다.
- static styling은 Tailwind class를 사용한다.
- 복잡한 class 조합은 `cva` 또는 기존 `cn` helper로 관리한다.
- 전역 CSS는 font, tokens, base behavior, unavoidable browser normalization에
  제한한다.
- DOM과 React Native UI 컴포넌트를 공유하지 않는다.
- shared contract와 pure formatter는 `packages/contracts`에서 재사용할 수 있다.
- icon은 lucide-react를 사용하고 임의 SVG를 만들지 않는다.

## 11. 디자인 토큰

### 11.1 Layout

- sidebar: 232px 기본, compact rail은 별도 검증
- top bar: 56–64px
- desktop page inset: 24–32px
- wide page inset: 32–40px
- list-detail gap: 16–24px
- document max width: 760–860px
- standard content max width: 1440–1600px
- chat/map workspace: available width 사용

### 11.2 Row density

- compact metadata row: 52–60px
- interview/chat primary row: 68–84px
- setting row: 48–56px
- multiline row는 content에 따라 늘어나되 hover로 높이가 바뀌지 않는다.

### 11.3 Typography

- Spoqa Han Sans Neo를 모바일과 웹의 공통 font로 사용한다.
- 서비스 화면 title은 24–28px 범위에서 compact하게 유지한다.
- section title은 18–22px.
- row title은 14–16px.
- metadata는 12–13px이되 contrast를 확보한다.
- hero scale type을 앱 내부에 사용하지 않는다.
- line height와 실제 Spoqa Han Sans Neo metrics를 기준으로 input vertical alignment를
  검증한다.

### 11.4 Color and surface

- Hypofit green은 primary action과 selected state에 집중한다.
- 기본 배경, raised surface, selected surface의 의미를 토큰으로 고정한다.
- 카드는 독립된 개체나 decision surface에만 사용한다.
- page section을 떠 있는 카드로 만들지 않는다.
- 상태는 색과 label/icon을 함께 쓴다.

### 11.5 Motion

- hover/focus: 100–160ms
- panel open/close: 180–240ms
- layout 전환은 transform/opacity를 우선한다.
- `prefers-reduced-motion`에서 불필요한 이동을 제거한다.
- 선택으로 인해 row 높이가 예고 없이 바뀌지 않게 한다.

## 12. 라우팅과 상태 구조

### 12.1 현재 위험

`App.tsx`가 공개 경로, 인증, splash, customer route, admin route를 모두 큰
분기로 처리한다. UI 고도화와 함께 분기가 더 커지면 뒤로가기, deep link,
선택 상태, 탭 상태 회귀 위험이 커진다.

### 12.2 단계적 개선

1. 현재 경로 목록과 owner를 route manifest로 추출한다.
2. 공개, 인증, customer app, operator route group을 분리한다.
3. `useWebNavigation` 또는 동등한 작은 history wrapper로 push, replace,
   popstate를 중앙화한다.
4. tab destination과 pathname을 하나의 source of truth로 만든다.
5. search/filter/selected row를 URLSearchParams에 저장할 화면을 정의한다.
6. nested route 요구가 더 커질 때만 React Router 도입을 별도 결정한다.

현재 MVP에서는 라우터 라이브러리 도입 자체가 목표가 아니다. 기존 링크를 깨지
않고 경로 계약을 명시하는 것이 먼저다.

## 13. 상태 설계

모든 핵심 화면에서 다음 상태를 디자인하고 구현한다.

- initial loading
- background refetch
- empty first use
- empty filtered result
- API error
- auth expired
- forbidden role
- deleted/hidden resource
- offline/network timeout
- optimistic mutation
- mutation success
- mutation conflict 409
- long Korean title/body
- missing profile image
- many unread items
- zero unread items
- destructive confirmation

Skeleton은 실제 row 크기와 같아야 하며 로딩 완료 시 레이아웃이 움직이지 않아야
한다. background refetch는 전체 화면 loading으로 되돌리지 않는다.

## 14. 접근성

- `main`, `nav`, `aside`, `header` landmark를 올바르게 사용한다.
- skip link를 제공한다.
- 현재 nav에는 `aria-current="page"`를 유지한다.
- 모든 icon-only button에 accessible name과 tooltip을 제공한다.
- focus order는 시각적 순서와 일치한다.
- sticky header/panel이 focused element를 가리지 않게 한다.
- dialog open 시 focus를 내부로 이동하고 close 시 trigger로 복귀한다.
- tabs는 arrow key 이동, selected state, tabpanel 연결을 지원한다.
- combobox는 입력, suggestion, keyboard selection을 지원한다.
- 색만으로 선택·오류·상태를 구분하지 않는다.
- 200% zoom과 text spacing override를 점검한다.
- 입력 오류는 field label과 연결하고 해결 방법을 제공한다.
- 인증은 password manager와 paste를 막지 않는다.

## 15. 성능

목표:

- p75 LCP ≤ 2.5s
- p75 INP ≤ 200ms
- p75 CLS ≤ 0.1

실행:

- route/page lazy loading 유지
- 큰 지도·관리·채팅 bundle 분리
- 이미지 width/height 또는 aspect ratio 예약
- font preload는 실제 효과 측정 후 적용
- 모든 화면에서 무분별한 animation과 box shadow 제한
- TanStack Query cache와 background refetch 사용
- 검색 입력 debounce와 request cancellation 적용
- 인터뷰/채팅 virtualization은 데이터 규모 측정 후 도입
- 개발 mock이 아니라 운영과 유사한 row 수로 성능 확인

## 16. QA Matrix

### 16.1 Viewports

- 320×568: minimum fallback
- 390×844: mobile web fallback
- 430×932: large phone mobile web
- 768×1024: medium fallback
- 1024×768: compact laptop/tablet landscape
- 1280×720: short laptop
- 1366×768: common laptop
- 1440×900: standard desktop
- 1600×900: wide desktop
- 1920×1080: full HD

### 16.2 Browsers

- Chrome current
- Safari current on macOS
- Edge current
- iOS Safari에서 auth와 MVP 핵심 흐름
- iOS standalone PWA에서 shell, safe area, keyboard, navigation
- Android Chrome에서 auth와 MVP 핵심 흐름
- Android installed PWA에서 shell, keyboard, back navigation

### 16.3 Interaction

- keyboard only
- mouse
- trackpad
- coarse pointer where available
- iOS/Android browser chrome expand·collapse
- mobile virtual keyboard open·close
- browser back과 swipe-back
- 200% browser zoom
- reduced motion
- slow network
- expired session

### 16.4 Data

- no interviews
- 1 interview
- 20+ interviews
- long title and target
- missing profile image
- founder/respondent/both roles
- no chats
- many chats and unread messages
- map permission denied
- map SDK unavailable
- answered/unanswered support tickets

## 17. 구현 단계

### Phase 0. 기준선과 계약 고정

- [ ] 현재 `/app` 전체 화면을 canonical desktop viewport로 캡처한다.
- [ ] Expo 모바일, 모바일 웹, 데스크톱 웹의 기능·상태 parity 표를 확정한다.
- [ ] 390px 모바일 웹에서 현재 핵심 흐름과 viewport 문제를 캡처한다.
- [x] customer web, landing, admin의 디자인 책임을 분리한다.
- [ ] desktop layout 유형과 breakpoint를 실제 콘텐츠로 검증한다.
- [x] 랜딩에 `로그인 → /app` 진입을 추가한다.
- [x] existing route/deep-link 회귀 테스트를 보강한다.

### Phase 1. Web foundation

- [x] web layout/token 계약을 `styles.css`와 shared UI에 정의한다.
- [x] `PageLayout` variants를 구현한다.
- [x] `DesktopSidebar`와 `AppTopBar`를 구현한다.
- [x] `CompactWebShell`과 공용 bottom navigation reserve를 구현한다.
- [x] `dvh`, safe-area, standalone PWA, browser tab viewport 변수를 정리한다.
- [x] 실제 로고, nav selected/unread, account action을 적용한다.
- [x] route manifest와 navigation wrapper를 추출한다.
- [x] skip link와 focus foundation을 추가한다.

### Phase 2. Shared operational components

- [x] `ListSurface`와 화면별 compact row 계약을 구현한다.
- [x] `SplitView`와 `ContextPanel`을 구현한다.
- [x] `PageToolbar`를 구현한다.
- [ ] `FilterPopover`를 구현한다.
- [ ] accessible tabs/menu/dialog/combobox 계약을 정리한다.
- [ ] form section과 sticky action primitive를 구현한다.
- [ ] loading/empty/error/skeleton 상태를 페이지 유형별로 보강한다.
- [x] Storybook은 새로 도입하지 않고 테스트 harness 또는 실제 페이지로 검증한다.

### Phase 3. 홈과 인터뷰 핵심 흐름

- [x] 홈을 row + selected detail 구조로 재구성한다.
- [x] 인터뷰 검색·필터 toolbar를 재구성한다.
- [x] filter/search state를 URL에 보존한다.
- [x] 인터뷰 row 정보 밀도와 상태 우선순위를 통일한다.
- [x] 인터뷰 detail panel과 full detail 책임을 정리한다.
- [x] 신청 전/후 CTA를 통일한다.
- [x] 내 인터뷰 tabs와 row를 재구성한다.
- [x] 모집글 관리와 지원자 context를 desktop에 맞게 재구성한다.
- [ ] compact에서 split view를 단일 목록·상세 route로 변환한다.
- [ ] 모바일 웹에서 검색·필터·신청·채팅 이동을 end-to-end 검증한다.

### Phase 4. 생성·수정 form

- [ ] 모집글 create/edit field contract를 통일한다.
- [x] desktop form layout과 preview/context 영역을 구현한다.
- [x] 장소·상세 주소·공개 범위를 하나의 group으로 정리한다.
- [x] 일정·사례비·시간·모집 인원 단위를 정리한다.
- [ ] validation, conflict, success 상태를 테스트한다.
- [ ] 완료 상태에서 수정·삭제 정책을 API와 대조한다.

### Phase 5. 지도와 채팅 workspace

- [x] 지도 desktop panel 구조를 공용 workspace layout에 맞춘다.
- [x] map search, current location, result, selection 상태를 동기화한다.
- [x] 모바일 sheet 로직과 desktop panel 로직의 경계를 분리한다.
- [x] 채팅 list/thread split을 재구성한다.
- [x] wide desktop optional context panel을 구현한다.
- [ ] composer, unread, retry, date separator, system message를 검증한다.
- [x] map/chat이 document scroll을 잠그고 내부 목록만 scroll을 소유하게 한다.
- [ ] map/chat의 short-height viewport를 실제 브라우저에서 시각 검증한다.
- [x] 모바일 웹 지도 sheet와 desktop 결과 panel이 독립 layout을 사용하게 한다.
- [ ] 모바일 웹 채팅방에서 bottom nav, keyboard, composer reserve를 검증한다.

### Phase 6. 프로필·알림·지원·인증

웹 진입 스플래시와 로그인·회원가입 responsive redesign의 상세 실행 계약은
`docs/completed/responsive-web-auth-entry-experience-plan.md`를 따른다.

- [x] 프로필을 settings navigation + content 구조로 재구성한다.
- [x] 계정·역할·알림·보기 설정 form을 통일한다.
- [x] notification list와 full page 책임을 정리한다.
- [x] 문의 목록·상세·작성 흐름을 재구성한다.
- [x] 신고 흐름을 문의와 분리해 유지한다.
- [x] auth form과 OTP 단계의 desktop alignment를 보강한다.
- [ ] legal/delete-account route와 접근성을 회귀 테스트한다.

### Phase 7. 반응형·접근성·성능 QA

- [ ] canonical viewport matrix를 자동 캡처한다.
- [ ] Chrome, Safari, Edge smoke를 진행한다.
- [ ] keyboard-only와 screen reader 핵심 흐름을 점검한다.
- [ ] 200% zoom, long text, text spacing을 점검한다.
- [ ] LCP, INP, CLS를 측정하고 regression budget을 기록한다.
- [ ] responsive overflow와 fixed element overlap을 검사한다.
- [ ] iOS Safari·standalone PWA와 Android Chrome·installed PWA를 점검한다.
- [ ] browser chrome, safe area, virtual keyboard, browser back 회귀를 점검한다.
- [ ] empty/error/loading/auth-expired 상태를 확인한다.

### Phase 8. 승인·Figma·배포

- [ ] 코드 화면에서 사용자 시각 승인을 받는다.
- [ ] 승인된 최종 화면만 Figma에 동기화한다.
- [ ] Figma의 desktop frames를 한 구역에 정리한다.
- [x] web typecheck, targeted tests, full build를 실행한다.
- [ ] Vercel preview에서 production env와 API 연결을 smoke한다.
- [x] 사용자 승인 후 manual production deploy를 진행한다.
- [x] `/`, `/app`, legal, support, delete-account route를 production에서 확인한다.
- [ ] 계획 완료 후 `docs/completed/`로 이동한다.

2026-07-13 코드 재점검 보완:

- 768~1023px에서 compact top navigation과 mobile bottom navigation이 동시에
  나타나던 breakpoint 충돌을 제거했다.
- 채팅 목록의 실제 선택 버튼에 keyboard focus ring을 적용했다.
- 채팅 상대 프로필과 차단 확인 overlay를 Radix modal dialog로 전환해 focus
  trap, Escape 닫기, focus restore를 확보했다.
- 전체 web 테스트 `75 passed`, TypeScript/Vite production build,
  `git diff --check` 통과를 확인했다.

## 18. 테스트 계획

### Unit/component

- route manifest와 destination path
- search/filter URL serialization
- role-based action visibility
- tabs keyboard behavior
- menu/dialog focus behavior
- list row selected/read/unread/status state
- form validation과 API conflict mapping

### Integration

- landing login → `/app` auth → home
- interview search → select → detail → apply
- applied interview → chat
- founder post → applicant → chat/detail
- notification → target route → back
- profile subpage → back to profile
- account deletion → logout/auth

### Visual

- canonical viewport screenshot baselines
- long copy and large data states
- no card nesting
- no horizontal overflow
- selected/focus/hover/disabled/loading variants
- map and chat short-height layouts

## 19. 위험과 대응

### 모바일을 그대로 확대할 위험

대응: 각 화면 구현 전에 `mobile contract`와 `desktop interaction`을 별도 표로
작성한다.

### SaaS dashboard처럼 변할 위험

대응: metric card를 금지하고 실제 작업 row, detail, context를 우선한다.

### 공용 컴포넌트 과설계

대응: 두 화면 이상에서 반복되기 전에는 추상화하지 않는다.

### routing 회귀

대응: route manifest를 먼저 만들고 deep link, popstate, notification entry,
auth redirect 테스트를 유지한다.

### 한 번에 전 화면을 바꾸는 위험

대응: shell → shared components → 핵심 인터뷰 흐름 → workspace → settings 순으로
진행하며 phase별로 배포 가능한 상태를 유지한다.

### 기존 production과 Git 불일치

대응: 구현 시작 전 현재 랜딩 변경을 commit/push해 production source를 Git과
맞춘다. 이후 Vercel은 명시적 배포만 수행한다.

## 20. 완료 기준

다음 조건을 모두 만족해야 완료 처리한다.

- 모바일의 핵심 기능·상태·문구 계약이 웹에 보존된다.
- 웹이 모바일 확대판이 아니라 데스크톱 작업 공간으로 보인다.
- 모바일 웹에서 MVP 핵심 흐름을 앱 설치 강제 없이 완료할 수 있다.
- 홈, 인터뷰, 지도, 채팅, 프로필이 하나의 shell과 spacing 체계를 사용한다.
- 목록·상세·context panel 책임이 화면별로 명확하다.
- 랜딩에서 로그인 후 `/app`으로 정상 진입한다.
- role, auth, URL, back navigation이 회귀하지 않는다.
- 320px reflow, desktop viewport, 200% zoom에서 핵심 기능이 사용 가능하다.
- iOS Safari, Android Chrome, standalone PWA에서 safe area, keyboard,
  browser back과 bottom navigation이 충돌하지 않는다.
- keyboard focus, tabs, menus, dialogs, combobox가 접근성 계약을 지킨다.
- production-like data에서 overflow와 성능 문제가 없다.
- web build와 관련 테스트가 통과한다.
- 사용자 승인 후 Figma가 최종 코드 화면과 동기화된다.
- Vercel production smoke가 완료된다.
- 이 문서를 `docs/completed/`로 옮기고 active index를 갱신한다.
