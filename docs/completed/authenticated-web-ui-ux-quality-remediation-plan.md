# Authenticated Web UI/UX Quality Remediation Plan

Status: completed - implementation baseline preserved; manual visual QA moved to release QA

Last updated: 2026-08-08

## 2026-07-19 문서·구현 상태 대조

- shell, profile settings index, notification utility, scroll ownership의
  구현 acceptance 항목을 현재 코드와 자동화 검증에 맞춰 완료 처리했다.
- 제거된 위치 권한 전용 profile route를 acceptance 목록에서 제외하고, 현재
  실제 도달 가능한 account, role, notifications, support, report, legal,
  account-deletion 경로로 고쳤다.
- Vercel manual production deployment와 공개 경로 smoke 완료를 반영했다.
- 실제 브라우저의 notification deep-link/back, screenshot, keyboard, 200% zoom,
  cross-browser, long-copy, reduced-motion, Figma 항목은 계속 열린 상태다.

## 2026-07-17 웹 권한 설정 정리

- profile의 위치 권한 row와 정적인 전용 페이지를 제거했다. 위치 권한은 지도
  기능이 소유하며, 사용자가 현재 위치 버튼을 누른 시점에만 요청한다.
- 지도는 권한 요청 전에 기본 지역을 먼저 표시하고 지역 검색·지도 이동을 계속
  사용할 수 있게 한다. 위치 권한을 거절해도 핵심 탐색 흐름을 막지 않는다.
- 과거 `/profile/location` 주소는 오류 화면 대신 `/map`과 같은 지도 화면으로
  해석해 기존 북마크와 브라우저 기록을 보호한다.
- 알림 설정은 정적 상태 배지가 아니라 운영 API의 사용자 알림 선호도를 읽고
  저장하는 화면으로 전환한다. 웹 푸시 구독이 없는 상태에서 브라우저 권한만
  요청하는 동작은 추가하지 않는다.

## Next implementation phase - desktop console shell and profile settings

### 1. Decision summary

2026-07-15 사용자 제공 Google Play Console 설정 화면을 구조 참고 자료로
분석했다. 이 단계에서는 Google의 색상, 로고, radius, 문구를 복제하지 않는다.
다음 정보 구조만 Hypofit의 desktop authenticated web에 맞게 번역한다.

```text
global brand header        global utility header
global product navigation  task content
                           page title
                           identity or context summary
                           row-based settings surface
```

결정 사항:

- desktop `1200px+` 셸에 고정된 top utility region을 추가한다.
- 현재 desktop rail 하단의 알림 진입점을 top-right bell로 이동한다.
- desktop에서 알림 진입점은 셸에 한 번만 제공한다.
- `/notifications`도 다른 인증 후 화면과 같은 `AppShell` 안으로 편입한다.
- `/profile`은 계정 상세로 바로 열리는 화면이 아니라 설정 index로 재구성한다.
- profile identity는 설정 row 목록과 분리된 하나의 compact summary로 둔다.
- settings는 큰 카드 여러 개가 아니라 하나의 structural surface 안에서 row와
  divider로 구분한다.
- desktop profile 내부의 두 번째 persistent sidebar는 제거한다. global product
  navigation과 profile settings navigation이 동시에 경쟁하지 않게 한다.
- `계정 삭제`와 `로그아웃`은 왼쪽 navigation이 아니라 `/profile/account`의
  `계정 관리` section에 둔다.
- 일반 문서·목록 화면은 desktop main content가 vertical scroll owner가 된다.
- 채팅처럼 명확한 workspace 화면은 main overflow를 잠그고 목록과 대화 pane이
  각각 독립적인 scroll owner가 된다. sidebar, profile summary, settings list에는
  별도 nested scroll을 만들지 않는다.
- medium과 compact web은 현재 승인된 navigation mode를 유지한다. Google Play
  Console형 구조는 desktop을 우선 대상으로 하며 mobile UI를 넓게 줄인 형태로
  만들지 않는다.

이 결정은 기존 `quiet interview coordination workspace` 원칙을 폐기하지 않는다.
Play Console의 hierarchy와 shell anatomy를 참고하되, Hypofit의 green accent,
Spoqa Han Sans Neo, 8px 이하 radius, 인터뷰 중심 문구와 상태 체계를 유지한다.

### 2. Why this direction fits Hypofit

사용자 제공 화면에서 유효한 신호:

- brand와 utility가 한 줄에 있고 navigation보다 먼저 global context를 만든다.
- 알림은 page content가 아니라 전역 utility로 취급된다.
- 현재 navigation item만 조용한 tinted selection으로 강조된다.
- settings content는 page title 아래 한 열로 정렬된다.
- 각 setting row는 leading icon, title, description, trailing affordance를 갖는다.
- row 사이의 divider가 grouping을 설명하므로 모든 item을 card로 만들 필요가 없다.
- 배경, navigation, content surface의 명도가 달라 shell과 task area가 즉시
  구분된다.

Hypofit 적용 효과:

- 현재 desktop rail 하단에 묻힌 notification utility를 예측 가능한 위치로 옮긴다.
- profile에서 global rail과 secondary settings sidebar가 동시에 보이는 이중
  navigation 부담을 줄인다.
- profile 사진, 이름, 역할을 설정 목록의 일부가 아니라 사용자 context로
  분리한다.
- account, role, notifications, support, report, legal route를 빠르게 scan할 수
  있게 한다.
- page별 notification button 중복과 header alignment drift를 줄인다.
- 전체 화면이 작은 white card 모음처럼 보이는 문제를 줄인다.

적용하지 않을 요소:

- Google blue color와 Google iconography
- unread notification을 큰 blue pill로 상시 표시하는 방식
- 16px 이상의 oversized outer radius
- Play Console의 결제, 세금, 개발자 계정 IA
- Hypofit MVP와 관계없는 admin/dashboard density
- 작은 화면에 desktop rail을 축소해서 억지로 유지하는 방식

### 3. Research basis

외부 기준은 screenshot 복제 근거가 아니라 component responsibility와
accessibility를 검증하는 근거로만 사용한다.

- Material 3 top app bar:
  https://developer.android.com/develop/ui/compose/components/app-bars
  - top app bar는 화면의 key task와 information에 접근하는 전역 영역이다.
  - action icon은 오른쪽 `actions` region에 놓인다.
  - desktop web에서는 pinned utility bar로 번역한다.
- Material 3 navigation drawer:
  https://developer.android.com/develop/ui/compose/components/drawer
  - standard navigation은 content와 공간을 공유하고 section/divider/item으로
    구성할 수 있다.
  - Hypofit desktop rail은 modal drawer가 아니라 standard persistent navigation을
    유지한다.
- W3C landmark regions:
  https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
  - visual shell을 `header`, `nav`, `main`, 필요 시 labeled `section`으로 동일하게
    표현한다.
  - navigation landmark가 둘 이상이면 각각 고유한 accessible label을 갖는다.
- Google accessibility and UI element guidance:
  https://developers.google.com/style/accessibility
  https://developers.google.com/style/ui-elements
  - icon-only action은 accessible name과 tooltip을 갖는다.
  - native link/button semantics와 logical DOM order를 유지한다.
- WCAG 2.2 target size and focus:
  https://www.w3.org/TR/WCAG22/
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
  - icon glyph 크기와 click target 크기를 분리한다.
  - visible focus, keyboard reachability, color-independent state를 유지한다.

### 4. Current implementation audit

#### 4.1 `AppShell`

Primary file:

- `apps/web/src/shared/ui/navigation/AppShell.tsx`

Current state:

- desktop shell은 `232px + main`의 한 행 grid다.
- brand는 desktop rail 상단에 있다.
- notification은 desktop rail 하단 footer에 label과 함께 있다.
- desktop main만 `h-dvh`와 `overflow-y-auto`를 소유한다.
- medium top navigation은 이미 notification을 right utility로 제공한다.
- compact는 mobile bottom navigation을 사용한다.

Problems:

- desktop과 medium에서 notification 위치가 다르다.
- desktop rail footer의 `알림 / 새 소식을 확인해요` block은 global utility보다
  settings/helper row처럼 읽힌다.
- brand, navigation, notification이 하나의 vertical column에 있어 top-level
  app structure가 약하다.
- desktop page title과 utility가 공통 top baseline을 공유하지 않는다.

#### 4.2 `NotificationButton` and notifications route

Primary files:

- `apps/web/src/shared/ui/notification-button.tsx`
- `apps/web/src/pages/NotificationsPage.tsx`
- `apps/web/src/app/App.tsx`

Current state:

- API notification query와 unread dot를 이미 공용 component가 소유한다.
- `scope="shell"`과 default page mode로 target size가 분리돼 있다.
- destination은 `/notifications`로 통일돼 있다.
- `/notifications`는 현재 `AppShell`을 거치지 않는 standalone protected route다.

Problems:

- desktop 위치가 component가 아니라 `DesktopRail` layout에 종속돼 있다.
- unread count를 accessible name에 포함하지 않는다.
- tooltip contract가 없다.
- 알림 센터로 이동하면 global navigation context가 사라진다.
- desktop, medium, compact에서 중복 노출 여부를 명시적으로 검증하는 test가
  부족하다.

#### 4.3 Profile routes

Primary files:

- `apps/web/src/app/App.tsx`
- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/pages/ProfileSubPage.tsx`

Current state:

- compact `/profile`은 profile hub를 표시한다.
- desktop `/profile`은 곧바로 `ProfileSubPage type="account"`를 표시한다.
- desktop profile subpage 안에 identity summary와 secondary navigation이 있다.
- account detail에는 profile photo, basic info, password change가 있다.
- latest local refinement에서 account deletion과 sign-out은 account detail의
  `계정 관리` section으로 이동했다.

Problems:

- desktop에서 `/profile`이 settings index가 아니라 account detail로 시작한다.
- global rail에서 `프로필`을 선택한 뒤 다시 secondary sidebar를 읽어야 한다.
- profile identity, secondary navigation, account detail이 한 화면에서 서로 다른
  hierarchy를 주장한다.
- internal sidebar scroll을 제거했지만, 이 구조 자체가 Play Console형 single
  navigation + task content model과 맞지 않는다.
- `ProfileSubPage`가 공용 `PageLayout`과 `PageHeader` 대신 별도 layout/header를
  소유해 width와 spacing이 다시 drift할 위험이 있다.

#### 4.4 Reusable boundary

공용 boundary는 다음처럼 잡는다.

- `AppShell`: app-wide brand, primary navigation, global utilities, main scroll
- `PageLayout` / `PageHeader`: route-level title, width, action alignment
- `ProfileSettingsIndex`: desktop `/profile` index and identity summary
- `ProfileSubPage`: account/role/notification/location/report detail content
- `SettingsIndexRow`: reusable settings list anatomy

admin console의 layout을 직접 공유하거나 customer app을 admin UI로 바꾸지 않는다.
필요한 것은 header + navigation + content hierarchy이며, admin data density와
operation controls는 별도다.

### 5. Target desktop shell contract

Breakpoint:

- desktop console shell: `min-width: 1200px`
- medium top navigation: `768px - 1199px`
- compact mobile web: `320px - 767px`

Initial desktop geometry:

| Token | Initial value | Purpose |
| --- | ---: | --- |
| `--app-desktop-header-height` | `64px` | brand와 global utilities의 공통 baseline |
| `--app-rail-width` | existing `232px` | label이 있는 persistent navigation |
| desktop page x gutter | existing `32px` | main content outer spacing |
| utility icon target | `40px` | bell keyboard/touch target |
| utility icon glyph | `19-20px` | navigation보다 과도하게 강조되지 않는 icon |
| structural surface radius | `8px` max | Hypofit token contract 유지 |
| settings content max width | `1120-1280px` | 긴 row description의 line length 제한 |

Target CSS grid:

```text
columns: 232px minmax(0, 1fr)
rows:    64px minmax(0, 1fr)

row 1 / col 1: DesktopBrandHeader
row 1 / col 2: DesktopUtilityBar
row 2 / col 1: DesktopRail
row 2 / col 2: main#app-content
```

#### 5.1 `DesktopBrandHeader`

- Hypofit mark와 wordmark를 한 번만 표시한다.
- `/app`으로 이동하는 link다.
- 현재 rail 안의 brand block을 이동한다.
- brand subtitle `인터뷰 조율`은 공간과 hierarchy를 재평가한다. top header가
  답답해지면 subtitle을 제거하고 wordmark만 유지한다.

#### 5.2 `DesktopUtilityBar`

- top-right에 global notification button을 둔다.
- 향후 account menu 확장 지점만 열어 두고 이번 단계에서는 불필요한 avatar menu를
  추가하지 않는다.
- `hypo-surface/95` background와 bottom border를 사용한다.
- page title을 이 bar에 넣지 않는다. page title은 main content가 소유한다.
- `aria-label="전역 작업"` 또는 명시적인 region label을 제공한다.

#### 5.3 `DesktopRail`

- row 2에서 시작하고 viewport remainder를 사용한다.
- brand와 notification footer를 제거한다.
- `홈 / 인터뷰 / 지도 / 채팅 / 프로필` navigation만 우선 유지한다.
- active item은 existing green soft fill과 left indicator를 유지한다.
- rail 자체에 nested scrollbar를 만들지 않는다.
- 200% zoom에서 rail이 잘리면 desktop을 유지하기보다 medium mode로 reflow하는
  content-driven breakpoint를 검토한다.

#### 5.4 `main#app-content`

- 일반 route에서는 desktop의 vertical scroll owner다.
- chat workspace에서는 overflow를 잠그고 chat list와 message pane에 scroll
  ownership을 위임한다.
- fixed top utility 아래 row 2에 놓인다.
- route change와 browser back scroll restoration은 기존 navigation-motion
  contract를 유지한다.
- sticky page controls가 추가되더라도 global utility bar를 덮지 않는다.

### 6. Notification utility contract

Visual:

- desktop와 medium top-right에 bell icon-only popover trigger를 둔다.
- background가 없는 quiet state를 기본으로 한다.
- hover/focus/pressed에서만 subtle surface를 표시한다.
- unread는 existing red dot를 유지하되 accessible name과 함께 상태를 전달한다.
- 큰 blue unread pill은 복제하지 않는다. Hypofit에서는 notification count보다
  interview task가 우선이다.
- popover는 trigger 오른쪽 끝에 정렬하고 380px width, 16px viewport collision
  padding, 최대 6개 recent notification, fixed header/footer와 internal list scroll을
  사용한다.
- popover는 menu처럼 compact하게 보이지만 rich notification content이므로
  `menu` role 대신 경량 portal 기반 non-modal popover dialog pattern을
  사용한다. 새 UI 런타임을 추가하지 않고, trigger 기준 위치 계산, viewport
  collision 보정, focus handoff, 바깥 클릭, `Escape` 복귀를 컴포넌트가
  책임진다.

Behavior:

- desktop/medium click과 keyboard activation은 현재 route를 유지한 채 popover를
  연다. compact page-level bell은 `/notifications`로 이동한다.
- `aria-label`은 unread state에 따라 다음처럼 변한다.
  - no unread: `알림`
  - unread known: `알림, 읽지 않은 알림 N개`
- unread query가 20개 limit에 도달하면 `20개 이상`으로 안내해 capped count를
  exact count처럼 표현하지 않는다.
- hover/focus tooltip은 `알림`을 표시한다.
- loading 중에도 button size와 position은 변하지 않는다.
- notification query failure가 shell 전체 error로 전파되지 않는다.
- unread dot는 query success 이후에만 확정한다.
- popover open만으로 read state를 변경하지 않는다. item activation 또는 명시적인
  `모두 읽음` action만 mutation을 실행한다.
- destination이 있는 item은 read mutation 후 chat, interview, application,
  support route로 이동하고 popover를 닫는다. 실제 anchor를 사용해 새 탭 열기 등
  브라우저 기본 링크 동작을 보존한다. informational item은 read만 처리한다.
- desktop/medium breakpoint 전환으로 현재 trigger의 shell region이 숨겨지면 열려
  있던 portal popover를 닫아 반대 layout 위에 떠 있는 상태를 만들지 않는다.
- `알림 전체 보기`는 popover를 닫고 `/notifications` route를 push한다.
- outside interaction은 popover를 닫고 사용자가 선택한 바깥 대상으로 focus를
  넘긴다. `Escape`로 닫을 때는 trigger로 focus를 복귀시킨다.
- `/notifications` route도 `AppShell`을 유지해 현재 app context를 잃지 않는다.

Duplication rules:

- desktop: top utility bell 한 개만 표시한다.
- medium: existing top navigation right bell 한 개만 표시한다.
- compact: approved page-level bell 또는 current mobile pattern을 유지한다.
- home, chat, profile page가 desktop에서 별도 bell을 렌더링하면 임시 CSS로 숨기지
  않고 render responsibility를 제거한다.

### 7. Target profile settings information architecture

#### 7.1 Desktop `/profile` becomes settings index

```text
설정

[identity summary]
avatar  name + role
        email

[settings surface]
계정 정보          이름, 이메일, 전화번호와 비밀번호를 관리합니다.      >
역할 설정          창업자와 인터뷰어 기능을 관리합니다.                 >
알림 설정          신청, 선정, 채팅 알림을 관리합니다.                   >
문의하기            문의 내역과 운영팀 답변을 확인합니다.                 >
신고하기            부적절한 모집글이나 사용자를 신고합니다.              >
```

Rules:

- desktop title은 task meaning이 명확한 `설정`을 사용한다. compact app의 tab label
  `프로필`은 유지한다.
- identity summary는 settings row list와 최소 `20-24px` 간격으로 분리한다.
- identity summary를 secondary navigation 안에 넣지 않는다.
- identity summary는 avatar, name, role, email만 우선 표시한다.
- profile image editing은 avatar interaction 또는 `계정 정보`에서 수행한다.
- list outer surface는 하나만 사용한다.
- group이 필요하면 section heading + divider를 쓰고 group별 floating card를 만들지
  않는다.
- 각 row 전체가 link target이며 trailing chevron은 decorative다.
- row title과 description은 current Toss-like Korean copy를 유지한다.
- account deletion과 sign-out은 index row에 두지 않는다.
- 위치 권한은 profile 설정으로 중복 노출하지 않고 지도 기능의 현재 위치 action이
  소유한다.
- 이용약관과 개인정보 처리방침은 공용 footer에 유지하고 profile index에서 중복
  노출하지 않는다.

#### 7.2 Desktop profile detail routes

Routes:

- `/profile/account`
- `/profile/role`
- `/profile/notifications`
- `/report` 직접 신고 폼
- related support/legal routes

Rules:

- persistent secondary sidebar를 사용하지 않는다.
- page header에는 settings index로 돌아가는 affordance와 detail title을 제공한다.
- browser back과 explicit `설정으로` route의 의미를 구분한다.
- form 또는 settings content는 `760-880px` reading width를 기본으로 한다.
- save/cancel은 current form contract를 유지한다.
- `계정 관리` section은 account detail view 하단에 유지한다.
- `로그아웃`은 ordinary account action, `계정 삭제`는 danger action으로 구분한다.
- account deletion을 실행하면 기존 confirm/deletion flow로 이동한다.
- `/profile/notifications`는 FastAPI notification preference를 사용자별 query key로
  읽고 저장한다. 현재 웹 브라우저는 push provider로 등록하지 않으므로 브라우저
  권한을 요청하거나 웹 푸시 수신을 약속하지 않는다.

#### 7.3 Compact and medium behavior

- compact `/profile`은 현재 mobile profile hub와 bottom navigation을 유지한다.
- compact subpage back direction과 navigation history contract를 유지한다.
- medium은 existing top navigation과 single-column profile settings layout을 쓴다.
- medium에서 desktop secondary sidebar를 축소판으로 만들지 않는다.
- account action, legal, report, support reachability는 모든 viewport에서 유지한다.

### 8. Settings row component contract

Proposed component:

- `SettingsIndexRow`

```ts
interface SettingsIndexRowProps {
  description?: string;
  href: string;
  icon: LucideIcon;
  label: string;
  status?: string;
  tone?: "default" | "danger";
}
```

Initial visual contract:

- row min height: `72px`, content에 따라 증가 가능
- horizontal padding: `16px compact`, `20-24px desktop`
- leading icon: decorative tile 없이 `20px` icon 우선
- icon/label gap: `16px`
- title: `ui-row-title`
- description: `ui-body` 또는 13-14px semantic helper role
- trailing chevron: `18px`, muted color, `aria-hidden="true"`
- divider: full width 또는 text start alignment 중 하나를 전체 목록에서 일관되게
  선택
- hover: `hypo-surface-muted` 이하의 subtle change
- focus: existing 3px brand focus ring
- status가 있으면 text/badge를 함께 사용하고 color alone을 금지
- long Korean title, long email, 200% zoom에서 horizontal overflow 금지

Do not:

- row마다 rounded card를 만들지 않는다.
- title, description, icon, chevron 모두를 brand green으로 만들지 않는다.
- chevron만 click target으로 만들지 않는다.
- hover에서 layout shift가 생기는 border를 추가하지 않는다.
- row helper copy를 두 줄 이상 강제하지 않는다.

### 9. Component and file plan

#### Phase 1 - shell foundation

Primary files:

- `apps/web/src/styles.css`
- `apps/web/src/shared/ui/navigation/AppShell.tsx`
- `apps/web/src/shared/ui/notification-button.tsx`

Tasks:

- [x] `--app-desktop-header-height` token을 추가한다.
- [x] desktop `AppShell`을 two-row grid로 변경한다.
- [x] `DesktopBrandHeader`와 `DesktopUtilityBar`를 분리한다.
- [x] brand를 rail에서 top-left header로 이동한다.
- [x] notification을 rail footer에서 top-right utility로 이동한다.
- [x] rail footer helper block을 제거한다.
- [x] main row와 scroll ownership을 재검증한다.
- [x] medium/compact render path가 영향을 받지 않는지 자동화 테스트로 확인한다.

#### Phase 2 - notification semantics and route integration

Primary files:

- `apps/web/src/app/App.tsx`
- `apps/web/src/shared/ui/notification-button.tsx`
- `apps/web/src/pages/NotificationsPage.tsx`
- notification hook and shell tests

Tasks:

- [x] `/notifications`를 `AppShell` 안에 렌더링한다.
- [x] unread count를 accessible name에 포함한다.
- [x] icon-only tooltip을 추가한다.
- [x] loading/error 시 layout stability를 보장한다.
- [x] desktop/medium/compact 노출 책임과 shell utility 구조 test를 추가한다.
- [x] `/notifications` route가 primary tab을 잘못 활성화하지 않는지 검증한다.
- [ ] 실제 브라우저에서 notification deep-link와 back return을 확인한다.

#### Phase 3 - desktop settings index

Primary files:

- `apps/web/src/app/App.tsx`
- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/pages/ProfileSubPage.tsx`
- optional new shared profile settings components

Tasks:

- [x] desktop `/profile` route를 account detail 대신 settings index로 연결한다.
- [x] desktop-only `ProfileSettingsIndex` responsibility를 분리한다.
- [x] identity summary를 settings list 위의 independent context section으로 만든다.
- [x] one-surface settings list와 `SettingsIndexRow`를 구현한다.
- [x] current route groups와 labels를 compact profile hub 기준으로 audit한다.
- [x] account deletion/sign-out이 account detail에만 남는지 확인한다.
- [x] 같은 viewport 안의 duplicate profile editor와 identity summary를 제거한다.

#### Phase 4 - profile detail simplification

Primary files:

- `apps/web/src/pages/ProfileSubPage.tsx`
- `apps/web/src/shared/ui/page.tsx`

Tasks:

- [x] desktop secondary sidebar를 제거한다.
- [x] custom settings layout/header를 공용 page primitive와 정렬한다.
- [x] detail header의 back/breadcrumb contract를 구현한다.
- [x] account, role, notifications, location, report content width를 통일한다.
- [x] detail route 사이의 title, description, action alignment를 통일한다.
- [x] edit profile과 password mode의 back behavior를 유지한다.
- [x] account management section의 logout/delete behavior를 검증한다.

#### Phase 5 - visual and interaction QA

Primary references:

- `docs/reference/ui-final-qa-checklist.md`
- `docs/completed/web-navigation-motion-system-plan.md`

Tasks:

- [ ] route별 desktop screenshot baseline을 만든다.
- [ ] keyboard-only tab order와 focus visibility를 확인한다.
- [ ] 200% zoom에서 rail, utility, main reflow를 확인한다.
- [ ] browser back, explicit back, notification deep-link return을 확인한다.
- [ ] loading, empty, error, auth-expired, long-copy 상태를 확인한다.
- [ ] Chrome, Safari, Firefox rendering을 비교한다.
- [ ] approved final state에서만 Figma sync 여부를 결정한다.

### 9.1 Play Console shell implementation result - 2026-07-15

구현 완료:

- desktop `AppShell`을 `64px` global header와 remainder content의 two-row grid로
  변경했다.
- Hypofit brand를 top-left header로, notification utility를 top-right로 이동하고
  desktop rail에는 primary navigation만 남겼다.
- notification button에 unread count accessible name과 tooltip을 추가했다.
- `/notifications`를 utility route로 `AppShell`에 편입하고 primary tab의 false
  active state를 제거했다.
- desktop `/profile`을 `ProfileSettingsIndex`로 연결했다.
- identity summary와 one-surface row navigation을 분리하고 profile detail의 두 번째
  persistent sidebar를 제거했다.
- 계정 상세 view에는 `설정으로`, 편집/비밀번호 변경 mode에는 로컬 뒤로가기만
  표시해 중복 back affordance를 제거했다.
- 계정 삭제와 로그아웃은 desktop settings index가 아니라 account detail의
  `계정 관리` section에만 유지했다.

자동 검증:

- web tests: `29 files`, `160 tests` passed
- web TypeScript lint: passed
- shell, notification, `/notifications`, desktop `/profile`, settings index 전용
  regression test 추가

남은 작업:

- 실제 브라우저 desktop/medium/compact 시각 QA
- keyboard, 200% zoom, Safari/Firefox, notification return path 확인
- 사용자 승인 후 Figma sync 여부 결정

### 9.2 Desktop chat scroll ownership correction - 2026-07-15

- desktop `/chat`은 document scroll이 아니라 bounded workspace로 동작한다.
- chat root 높이를 viewport가 아닌 `AppShell` main row의 available height 기준으로
  계산한다.
- medium 전용 `100dvh - 4rem` 높이는 `768-1199px`에만 적용해 desktop available
  height 규칙과 cascade가 충돌하지 않게 한다.
- 상단 header/search/filter는 고정되고 chat room list만 내부 스크롤한다.
- thread header/composer는 고정되고 message history만 내부 스크롤한다.
- compact/mobile의 full-screen pushed thread와 medium layout 계산은 변경하지 않는다.

### 9.3 Authenticated desktop utility footer - 2026-07-16

- desktop 일반 route에는 개인정보처리방침, 이용약관, 문의하기와 contentruck
  copyright를 제공하는 compact utility footer를 둔다.
- footer는 fixed/sticky bar나 card가 아니라 콘텐츠 아래의 divider 기반 영역이다.
- primary navigation을 반복하지 않고 legal/support recovery path만 제공한다.
- chat과 map workspace에는 footer를 렌더링하지 않는다.
- compact와 medium web에는 footer를 표시하지 않고 기존 bottom/top navigation과
  profile legal path를 유지한다.
- 공개 문의 화면에는 이전 정보 구조 결정대로 legal footer를 추가하지 않는다.
- landing footer의 copyright owner는 `contentruck`으로 통일한다.

### 9.4 Desktop map scroll ownership correction - 2026-07-16

- desktop `/map`은 document scroll이 아니라 bounded workspace로 동작한다.
- map root는 `100dvh`를 다시 선언하지 않고 `AppShell` main row의 available
  height를 사용한다.
- 지도 canvas는 남은 workspace 높이를 채우고 pan/zoom gesture를 소유한다.
- 검색·필터·선택 상태는 panel 상단에 유지하고 모집글 목록만 내부에서
  vertical scroll을 소유한다.
- compact/mobile의 full map과 bottom sheet scroll 계약은 변경하지 않는다.
- map workspace에는 desktop utility footer를 렌더링하지 않는다.

### 9.5 Map viewport search concurrency hardening - 2026-07-17

Problem:

- `dragend`와 `zoom_changed`를 별도로 구독해 동일한 사용자 조작이 여러 검색
  후보를 만들 수 있다.
- viewport 후보를 800ms 뒤에 query key로 반영하므로, 사용자가 다시 이동한 뒤에도
  이전 지역 요청이 debounce 구간 동안 현재 observer로 남을 수 있다.
- 새 query key에 캐시가 없으면 `posts = []`가 되어 marker와 result list가
  사라졌다가 새 응답과 함께 다시 나타난다.

Interaction contract:

- Kakao Map의 settled camera event는 `idle` 하나를 canonical viewport event로
  사용한다.
- viewport search는 마지막 settled viewport만 유효한 latest-wins semantics를
  갖는다.
- debounce는 idle 이후 350ms로 제한하고, 새 viewport가 오면 이전 timer와 현재
  map-list query를 취소한다.
- query cancellation은 TanStack Query가 제공하는 `AbortSignal`을 공용 API
  client의 `fetch`까지 전달하는 기존 contract를 유지한다.
- query key가 변경되는 동안에는 마지막 성공 결과를 placeholder로 유지한다.
- previous result를 표시하는 동안 map와 list를 full skeleton/empty state로
  교체하지 않는다. 필요한 경우 작은 non-blocking fetching indicator만 사용한다.
- user-driven pan/zoom feedback은 map camera를 다시 setCenter/setLevel하지 않는다.

Implementation tasks:

- [x] `KakaoMapCanvas`의 `dragend`와 `zoom_changed` listener를 `idle` listener로
      통합한다.
- [x] map search debounce를 350ms로 조정한다.
- [x] 새 viewport 수신 시 현재 interview-post list query를 명시적으로 취소한다.
- [x] `useInterviewPosts`에 TanStack Query v5 `keepPreviousData`를 적용한다.
- [x] `isFetching`과 `isPlaceholderData`를 map result surfaces에 전달해 최초 loading과
      background refresh를 구분한다.
- [x] A -> B -> C 연속 viewport 변경에서 C만 query params로 확정되는 테스트를
      추가한다.
- [x] 새 query key 전환 중 previous result 유지와 AbortSignal 전달을 테스트한다.

Acceptance:

- 빠르게 지도를 여러 번 움직여도 마지막 viewport만 최종 검색 범위가 된다.
- 이전 지역의 늦은 응답이 최신 viewport 결과로 보이지 않는다.
- background refresh 중 marker와 list가 빈 화면으로 깜빡이지 않는다.
- map gesture는 API loading과 무관하게 계속 동작한다.
- selected interview가 열린 동안 viewport search를 억제하는 기존 contract를
  유지한다.

Implementation result - 2026-07-17:

- Kakao Maps의 camera settled signal은 공식 `idle` event 하나로 통합했다.
- 새 viewport를 받으면 현재 지도에 연결된 active interview-post query만 정확한
  query key로 즉시 취소하고 350ms 동안 추가 조작이 없을 때만 마지막 viewport를
  query key로 확정한다.
- viewport handler와 marker selection handler를 안정화해 debounce 상태 변경만으로
  Kakao event listener와 marker overlay가 재생성되지 않게 했다.
- query key 전환 중에는 마지막 성공 결과를 유지하고 desktop count badge와 mobile
  sheet badge에 작은 progress indicator만 표시한다.
- current location marker와 user-driven camera를 분리해 결과 갱신이 map center/level을
  다시 덮어쓰지 않게 유지했다.
- targeted map/query tests: 4 files, 17 tests passed.
- web typecheck, ESLint, architecture boundary check, production build, and
  `git diff --check` passed.

Official references:

- Kakao Maps Web API `idle` event:
  <https://apis.map.kakao.com/web/documentation/#idle>
- TanStack Query cancellation and query `AbortSignal`:
  <https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation>
- TanStack Query `placeholderData: keepPreviousData`:
  <https://tanstack.com/query/v5/docs/framework/react/guides/paginated-queries>

### 9.6 Current-location map control separation - 2026-07-17

Problem:

- 검색 입력 오른쪽의 위치 아이콘은 검색 제출 또는 입력 보조 기능처럼 보여 현재
  위치로 지도를 이동하는 독립 action이라는 사실이 약하다.
- 검색과 map camera control이 한 form에 결합되어 사용자가 기능을 찾기 어렵다.

Interaction contract:

- 검색창은 지역·역·학교 검색만 담당한다.
- 현재 위치는 지도 위에 떠 있는 독립적인 circular control로 제공한다.
- compact/mobile에서는 bottom sheet 바로 위 trailing edge에 두고 sheet 높이를
  따라 이동한다.
- mobile sheet가 expanded 상태이거나 selected post card가 열려 있으면 겹침을
  피하기 위해 숨긴다.
- desktop에서는 map canvas의 top-right에 고정하고 result panel과 분리한다.
- control은 44px hit target, visible border, light shadow, accessible label, focus state,
  pressed state를 갖는다.
- location request 중에는 동일 위치에서 spinner를 표시하고 duplicate request를
  막는다.

Implementation result:

- [x] `MapSearchControls`에서 location action과 requesting state를 제거했다.
- [x] `MapLocationButton`을 독립 component와 test로 추가했다.
- [x] mobile bottom-sheet offset과 desktop top-right 위치 contract를 적용했다.
- [x] selected card와 expanded sheet overlap avoidance를 적용했다.
- [x] loading, disabled, hover, pressed, focus, accessible name state를 적용했다.

Verification:

- location/search/map targeted tests: 3 files, 10 tests passed.
- web typecheck, ESLint, architecture boundary check, production build, and
  `git diff --check` passed.

Official references:

- Apple map control contrast guidance:
  <https://developer.apple.com/design/human-interface-guidelines/maps>
- Google Maps My Location control behavior:
  <https://developers.google.com/maps/documentation/android-sdk/location>

### 9.7 Desktop interview filter density alignment - 2026-07-17

- desktop interview filter chips가 chat filter tabs의 30px control density보다 큰
  40px 높이로 렌더링되어 toolbar가 과도하게 무거워 보였다.
- desktop inline interview filters는 chat filter와 같은 30px height, 10px horizontal
  padding, 6px gap으로 정렬했다.
- filter group label 사이의 여백도 16px에서 12px로 줄여 한 줄의 정보 밀도를
  높였다.
- 30px control 안에서 12px semibold 한글과 진한 brand fill이 결합해 실제 수치보다
  글자가 크게 보이던 문제를 보완했다. desktop filter label은 12px medium과 16px
  line-height를 사용하고, group label은 11px medium으로 한 단계 낮춘다.
- selected filter는 desktop에서 full brand fill 대신 brand-soft surface, brand text,
  subtle brand border를 사용한다. 선택 여부는 `aria-pressed`로도 유지하며 색만으로
  상태를 전달하지 않는다.
- inline `초기화` action도 30px height와 같은 typography rhythm을 사용해 filter
  row에서 별도의 큰 button처럼 튀지 않게 한다.
- compact/mobile filter dialog는 touch accessibility를 위해 기존 44px hit target을
  유지한다.

### 10. State matrix

| State | Shell expectation | Profile expectation |
| --- | --- | --- |
| auth loading | shell geometry 유지, utility 자리 예약 | identity skeleton 또는 calm loading state |
| user sync loading | bell 위치 고정 | name/email fallback이 width를 흔들지 않음 |
| unread notifications | bell dot + accessible count | profile content와 무관하게 유지 |
| notification API error | shell 전체 오류 금지 | bell 기본 상태 유지, diagnostics 사용 |
| profile image missing | default avatar | list alignment 유지 |
| long name/email | truncate 또는 wrap contract | horizontal overflow 금지 |
| account edit mode | shell/route context 유지 | form action size 고정 |
| password change mode | shell/route context 유지 | current/new/confirm fields만 표시 |
| logout pending | duplicate click 방지 | action label 또는 disabled feedback 제공 |
| deletion route | global shell 유지 여부를 route contract로 결정 | danger copy와 confirmation 명확 |
| offline/API unavailable | navigation 유지 | retry 가능한 calm error state |

### 11. Accessibility contract

- DOM order는 brand header -> global utility -> primary navigation -> main content의
  논리적 관계를 유지한다. CSS grid만으로 읽기 순서를 뒤집지 않는다.
- primary navigation과 profile settings navigation이 동시에 존재하지 않게 한다.
- `nav`가 둘 이상인 viewport에서는 고유 `aria-label`을 제공한다.
- bell은 link semantics, accessible name, tooltip, visible focus를 갖는다.
- unread dot만으로 상태를 전달하지 않는다.
- settings row는 native anchor를 사용한다.
- chevron과 decorative icon은 screen reader 중복 announcement를 막는다.
- page마다 하나의 명확한 `h1`을 갖는다.
- selected navigation은 `aria-current="page"`를 유지한다.
- color contrast는 WCAG AA를 유지하고 active state를 color만으로 구분하지 않는다.
- 200% zoom에서 utility가 content를 가리지 않는다.
- reduced motion 사용자는 shell transition 때문에 content가 움직이지 않는다.

### 12. Canonical verification matrix

Automated:

- targeted `AppShell` and route tests
- `NotificationButton` unread/accessibility tests
- profile route and back behavior tests
- TypeScript lint
- production build
- `git diff --check`

Manual visual:

| Viewport | Expected mode | Key checks |
| --- | --- | --- |
| `1440 x 900` | desktop console shell | top bar baseline, rail, wide settings rows |
| `1280 x 800` | desktop console shell | no nested scrollbar, content width, footer reachability |
| `1200 x 800` | desktop boundary | rail labels, utility collision, profile row wrap |
| `1024 x 768` | medium top nav | no desktop rail remnants, bell top-right |
| `768 x 1024` | medium boundary | navigation overflow, settings single column |
| `390 x 844` | compact | existing profile hub and bottom nav preserved |
| `320 x 568` | compact minimum | legal/support/delete reachability, no horizontal scroll |
| desktop at 200% zoom | reflow | no clipped rail, utility, title, or form action |

Browser checks:

- Chrome latest
- Safari latest
- Firefox latest

### 13. Acceptance criteria

Shell:

- [x] desktop에서 Hypofit brand는 top-left에 한 번만 보인다.
- [x] bell은 top-right에 있고 rail footer에는 없다.
- [x] desktop/medium/compact 각 mode에서 notification entry가 한 개만 보인다.
- [x] global top bar와 rail은 main content와 명확히 분리된다.
- [x] main content만 vertical scroll을 소유한다.
- [x] nested sidebar scrollbar가 없다.

Profile:

- [x] desktop `/profile`이 settings index로 읽힌다.
- [x] identity summary와 settings list가 시각적으로 분리된다.
- [x] settings rows는 한 structural surface와 divider를 사용한다.
- [x] global rail과 secondary profile sidebar가 동시에 나타나지 않는다.
- [x] account, role, notifications, support, report, legal, account-deletion
      route가 모두 도달 가능하다.
- [x] logout과 account deletion은 account detail에서만 제공된다.
- [x] compact profile flow는 회귀하지 않는다.

Quality:

- [ ] keyboard와 screen reader landmark가 shell 구조를 이해할 수 있다.
- [ ] unread, active, danger state가 color alone에 의존하지 않는다.
- [ ] long Korean copy와 200% zoom에서 clipping이 없다.
- [ ] route transition과 browser back 방향이 기존 contract를 유지한다.
- [x] tests, lint, build, diff check가 통과한다.
- [ ] canonical viewport visual QA 결과가 문서에 기록된다.

### 14. Explicit non-goals

- Expo React Native mobile profile redesign
- admin console redesign
- real-time notification transport 변경
- new profile/account API
- Google Play Console color or brand copy
- payment, analytics, KPI dashboard
- Figma immediate sync during code iteration

Figma는 구현과 로컬 visual QA 후 사용자가 화면을 승인했을 때만 동기화한다.

## Implementation progress - 2026-07-15

구현 단계는 완료했다. 공용 foundation과 shell을 먼저 정리한 뒤 홈, 인터뷰,
채팅, 지도, 내 인터뷰, 프로필, 알림, 상세/form/support/legal 순서로 동일한
semantic contract를 적용했다.

- `AppShell`, `PageLayout`, `PageHeader`, `ListSurface`, `ContextPanel`, button,
  field, badge, state primitive를 pane/row-first 구조로 정리했다.
- `display-brand`, `page-title`, `section-title`, `row-title`, `body`, `label`,
  `metadata`, `badge`, `control` typography role을 구현했다.
- desktop/medium에서는 shell만 brand를 소유하고 compact home에서만 본문 brand를
  노출한다.
- 홈·인터뷰·채팅·알림의 반복 content를 flat row와 divider 중심으로 변경하고,
  선택 detail 또는 overlay만 elevation을 갖도록 낮췄다.
- 지도는 primary canvas를 유지하고 검색·위치·목록처럼 직접 조작하는 control만
  raised surface로 유지했다.
- 프로필과 내 인터뷰는 metric dashboard 대신 settings/task list hierarchy로
  정리했다.
- 상세, 모집글 작성, 문의, 신고, 약관 화면도 같은 type·field·button foundation을
  사용하도록 조정했다.

Verification:

- web tests: `26 files`, `151 tests` passed
- web TypeScript lint: passed
- web production build: passed
- `git diff --check`: passed
- authenticated Chrome visual smoke: `1440 x 900` 6 routes and `390 x 844`
  3 core routes captured; compact navigation reflow and home empty state verified
- static warning signal after remediation: `font-black` 191,
  `rounded-hypo-lg` 110, `shadow-hypo-panel` 28
- Vercel deployment: not requested, intentionally not run
- Figma sync: active code iteration policy에 따라 intentionally deferred

Remaining acceptance work:

- Chrome, Safari, Firefox 실제 rendering 비교
- canonical viewport 전체와 200% zoom visual QA
- keyboard-only, reduced-motion, loading/empty/error/long-copy screenshot QA
- 승인된 최종 화면의 Figma sync 여부 결정

## 0. Executive decision

이 계획은 인증 후 고객용 웹을 단순히 더 화려하게 만드는 작업이 아니다.
현재 `/app`과 주요 고객 화면이 보이는 다음 문제를 구조적으로 해결하는 실행
계획이다.

- 서비스 아이콘과 `Hypofit` 이름이 shell과 본문에서 중복된다.
- 반복 목록, 상세, 요약, 빈 상태가 모두 흰 카드와 테두리로 표현된다.
- 제목, 본문, metadata, badge, control의 크기와 line-height가 화면마다 다르다.
- navigation, filter, counter, chip, metric이 같은 시각적 무게로 경쟁한다.
- 실제 인터뷰 모집·신청·조율 작업보다 "AI가 만든 SaaS dashboard"의 구성이
  먼저 보인다.
- 모바일에서 검증된 흐름을 데스크톱에 맞게 번역했지만, desktop layout의
  밀도와 위계가 아직 하나의 시스템으로 정리되지 않았다.

선택한 방향은 다음과 같다.

```text
quiet interview coordination workspace

brand is persistent but restrained
the current interview object owns attention
rows carry repeated information
one selected detail surface carries depth
controls recede until needed
```

한국어로는 `차분한 인터뷰 조율 작업 공간`을 목표로 한다. 일반적인 통계
dashboard, CRM template, Linear clone, mobile app 확대판을 목표로 하지 않는다.

## 1. Ownership and boundaries

### 1.1 This plan owns

- 인증 후 고객용 web shell의 시각적 위계와 brand 노출 규칙
- `/app`, `/interviews`, `/my-interviews`, `/map`, `/chat`, `/profile`,
  `/notifications`의 공통 UI 품질 개선
- page type, content width, gutter, split pane, scroll ownership 계약
- typography, spacing, surface, border, radius, elevation, icon density 계약
- row, list, toolbar, detail pane, empty/error/loading state의 공통 pattern
- desktop, medium web, compact mobile web의 시각적 일관성
- 현재 코드의 card 과다 사용과 화면별 Tailwind class drift 정리
- screenshot 기반 baseline과 route-by-route visual acceptance gate

### 1.2 Sibling plans retain ownership

- `desktop-web-service-ui-advancement-plan.md`
  - 고객용 web의 정보 구조, route, list/detail 및 workspace 구조
- `web-navigation-motion-system-plan.md`
  - browser history, route transition, scroll restoration, focus handoff
- `responsive-web-auth-entry-experience-plan.md`
  - landing-to-login, signup, auth bootstrap, password recovery
- `public-support-and-authenticated-inquiry-experience-plan.md`
  - public support와 로그인 후 문의 list/detail/composer
- `landing-page-and-store-creative-production-plan.md`
  - public landing과 store creative

이 계획은 sibling plan의 flow를 임의로 바꾸지 않는다. 시각 개선 중 route,
history, auth, support contract 변경이 필요해지면 해당 문서에 먼저 기록한다.

### 1.3 Out of scope

- Expo React Native UI 재설계
- public landing 전체 재설계
- `/admin` 운영자 console 재설계
- 결제, escrow, AI matching, 통계 dashboard 추가
- 새로운 backend 기능을 근거 없이 UI에 가정하는 작업
- 특정 외부 제품의 화면을 그대로 복제하는 작업

## 2. Research basis and Hypofit adaptation

외부 사례는 visual copy 대상이 아니라 design decision의 검증 자료로 사용한다.

### 2.1 Official design-system and product research

| Source | Useful principle | Hypofit adaptation |
| --- | --- | --- |
| [Nielsen Norman Group visual design principles](https://www.nngroup.com/articles/principles-visual-design/) | scale, hierarchy, balance, contrast를 제한된 수의 강한 신호로 만든다 | 한 화면에서 page title, section title, row title이 서로 경쟁하지 않게 text role을 제한한다 |
| [Atlassian design tokens](https://atlassian.design/foundations/design-tokens) | spacing과 typography 결정을 token으로 고정한다 | 화면별 `text-*`, `gap-*`, `px-*` 조합을 줄이고 semantic web UI primitive로 이동한다 |
| [Atlassian spacing and grid](https://atlassian.design/foundations/grid-beta/applying-grid/) | 동일한 spacing은 grouping을 만들고, 다른 spacing은 중요도 차이를 만든다 | 모든 box에 같은 20px 여백을 주지 않고 row, section, page band의 rhythm을 분리한다 |
| [Atlassian typography](https://atlassian.design/foundations/typography/applying-typography) | heading hierarchy, text color, line length를 함께 통제한다 | 긴 설명은 최대 폭을 제한하고 metadata를 12px 아래로 축소하지 않는다 |
| [Linear 2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh) | task 중심 영역만 높은 시각적 무게를 갖고 navigation은 뒤로 물러난다 | sidebar는 조용하게 유지하고 선택한 인터뷰, 지원자, 대화가 화면 중심이 되게 한다 |
| [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | environment, appearance, hierarchy를 분리해 stress test하고 각 view type 전체를 점검한다 | home 한 화면만 예쁘게 만든 뒤 확산하지 않고 list, split, map, chat, settings mode별로 검증한다 |
| [Intercom navigation redesign](https://www.intercom.com/blog/redesigning-product-navigation/) | navigation order와 icon은 사용자의 mental model을 만들며 obviousness가 cleverness보다 중요하다 | `홈 / 인터뷰 / 지도 / 채팅 / 프로필` label을 유지하고 icon-only desktop rail로 축소하지 않는다 |
| [Intercom information architecture](https://www.intercom.com/blog/designing-for-clarity-restructuring-intercoms-information-architecture/) | hover해야만 이해되는 cryptic navigation보다 한눈에 보이는 label이 빠르다 | desktop navigation에 icon과 label을 함께 유지한다 |
| [Intercom product principles](https://www.intercom.com/blog/intercom-product-principles/) | familiar pattern, progressive disclosure, real people 중심 표현 | interview detail은 필요할 때 깊어지고, founder/respondent를 database row처럼만 보이지 않게 한다 |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | reflow, focus, contrast, target size, text spacing 변경 내성을 보장한다 | 320px, 200% zoom, keyboard-only, visible focus를 release gate로 둔다 |
| [web.dev responsive basics](https://web.dev/articles/responsive-web-design-basics) | device 이름이 아니라 content가 깨지는 지점에서 breakpoint를 정한다 | 768/1200 token은 유지하되 실제 Korean copy와 controls가 깨지면 mode 기준을 재검증한다 |

### 2.2 Domain reference signals

- [User Interviews](https://www.userinterviews.com/)는 researcher와 participant를
  연결하는 핵심 가치를 `targeting -> recruiting -> scheduling` 흐름으로
  설명한다. Hypofit도 dashboard metric보다 모집글, 대상 조건, 신청 상태,
  조율 흐름이 먼저 읽혀야 한다.
- [Respondent participant platform](https://www.respondent.io/new-participant-platform)은
  참여자가 연구를 찾고, 신청 상태를 보고, 보상을 추적하는 object 중심 화면을
  강조한다. Hypofit home은 일반적인 welcome dashboard보다 최근 인터뷰와 진행
  상태를 직접 보여주는 편이 맞다.
- [Dovetail Recruit](https://dovetail.com/blog/dovetail-3-launch/)는 participant,
  project, scheduling context를 연결한다. Hypofit desktop detail pane도 선택한
  모집글과 지원자/채팅 context를 이어 주되 CRM 전체를 흉내 내지 않는다.

### 2.3 Directions explicitly rejected

#### Rejected A: metric dashboard

- 큰 숫자 카드, 그래프, KPI를 home 첫 화면에 배치하지 않는다.
- 현재 MVP에서 매일 의사결정에 필요한 지표가 아니며 실제 workflow를 가린다.

#### Rejected B: card gallery

- 모든 section과 row를 독립된 rounded white card로 만들지 않는다.
- card 수가 많아질수록 그룹 관계와 우선순위가 약해진다.

#### Rejected C: Linear or Notion clone

- density와 hierarchy 원칙은 참고하지만 색, shell anatomy, shortcut 중심 UX,
  microcopy를 복제하지 않는다.
- Hypofit은 issue tracker가 아니라 사람과 인터뷰를 연결하는 서비스다.

#### Rejected D: stretched mobile app

- desktop에 mobile bottom sheet, 큰 touch padding, 한 화면 한 task 제약을 그대로
  가져오지 않는다.
- 상태와 action contract만 공유하고 comparison과 parallel context는 web에 맞춘다.

## 3. Current-state audit

### 3.1 Quantitative warning signals

2026-07-15 기준 `apps/web/src/pages`, `features`, `shared/ui`의 단순 occurrence
audit 결과다. 숫자 자체가 결함은 아니지만 현재 시각적 drift의 크기를 보여준다.

| Signal | Approximate count | Risk |
| --- | ---: | --- |
| `rounded-hypo-lg` | 160 | 독립 card와 pill-like container 과다 |
| `shadow-hypo-panel` | 50 | base surface와 elevated surface의 의미 혼합 |
| `bg-hypo-surface` | 150 | 흰 box가 기본 grouping 수단으로 남용됨 |
| `border-hypo-border` | 197 | 모든 경계가 같은 강도로 표현됨 |
| `font-black` | 323 | title, label, navigation, metadata의 weight 위계가 평평해짐 |
| `text-xs` | 170 | small text가 UI 전반의 기본값처럼 확산됨 |
| `text-sm` | 238 | semantic role보다 local class가 typography를 결정함 |

대형 화면 파일도 한 화면이 너무 많은 시각 결정을 직접 소유하고 있음을 보여준다.

| File | Approximate lines |
| --- | ---: |
| `MapPage.tsx` | 1,626 |
| `ChatPage.tsx` | 1,205 |
| `ProfileSubPage.tsx` | 963 |
| `InterviewsPage.tsx` | 819 |

### 3.2 Priority findings

#### P0. Brand ownership is duplicated

- `AppShell` desktop rail과 medium top nav가 logo와 `Hypofit`을 소유한다.
- `ExplorePage`가 같은 logo와 `Hypofit`을 다시 본문 header에 표시한다.
- desktop에서 왼쪽 sidebar와 중앙 content가 모두 app identity를 주장한다.
- page heading이 user task가 아니라 brand repetition으로 소비된다.

Decision:

- desktop/medium shell에서는 shell만 logo와 service name을 소유한다.
- authenticated page content에는 logo wordmark를 반복하지 않는다.
- compact mobile web처럼 persistent brand shell이 없는 mode에서만 home header에
  brand를 한 번 허용한다.

#### P0. Surface nesting creates generic dashboard appearance

- `ListSurface` 안에 row/card가 있고, 옆 `ContextPanel` 안에 다시 detail card가
  들어간다.
- empty state도 bordered box로 표현돼 내용이 없어도 여러 frame이 남는다.
- selected detail이 없을 때 오른쪽 panel에 작은 안내 card만 떠 넓은 desktop이
  미완성 mockup처럼 보인다.

Decision:

- repeated content는 flat row와 divider가 기본이다.
- list/detail workspace 전체에 하나의 structural boundary만 허용한다.
- base pane에는 shadow를 쓰지 않는다.
- card는 선택된 detail, modal confirmation, 복합 form group처럼 실제 독립
  surface에만 쓴다.

#### P1. Typography has no enforceable semantic scale

- `text-lg`, `text-xl`, `text-2xl`, `text-[28px]`, 다양한 `leading-*`이 화면별로
  조합된다.
- `font-black`이 brand, title, label, navigation, badge에 모두 쓰인다.
- box 높이와 text line box가 맞지 않아 label이 위아래로 떠 보이는 구간이 있다.

Decision:

- font size와 line-height를 묶은 semantic role을 만든다.
- `font-brand`는 wordmark에만 사용한다.
- body와 metadata에 `font-black`을 사용하지 않는다.

#### P1. Control bands flatten the hierarchy

- title, description, search, result count, filter trigger, active chips가 각각 별도
  band나 box가 된다.
- chat context에 metric tile이 추가돼 대화보다 dashboard 성격이 강해진다.
- profile은 settings action보다 activity metric이 먼저 보이는 구성이 남아 있다.

Decision:

- 한 화면의 primary control band는 최대 1개를 기본으로 한다.
- result count는 heading의 보조 정보나 toolbar 끝으로 통합한다.
- active filter는 removable chip을 사용하되 filter가 있을 때만 표시한다.
- metric은 다음 action을 바꾸는 정보일 때만 유지한다.

#### P1. Layout and spacing are page-owned

- 공통 `PageLayout`이 있어도 pages가 자체 padding, max-width, safe-area,
  breakpoint를 반복한다.
- 같은 header와 list가 route마다 다른 좌우 시작선에 놓인다.

Decision:

- responsive behavior를 page가 아니라 layout mode가 소유한다.
- per-screen arbitrary gutter는 제거하고 예외는 문서에 이유를 기록한다.

## 4. Product-facing visual principles

### 4.1 Attention must be earned

한 화면의 시각적 우선순위는 다음 순서를 기본으로 한다.

```text
current task or selected interview
  -> primary action or status
  -> supporting metadata
  -> global navigation and utilities
  -> explanatory copy
```

navigation과 brand가 current task보다 밝거나 크면 실패다.

### 4.2 Objects before containers

사용자가 먼저 읽어야 하는 것은 `card`가 아니라 다음 object다.

- 인터뷰 제목
- 찾는 사람
- 사례비와 방식
- 신청/선정/반려/완료 상태
- 대화 상대와 마지막 메시지
- 지원자와 신청 내용

container는 object 관계를 설명할 때만 보인다.

### 4.3 Dense does not mean cramped

- desktop row는 한눈에 비교할 정보만 유지한다.
- detail은 선택 후 오른쪽 pane 또는 full route에서 제공한다.
- metadata를 10px로 줄여 공간을 만드는 대신 불필요한 문구와 box를 제거한다.
- vertical rhythm은 row마다 같고 section 사이에서만 크게 달라진다.

### 4.4 Human coordination, not database administration

- avatar, 이름, 역할, 한줄 소개는 실제 사람 맥락을 제공할 때 사용한다.
- 사람을 metric tile이나 ID 중심으로 표현하지 않는다.
- founder와 respondent의 다음 action을 문장과 button label로 명확히 한다.

## 5. Foundation contract

### 5.1 Typography roles

Spoqa Han Sans Neo를 유지한다. 아래 값은 초기 구현 contract이며 canonical
viewport와 Korean long-copy QA 후 token 단위로만 조정한다.

| Role | Compact web | Desktop web | Line height | Weight | Typical use |
| --- | ---: | ---: | ---: | ---: | --- |
| `display-brand` | 18px | 14px | 24px / 20px | 700 | shell wordmark only |
| `page-title` | 22px | 24px | 30px / 32px | 700 | route task title |
| `section-title` | 18px | 18px | 26px | 700 | list/detail section |
| `row-title` | 15px | 15px | 22px | 600 | interview, person, chat title |
| `body` | 15px | 14px | 24px / 22px | 400 | description and readable content |
| `label` | 14px | 13px | 20px / 18px | 600 | field and control label |
| `metadata` | 12px | 12px | 18px | 400 or 500 | time, location, secondary state |
| `badge` | 11px | 11px | 16px | 600 | concise status only |
| `control` | 14px | 14px | 20px | 600 | buttons, navigation, tabs |

Rules:

- product UI에서 11px보다 작은 text를 추가하지 않는다.
- long-form legal/support 문서는 별도 reading typography contract를 유지한다.
- arbitrary `text-[Npx]`, `leading-[N]`은 shared role로 표현할 수 없는 경우만
  허용하고 이유를 기록한다.
- `font-black`은 wordmark와 매우 제한된 display use 외에는 제거한다.
- button/input의 text line box와 container height를 함께 정의한다.
- single-line controls는 `items-center`와 fixed line-height를 함께 검증한다.
- multiline content는 top alignment를 명시한다.

### 5.2 Spacing scale

허용 scale:

```text
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px
```

Semantic use:

| Token | Value | Use |
| --- | ---: | --- |
| `control-inline-gap` | 8px | icon-label, inline controls |
| `row-content-gap` | 12px | avatar-content, title-metadata |
| `row-padding-x` | 16px | repeated list row |
| `row-padding-y-compact` | 12px | dense desktop row |
| `row-padding-y-comfortable` | 16px | mobile or complex row |
| `section-gap` | 24px | page sections |
| `page-gutter-medium` | 20px | 768-1199 |
| `page-gutter-desktop` | 24px or 32px | 1200+ by layout mode |
| `page-top` | 24px | standard task page |

Rules:

- 같은 hierarchy 안에서는 같은 spacing을 사용한다.
- section boundary는 row boundary보다 확실히 크게 한다.
- optical alignment가 필요해도 scale 안에서 먼저 해결한다.
- icon의 bounding box가 작아 보인다는 이유로 text baseline을 magic offset으로
  보정하지 않는다.

### 5.3 Surface and elevation

| Level | Visual treatment | Use |
| --- | --- | --- |
| `canvas` | `hypo-bg` | page background |
| `pane` | same canvas or white, divider only | list/detail/settings region |
| `selected` | subtle brand tint or 2px indicator | selected row/current navigation |
| `raised` | border plus minimal shadow | dropdown, popover, selected preview |
| `overlay` | clear shadow and backdrop | modal/dialog |

Rules:

- base list row에는 shadow를 사용하지 않는다.
- pane 안의 pane을 rounded card로 중첩하지 않는다.
- border는 구조를 설명할 때만 사용한다.
- divider는 repeated row 사이에서 사용하고 section 전체를 box로 감싸는 대체재로
  남용하지 않는다.
- radius는 4/6/8px을 기본으로 하고 pill은 badge, segmented control, selected nav
  indicator처럼 capsule 의미가 있을 때만 사용한다.

### 5.4 Color and contrast

- brand green은 primary CTA, selected state, focus, meaningful accent에만 쓴다.
- navigation inactive state는 neutral text/icon으로 뒤로 물러난다.
- status는 text label과 color를 함께 사용한다.
- `hypo-surface-muted`의 warm tone은 meaning 없는 decoration으로 확산하지 않는다.
- border, muted text, icon은 실제 배경 위에서 WCAG contrast를 측정한다.
- unread dot, badge, warning은 color alone이 아닌 label/count/state와 함께 제공한다.

### 5.5 Icon contract

- Lucide 한 세트를 유지한다.
- navigation 18px, ordinary action 16-18px, primary icon action 18-20px를 기본으로
  한다.
- 같은 row 안에서 stroke width를 임의로 다르게 하지 않는다.
- icon-only action은 36-40px hit area와 accessible name을 갖는다.
- navigation은 icon-only로 축소하지 않고 label을 함께 유지한다.
- decorative brand mark와 action icon을 같은 크기/weight로 경쟁시키지 않는다.

## 6. Shell and brand contract

### 6.1 Desktop: 1200px and above

- left rail의 top brand가 authenticated product에서 유일한 persistent wordmark다.
- rail width 초기값은 224-232px 범위에서 content stress test 후 확정한다.
- main content 안의 logo와 `Hypofit` 반복을 제거한다.
- global notification은 shell utility로 한 번만 제공한다.
- page는 brand가 아니라 task title을 표시한다.
- active navigation은 quiet tint와 indicator로 표시하고 큰 floating card처럼 만들지
  않는다.
- rail footer는 실제 user/account action 또는 최소한의 support access만 둔다.
  generic motivational copy는 제거 후보로 분류한다.

### 6.2 Medium: 768-1199px

- top navigation이 logo와 wordmark를 한 번 소유한다.
- content page에서 wordmark를 반복하지 않는다.
- top nav 높이는 56-64px 안에서 고정하고 content starts를 모든 route에서 맞춘다.
- page title과 controls는 top nav 아래 별도 task band에 둔다.

### 6.3 Compact web: 320-767px

- persistent wordmark가 없으므로 home에서만 logo와 brand를 한 번 허용한다.
- 다른 tab은 concise page title을 사용한다.
- bottom navigation label과 icon 크기는 native app parity를 참고하되 web hit target과
  browser safe area를 지킨다.
- home logo, page title, section title이 한 viewport 안에서 세 번 반복되지 않게 한다.

### 6.4 Page identity

Page header는 다음 중 필요한 항목만 갖는다.

```text
task title
short supporting sentence, only when needed
primary page action
optional utility actions
```

다음은 제거한다.

- `홈` eyebrow + `Hypofit` wordmark + recent-interview section title의 삼중 반복
- 현재 route 이름을 page와 section에서 연속 반복
- 기능을 이미 보여주고 있는데 다시 설명하는 generic helper sentence
- sidebar와 동일한 brand mark

## 7. Layout modes

Page가 breakpoint behavior를 직접 조립하지 않고 다음 mode 중 하나를 선택한다.

### 7.1 `list-detail`

Use:

- home recent interviews
- interview discovery
- notification list where detail is useful
- my applications/posts

Desktop contract:

- list pane `minmax(520px, 1fr)`
- detail pane `360-420px`
- pane gap 16-20px or one shared split boundary
- list and detail header baselines aligned
- selected detail이 없으면 meaningless bordered helper card를 띄우지 않는다.
  detail pane을 접거나 unframed neutral placeholder를 사용한다.

### 7.2 `workspace`

Use:

- chat
- map

Contract:

- viewport height를 소유한다.
- document body가 아니라 internal pane/list가 scroll한다.
- chat/map primary surface에는 decorative outer card를 두지 않는다.
- third context pane은 task relevance가 있을 때만 표시한다.

### 7.3 `settings-form`

Use:

- profile and settings
- create/edit post
- account/support/report forms

Contract:

- content max width를 task complexity로 결정한다.
- fields를 card마다 나누지 않고 semantic section과 divider로 묶는다.
- primary action 위치를 page마다 바꾸지 않는다.
- long forms는 section title, field group, sticky action 필요 여부를 명시한다.

### 7.4 `document`

Use:

- legal and long-form policy
- public help documents

Contract:

- body line length를 제한한다.
- app workspace typography를 long-form text에 그대로 적용하지 않는다.
- reading order와 heading hierarchy를 최우선으로 한다.

## 8. Route-by-route implementation backlog

### 8.1 Shell and shared foundation - P0

Primary files:

- `apps/web/src/shared/ui/navigation/AppShell.tsx`
- `apps/web/src/shared/ui/page.tsx`
- `apps/web/src/shared/ui/workspace.tsx`
- `apps/web/src/shared/ui/button.tsx`
- `apps/web/src/shared/ui/field.tsx`
- `apps/web/src/styles.css`

Tasks:

- [x] desktop/medium/compact brand ownership을 구현한다.
- [x] home content의 duplicated logo/wordmark를 viewport mode별로 제거한다.
- [x] notification utility 위치를 shell contract로 통합한다.
- [x] page title, section title, row title, body, metadata, badge, control role을
      shared primitives로 만든다.
- [x] `PageLayout`을 `list-detail`, `workspace`, `settings-form`, `document` mode로
      명확히 나눈다.
- [x] `ListSurface`와 `ContextPanel`의 default card treatment를 pane-first 구조로
      바꾼다.
- [x] screen-specific gutter와 max-width override inventory를 작성하고 제거한다.
- [x] base surface shadow와 nested card를 제거한다.

Acceptance:

- desktop first viewport에 brand logo/name pair가 한 번만 보인다.
- page title baseline과 main gutter가 주요 route에서 일치한다.
- shell에서 active nav보다 selected task content가 높은 시각적 무게를 갖는다.
- 1199/1200px 전환에서 duplicate nav, blank row, document overflow가 없다.

### 8.2 Home `/app` - P0

Primary file:

- `apps/web/src/pages/ExplorePage.tsx`

Tasks:

- [x] desktop/medium에서 content logo와 `Hypofit`을 제거한다.
- [x] page heading과 `최근 올라온 인터뷰` section의 중복을 하나의 task header로
      정리한다.
- [x] recent interview list를 flat rows와 dividers로 바꾼다.
- [x] selected row만 quiet background/indicator를 가진다.
- [x] detail 미선택 상태의 작은 bordered helper card를 제거한다.
- [x] empty state를 list pane 안의 unframed state로 바꾼다.
- [x] empty state에서도 pane가 거대한 빈 white card처럼 보이지 않게 한다.
- [x] home과 interview 목록의 텍스트 로딩 상태를 동일한 row skeleton으로 통합한다.
- [x] 인터뷰가 많을 때 header는 고정되고 list만 scroll하는 현재 contract를
      유지한다.
- [x] compact web에서는 logo를 한 번만 유지하고 desktop과 다른 header variant를
      사용한다.

Acceptance:

- home이 interview search page를 복제하지 않는다.
- 0, 1, 5, 20개 interview 상태에서 layout이 자연스럽다.
- long Korean title, no image, read/unread, applied status가 row 높이를 깨지 않는다.

### 8.3 Interview discovery `/interviews` - P0

Primary files:

- `apps/web/src/pages/InterviewsPage.tsx`
- `apps/web/src/features/interview-posts/components/OpportunityCard.tsx`
- `apps/web/src/features/interview-posts/components/OpportunityDetailPanel.tsx`
- `apps/web/src/features/interview-posts/components/OpportunityExpandedDetail.tsx`

Tasks:

- [x] title/description/search/result/filter를 최대 두 개 vertical band로 통합한다.
- [x] result count를 독립 decorative badge가 아닌 heading/toolbar metadata로 바꾼다.
- [x] desktop filter는 persistent compact toolbar, compact web은 modal/sheet로
      명확히 분리한다.
- [x] active filter chip은 실제 filter가 있을 때만 표시한다.
- [x] row에는 title, target summary, reward, mode, location/status만 우선 표시한다.
- [x] row expansion과 right detail pane이 같은 정보를 중복하지 않게 한다.
- [x] desktop에서는 selected detail pane, compact에서는 pushed full detail 또는
      controlled expansion 중 하나만 사용한다.
- [x] apply CTA는 detail hierarchy의 마지막 primary action으로 고정한다.

Acceptance:

- search와 filter가 content보다 높은 card처럼 보이지 않는다.
- row scan만으로 지원 여부 판단의 1차 정보가 보인다.
- detail에 들어가야 할 founder/review/long description이 row에 넘치지 않는다.

### 8.4 My interviews and owned posts - P1

Primary routes/components:

- `/my-interviews`
- application/post management components

Tasks:

- [x] 신청한 인터뷰와 내가 만든 모집글을 metric dashboard가 아닌 task list로
      구성한다.
- [x] status filter와 count를 하나의 segmented/tab contract로 통합한다.
- [x] applicant list는 name, fit summary, status, last activity, chat action을
      우선한다.
- [x] management actions는 overflow menu와 explicit primary action으로 구분한다.
- [x] 완료된 object는 visual noise를 낮추되 text/status는 유지한다.

### 8.5 Chat `/chat` and `/chat/:roomId` - P1

Primary file:

- `apps/web/src/pages/ChatPage.tsx`

Tasks:

- [x] chat list를 borderless row + divider 기반으로 통일한다.
- [x] name, interview context, last message, time, unread, status의 type role을
      고정한다.
- [x] conversation이 현재 task일 때 sidebar와 metric tiles가 경쟁하지 않게 한다.
- [x] third context pane의 four-metric summary를 제거하거나 실제 next action 정보로
      대체한다.
- [x] interview detail은 필요할 때 열리는 context로 progressive disclosure한다.
- [x] message composer, header, conversation의 horizontal starts를 맞춘다.
- [x] unread, blocked, ended, selected/rejected states를 card 추가 없이 표현한다.

Acceptance:

- chat이 Android SMS mockup이나 generic CRM inbox가 아니라 familiar DM pattern으로
  읽힌다.
- 사람과 인터뷰 context가 보이지만 row가 과도하게 높지 않다.
- keyboard, scroll, route transition contract는 sibling navigation plan을 유지한다.

### 8.6 Map `/map` - P1

Primary file:

- `apps/web/src/pages/MapPage.tsx`

Tasks:

- [x] map를 primary canvas로 유지하고 outer card frame을 제거한다.
- [x] search, current-location, list toggle만 raised control로 허용한다.
- [x] selected marker preview와 interview list의 surface level을 구분한다.
- [x] browser current-location marker state를 viewport search center와 분리해
      map drag, zoom, place search 뒤에도 실제 위치 marker를 유지한다.
- [x] user-driven map zoom의 viewport feedback에는 camera를 다시 적용하지 않고,
      external center change 또는 marker selection 때만 center와 level을 동기화한다.
- [x] desktop list pane은 map와 같은 top/bottom baseline을 가진다.
- [x] filter/status copy를 map 위에 중복하지 않는다.
- [x] loading/empty/error state가 map gesture를 불필요하게 차단하지 않는다.

Acceptance:

- map, search, marker, selected preview, list의 z-index와 visual weight가 명확하다.
- desktop에서 map가 작은 card 안의 illustration처럼 보이지 않는다.

### 8.7 Profile and settings `/profile/*` - P1

Primary files:

- `apps/web/src/pages/ProfilePage.tsx`
- `apps/web/src/pages/ProfileSubPage.tsx`

Tasks:

- [x] activity metric을 settings보다 먼저 보여주는 dashboard layout을 제거한다.
- [x] identity summary는 한 번만 제공하고 settings는 section + row + divider로
      구성한다.
- [x] desktop identity summary에서 nickname 바로 아래에 한줄소개를 표시하고
      email은 보조 metadata로 분리한다. Nickname은 primary text, 한줄소개는
      brand accent, email은 icon metadata로 시각적 역할을 구분한다.
- [x] account information 상단에 다른 사용자에게 보이는 photo, name, role, bio만
      사용한 명함형 public profile preview를 제공하고 email과 phone은 제외한다.
- [x] profile photo upload를 별도 section으로 두지 않고 account 기본 정보의 첫
      row로 통합한다.
- [x] account detail의 page intro와 public profile preview 사이에 충분한 vertical
      rhythm과 divider를 두어 페이지 설명과 실제 설정 콘텐츠를 구분한다.
- [x] account password change의 current, new, confirm fields에 독립적인
      show/hide control을 제공하고 화면 이탈 시 다시 hidden 상태로 초기화한다.
- [x] account, role, notifications, appearance, support, report, legal의 group order를
      mobile product contract와 맞춘다.
- [x] row icon, label, chevron의 color와 weight를 통일한다.
- [x] destructive account action은 footer utility와 confirm flow로 분리한다.
- [x] subpage header, form width, save/cancel action 위치를 통일한다.
- [x] 1200px 이상 `/profile`은 모바일식 허브를 늘리지 않고 계정 설정 detail로
      연결한다. 모바일·compact web의 기존 프로필 허브는 유지한다.
- [x] desktop 설정 navigation은 identity summary + flat secondary navigation으로
      구성하고, group별 card와 중복 업무 CTA를 제거한다.
- [x] desktop detail에서는 모바일용 뒤로가기 control을 숨기고 browser history와
      persistent secondary navigation을 사용한다.

Acceptance:

- profile이 user analytics dashboard가 아니라 settings surface로 읽힌다.
- account deletion, report, support, legal link reachability를 유지한다.

### 8.8 Notifications - P2

Primary files:

- `apps/web/src/pages/NotificationsPage.tsx`
- `apps/web/src/features/notifications/components/NotificationPopover.tsx`
- `apps/web/src/features/notifications/notificationPresentation.tsx`
- `apps/web/src/shared/ui/notification-button.tsx`

Tasks:

- [x] date group과 item 사이의 redundant card/divider를 줄인다.
- [x] unread는 dot와 text weight로 표현하고 전체 row card를 만들지 않는다.
- [x] notification type icon은 decorative tile이 아니라 recognition aid로만 쓴다.
- [x] click destination과 read state feedback을 명확히 한다.
- [x] desktop/medium shell bell을 최근 6개 알림 popover trigger로 변경한다.
- [x] compact page-level bell과 `/notifications` full page route를 유지한다.
- [x] popover loading, empty, error, unread/read, mark-all states를 구현한다.
- [x] notification destination, relative time, date grouping presentation logic을
      feature module로 분리해 popover와 full page가 공유한다.

### 8.9 Auth, support, legal harmonization - P2

이 plan은 sibling flow를 변경하지 않는다. foundation 적용만 한다.

Tasks:

- [x] auth/support/legal에서 shared type, field, button, focus token을 사용한다.
- [x] public page의 brand 노출은 authenticated shell rule과 별도로 유지한다.
- [x] long-form document는 app row density를 강제로 적용하지 않는다.
- [x] support list/detail은 support plan의 state/route contract를 유지한다.

## 9. Shared component remediation

| Primitive | Current issue | Target contract |
| --- | --- | --- |
| `AppShell` | logo duplication and page-owned utilities | one brand owner per viewport, one global utility region |
| `PageLayout` | mode and gutter drift | explicit layout mode with centralized breakpoints |
| `PageHeader` | title/description/action composition varies | semantic task header with consistent baseline |
| `ListSurface` | defaults to card | flat pane by default, optional framed variant |
| `ContextPanel` | card within every split view | unframed pane by default, raised only when selected/overlay |
| `OpportunityCard` | repeated independent card | reusable entity row with divider and selected state |
| `EmptyState` | bordered card inside empty pane | compact/unframed/panel variants based on context |
| `Button` | screen-level size/weight overrides | fixed size, type role, icon gap, loading width |
| `Field` | text baseline and box proportion drift | fixed control height plus typography role |
| `StatusBadge` | decorative pill expansion | status-only semantic variants |
| `NotificationButton` | page-by-page placement | shell utility on desktop/medium, page action only compact |

New abstraction rule:

- component를 새로 만드는 목적은 긴 class string을 숨기는 것이 아니라 반복되는
  semantic decision을 한곳에 고정하는 것이다.
- one-off visual wrappers는 shared component로 승격하지 않는다.
- shared primitive는 default, hover, focus, selected, disabled, loading, long text를
  함께 정의한다.

## 10. State matrix

각 screen cluster는 다음 state를 별도 screenshot 또는 interaction QA로 확인한다.

| State | Home/interview | Chat | Map | Profile/support |
| --- | --- | --- | --- | --- |
| default with data | required | required | required | required |
| loading | required | required | required | required |
| empty | required | required | required | required where applicable |
| API error | required | required | required | required |
| auth expired | required | required | required | required |
| offline | required | required | required | required |
| long Korean title/name | required | required | marker/list | required |
| no profile image | row/detail | row/header | preview | identity |
| selected | row/detail | room | marker | row where applicable |
| unread/unviewed | row | row/message | n/a | notification |
| disabled/loading CTA | apply | workflow/send | location/search | save/submit |
| permission denied | n/a | notification if relevant | location | photo/notification |
| keyboard open | search/apply | composer | search | forms |

## 11. Responsive and density matrix

### 11.1 Canonical viewports

```text
320 x 568    minimum compact web
390 x 844    current phone reference
768 x 900    medium start
1024 x 768   medium landscape / small notebook fallback
1199 x 800   medium boundary
1200 x 800   desktop boundary
1280 x 720   low-height desktop
1366 x 768   common notebook
1440 x 900   primary desktop
1600 x 900   wide desktop
```

### 11.2 Reflow and zoom

- 320 CSS px에서 horizontal page scroll 없이 core flow가 작동해야 한다.
- 200% browser zoom에서 navigation, primary action, form labels가 잘리지 않는다.
- list-detail이 유지되지 않으면 single pane으로 reflow한다.
- browser text spacing override에도 controls가 clipping되지 않는다.

### 11.3 Density targets

- simple desktop list row: 60-72px
- avatar/chat desktop row: 68-80px
- complex interview row: 76-92px, 정보를 줄여 이 범위를 넘지 않는 것을 우선한다.
- compact web row: desktop보다 4-8px 더 여유를 둘 수 있다.
- icon-only target: visual icon 16-20px, clickable area 36-44px
- primary button: 40-44px desktop, 44-48px compact web
- single-line input: 40-44px desktop, 44-48px compact web

수치는 hardcoded screen class가 아니라 shared size variant로 구현한다.

## 12. Accessibility and content quality

### 12.1 Accessibility gate

- semantic heading order가 visual size와 일치한다.
- keyboard focus가 sidebar, toolbar, list, detail, modal 순서로 예측 가능하다.
- focus ring이 border/background에 묻히지 않는다.
- 24x24 CSS px WCAG minimum target을 항상 만족하고 주요 control은 36px 이상을
  사용한다.
- selected, unread, rejected, warning을 color만으로 전달하지 않는다.
- tooltip이나 hover 없이 navigation 의미를 이해할 수 있다.
- sticky/fixed UI가 zoom과 keyboard focus를 가리지 않는다.

### 12.2 Copy gate

- title은 현재 object 또는 task를 말한다.
- description은 화면을 보고 알 수 없는 정보만 설명한다.
- generic copy (`한눈에`, `더 정확하게`, `이어가세요`)를 반복하지 않는다.
- button은 실행 결과가 드러나는 동사를 사용한다.
- same object를 page title, section title, card title에서 세 번 반복하지 않는다.
- founder/respondent role language를 현재 service glossary와 맞춘다.

## 13. Implementation sequence

### Phase 0. Baseline capture and inventory

- [ ] review/demo account로 deterministic data state를 확정한다.
- [ ] canonical viewport별 current screenshots를 저장한다.
- [ ] route별 brand count, card layers, title roles, scroll owner를 기록한다.
- [ ] current keyboard/focus order를 기록한다.
- [ ] before screenshots에 실제 문제 annotation을 남긴다.

Exit gate:

- subjective feedback가 아니라 route별 observable problem list가 있다.

### Phase 1. Foundation tokens and primitives

- [x] typography roles를 shared token/component로 구현한다.
- [x] spacing/gutter/page mode를 구현한다.
- [x] surface/elevation variants를 구현한다.
- [x] button, field, badge, empty state를 정규화한다.
- [x] visual-only wrapper와 nested card를 줄인다.

Exit gate:

- 새 screen implementation이 raw type/spacing decision을 반복하지 않는다.

### Phase 2. Shell and brand ownership

- [x] desktop rail brand를 single owner로 만든다.
- [x] medium top nav brand를 single owner로 만든다.
- [x] compact home brand exception을 구현한다.
- [x] global notification utility를 통합한다.
- [x] page header starts와 shell content gutter를 통일한다.

Exit gate:

- 각 viewport에서 first viewport의 logo/wordmark pair가 한 번만 보인다.

### Phase 3. Home and interview discovery

- [x] home flat list/detail을 구현한다.
- [x] home zero/one/many states를 구현한다.
- [x] interview toolbar와 filters를 통합한다.
- [x] interview row/detail responsibility를 분리한다.
- [x] selected/applied/viewed state를 통일한다.

Exit gate:

- 두 핵심 browse screen이 같은 object language와 density를 사용한다.

### Phase 4. Chat and map workspace

- [x] chat list/thread/context의 시각적 우선순위를 정리한다.
- [x] metric tile과 redundant summary를 제거한다.
- [x] map canvas와 floating controls의 elevation을 정리한다.
- [x] internal scroll/gesture ownership을 재검증한다.

Exit gate:

- immersive surface가 일반 card page처럼 보이지 않는다.

### Phase 5. Profile, notifications, management

- [x] settings row system을 적용한다.
- [x] desktop footer와 중복되는 profile 법적 링크는 desktop에서 숨기고 compact
      viewport의 profile 접근 경로는 유지한다.
- [x] desktop/medium utility header에 account avatar menu를 추가하고 계정 정보
      요약, profile settings, sign-out 경로를 제공하며 dropdown stacking context가
      main content 위에 유지되도록 한다. 계정 수정은 profile settings 안에서
      진입한다. Header trigger는 원형 avatar와 명확한 경계선을 사용한다.
- [x] application/post management를 task list로 정리한다.
- [x] notification list를 flat grouped list로 정리한다.
- [x] auth/support/legal에 foundation token을 적용한다.

Exit gate:

- remaining route가 core route와 다른 제품처럼 보이지 않는다.

### Phase 6. QA, polish, and release decision

- [ ] Chrome, Safari, Firefox current stable에서 core route를 확인한다.
- [ ] canonical viewport와 200% zoom을 확인한다.
- [ ] keyboard-only와 reduced-motion을 확인한다.
- [ ] loading/empty/error/long-copy state를 확인한다.
- [ ] before/after screenshot review를 수행한다.
- [x] production build와 relevant tests를 실행한다.
- [x] requested only: Vercel manual deploy와 공개 route production smoke를 수행한다.
- [ ] requested/final only: approved screens를 Figma에 sync한다.

## 14. Validation strategy

### 14.1 Static checks

- raw `font-black`, arbitrary font size, shadow, nested surface usage의 diff를 audit한다.
- shared primitive 밖의 new `rounded-hypo-lg`, `shadow-hypo-panel` 사용을 review한다.
- route별 duplicated `Hypofit`/logo occurrence를 검사한다.
- `git diff --check`를 실행한다.

### 14.2 Behavioral checks

- document scroll과 internal list scroll을 구분한다.
- 1199/1200 breakpoint 양쪽에서 shell grid placement를 확인한다.
- list selection 후 browser back/forward가 올바른 context로 돌아오는지 확인한다.
- modal/popover focus return을 확인한다.
- search/filter input과 keyboard action을 확인한다.

### 14.3 Visual review rubric

각 screen을 1-5점으로 평가하고 하나라도 3점 미만이면 완료 처리하지 않는다.

| Criterion | Question |
| --- | --- |
| task clarity | 3초 안에 현재 할 일과 primary object를 알 수 있는가 |
| hierarchy | title, status, action, metadata의 순서가 분명한가 |
| density | 빈 공간이나 과밀 없이 반복 작업에 적합한가 |
| brand restraint | Hypofit identity가 보이지만 task를 방해하지 않는가 |
| originality | generic AI dashboard나 외부 product clone처럼 보이지 않는가 |
| consistency | 같은 object/action/state가 route마다 같은 방식으로 보이는가 |
| responsiveness | content에 따라 자연스럽게 reflow되는가 |
| accessibility | contrast, focus, target, zoom, text spacing이 안전한가 |
| implementation fit | shared component와 Tailwind token으로 유지 가능한가 |

### 14.4 Acceptance metrics

- desktop/medium authenticated shell의 logo + `Hypofit` pair: viewport당 1개
- core page의 primary heading: 1개
- base repeated row shadow: 0개
- nested card: 0개, documented exception only
- small UI text: 11px below 금지
- page-specific document scroll on workspace routes: 0
- horizontal scroll at 320px and 200% zoom: 0, essential map/table exception only
- core route keyboard trap: 0
- visible focus missing control: 0

## 15. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| 전체 redesign이 한 번에 커져 regression이 발생 | foundation -> shell -> screen cluster 순으로 작은 vertical slice를 merge한다 |
| card를 제거한 뒤 grouping이 약해짐 | divider, spacing, heading, selected background의 역할을 먼저 token화한다 |
| mobile web parity가 깨짐 | compact variant를 같은 component contract 안에서 함께 구현한다 |
| desktop density를 위해 text가 너무 작아짐 | metadata 12px minimum과 zoom QA를 release gate로 둔다 |
| 외부 reference를 과도하게 복제 | pattern insight와 Hypofit adaptation을 문서화하고 visual signature는 복제하지 않는다 |
| shared abstraction이 과도해짐 | 반복 semantic decision이 없는 wrapper는 component로 만들지 않는다 |
| 기존 dirty worktree와 충돌 | route cluster별 ownership을 분리하고 unrelated changes를 되돌리지 않는다 |
| visual polish가 API/state regression을 가림 | loading/empty/error/auth-expired state를 phase별 acceptance에 포함한다 |

## 16. Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-15 | authenticated desktop/medium에서 shell만 persistent brand를 소유 | sidebar와 본문의 logo/name 중복 제거 |
| 2026-07-15 | card-first가 아니라 pane/row-first로 전환 | grouping과 task hierarchy 회복 |
| 2026-07-15 | new active plan은 visual quality remediation만 소유 | 기존 desktop IA, navigation motion, auth/support plan과 backlog 충돌 방지 |
| 2026-07-15 | Figma sync는 code direction 승인 후 수행 | active iteration 중 design/code drift 방지 |

## 17. Definition of done

이 계획은 다음 조건이 모두 충족될 때만 completed로 이동한다.

- shell brand ownership이 viewport별로 한 번만 적용됐다.
- typography, spacing, surface, icon, control semantic contract가 code에 구현됐다.
- home, interview, chat, map, profile, notification의 core visual remediation가
  완료됐다.
- card nesting과 generic metric dashboard 요소가 제거되거나 product reason으로
  명시됐다.
- canonical viewport, long Korean text, zero/one/many, loading/empty/error,
  keyboard, 200% zoom QA가 완료됐다.
- relevant web tests, lint, production build가 통과했다.
- Vercel production deployment는 사용자가 요청한 경우에만 완료/검증됐다.
- Figma sync가 수행됐거나 의도적으로 deferred됐다고 final report에 명시됐다.
- `docs/active/README.md`, `AGENTS.md`, service reading order가 최신 상태다.
