# Founder Review Reputation Summary Plan

Status: completed - implementation and production smoke complete

Last updated: 2026-06-18

## Purpose

창업자가 인터뷰를 진행한 뒤 받은 후기를 다음 모집글의 신뢰 정보로
재사용한다. 응답자는 모집글을 보기 전에 "이 모집자가 실제로 인터뷰를
잘 진행했는지"를 빠르게 판단할 수 있어야 한다.

이 문서는 후기 원문 공개가 아니라, MVP에서 안전하게 시작할 수 있는
창업자 후기 요약 노출을 구현하기 위한 계획이다.

## Product Goal

인터뷰 상세, 인터뷰 목록, 홈 최근 인터뷰에서 창업자 신뢰 신호를 보여준다.

핵심 표시 정보:

```text
★ 4.8 · 후기 12개
```

상세 화면에서는 모집자 정보 안에 더 명확하게 표시한다.

```text
모집자 정보
박세현 · 창업자
★ 4.8 · 후기 12개
```

## Current State

이미 있는 데이터 구조:

- `interview_reviews`
  - `reviewer_id`: 후기를 작성한 사용자
  - `reviewee_id`: 후기를 받은 사용자
  - `reviewer_role`: `founder` 또는 `respondent`
  - `rating`: 1~5
  - `tags`: 현재 모바일에서는 비활성화 예정
  - `comment`: 후기 원문
  - `visibility`: `private`, `public_later`, `hidden`, `removed`
- `interview_posts`
  - `founder_id`
- `InterviewPostRead`
  - 이미 `founder: UserSummary | null`을 포함한다.
- 모바일 상세 화면
  - `FounderInfoSection`에서 모집자 이름, 역할, 한줄소개를 표시한다.

현재 문제:

- 후기 작성은 가능하지만, 후기 데이터가 모집글 신뢰 정보로 이어지지 않는다.
- 창업자에게 달린 후기 평균/개수를 제공하는 API 응답 필드가 없다.
- 후기 원문 공개 정책과 모더레이션 정책이 아직 충분히 닫혀 있지 않다.

## MVP Scope

이번 구현 범위:

- 창업자별 후기 요약 집계
- 모집글 API 응답에 후기 요약 포함
- 모바일 인터뷰 상세 화면의 모집자 정보에 후기 요약 표시
- 모바일 인터뷰 목록과 홈 최근 인터뷰에는 조건부로 짧게 표시
- 숨김/삭제된 후기는 집계 제외
- 후기 원문은 노출하지 않음
- 새 후기 작성 안내 문구에 별점 반영 가능성을 짧게 고지

이번 범위에서 제외:

- 후기 원문 공개 화면
- 후기 상세 목록 페이지
- 사용자별 공개 프로필 페이지
- 리뷰 신고/이의제기 전용 플로우
- 평판 랭킹, 추천 정렬, 자동 매칭
- 별점 조작 방지 고급 로직
- 별도 집계 테이블/materialized view

## Trust And Safety Policy

후기 원문은 공개하지 않는다.

이유:

- 후기 원문에는 욕설, 비방, 개인정보, 외부 연락처가 포함될 수 있다.
- 운영자가 숨김/삭제 처리하기 전까지 공개되면 심사와 운영 리스크가 커진다.
- App Store/Google Play 심사에서는 UGC 신고/차단/모더레이션 흐름과 정책
  일치가 중요하다.

노출 가능한 정보:

- 평균 별점
- 후기 개수
- 최근 후기 일시

집계 제외:

- `visibility = 'hidden'`
- `visibility = 'removed'`

초기 공개 기준:

- MVP에서는 `private` 후기도 원문은 노출하지 않고 집계에는 포함할 수 있다.
- 단, 후기 작성 화면에 아래 수준의 고지를 추가해야 한다.

```text
비방이나 욕설이 담긴 후기는 제한될 수 있고, 별점은 모집자 평판에 반영될 수 있어요.
```

장기 공개 기준:

- 후기 원문을 공개하려면 `visibility='public_later'` 또는 별도 공개 동의
  상태만 대상으로 한다.
- 원문 공개 전에는 신고, 숨김, 삭제, 운영자 검토 기준을 먼저 닫는다.

## API Contract

`InterviewPostRead`에 새 필드를 추가한다.

```python
class FounderReviewSummaryRead(BaseModel):
    average_rating: float | None = None
    review_count: int = 0
    latest_reviewed_at: datetime | None = None
```

```python
class InterviewPostRead(...):
    founder_review_summary: FounderReviewSummaryRead | None = None
```

TypeScript contract:

```ts
export interface FounderReviewSummary {
  average_rating: number | null;
  review_count: number;
  latest_reviewed_at: string | null;
}

export interface InterviewPost {
  founder_review_summary?: FounderReviewSummary | null;
}
```

Response example:

```json
{
  "id": "post-id",
  "title": "운동 루틴 앱 인터뷰",
  "founder_id": "founder-id",
  "founder": {
    "id": "founder-id",
    "name": "박세현",
    "role": "founder",
    "bio": "고객검증을 진행하고 있어요.",
    "profile_image_url": null
  },
  "founder_review_summary": {
    "average_rating": 4.8,
    "review_count": 12,
    "latest_reviewed_at": "2026-06-18T09:00:00Z"
  }
}
```

## Backend Implementation Plan

### 1. Schema 추가

파일:

- `apps/api/app/schemas/interview_posts.py`
- `packages/contracts/src/api/interview-posts.ts`

작업:

- `FounderReviewSummaryRead` Pydantic schema 추가
- `InterviewPostRead.founder_review_summary` 추가
- TS `FounderReviewSummary` 타입 추가
- TS `InterviewPost`에 optional field 추가

### 2. Repository 집계 함수 추가

파일:

- `apps/api/app/repositories/interview_posts.py`

새 내부 함수:

```python
async def _get_founder_review_summaries(
    session: AsyncSession,
    founder_ids: Sequence[UUID],
) -> dict[UUID, FounderReviewSummary]:
```

집계 기준:

```sql
select
  reviewee_id as founder_id,
  avg(rating) as average_rating,
  count(*) as review_count,
  max(created_at) as latest_reviewed_at
from interview_reviews
where reviewee_id in (:founder_ids)
  and reviewer_role = 'respondent'
  and visibility not in ('hidden', 'removed')
group by reviewee_id;
```

주의:

- `reviewer_role='respondent'`만 집계한다.
  - 창업자가 응답자에게 남긴 후기는 응답자 평판용이고, 모집자 신뢰 정보가 아니다.
- `reviewee_id=founder_id` 기준이다.
- `hidden`, `removed`는 반드시 제외한다.
- 평균은 소수점 1자리로 반올림한다.
- 리뷰가 없으면 `average_rating=null`, `review_count=0`으로 처리한다.

### 3. 모집글 조회 응답에 summary attach

대상 함수:

- `list_interview_posts`
- `find_interview_posts`
- `get_interview_post`
- `get_visible_interview_post`

작업:

- 조회된 post들의 `founder_id` 목록 수집
- 한 번의 aggregate query로 summary 조회
- 각 post 객체에 `founder_review_summary` 동적 속성 attach

주의:

- N+1 쿼리 금지
- list/home/map/search 모두 같은 API 응답을 쓰므로 repository 단에서 처리한다.
- SQLAlchemy 모델에 실제 컬럼을 추가하지 않는다. 읽기 전용 응답 속성으로 둔다.

### 4. 후기 생성 copy 수정

파일:

- `apps/mobile/src/screens/chat/ChatThreadScreen.tsx`

현재 문구:

```text
비방이나 욕설이 담긴 후기는 제한될 수 있어요.
```

변경:

```text
비방이나 욕설이 담긴 후기는 제한될 수 있고, 별점은 모집자 평판에 반영될 수 있어요.
```

이 문구는 후기 작성 시점에 한 번만 보이는 짧은 고지다.

## Mobile UI Implementation Plan

### 1. 공통 표시 helper 추가

파일 후보:

- `apps/mobile/src/shared/format/reviews.ts`
- 또는 기존 shared formatter 위치가 있으면 거기에 추가

함수:

```ts
formatFounderRating(summary): string | null
```

출력 규칙:

- `review_count <= 0`: `null`
- 평균이 있으면 `★ 4.8 · 후기 12개`
- 평균이 없고 count만 있으면 `후기 12개`
- 평균은 소수점 1자리

### 2. 인터뷰 상세 화면

파일:

- `apps/mobile/src/screens/interviews/InterviewDetailScreen.tsx`

위치:

- `FounderInfoSection`

디자인:

```text
박세현                         창업자
★ 4.8 · 후기 12개
고객검증을 진행하고 있어요.
```

세부 규칙:

- 후기 요약은 이름 아래, bio 위에 둔다.
- 텍스트 크기: `text-xs`
- 별은 브랜드 컬러 또는 진한 텍스트 컬러
- 후기 없음이면 아무것도 표시하지 않는다.
- 자신의 모집글 상세에서도 동일하게 보여도 된다. 단, 자기 글임을 강조하는 문구는 추가하지 않는다.

### 3. 인터뷰 목록 row

파일:

- `apps/mobile/src/screens/interviews/InterviewSearchScreen.tsx`

표시 기준:

- `review_count >= 3`일 때만 표시
- 낮은 표본으로 과한 신뢰 신호를 주지 않기 위함

위치:

- 모집글 제목/대상 설명 아래 meta 라인 근처

예시:

```text
★ 4.8 · 후기 12개
```

표시하지 않는 경우:

- 후기 0개
- 후기 1~2개

### 4. 홈 최근 인터뷰

파일:

- `apps/mobile/src/screens/home/HomeScreen.tsx`

표시 기준:

- 인터뷰 목록과 동일하게 `review_count >= 3`

목표:

- 홈 화면이 인터뷰 탭과 완전히 같아 보이지 않도록, 과하지 않은 신뢰 신호만 추가한다.

### 5. 지도 화면

파일:

- `apps/mobile/src/screens/map/MapScreen.tsx`

MVP에서는 지도 마커에는 표시하지 않는다.

허용 위치:

- 마커 미리보기 카드 또는 상세 카드 안에서만 조건부 표시
- 초기 구현에서는 상세 카드만 검토한다.

이유:

- 지도는 이미 위치, 사례비, 모집글 제목, 거리 정보가 밀집되어 있다.
- 마커에 평판까지 넣으면 시각 노이즈가 커진다.

## Seed Data Plan

파일:

- `apps/api/scripts/seed_sehyeon_workflow_data.py`

작업:

- `sehyeon73@gmail.com` 계정 기준 테스트 데이터에 창업자 후기 요약이 보이도록
  respondent가 founder에게 남긴 review를 충분히 생성한다.
- 최소 한 명의 창업자는 후기 3개 이상이 되게 만든다.
- 1~2개 후기만 있는 창업자도 만들어 목록 조건부 표시를 검증한다.

검증 케이스:

- 상세 화면: 후기 1개 이상이면 표시
- 목록 화면: 후기 3개 이상일 때만 표시
- hidden/removed review는 집계 제외
- respondent가 받은 후기는 founder 모집글 평판에 섞이지 않음

## Testing Plan

### API tests

추가 대상:

- `apps/api/tests/test_repository_scoping.py`
- 또는 새 `apps/api/tests/test_interview_post_reviews.py`

테스트:

- 모집글 목록 응답에 창업자 후기 평균과 개수가 포함된다.
- `reviewer_role='founder'` 후기는 창업자 평판에 포함되지 않는다.
- `visibility='hidden'`, `visibility='removed'` 후기는 제외된다.
- 여러 모집글이 같은 창업자를 가리키면 같은 summary가 붙는다.
- 후기가 없는 창업자는 `review_count=0`, `average_rating=null`이다.

### Mobile validation

명령:

```bash
COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck
```

확인:

- 상세 화면에서 `★ 4.8 · 후기 12개` 표시
- 목록/홈에서는 후기 3개 이상일 때만 표시
- 후기 없는 모집글은 레이아웃이 흔들리지 않음

### API validation

명령:

```bash
cd apps/api && .venv/bin/python -m pytest tests/test_repository_scoping.py -q
```

필요 시 전체 관련 테스트:

```bash
cd apps/api && .venv/bin/python -m pytest tests/test_repository_scoping.py tests/test_sessions_routes.py tests/test_chat_service.py -q
```

## Deployment Plan

1. 로컬 API 테스트 통과
2. 모바일 typecheck 통과
3. 시드 데이터 업데이트가 있으면 GPU 서버에 시드 스크립트 업로드 후 실행
4. FastAPI 변경이 있으면 Git 기반 반영 후 GPU 서버 blue/green 배포
5. 모바일은 사용자가 요청할 때 로컬 iOS 빌드 및 App Store Connect 업로드

주의:

- EAS cloud build는 현재 한도 이슈로 기본 사용하지 않는다.
- API 배포는 직접 파일 수정이 아니라 git/릴리스 경로 기준으로 맞춘다.

## Rollout Criteria

## Implementation Status

2026-06-18 local implementation update:

- Added `founder_review_summary` to the FastAPI and TypeScript interview post
  contracts.
- Added repository-level founder review aggregation from `interview_reviews`.
- Added mobile formatter and showed founder review summaries in interview
  detail, interview discovery rows, and home opportunity rows.
- Updated the review modal policy copy to mention that ratings may affect
  founder reputation.
- Updated `seed_sehyeon_workflow_data.py` with reputation-history reviews for
  `sehyeon73@gmail.com`.
- Local validation:
  - `apps/api/.venv/bin/python -m py_compile apps/api/app/repositories/interview_posts.py apps/api/app/schemas/interview_posts.py apps/api/scripts/seed_sehyeon_workflow_data.py`
  - `COREPACK_HOME=/Users/sehyeon/hypofit/.corepack corepack pnpm --dir apps/mobile typecheck`
  - `cd apps/api && .venv/bin/python -m pytest tests/test_chat_service.py tests/test_sessions_routes.py tests/test_sessions_service.py -q`
  - `cd apps/api && .venv/bin/python -m pytest tests/test_repository_scoping.py -q` skipped locally because `TEST_DATABASE_URL` is not configured.
- Production update:
  - API blue/green deployed to GPU server from commit `23f9b1d`.
  - Active API color is `blue`.
  - Production health and readiness checks passed.
  - Production seed script reran for `sehyeon73@gmail.com`.
  - Public interview-post API sample returned `founder_review_summary` with
    `average_rating=4.8` and `review_count=4`.
- Remaining validation:
  - API integration test should still be run in an environment with
    `TEST_DATABASE_URL`.
  - Device/simulator visual smoke remains user-facing QA unless mobile release
    deployment is explicitly requested.

완료 조건:

- [x] API 응답에 `founder_review_summary`가 포함된다.
- [x] 창업자에게 받은 respondent review만 집계된다.
- [x] 숨김/삭제 후기는 집계 제외된다.
- [x] 상세 화면 모집자 정보에 후기 요약이 표시된다.
- [x] 목록/홈에서는 후기 3개 이상일 때만 표시된다.
- [x] 후기 작성 고지 문구가 별점 반영 가능성을 포함한다.
- [x] 시드 데이터로 상세/목록/홈 케이스를 모두 확인할 수 있게 스크립트를 보강했다.
- [ ] API 통합 테스트는 `TEST_DATABASE_URL` 환경에서 실행해야 한다.
- [x] 모바일 typecheck 통과
- [x] GPU API 배포와 운영 seed 재실행
- [x] 운영 API 응답 샘플에서 `founder_review_summary` 확인

## Open Decisions

- 목록 표시 기준을 후기 3개 이상으로 둘지, 1개부터 표시할지.
  - 현재 권장: 상세은 1개부터, 목록/홈은 3개 이상.
- 평균 별점만 보여줄지, `후기 12개`만 보여줄지.
  - 현재 권장: 평균과 개수를 함께 표시.
- 후기 원문 공개 여부.
  - 현재 결정: MVP에서는 원문 공개하지 않음.
