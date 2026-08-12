# Hypofit 문서 안내

루트 `README.md`는 서비스 소개만 담당합니다. 개발, 구조, 운영과 작업 계획은 아래 문서에서 목적별로
관리합니다.

## 처음 개발할 때

- [로컬 개발 가이드](development.md): 설치, 환경 변수, 웹·모바일·API 실행과 검증
- [기여 가이드](../CONTRIBUTING.md): 브랜치, 커밋, Pull Request와 리뷰 절차
- [에이전트 시작 문서](service/00-agent-start-here.md): 변경 영역별 필수 선행 문서

## 제품 이해

- [서비스 지식 베이스](service/README.md): 제품 철학, 사용자, 핵심 흐름과 기능 지도
- [MVP 범위](mvp-scope.md): 현재 검증 목표와 제외 범위

## 기술 구조

- [아키텍처](architecture.md): 웹, 모바일, API, 데이터와 인증 구조
- [저장소 구조](repository-structure.md): 모노레포 디렉터리와 모듈 책임
- [배포](deployment.md): Vercel, Lightsail, 모바일 배포와 운영 규칙

## 작업 문서

- [진행 중인 구현 계획](active/README.md): 아직 코드나 운영 작업이 남은 계획
- [참고 문서](reference/README.md): 표준, 정책, 체크리스트와 운영 참고 자료
- [완료 문서](completed/README.md): 끝난 구현 계획과 변경 이력

문서 역할이 바뀌면 현재 위치를 유지한 채 상태만 바꾸지 말고, `active`, `reference`, `completed` 중
맞는 위치로 이동한 뒤 각 목차와 참조 링크도 함께 갱신합니다.
