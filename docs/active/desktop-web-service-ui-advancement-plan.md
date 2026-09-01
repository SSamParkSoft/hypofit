# Desktop Web Service UI Advancement Plan

Status: active

## 2026-08-26 Calm Emerald Product UI System

### 구현 범위

- `/app`, `/interviews`, `/map`, `/chat`, `/profile`의 기존 route와 정보
  구조를 유지한 채, 인증 후 web surface를 Calm Emerald product system으로
  정리한다.
- desktop은 top navigation과 existing master-detail/workspace 구성을,
  phone은 5개 destination bottom navigation과 단일 흐름을 유지한다.
- API, route, data model, map/chat interaction, interview filter와 selection
  flow는 변경하지 않는다.

### 적용한 규칙

- product token은 neutral surface를 기본으로 하고 `#0F7A4D`를 primary
  action, selection, current state에만 사용한다. lime은 current progress의
  작은 accent로 제한한다.
- top navigation active state는 pill 대신 brand text와 2px bottom indicator를
  사용한다. mobile tab active surface도 compact marker로 제한한다.
- home은 현재 이어갈 인터뷰를 focus panel로 유지하고, 일정이 없을 때는 dark
  surface 대신 compact neutral empty state를 표시한다. 최근 인터뷰는 독립 카드
  grid 대신 divider 기반 row list로 표시한다.
- interview desktop filters는 search, quick filter와 `필터` entry로 밀도를
  낮추되, modal filter panel에서 기존 조건을 모두 유지한다.
- profile은 긴 설명형 header와 icon tile 반복을 줄이고 identity summary,
  account edit entry, grouped divider rows로 정리한다.
- selected list rows, chat outgoing messages, detail panels는 각각
  `surface-selected`, `brand-soft`, solid border surface를 사용한다. content
  card의 불필요한 shadow는 제거한다.

### 2026-08-26 검증 기록

- web typecheck, lint(architecture boundary 포함), 전체 test `331`건,
  production build와 public browser smoke가 통과했다.
- browser smoke는 공개/보호 auth entry와 `390x844` viewport를 확인한다.
  인증된 route의 나머지 viewport visual capture는 유효한 review credential로
  다시 실행할 수 있는 후속 QA 항목으로 남긴다.
- bundle budget은 현재 CSS asset `119.35 KiB raw / 19.49 KiB gzip`가 기존
  budget을 초과해 실패한다. landing motion/style 누적을 포함한 repository
  baseline 차이이므로, 이번 product UI 기능 검증과 분리해 CSS budget 기준 또는
  stylesheet 분리를 별도로 정리해야 한다.

### 2026-08-26 Profile 2.0 desktop workspace

- `/profile`은 하나의 Profile 2.0 responsive component를 사용한다. `>=1200px`에서
  `320px` identity surface와 open management column의 two-column workspace로
  전환하고, 그 아래에서는 같은 정보 구조가 single-column으로 자연스럽게 접힌다.
  legacy `ProfilePage`로 교체 렌더링하지 않는다.
- desktop header에는 실제 `모집글 만들기` entry만 두고, `내 인터뷰`는 real count를
  가진 `내 활동` row로 이동한다. account, notification, inquiry, report, policy,
  sign-out, deletion route는 모두 유지한다.
- identity surface는 프로필 사진 upload, 이름, email, 소속, bio, profile edit을
  소유한다. activity와 management section은 container border 대신 divider, spacing,
  tonal hover로 hierarchy를 만든다.
- profile photo upload/state와 activity data loading은 `useProfileWorkspace`로
  공유해 desktop/compact presentation이 business logic을 중복하지 않는다. 이
  workflow의 explicit feature dependencies만 web boundary check에 추가했다.

## 2026-08-15 반응형 UI 고도화 실행 계획

### 현재 기준선

- 현재 구현의 종합 반응형 완성도는 `84/100`으로 평가한다.
- 데스크톱은 상단 내비게이션, 최대 너비, 목록·상세 병렬 구조와 지도·채팅
  workspace가 안정적이므로 `89/100` 수준이다.
- 모바일 웹은 `dvh`, safe area, 하단 내비게이션 reserve와 단일 화면 흐름이
  갖춰져 있어 `84/100` 수준이다.
- `768~1199px` compact web은 기능상 동작하지만 전용 정보 밀도와 전환 규칙이
  충분히 검증되지 않아 `78/100` 수준이다.
- 이번 작업의 목표는 새 레이아웃 체계를 발명하는 것이 아니라 이미 관측된
  breakpoint 충돌, 높이 중복, scroll ownership 불일치를 제거해 전체 점수를
  `90/100` 이상으로 올리는 것이다.

### 범위와 비범위

이번 작업에 포함한다.

- 인증 후 `/app`의 홈, 인터뷰, 지도, 채팅, 프로필 공통 shell
- `320~1199px`의 phone/compact fallback과 `1200px+` desktop 전환
- viewport 높이, safe area, header/bottom navigation reserve
- 문서 스크롤과 내부 panel/list 스크롤의 소유권
- 한국어 긴 문자열, empty/loading/error 상태의 overflow
- 키보드 탐색, focus, touch target과 `200%` 확대 시 핵심 흐름

이번 작업에서 제외한다.

- iPad 전용 정보 구조와 태블릿 전용 디자인 시스템
- 모바일 RN 화면 재설계
- 모든 CSS utility를 새 abstraction으로 감싸는 대규모 리팩터링

### 반응형 계약

| 구간 | 내비게이션 | 기본 구성 | 스크롤 원칙 |
| --- | --- | --- | --- |
| `<768px` | 5개 하단 탭 | phone single-column 또는 full-screen task surface | 일반 페이지는 document scroll, 홈·지도·채팅방은 선언된 내부 영역만 scroll |
| `768~1199px` | 상단 전역 내비게이션 | compact single-column을 기본으로 하고 충분한 폭이 필요한 단순 section만 2열 | body와 내부 panel의 동시 scroll을 피하고 페이지별 owner를 하나로 고정 |
| `>=1200px` | 상단 전역 내비게이션 | list/detail 또는 workspace split | 지도·채팅 workspace는 내부 scroll, 일반 페이지는 document scroll |
| `>=1600px` | 상단 전역 내비게이션 | 실제 보조 정보가 있을 때만 third context panel 허용 | `1200px` 계약을 유지하고 빈 공간을 채우기 위한 panel은 추가하지 않음 |

구현 규칙:

- 같은 요소에 범위가 열린 `md:*` grid 규칙과 `min-[1200px]:*` desktop grid
  규칙을 함께 두지 않는다. compact 규칙은 필요한 경우
  `md:max-[1199px]:*`로 닫는다.
- shell에서 header를 제외한 작업 높이를 계산한 뒤 자식 페이지가 다시
  `100dvh` 또는 `h-dvh`를 적용하지 않는다.
- 페이지 높이는 공통 CSS 변수와 `PageLayout`/workspace helper가 소유하고,
  개별 화면은 콘텐츠 배치만 소유한다.
- 화면 전체와 내부 목록이 동시에 `overflow-y-auto`를 갖지 않도록 한다.
- breakpoint는 콘텐츠가 실제로 깨지는 지점에만 추가한다. 기기명이나 임의의
  미세 구간별 breakpoint를 늘리지 않는다.

### Phase R1. Shell과 높이 계약 정리

- [x] `AppShell`의 normal document page와 full-height workspace 계약을
  명시적으로 분리한다.
- [x] header, footer, mobile bottom navigation을 제외한 실제 content height를
  공통 변수로 계산한다.
- [x] `PageLayout`의 `workspace` variant가 shell 내부에서 `h-dvh`를 중복
  적용하지 않게 수정한다.
- [x] `InterviewsPage`의 desktop `h-dvh`를 제거하거나 공통 workspace height로
  치환해 header 높이만큼 생기는 불필요한 문서 overflow를 막는다.
- [x] 지도와 채팅은 기존 full-height 동작을 유지하되 footer 접근을 위한 scroll
  chain이 desktop에서만 작동하는지 확인한다.

완료 기준:

- `1280x720`, `1280x832`, `1440x900`에서 일반 페이지에 의도하지 않은
  header 높이만큼의 세로 overflow가 없다.
- 지도와 채팅의 지도 캔버스, 방 목록, 메시지 목록 높이가 footer나 viewport
  변화 때문에 줄어들거나 가려지지 않는다.

### Phase R2. Compact web `768~1199px` 정리

- [x] 홈 Bento는 `768~1199px`에서 명시적인 2열 또는 full-span 조합만 사용하고
  implicit grid column이 생기지 않게 한다.
- [x] 인터뷰와 프로필은 compact에서 단일 읽기 흐름을 유지하고 desktop
  detail/context panel을 억지로 축소하지 않는다.
- [ ] 지도는 검색창, 현재 위치 버튼, 결과 sheet가 `768x1024`와
  `1024x768`에서 겹치지 않게 한다.
- [x] 채팅은 compact에서 목록과 대화방을 동시에 좁게 표시하지 않고 route
  기반 단일 pane 전환을 유지한다.
- [ ] 상단 전역 내비게이션은 `768px`에서 브랜드, 5개 메뉴, 알림, 계정 메뉴가
  overflow하지 않는지 확인하고 필요하면 라벨 간격만 조정한다.

완료 기준:

- `768x1024`, `1024x768`, `1199x800`에서 가로 스크롤이 없다.
- 카드나 row의 제목, 상태, CTA가 잘리거나 다른 열을 밀어내지 않는다.
- compact 화면에서 desktop용 빈 detail panel이 남지 않는다.

### Phase R3. 화면별 scroll ownership 통일

- [x] 홈, 인터뷰, 지도, 채팅, 프로필에 대해 document/panel/list 중 실제 scroll
  owner를 한 줄짜리 표로 코드 주석이 아닌 이 문서에 확정한다.
- [x] 홈은 콘텐츠가 늘어난 현재 Bento 구조에 맞춰 document scroll을 기본으로
  하고, 카드 안에 불필요한 중첩 scroll을 만들지 않는다.
- [x] 인터뷰는 desktop 목록이 내부 scroll을 소유할 필요가 있을 때만 고정
  높이를 사용하고 compact/mobile에서는 자연스러운 document flow를 유지한다.
- [x] 지도는 page scroll을 잠그고 결과 panel 또는 mobile sheet만 scroll한다.
- [ ] 채팅 목록/방은 메시지 영역만 scroll하고 composer는 viewport와 keyboard에
  가려지지 않게 고정한다.
- [x] 프로필과 설정은 document scroll만 사용하고 내부 설정 block에 별도
  scrollbar를 만들지 않는다.

확정할 scroll owner:

| 화면 | phone | compact web | desktop |
| --- | --- | --- | --- |
| 홈 | document | document | document |
| 인터뷰 | document | document | list panel은 실제 고정 workspace일 때만 internal |
| 지도 | map viewport + sheet internal | map viewport + result internal | map/result panel internal |
| 채팅 목록 | document 또는 room list | document | room list internal |
| 채팅방 | message list internal | message list internal | message list internal |
| 프로필·설정 | document | document | document |

### Phase R4. 콘텐츠·접근성 stress 보강

- [ ] 이름, 인터뷰 제목, 지역, 상태, 빈 상태 문구에 긴 한국어 fixture를 넣어
  wrap, truncate, line-clamp 정책을 확인한다.
- [ ] filter, icon button, bottom navigation의 pointer target을 phone에서 최소
  `44x44 CSS px`로 유지한다.
- [ ] `200%` 확대에서 상단 메뉴 접근, 인터뷰 검색, 지도 검색, 채팅 입력,
  프로필 설정 진입이 가능해야 한다.
- [ ] keyboard-only에서 skip link, 상단 메뉴, popup, list row, detail CTA의 focus
  순서와 focus-visible을 확인한다.
- [ ] `prefers-reduced-motion`에서 route와 popup 동작이 정보 손실 없이 완료되는지
  확인한다.

### Phase R5. 검증과 회귀 방지

필수 viewport:

```text
phone:          390 x 844
large phone:    430 x 932
compact tall:   768 x 1024
compact wide:  1024 x 768
desktop short: 1280 x 720
desktop entry: 1280 x 832
desktop:       1440 x 900
wide desktop: 1728 x 1117
```

- [ ] 홈, 인터뷰, 지도, 채팅, 프로필을 위 viewport에서 캡처한다.
- [ ] loading, empty, error, long-content 상태는 대표 화면에서 최소 한 번씩
  확인한다.
- [ ] Chrome을 기본 자동 smoke 대상으로 삼고 Safari에서 `dvh`, sticky header,
  safe area, keyboard 관련 핵심 화면을 수동 확인한다.
- [x] 기존 authenticated browser smoke를 필수 viewport별 navigation 전환과
  horizontal overflow 검사로 확장한다.
- [x] shared shell 또는 workspace 수정 후 web `typecheck`, lint, 전체 test,
  production build, browser smoke를 실행한다.

최종 완료 기준:

- 필수 viewport 전체에서 `document.documentElement.scrollWidth`가 viewport
  너비를 초과하지 않는다.
- fixed/sticky 요소가 콘텐츠, CTA, footer 또는 keyboard와 겹치지 않는다.
- 각 화면의 실제 scroll owner가 위 표와 일치한다.
- breakpoint 양쪽 `767/768`, `1199/1200px`에서 내비게이션과 주요 pane이
  중복되거나 사라지지 않는다.
- 시각 QA에서 desktop `90+`, compact web `85+`, mobile web `88+`, 종합
  `90+`를 달성한다.

### 2026-08-15 구현·검증 기록

- `--app-shell-content-height`를 추가해 phone bottom navigation, compact top
  navigation, desktop header를 제외한 content height 계산을 한 곳으로 모았다.
- `AppShell`은 normal document page와 map/chat desktop workspace를 분리하고,
  홈은 모바일 하단 내비게이션 reserve를 다시 갖도록 수정했다.
- `PageLayout.workspace`와 `InterviewsPage`에서 중복 `h-dvh`를 제거했다.
- 지도 compact 높이의 `100dvh - 4rem` literal을 제거하고 공통 shell height를
  사용한다.
- authenticated browser smoke는 `390x844`, `430x932`, `767x900`,
  `768x1024`, `1024x768`, `1199x800`, `1200x800`, `1280x720`, `1280x832`,
  `1440x900`, `1728x1117`에서
  5개 핵심 route의 horizontal overflow와 상단/하단 navigation 전환을 검사한다.
- web lint와 architecture boundary, 전체 `305` tests, typecheck, production
  build, bundle budget, 공개 browser smoke가 통과했다.
- authenticated responsive smoke 실행은 기존 review account의 Supabase REST
  sign-in이 `invalid_credentials`를 반환해 완료하지 못했다. 구현은 준비됐지만
  유효한 smoke credential로 재실행하기 전에는 viewport 시각 QA와 관련 체크를
  완료 처리하지 않는다.

## 2026-08-15 홈 작업 허브 목업 고도화

- 사용자 검토용 목업으로 홈의 동일한 `icon + title + description + row` 반복을
  해체했다. 섹션 제목의 장식용 Lucide 아이콘과 `AI 추천` 배지는 제거하고,
  아이콘은 지원자·채팅·일정처럼 실제 상태나 행동을 설명할 때만 사용한다.
- 첫 화면은 `오늘의 인터뷰` greeting과 역할과 무관하게 접근 가능한
  `모집글 만들기` CTA로 시작한다. 바로 아래에는 현재 진행 단계와 다음 행동을
  함께 보여주는 `CurrentFocusPanel`, 가장 가까운 일정을 강조하는
  `NextSchedulePanel`을 8:4 비대칭 구성으로 둔다.
- `최근 올라온 인터뷰`는 행 목록이 아니라 독립적으로 탐색할 수 있는 2열 타일로
  바꿨다. `오늘의 추천`은 한 건만 강조하되 AI 위젯처럼 보이는 색상 배지와
  `추천한 이유` 문단 대신 방식·시간·사례비의 실제 모집글 정보를 우선한다.
  최근 타일과 구별되는 옅은 브랜드색 surface는 유지하되, 내부를 가르는 구분선은
  사용하지 않는다. 실제 `created_at`을 상대 시각으로 표시해 추천의 최신성을
  사용자가 직접 판단할 수 있게 한다. 최근 인터뷰와 추천 모두 제목 아래에 작은
  프로필 이미지와 모집자 이름을 표시해 게시물의 신뢰 주체가 바로 보이게 한다.
  모집자 프로필에 팀 또는 회사 정보가 있으면 이름과 함께 소속명도 표시한다.
  계정정보 편집에서는 창업자 역할을 사용할 때만 선택형 소속 유형과 소속명을
  입력할 수 있게 하며, 이는 별도 조직 계정이나 권한 모델을 만들지 않는다.
  홈 하단 공지는 제거하고 전역 알림 진입점에 맡긴다.
- elevation은 현재 진행 패널 한 곳에 집중한다. 다음 일정은 브랜드색의 평면
  decision surface, 최근 인터뷰는 낮은 경계선 타일, 추천은 중립 반투명 surface와
  사례비 강조 typography를 사용해 AI 위젯이나 동일한 카드 반복처럼 보이지 않게 한다.
- 작은 화면에서는 모든 영역을 단일 열로 재배치하고, 최근 인터뷰만 `sm` 이상에서
  2열을 사용한다. 데스크톱은 핵심 영역 `8:4`, 하단 영역 `8:4` 비율을 사용하며
  각 카드 내부에 독립 scroll을 만들지 않는다.
- 최근 인터뷰 타일과 오늘의 추천은 곧바로 route를 바꾸지 않고 중앙 미리보기
  dialog를 연다. 미리보기는 제목, 방식, 사례비, 요약, 찾는 대상을 보여주며
  `상세 보기`에서 기존 인터뷰 경로로 이동한다. ESC, overlay, 명시적인 닫기
  버튼으로 취소할 수 있고 실제 신청 입력은 상세 화면에 남긴다.
- 이번 변경은 실데이터 연결 전 시각·정보 구조 검토를 위한 목업이다. 사용자 시각
  승인 전이므로 production aggregator 연결은 진행하지 않는다.

## 2026-08-15 홈 작업 허브 실데이터 연결

- `/app` 홈의 정적 mock data를 제거하고 기존 Spring API 응답을 조합하는
  `useHomeDashboard`와 순수 read-model builder로 교체했다. 별도 홈 전용
  endpoint를 추가하지 않고 현재 MVP 규모에 필요한 네 API만 병렬 조회한다.
  - 공개 모집글: `GET /api/v1/interview-posts/?status=open&sort=newest&limit=8`
  - 내가 신청했거나 내 모집글에 들어온 신청: `GET /api/v1/applications/`
  - 내 인터뷰 일정: `GET /api/v1/sessions/`
  - 내 채팅방과 unread count: `GET /api/v1/chat/rooms/`
- web architecture boundary에는 `home -> applications/chat/interview-posts/sessions`
  네 방향만 명시적인 workflow edge로 등록했다. `shared`나 다른 feature 전체를
  우회하는 광범위한 allowlist는 추가하지 않았다.
- `내 진행 상황`은 새 지원자 확인, 선정 후 일정 조율, 신청 결과 대기, 읽지 않은
  채팅, 예정된 인터뷰 순서로 지금 이어갈 한 가지 행동을 고른다. 가장 가까운 미래
  일정은 별도 `다음 일정` surface에 표시한다.
- `최근 올라온 인터뷰`는 API의 최신순 open 모집글 최대 4건을 사용한다. 데이터가
  없거나 일부 조회가 실패하면 가짜 모집글을 대신 노출하지 않고 skeleton,
  재시도 가능한 오류, 명시적인 empty state를 보여준다.
- `오늘의 추천`은 AI 매칭이나 지원자 ranking이 아니다. 현재는 본인의 모집글과
  이미 신청한 모집글을 제외한 최신 open 후보 중 사례비가 가장 높은 한 건을
  선택하는 결정적 규칙이다. UI는 생성형 추천 사유를 만들지 않고 실제 모집
  상태·방식·시간·사례비만 보여준다. AI 추천·점수·선정 가능성은 주장하지 않는다.
- 홈 타일과 추천 미리보기의 상세 경로는 실제 interview post id를 사용하고,
  현재 진행·다음 일정은 실제 내 인터뷰와 채팅 경로로 연결한다.

## 2026-08-13 홈 mock Bento 프로토타입

- 시각 검토 후 `내 진행 상황`을 Bento의 첫 번째이자 왼쪽 상단 카드로 이동했다.
  역할 배지는 제거하고 greeting은 `{이름}님, 안녕하세요`로 단순화했다.
- 별도 `다음 일정` 카드는 `내 진행 상황` 하단으로 합쳤다. 신청·지원자·채팅·알림을
  숫자로 나열하던 통계 grid는 제거하고 실제로 이어갈 행과 가장 가까운 일정만
  보여준다.
- `내 진행 상황`은 데스크톱 첫 행 전체 폭으로 확장한다. 다음 행은 최근 인터뷰
  7열과 맞춤 추천 5열로 구성하며, 맞춤 추천은 대표 인터뷰 한 건만 노출한다.
  별도 `내 주변` 카드는 제거하고 위치 탐색은 지도 탭에 맡긴다.
- 모든 카드를 불투명한 흰색 패널로 반복하지 않고, 배경이 은은하게 비치는
  저투명 흰색 surface와 부드러운 부유 shadow를 사용한다. 아이콘의 별도 색상
  박스도 제거해 생성형 AI 대시보드처럼 보이는 반복 장식을 줄인다.
- `1200px` desktop grid는 `min-[1200px]` span과 일반 `md:` grid 규칙을 동시에
  적용하지 않는다. Tailwind CSS 4 생성 순서에서 `md:grid-cols-2`가 desktop
  12열을 덮는 동안 자식의 7열·5열 span은 남아 implicit column이 생기는 문제가
  재현됐다. medium 규칙을 `md:max-[1199px]` 범위로 한정해 desktop 12열과
  명확히 배타적으로 유지한다.
- `/app` 홈은 기존 recent-interview list/detail/apply 중복 구조를 제거하고,
  `apps/web/src/features/home/` 아래의 feature-owned mock Bento dashboard로
  재구성한다.
- 이번 단계는 데스크톱 정보 구조와 시각 밀도를 빠르게 검증하기 위한 mock UI
  프로토타입이다. 포함 섹션은 `맞춤 추천`, `내 진행 상황`, `다음 일정`,
  `최근 올라온 인터뷰`, `공지와 안내`다.
- 각 섹션은 nested card를 만들지 않고 row, divider, compact section header로
  구성한다. 상위 shell의 global notification은 유지하고, 홈 route에서는 현재
  auth 사용자 이름을 greeting에 사용한다.
- `맞춤 추천`은 production AI나 ranking을 의미하지 않는다. 실제 recommendation
  logic, 실데이터 집계, notice source, nearby source, founder/respondent별 live
  composition은 후속 작업으로 남긴다.
- production follow-up:
  - mock home cards를 실제 recent/progress/schedule/notice data
    aggregator로 교체
  - recommendation section을 승인된 AI summary/recommendation 범위와 다시
    연결할지 결정
  - mock route target을 실제 post/detail/deep-link target으로 치환

## 2026-08-13 데스크톱 상단 내비게이션 통합

- `768px` 이상 웹 셸은 브랜드, `홈 / 인터뷰 / 지도 / 채팅 / 프로필`, 알림,
  계정 메뉴를 하나의 전역 상단 헤더에 배치한다. `1200px` 이상에서 사용하던
  232px 왼쪽 rail과 분리된 브랜드·유틸리티 헤더는 제거했다.
- 메뉴 수가 5개이고 2차 내비게이션을 상시 펼칠 필요가 없는 현재 정보 구조에
  맞춰 텍스트 중심 메뉴와 현재 위치를 나타내는 연한 브랜드 배경을 사용한다.
  별도의 하단 강조선은 두지 않으며, 모바일 `<768px`의 5개 하단 탭은 유지한다.
- 전역 이동 수단이 헤더 하나로 통합되므로 헤더는 viewport 상단에 sticky로
  유지한다. 중간 화면과 데스크톱 모두 64px 높이를 사용하고, 반투명 배경과
  backdrop blur 및 저대비 1px 하단 구분선으로 본문과 가볍게 구별한다. 두꺼운
  divider나 장식적인 카드 형태는 사용하지 않는다.
- 사이드바가 차지하던 가로 공간을 지도, 채팅, 목록·상세 화면에 반환한다.
  지도와 채팅은 기존 `100dvh - header` 작업 높이와 내부 패널 스크롤을
  유지했다. 당시 문서형 푸터는 workspace 다음 행에 두었으나, 이 결정은
  2026-08-25의 25절에서 제거로 변경됐다.

## 2026-08-13 데스크톱 내부 목록 스크롤 체인 (2026-08-25 변경 전 기록)

- 지도, 채팅, 인터뷰 목록처럼 내부 스크롤을 소유하는 패널은 콘텐츠가 overflow할
  때 기존처럼 패널 내부를 스크롤한다.
- 데스크톱에서는 목록이 비어 있거나 스크롤 시작·끝에 도달한 경우 휠 입력을
  바깥 문서로 전달해 전체 페이지와 최하단 푸터에 접근할 수 있게 한다. 모바일의
  바텀시트와 고정 앱 화면은 기존 `overscroll-contain` 제스처 격리를 유지한다.

## 2026-08-13 전체 폭 문서형 푸터 (2026-08-25 제거 전 기록)

- 일반 데스크톱 페이지의 푸터를 셸의 마지막 grid row로 이동했다. 페이지
  전체를 가로지르는 문서형 바이며, 최하단까지 스크롤했을 때 나타난다.
- 일반 페이지는 데스크톱 `main` 내부 스크롤 대신 문서 흐름을 사용하고,
  통합된 전역 header는 sticky 위치를 유지한다.
- 지도와 채팅은 고정 높이 workspace와 내부 패널 스크롤을 유지한다. 푸터는
  workspace 바깥의 다음 grid row에 렌더링해, 사용자가 브라우저 페이지를
  최하단으로 내릴 때만 나타난다.
- 푸터는 서비스 소유 정보인 `© 2026 contentruck`을 왼쪽에 두고,
  개인정보처리방침·이용약관·문의하기 링크를 오른쪽에 묶는 compact utility
  layout을 사용한다.

## 2026-08-13 지도 현재 위치 컨트롤

- 데스크톱 지도에서 현재 위치 컨트롤을 지도 캔버스 오른쪽 위에서 오른쪽
  아래로 이동했다. 모바일은 바텀시트와 선택 카드 높이에 반응하는 기존 위치를
  유지한다.

## 2026-08-13 데스크톱 셸 구분선 정리 (상단 내비게이션 통합 전 기록)

- 브랜드 header와 왼쪽 rail을 하나의 연속된 navigation surface로 처리하고,
  두 영역의 아래·오른쪽 border를 제거했다. 전역 작업 header도 divider를
  제거하고 본문과 같은 배경색을 사용해 별도 막대처럼 보이지 않게 한다.
- 당시에는 데스크톱 header를 문서와 함께 스크롤하고 왼쪽 rail의 navigation만
  sticky로 유지했다. 이후 전역 메뉴를 상단 헤더로 통합하면서 이 동작은 sticky
  header로 대체했다.
- 데스크톱 header 높이를 64px에서 56px로 줄이고 일반 페이지와 workspace의
  상단 여백을 24px에서 20px로 조정했다. 전역 아이콘 버튼의 클릭 영역은
  유지하면서 본문 시작 위치를 약 12px 위로 올린다.

## 2026-07-19 문서·구현 상태 대조

- 랜딩의 로그인 진입이 `/app`에 연결되고 관련 테스트가 존재함을 확인했다.
- 공용 `PageToolbar` 구현을 확인하고 아직 없는 `FilterPopover`를 별도 잔여
  항목으로 분리했다.
- 공개 지원 계획에서 문의 목록·상세·작성 흐름이 구현 완료됐음을 반영했다.
- Vercel production deployment가 `Ready`이고 `/`, `/app`, legal, support,
  delete-account 공개 경로가 HTTP 200임을 확인했다.
- canonical viewport, 실제 브라우저, 키보드, 확대, 모바일 웹 E2E
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
- Vercel production 배포와 공개 route 확인은 이후 요청에 따라 완료했다.

Last updated: 2026-08-25

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

- 브랜드, 5개 최상위 메뉴, 알림, 계정 메뉴를 포함한 상단 내비게이션을 사용한다.
- 기본은 단일 본문과 overlay/detail drawer 조합이다.
- 채팅과 지도는 두 개 영역까지 허용한다.
- iPad 전용 최적화가 아니라 좁은 노트북·태블릿 fallback이다.

### 7.3 Desktop: 1200–1599px

- 64px sticky 상단 내비게이션을 사용하고 왼쪽 navigation rail은 두지 않는다.
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

- 상단 compact greeting과 현재 사용자 context를 둔다.
- 현재 기준 desktop 홈은 full search를 복제하지 않는 compact Bento summary를
  우선 사용한다.
- 섹션은 `맞춤 추천`, `내 진행 상황`, `다음 일정`, `최근 올라온 인터뷰`,
  `공지와 안내`를 기본으로 한다.
- 각 section 내부는 nested card 대신 row와 divider를 사용한다.
- recommendation, activity, schedule은 홈에서 이어서 처리할 행동으로 연결하고,
  full browse는 인터뷰/지도/채팅으로 넘긴다.
- 인터뷰 전체 검색 기능은 인터뷰 탭에 남기고 홈은 최근성과 진행성에 집중한다.
- mock prototype 단계에서는 실데이터 aggregation보다 정보 구조와 시각 밀도를
  먼저 검증한다.

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

- top navigation: medium·desktop 64px
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

- [x] 홈 mock Bento prototype을 feature-owned dashboard로 재구성한다.
- [x] 홈 mock section을 기존 API 기반 recent/progress/schedule/chat read model로
  교체한다.
- [x] 홈 recommendation 영역을 deterministic non-AI 규칙으로 연결하고
  non-ranking AI boundary를 명시한다.
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

### Phase 8. 승인·배포

- [ ] 코드 화면에서 사용자 시각 승인을 받는다.
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

- signed-out landing login → `/app` auth → home
- signed-in landing `대시보드로 이동` → `/app` home without another login step
- `/` remains a public landing route and does not auto-redirect an existing session
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

## 20. 모바일 웹 앱 설치 정책 (2026-08-15)

- [x] `768px` 미만 랜딩 헤더에서 웹 로그인 진입을 제거한다.
- [x] 모바일 랜딩의 핵심 CTA를 App Store와 Google Play 설치 경로로 통일한다.
- [x] 모바일에서 `/app` 또는 보호된 고객 화면을 직접 열면 랜딩으로 돌린다.
- [x] 약관, 개인정보처리방침, 공개 지원, 계정 삭제, OAuth 콜백은 모바일에서도 유지한다.
- [x] 데스크톱 웹 로그인과 인증된 고객 작업 공간은 유지한다.

이 정책은 모바일 브라우저에서 제품 기능을 중복 운영하지 않고 네이티브 앱으로
유도하기 위한 현재 제품 결정이다. 모바일 브라우저를 PWA 고객 앱으로 다시
확장하려면 별도 제품 결정과 활성 계획이 필요하다.

## 21. 완료 기준

다음 조건을 모두 만족해야 완료 처리한다.

- 모바일의 핵심 기능·상태·문구 계약이 웹에 보존된다.
- 웹이 모바일 확대판이 아니라 데스크톱 작업 공간으로 보인다.
- 모바일 웹에서는 공개 정보와 지원 경로를 확인하고 네이티브 앱 설치로 이어진다.
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
- Vercel production smoke가 완료된다.
- 이 문서를 `docs/completed/`로 옮기고 active index를 갱신한다.

## 22. 계정 정보 로그인 방법 시각화 (2026-08-16)

- [x] 연결된 Apple, Google, 카카오, 네이버 계정에 공식 공급자 아이콘을 표시한다.
- [x] 연결 가능한 로그인 버튼에도 동일한 공급자 아이콘 체계를 적용한다.
- [x] 공급자 이름과 마스킹 이메일은 텍스트로 유지하고 아이콘은 장식 요소로 처리한다.
- [x] 연결, 해제 진행 중, 해제 상태를 색상과 텍스트로 함께 구분한다.
- [x] 좁은 화면에서도 아이콘, 계정 정보, 상태 배지가 한 행에서 안정적으로 축소되게 한다.
- [x] 제공하지 않는 연결 해제 안내와 계정 관리 행의 반복 설명을 제거해 설정 화면 밀도를 낮춘다.

공식 소셜 로고는 기존 `apps/web/public/social-auth` 자산을 사용하며 임의로 다시
그리거나 변색하지 않는다.

## 23. 랜딩 세션 인지형 진입 (2026-08-17)

- [x] 공개 랜딩 `/`은 유효한 세션이 있어도 자동으로 대시보드로 보내지 않는다.
- [x] 로그아웃 상태의 데스크톱 랜딩은 `로그인`, 로그인 상태는
  `대시보드로 이동`을 표시한다.
- [x] 로그인 상태의 CTA는 `/app`으로 바로 이동하고 기존 세션을 그대로 사용한다.
- [x] 명시적으로 계정을 다시 선택할 때만 `/app?account=choose`를 사용한다.
- [x] 공개 Google·카카오 로그인은 공급자의 계정 선택 화면을 요청한다.
- [x] 계정 연결 흐름은 기존 계정에 새 로그인을 붙이는 별도 계약이므로 변경하지 않는다.

## 24. 대시보드 로그아웃 목적지 (2026-08-17)

- [x] 상단 계정 메뉴와 프로필의 모든 로그아웃 진입점은 세션 종료 성공 후 공개
  랜딩 `/`으로 이동한다.
- [x] 보호 화면이 브라우저 뒤로가기에 남지 않도록 현재 경로를 replace한다.
- [x] 로그인 화면의 `다른 계정으로 로그인`은 별도 흐름으로 유지한다.

## 25. 대시보드 푸터 제거와 법적 문서 접근 경로 (2026-08-25)

- [x] 인증 후 대시보드 셸의 문서형 푸터를 제거한다.
- [x] 지도와 채팅을 포함한 고객 작업 화면은 푸터를 보기 위한 바깥 문서 스크롤을
  만들지 않는다.
- [x] 프로필 설정에 `개인정보처리방침`과 `이용약관` 행을 추가해 로그인 후에도
  법적 문서에 명확하게 접근할 수 있게 한다.
- [x] 문의, 신고, 계정 삭제 경로는 기존 프로필·지원 흐름에 그대로 유지한다.
- [x] 공개 랜딩의 사업자 정보와 개인정보처리방침·이용약관·계정 삭제 링크는
  대시보드와 별도인 공개 고지 책임으로 유지한다.

대시보드는 인터뷰 모집·탐색·조율 작업에 집중하고, 법적 고지 접근성은 공개
랜딩과 가입 동의, 프로필 설정이 나누어 소유한다. 내부 모든 화면에서 같은 법적
링크를 반복하는 전역 푸터는 사용하지 않는다.
