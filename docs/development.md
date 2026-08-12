# 로컬 개발 가이드

이 문서는 Hypofit을 로컬에서 실행하고 변경 영역에 맞는 검증을 수행하는 방법을 설명합니다.
전체 문서 목차는 `docs/README.md`, 서비스와 제품 흐름은 `docs/service/README.md`, 시스템 구조는
`docs/architecture.md`, 기여와 PR 절차는 루트의 `CONTRIBUTING.md`를 참고합니다.

## 개발 환경

기본 요구 사항:

- Node.js 20 이상
- Corepack과 `pnpm@9`
- Java 21
- Docker Desktop
- iOS 개발 시 Xcode와 iOS Simulator
- Android 개발 시 Android Studio와 Android Emulator

저장소는 pnpm 워크스페이스를 사용합니다. 루트 `package.json`에 선언된 pnpm 버전을 우선합니다.

## 의존성 설치

저장소 루트에서 실행합니다.

```bash
corepack enable
pnpm install
```

## 환경 변수

공개 가능한 예시는 루트 `.env.example`에 있습니다. 필요한 값을 각 앱의 로컬 환경 파일에 설정하되,
실제 비밀키와 운영 인증서는 커밋하지 않습니다.

주요 범주:

- 웹: API 주소, Supabase 공개 URL과 anon key, Kakao Maps 공개 키
- 모바일: API 주소, Supabase 공개 URL과 anon key, Google Maps 공개 키
- API: 데이터베이스 연결, Supabase 서버 설정, 소셜 인증, 푸시와 외부 공급자 설정

`VITE_*`와 `EXPO_PUBLIC_*` 값은 클라이언트 번들에 포함될 수 있습니다. 서비스 역할 키, 공급자 secret,
개인키와 데이터베이스 암호를 이 접두사의 환경 변수에 넣지 않습니다.

## 웹 실행

```bash
make dev-web
```

동일한 작업을 패키지 명령으로 실행할 수도 있습니다.

```bash
pnpm --dir apps/web dev
```

기본 개발 주소는 Vite가 출력하는 로컬 URL을 사용합니다.

## 모바일 실행

Metro 개발 서버:

```bash
make dev-mobile
```

iOS와 Android 실행:

```bash
pnpm ios:mobile
pnpm android:mobile
```

iOS Simulator에서는 로컬 API의 `127.0.0.1`을 사용할 수 있습니다. Android Emulator에서 호스트의
로컬 API에 접근할 때는 일반적으로 `10.0.2.2`를 사용합니다. 실기기는 접근 가능한 HTTPS API 주소가
필요합니다.

Expo SDK와 React Native 의존성은 `apps/mobile`의 현재 호환 범위를 유지합니다. 개별 패키지를 임의로
최신 버전으로 올리지 않습니다.

## API 실행

로컬 PostgreSQL을 먼저 실행합니다.

```bash
docker compose -f infra/docker-compose.yml up -d
```

그다음 Spring Boot API를 실행합니다.

```bash
make dev-api
```

Flyway가 로컬 스키마를 구성합니다. API 기본 포트와 readiness 경로는 실행 로그와
`apps/api/README.md`를 확인합니다.

## 영역별 검증

변경한 영역에 해당하는 검증부터 실행합니다.

### 웹

```bash
make lint-web
make test-web
make build-web
pnpm --dir apps/web run typecheck
pnpm --dir apps/web run bundle:check
```

라우팅, 로그인 진입 또는 앱 부트스트랩을 변경했다면 브라우저 smoke도 실행합니다.

```bash
pnpm --dir apps/web run test:browser
```

### 모바일

```bash
make lint-mobile
make test-mobile
```

현재 두 명령은 모바일 TypeScript 검증을 수행합니다. 네이티브 권한, 지도, 푸시, 빌드 설정을 변경한
경우에는 해당 플랫폼의 Simulator, Emulator 또는 실기기 검증을 추가합니다.

### API

```bash
make lint-api
make test-api
make build-api
```

API 계약, 데이터베이스, 트랜잭션 또는 영속성 동작을 변경했다면 Docker가 실행 중인 상태에서 통합
테스트를 추가합니다.

```bash
make test-api-integration
```

## 작업 범위별 참고 문서

- 문서 전체 목차: `docs/README.md`
- 제품과 기능: `docs/service/README.md`
- 전체 아키텍처: `docs/architecture.md`
- 저장소 모듈 경계: `docs/repository-structure.md`
- 배포: `docs/deployment.md`
- 모바일 로컬 빌드: `docs/reference/mobile-local-build-runbook.md`
- 현재 구현 작업: `docs/active/README.md`
- 기여와 PR: `CONTRIBUTING.md`

## 개발 중 주의 사항

- 운영 비밀값, `.ipa`, `.aab`, `.xcarchive`, 서비스 계정 JSON과 인증서를 커밋하지 않습니다.
- 데이터베이스 스키마 변경은 Flyway 마이그레이션으로 관리합니다.
- 웹, 모바일과 API 계약을 함께 변경하면 같은 작업에서 관련 문서를 갱신합니다.
- GitHub push는 웹 운영 배포를 의미하지 않습니다. 웹 배포와 모바일 스토어 업로드는 각각의 배포
  문서를 따릅니다.
