# Hypofit Store Marketing Assets

Last updated: 2026-08-12

Hypofit 스토어와 GitHub README에 사용하는 코드 기반 홍보 이미지입니다. 모든 결과물은 `tools/store-creative/`의 HTML/CSS 렌더러에서 생성합니다.

## 현재 결과물

| 용도 | 규격 | 수량 | 경로 | 상태 |
| --- | --- | ---: | --- | --- |
| App Store iPhone 6.9-inch | `1320 x 2868` PNG | 3 | `export/app-store/` | 업로드 규격 완료 |
| Google Play phone | `1080 x 1920` PNG | 4 | `export/google-play/` | 레이아웃 완료, Android 릴리스 캡처 교체 필요 |
| Google Play feature graphic | `1024 x 500` PNG | 1 | `export/google-play/` | 업로드 규격 완료 |
| GitHub README | `2400 x 1260` PNG | 1 | `export/readme/` | 2x Retina 적용 완료 |

모든 PNG는 alpha channel이 없으며, 현재 한국어 세트는 아래 흐름을 설명합니다.

1. 실제 고객과 검증 인터뷰를 시작합니다.
2. 검색과 지도에서 조건에 맞는 인터뷰를 찾습니다.
3. 신청 이후 채팅에서 일정과 방식을 조율합니다.
4. 홈에서 모집과 신청 진행 상황을 확인합니다.

## 내보내기

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm store:creative:export
```

내보내기 스크립트는 로컬 Chrome을 사용해 고정 크기 PNG를 생성하고 각 파일의 픽셀 크기를 검증합니다. Play용 `1024 x 500` 그래픽 이미지도 같은 명령으로 생성합니다. 결과 디렉터리를 매번 비운 뒤 재생성하므로 수동 편집본은 이 경로에 두지 않습니다.

## 소스 캡처

현재 Apple 세트와 README는 App Store에 공개된 iOS `1.0.0` 캡처를 사용합니다.

- `docs/assets/readme/app-screens/home-current-brand.png`
- `docs/assets/readme/app-screens/interviews.jpg`
- `docs/assets/readme/app-screens/map.jpg`
- `docs/assets/readme/app-screens/interview-detail.jpg`
- `docs/assets/readme/app-screens/chat.jpg`

Google Play 세트의 레이아웃과 카피는 확정할 수 있지만, Play Console 최종 업로드본은 Android 릴리스 후보에서 같은 상태를 다시 캡처한 뒤 소스 경로를 교체해야 합니다. iPhone 상태 표시줄이나 Dynamic Island가 보이는 초안을 Android 최종 스토어 이미지로 제출하지 않습니다.

## Google Play 대체 텍스트

- 01: 최근 인터뷰와 진행 상황을 확인하는 Hypofit 홈 화면
- 02: 검색한 지역 주변의 대면 인터뷰를 비교하는 Hypofit 지도 화면
- 03: 선정 이후 인터뷰 일정과 방식을 조율하는 Hypofit 채팅 화면
- 04: 모집글과 신청 현황을 한눈에 확인하는 Hypofit 홈 화면

## 카피 제한

- 사례비는 모집 조건으로만 표현하며 지급 보장을 주장하지 않습니다.
- AI 매칭, 신원 보장, 에스크로, 자동 선정처럼 현재 제공하지 않는 기능을 표현하지 않습니다.
- 실제 사용자 개인정보, 비공개 주소, 인증정보를 캡처에 포함하지 않습니다.
