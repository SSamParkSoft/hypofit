# Hypofit 심사용 계정 및 Seed 데이터 운영 문서

### 문서 목적

- App Store / Google Play 심사용 계정과 연결된 seed 데이터 현황을 정리합니다.
- 스크린샷 촬영, TestFlight QA, 심사 제출, 심사 중 계정 복구에 사용할 수 있는 운영 기준 문서입니다.
- 이 문서는 작업일지가 아니라 현재 운영에 들어간 계정과 데이터 구성을 설명합니다.

### 운영 반영 상태

- 운영 반영 완료
- 반영 일자: 2026-06-16
- 반영 서버: GPU 서버 `/home/bukae/hypofit`
- 반영 커밋: `26fc670`
- API 기준: `https://hypofit-api.bukae.co.kr`
- 데이터 저장소: Supabase Auth + Supabase Postgres

### 심사 제출용 공식 계정

아래 계정 1개만 App Store Connect / Play Console 심사 계정 입력란에 넣습니다.

```text
Email: review-both@hypofit.demo
Password: HypofitReview-2026!Ssam
Role: 창업자 + 인터뷰어
```

계정 특성:

- 이메일 인증 완료 상태입니다.
- 이메일 OTP 없이 바로 로그인할 수 있습니다.
- 창업자와 인터뷰어 역할을 모두 가지고 있습니다.
- 심사자는 이 계정 하나로 홈, 인터뷰, 지도, 채팅, 알림, 프로필, 문의, 신고, 약관, 계정 삭제 접근을 확인할 수 있습니다.

### 보조 Seed 계정

아래 계정들은 App Store Connect / Play Console에 입력하지 않습니다.

```text
review-founder@hypofit.demo
review-respondent@hypofit.demo
```

용도:

- `review-both` 계정 화면에 실제처럼 보이는 모집글, 신청, 채팅 상대, 지원자 데이터를 만들기 위한 보조 계정입니다.
- 내부 QA나 데이터 복구 확인용으로만 사용합니다.
- 심사자가 별도 계정을 요구하지 않는 한 제출 문구에는 노출하지 않습니다.

### Seed 데이터 구성

운영 DB에는 심사용 계정과 연결된 아래 데이터가 들어가 있습니다.

#### 인터뷰 모집글

- 공개 인터뷰 목록과 지도 탭에 보이는 모집글이 들어가 있습니다.
- 안산/한양대 ERICA 주변 좌표 기반 모집글이 포함되어 있습니다.
- 온라인, 대면, 대면+화상 방식이 섞여 있습니다.
- 사례비는 12,000원부터 70,000원까지 다양하게 들어가 있습니다.
- 모집 인원 `recruit_count` 값도 포함되어 있습니다.

예시 주제:

- 대학생 시간표 관리 인터뷰
- 캠퍼스 카페 주문 경험 인터뷰
- 호수공원 산책 루틴 인터뷰
- 사리역 통학 동선 인터뷰
- 구독 서비스 정리 경험 인터뷰
- 직장인 점심 선택 인터뷰
- 스터디 공간 선택 인터뷰
- 중고거래 약속 조율 인터뷰

#### 신청 데이터

- `review-both` 계정이 신청한 인터뷰가 포함되어 있습니다.
- `review-both` 계정이 만든 모집글에 들어온 신청도 포함되어 있습니다.
- 상태는 신청, 선정, 반려, 완료가 섞여 있습니다.
- 반려 상태에는 반려 사유가 포함되어 있습니다.

#### 채팅 데이터

- `review-both` 계정에서 확인 가능한 채팅방이 6개 생성되어 있습니다.
- 창업자/인터뷰어 양쪽 메시지가 모두 들어가 있습니다.
- 선정, 반려, 신청 완료 등 시스템 메시지도 포함되어 있습니다.
- 채팅 목록에서 빈 화면이 나오지 않도록 최근 메시지와 읽음 상태가 들어가 있습니다.

#### 알림 데이터

- `review-both` 계정에 알림 6개가 들어가 있습니다.
- 새 신청, 선정, 반려, 새 메시지 유형이 포함되어 있습니다.
- 일부 알림은 읽지 않은 상태로 남아 있어 알림 화면과 배지를 확인할 수 있습니다.

#### 문의 데이터

- `review-both` 계정에 문의 2개가 들어가 있습니다.
- 접수 상태 문의 1개
- 답변 완료 문의 1개
- 프로필 > 문의하기 화면에서 빈 화면이 나오지 않도록 구성되어 있습니다.

#### 조회/읽음 데이터

- 인터뷰 조회 기록이 들어가 있습니다.
- 홈, 인터뷰, 지도, 상세 화면에서 이미 확인한 인터뷰 표시를 테스트할 수 있습니다.
- 채팅과 알림의 읽음/안읽음 상태도 일부 포함되어 있습니다.

### 실행한 Smoke 결과

운영 API 기준 smoke 테스트를 통과했습니다.

```text
api_root_health: status=ok
api_v1_readiness: status=ok
me: ok
interview_posts: 5 items
chat_rooms: 6 items
notifications: 6 items
support_tickets: 2 items
```

### Seed 실행 명령

GPU 서버에서 실행합니다.

```bash
cd /home/bukae/hypofit

ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_PASSWORD='HypofitReview-2026!Ssam' \
/home/bukae/miniconda3/envs/hypofit/bin/python apps/api/scripts/seed_store_review_data.py
```

주의:

- `ALLOW_STORE_REVIEW_SEED=true`가 없으면 실행되지 않습니다.
- 이 명령은 심사용 fixture 데이터를 다시 정리하고 재생성합니다.
- 실제 유저 데이터가 아니라 `review-*` 계정과 연결된 데이터만 대상으로 합니다.

### Reset 명령

심사용 fixture 데이터를 지우고 auth 계정은 유지할 때 사용합니다.

```bash
cd /home/bukae/hypofit

ALLOW_STORE_REVIEW_SEED=true \
STORE_REVIEW_SEED_MODE=reset \
STORE_REVIEW_PASSWORD='HypofitReview-2026!Ssam' \
/home/bukae/miniconda3/envs/hypofit/bin/python apps/api/scripts/seed_store_review_data.py
```

### Smoke 테스트 명령

운영 API에서 심사용 계정 접근을 확인할 때 사용합니다.

```bash
cd /home/bukae/hypofit

SUPABASE_URL='https://rpmddtobulnagpdzdkbl.supabase.co' \
SUPABASE_ANON_KEY='[Supabase anon key]' \
HYPOFIT_API_BASE_URL='https://hypofit-api.bukae.co.kr' \
REVIEW_EMAIL='review-both@hypofit.demo' \
REVIEW_PASSWORD='HypofitReview-2026!Ssam' \
/home/bukae/miniconda3/envs/hypofit/bin/python apps/api/scripts/store_review_smoke.py
```

### App Store Connect 심사 문구

```text
Demo account:
Email: review-both@hypofit.demo
Password: HypofitReview-2026!Ssam

This demo account has both founder and respondent permissions. It is pre-verified and does not require email OTP. Reviewers can use this single account to browse interview posts, view map-based discovery, apply to interviews, open chat rooms, check notifications, and access profile, support, report, legal, and account deletion screens.

The app currently does not process payments. Interview case-fee amounts are shown as recruitment information only.

Backend:
The review build uses the production API at https://hypofit-api.bukae.co.kr.
```

### Play Console Sign-in Details 문구

```text
Use the following reusable demo account. It is valid regardless of reviewer location and does not require OTP.

Email: review-both@hypofit.demo
Password: HypofitReview-2026!Ssam

Suggested flow:
1. Sign in with review-both@hypofit.demo.
2. Open Home to see current activity and recent interview posts.
3. Open Interviews to browse posts and open a detail page.
4. Open Map to view nearby interview posts.
5. Open Chat to review interview coordination messages.
6. Open Profile to access support, report, terms, privacy policy, and account deletion.

The app currently does not process payments. Interview case-fee amounts are shown as recruitment information only.
```

### 스크린샷 촬영 전 확인할 것

- TestFlight 또는 release build에서 `review-both@hypofit.demo`으로 로그인합니다.
- 이메일 OTP가 뜨면 안 됩니다.
- 홈 화면이 비어 있으면 안 됩니다.
- 인터뷰 목록이 비어 있으면 안 됩니다.
- 지도 탭에 마커와 목록이 보여야 합니다.
- 채팅 목록이 비어 있으면 안 됩니다.
- 알림 화면이 비어 있으면 안 됩니다.
- 프로필에서 문의, 신고, 약관, 개인정보처리방침, 계정 삭제가 접근 가능해야 합니다.

### 운영 주의사항

- 이 문서의 비밀번호는 심사 제출용 credential입니다. 외부 공유용 문서나 git에 커밋하지 않습니다.
- 심사 전 계정이 꼬이면 seed 명령을 다시 실행하면 됩니다.
- 심사자가 계정 삭제를 실제로 완료하지 않도록 심사 문구에는 계정 삭제 기능이 접근 가능하다는 수준으로만 안내합니다.
- 심사 중에는 API 서버, reverse tunnel, DB tunnel이 살아 있어야 합니다.
