# Hypofit

<p align="left">
  <img src="apps/web/public/brand/hypofit-logo.svg" alt="Hypofit" width="220" />
</p>

<p>
  초기 창업팀이 실제 타깃 고객을 빠르게 모집하고,
  사례비 기반 고객 인터뷰를 끝까지 완료하도록 돕는 인터뷰 매칭 서비스입니다.
</p>

<p>
  <img alt="iOS 1.0.0 released" src="https://img.shields.io/badge/iOS-1.0.0%20released-176B5D?style=flat-square" />
  <img alt="Android release in progress" src="https://img.shields.io/badge/Android-release%20in%20progress-F5A623?style=flat-square" />
  <img alt="Auth social only" src="https://img.shields.io/badge/Auth-social%20only-1D2522?style=flat-square" />
  <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-4B5563?style=flat-square" />
</p>

<p>
  <img src="apps/web/public/brand/hypofit-social-1200x630.png" alt="Hypofit brand preview" width="100%" />
</p>

## 무엇을 해결하나

가설 검증이 필요한 예비 창업자와 초기 창업자는 인터뷰 대상자를 찾는 데 시간을 많이 씁니다.
Hypofit은 이 과정을 `모집글 작성 -> 지원 접수 -> 선정/반려 -> 채팅 조율 -> 인터뷰 완료`로 정리해,
실제 고객 인터뷰를 더 빠르게 성사시키는 데 집중합니다.

현재 MVP는 대규모 리서치 플랫폼이나 AI 매칭 서비스가 아니라,
유료 고객 인터뷰 매칭 루프가 실제로 작동하는지 검증하는 제품입니다.

## 핵심 제품 루프

```text
창업자 모집글 작성
  -> 인터뷰어 지원
  -> 창업자 검토 및 선정/반려
  -> 채팅으로 일정과 방식 조율
  -> 인터뷰 진행
  -> 완료 / 문제 / 노쇼 기록
```

## 현재 제품 표면

### `apps/mobile`

실제 iOS/Android 제품 앱입니다.

- 소셜 로그인 중심 인증 진입
- 홈, 인터뷰, 지도, 채팅, 프로필 탭
- 모집글 작성, 지원, 선정/반려, 일정 조율, 후기/신뢰 흐름
- 위치, 푸시, 이미지 선택 같은 네이티브 기능

### `apps/web`

공개 웹과 데스크톱 보조 표면입니다.

- 랜딩 페이지와 로그인 진입
- 법률 문서, 지원/문의, 계정 삭제 웹 경로
- 설치/PWA fallback
- 데스크톱용 운영형 고객 웹 화면

### `apps/api`

Java 21 Spring Boot API입니다.

- 인터뷰 모집글, 지원, 세션, 채팅, 알림, 신고/문의, 계정 삭제
- Supabase Auth bearer token 검증
- OpenAPI 계약, Flyway 마이그레이션, 운영 readiness 경로

### `packages/contracts`

웹과 모바일이 함께 쓰는 타입, enum, 포맷터, 법률/문구 상수입니다.

## 현재 아키텍처와 상태

- 모노레포 구조를 유지합니다.
- 웹은 React + Vite로 운영합니다.
- 모바일은 Expo React Native가 정식 배포 경로입니다.
- API는 Spring Boot가 단일 기준 구현입니다.
- 웹은 Vercel, API는 Lightsail, 영속 데이터와 Auth는 Supabase를 사용합니다.
- 공개 인증 진입은 현재 소셜 로그인 전용입니다.
- iOS `1.0.0`은 출시 기준선이고, Android/Google Play는 현재 진행 중입니다.

## 기술 스택

- Web: React, Vite, TypeScript, TanStack Query, Tailwind CSS
- Mobile: Expo, React Native, Expo Router, NativeWind, TanStack Query
- API: Java 21, Spring Boot, Spring Security Resource Server, JPA/JDBC, Flyway
- Data/Auth: Supabase Postgres, Supabase Auth
- Infra: Vercel, Amazon Lightsail, Docker, GitHub Actions

## 저장소 구조

```text
hypofit/
  apps/
    web/
    mobile/
    api/
  packages/
    contracts/
  infra/
  docs/
  Makefile
  README.md
```

## 주요 문서

- [Service Knowledge Base](docs/service/README.md)
- [Agent Start Here](docs/service/00-agent-start-here.md)
- [Current MVP Execution Roadmap](docs/active/current-mvp-execution-roadmap.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Repository Structure](docs/repository-structure.md)
- [Reference Documents](docs/reference/README.md)
- [Cross-Platform Social Login Authentication Plan](docs/active/cross-platform-social-login-authentication-plan.md)

## 지원 / 보안 / 라이선스

- Support: [ssamso8282@gmail.com](mailto:ssamso8282@gmail.com)
- Security: 민감한 보안 이슈는 공개 이슈 대신 [보안 정책](SECURITY.md)에 따라 알려주세요.
- License: 이 프로젝트의 소스 코드는 [MIT License](LICENSE.md)를 따릅니다.
