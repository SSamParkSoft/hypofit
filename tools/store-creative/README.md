# Hypofit Store Creative Renderer

실제 앱 캡처와 Hypofit 브랜드 토큰을 사용해 스토어 및 GitHub 홍보 이미지를 재현 가능하게 생성합니다.

```bash
corepack pnpm store:creative:export
```

생성 결과:

- App Store 6.9-inch: `docs/store-assets/marketing/export/app-store/` (`1320 x 2868`, 3장)
- Google Play phone: `docs/store-assets/marketing/export/google-play/` (`1080 x 1920`, 4장)
- Google Play feature graphic: `docs/store-assets/marketing/export/google-play/` (`1024 x 500`, 1장)
- GitHub README: `docs/store-assets/marketing/export/readme/` (`2400 x 1260`, 2x Retina, 1장)

## 원칙

- 앱 UI는 HTML로 다시 그리지 않고 실제 캡처를 사용합니다.
- 카피와 배경, 화면 배치만 HTML/CSS에서 합성합니다.
- Apple과 Google Play는 같은 요소를 사용하되 각 캔버스에 맞게 재구성합니다.
- 결제 보장, AI 매칭, 신원 보장처럼 현재 제공하지 않는 기능은 표현하지 않습니다.
- Play 이미지는 iOS 상태 표시줄을 제외한 앱 콘텐츠 영역만 사용합니다. Android 릴리스 후보 화면이 준비되면 같은 파일명으로 소스를 교체해 최종 재출력합니다.

현재 소스 캡처는 `docs/assets/readme/app-screens/`의 공개 App Store 캡처입니다. 새 캡처로 교체할 때 파일명과 화면 의미를 유지하면 렌더러 수정 없이 다시 내보낼 수 있습니다.
