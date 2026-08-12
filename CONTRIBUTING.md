# Hypofit 기여 가이드

이 문서는 코드 변경을 준비하고 Pull Request로 검토받는 절차를 설명합니다. 로컬 설치와 실행 방법은
[`docs/development.md`](docs/development.md)를 참고합니다.

## 기본 원칙

- 현재 MVP에서 확인된 문제와 요청된 흐름을 해결하는 데 집중합니다.
- 하나의 변경은 하나의 명확한 목적을 갖도록 범위를 좁힙니다.
- 기존 제품 흐름과 문서화된 아키텍처 결정을 우선합니다.
- 동작, 아키텍처, 데이터, 배포 방식이 바뀌면 관련 문서를 같은 변경에서 갱신합니다.
- 비밀값, 로컬 빌드 산출물과 스토어 업로드 파일을 커밋하지 않습니다.

## 작업 시작

1. `main`의 최신 상태를 확인합니다.
2. 작업 목적을 나타내는 브랜치를 만듭니다.
3. 변경 영역과 관련된 `AGENTS.md`, `docs/service/`와 세부 문서를 먼저 읽습니다.
4. 사용자 변경사항이 이미 있는 파일은 덮어쓰거나 되돌리지 않습니다.

브랜치 이름 예시:

```text
feat/interview-search
fix/chat-back-navigation
docs/local-development
```

## 구현과 검증

변경은 가능한 한 작고 독립적으로 유지합니다. 공통 규칙을 우회하기 위한 임시 예외나 넓은 allowlist를
추가하지 않습니다.

검증은 변경 영역에 맞게 수행합니다. 전체 명령과 환경 구성은
[`docs/development.md`](docs/development.md)에 정리되어 있습니다.

- 웹 변경: lint, typecheck, 관련 테스트와 production build
- 모바일 변경: typecheck와 변경한 네이티브 동작의 플랫폼 검증
- API 변경: check, test, build와 필요한 경우 integration test
- UI 변경: 대상 화면 크기와 실제 실행 환경에서 레이아웃과 상태 확인

## 커밋

커밋은 검토 가능한 단위로 나눕니다. 메시지는 변경한 내용이 아니라 변경의 목적이 드러나도록 짧게
작성합니다.

예시:

```text
feat: add interview application summary
fix: restore chat thread back navigation
docs: separate development and contribution guides
```

관련 없는 기존 변경사항을 같은 커밋에 포함하지 않습니다.

## Pull Request 작성

PR을 열기 전에 다음을 확인합니다.

1. 브랜치가 하나의 일관된 변경만 포함하는지 확인합니다.
2. 변경 이유와 사용자 또는 운영자에게 미치는 영향을 요약합니다.
3. 실제 실행한 검증 명령과 결과를 적습니다.
4. 데이터, 환경 변수, 배포와 롤백 영향이 있다면 명시합니다.
5. 화면 변경은 검토에 도움이 되는 스크린샷이나 녹화를 첨부합니다.
6. 후속 작업이나 확인하지 못한 항목이 있다면 숨기지 않고 적습니다.

저장소의 [PR 템플릿](.github/pull_request_template.md)을 사용합니다. 해당하지 않는 체크 항목은 억지로
실행하지 말고 `not applicable`로 표시한 뒤 이유를 짧게 남깁니다.

## 리뷰와 병합

- 리뷰 의견은 코드, 동작 또는 근거를 기준으로 반영합니다.
- 요청 범위를 벗어나는 개선은 현재 PR을 키우기보다 별도 작업으로 분리합니다.
- 검증 실패, 해결되지 않은 리뷰 또는 불명확한 데이터 변경이 남아 있으면 병합하지 않습니다.
- 최종 병합은 저장소 설정에 따라 squash merge를 사용합니다.

## 보안 문제

취약점, 노출된 비밀값 또는 개인정보 관련 문제는 공개 Issue로 올리지 않습니다.
[`SECURITY.md`](SECURITY.md)의 비공개 제보 절차를 따릅니다.
