\set ON_ERROR_STOP on

-- Idempotent pre-launch QA fixture for one existing account.
-- Invoke with: psql "$DATABASE_URL" -v target_email='sehyeon73@gmail.com' -f <this-file>

begin;

create temporary table account_seed_context on commit drop as
select id as target_user_id
from app_users
where lower(email) = lower(:'target_email')
  and deleted_at is null
  and deactivated_at is null;

do $$
begin
  if (select count(*) from account_seed_context) <> 1 then
    raise exception 'Expected exactly one active app user for the target email';
  end if;
end
$$;

-- Synthetic counterparts are product records only and cannot sign in.
insert into app_users (id, email, name, role, bio, organization_type, organization_name)
values
  ('81000000-0000-4000-8000-000000000001', 'sehyeon-seed-founder@hypofit.invalid', '김도현', 'founder', '초기 서비스의 고객 문제를 검증하고 있어요.', 'team', '루틴랩'),
  ('81000000-0000-4000-8000-000000000002', 'sehyeon-seed-respondent@hypofit.invalid', '이지은', 'respondent', '새로운 서비스를 직접 사용하고 경험을 나누는 것을 좋아해요.', null, null),
  ('81000000-0000-4000-8000-000000000003', 'sehyeon-seed-applicant-1@hypofit.invalid', '박준서', 'respondent', '대학생 일정과 과제를 앱으로 관리해요.', null, null),
  ('81000000-0000-4000-8000-000000000004', 'sehyeon-seed-applicant-2@hypofit.invalid', '최유진', 'respondent', '프리랜서로 여러 프로젝트 일정을 조율해요.', null, null),
  ('81000000-0000-4000-8000-000000000005', 'sehyeon-seed-applicant-3@hypofit.invalid', '김하린', 'respondent', '업무와 개인 일정을 함께 관리하고 있어요.', null, null),
  ('81000000-0000-4000-8000-000000000006', 'sehyeon-seed-applicant-4@hypofit.invalid', '오민재', 'respondent', '연구와 아르바이트 일정을 주 단위로 계획해요.', null, null)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  bio = excluded.bio,
  organization_type = excluded.organization_type,
  organization_name = excluded.organization_name,
  deactivated_at = null,
  deleted_at = null;

update app_users
set role = 'both',
    organization_type = 'company',
    organization_name = '콘텐츠럭'
where id = (select target_user_id from account_seed_context);

insert into founder_profiles (user_id, team_name, service_domain, startup_stage, university)
select target_user_id, 'Hypofit 테스트 팀', '고객 인터뷰', 'idea', null
from account_seed_context
on conflict (user_id) do nothing;

insert into founder_profiles (user_id, team_name, service_domain, startup_stage, university)
values ('81000000-0000-4000-8000-000000000001', '루틴랩', '생활 서비스', 'idea', null)
on conflict (user_id) do update set
  team_name = excluded.team_name,
  service_domain = excluded.service_domain,
  startup_stage = excluded.startup_stage;

insert into respondent_profiles (
  user_id, birth_year, gender, occupation, location,
  available_modes, interests, experience_tags
)
select target_user_id, 1998, null, '직장인', '안산',
       '["online", "offline"]'::jsonb,
       '["창업", "생활서비스", "고객인터뷰"]'::jsonb,
       '["초기서비스", "사용자검증"]'::jsonb
from account_seed_context
on conflict (user_id) do nothing;

insert into respondent_profiles (
  user_id, birth_year, gender, occupation, location,
  available_modes, interests, experience_tags
)
values (
  '81000000-0000-4000-8000-000000000002', 1999, null, '대학생', '안산',
  '["online", "offline"]'::jsonb,
  '["생산성", "생활서비스", "운동"]'::jsonb,
  '["고객인터뷰", "모바일앱"]'::jsonb
)
on conflict (user_id) do update set
  occupation = excluded.occupation,
  location = excluded.location,
  available_modes = excluded.available_modes,
  interests = excluded.interests,
  experience_tags = excluded.experience_tags;

insert into respondent_profiles (
  user_id, birth_year, gender, occupation, location,
  available_modes, interests, experience_tags
)
values
  ('81000000-0000-4000-8000-000000000003', 2001, null, '대학생', '안산',
   '["online", "offline"]'::jsonb, '["생산성", "대학생활"]'::jsonb, '["일정관리", "팀프로젝트"]'::jsonb),
  ('81000000-0000-4000-8000-000000000004', 1996, null, '프리랜서 디자이너', '서울',
   '["online"]'::jsonb, '["생산성", "디자인"]'::jsonb, '["프로젝트관리", "캘린더"]'::jsonb),
  ('81000000-0000-4000-8000-000000000005', 1997, null, '직장인', '수원',
   '["online", "offline"]'::jsonb, '["생산성", "생활서비스"]'::jsonb, '["업무관리", "루틴"]'::jsonb),
  ('81000000-0000-4000-8000-000000000006', 1998, null, '대학원생', '안산',
   '["online", "offline"]'::jsonb, '["학업", "생산성"]'::jsonb, '["연구관리", "시간표"]'::jsonb)
on conflict (user_id) do update set
  occupation = excluded.occupation,
  location = excluded.location,
  available_modes = excluded.available_modes,
  interests = excluded.interests,
  experience_tags = excluded.experience_tags;

-- Clear only this fixture's deterministic ranges. Child workflow rows cascade.
delete from notifications
where id between '85000000-0000-4000-8000-000000000001'::uuid
             and '85000000-0000-4000-8000-000000000099'::uuid;

delete from interview_posts
where id between '82000000-0000-4000-8000-000000000001'::uuid
             and '82000000-0000-4000-8000-000000000099'::uuid;

insert into interview_posts (
  id, founder_id, title, service_summary, target_description,
  reward_amount, duration_minutes, recruit_count, interview_mode,
  location, location_text, location_address, location_place_name,
  location_latitude, location_longitude, location_precision, location_source,
  location_point, schedule_options, status, created_at, updated_at
)
values
  (
    '82000000-0000-4000-8000-000000000001',
    (select target_user_id from account_seed_context),
    '대학생 일정 관리 경험 인터뷰',
    '수업, 팀플, 아르바이트 일정을 함께 관리하는 방식을 확인합니다.',
    '최근 한 달 안에 학업과 개인 일정을 함께 조율한 대학생',
    30000, 40, 4, 'both',
    '한양대학교 ERICA캠퍼스', '한양대학교 ERICA캠퍼스 인근',
    '경기 안산시 상록구 한양대학로 55', '한양대학교 ERICA캠퍼스',
    37.296513, 126.837080, 'nearby', 'manual',
    extensions.ST_SetSRID(extensions.ST_MakePoint(126.837080, 37.296513), 4326)::extensions.geography,
    '["평일 18시 이후", "토요일 오후"]'::jsonb,
    'open', now() - interval '2 hours', now() - interval '2 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000002',
    (select target_user_id from account_seed_context),
    '구독 서비스 정리 경험 인터뷰',
    '사용하지 않는 유료 구독을 발견하고 정리하는 과정을 확인합니다.',
    '최근 3개월 안에 유료 구독을 해지하거나 정리한 사람',
    25000, 35, 3, 'online',
    null, null, null, null, null, null, null, null, null,
    '["평일 저녁", "일요일 오후"]'::jsonb,
    'open', now() - interval '1 day', now() - interval '1 day'
  ),
  (
    '82000000-0000-4000-8000-000000000003',
    '81000000-0000-4000-8000-000000000001',
    '중고거래 약속 조율 인터뷰',
    '중고거래에서 장소와 시간을 정할 때 생기는 불편을 확인합니다.',
    '최근 3개월 안에 중고거래 직거래를 해본 사람',
    35000, 40, 5, 'both',
    '안산문화광장', '안산문화광장 인근',
    '경기 안산시 단원구 광덕대로 157', '안산문화광장',
    37.318680, 126.830930, 'nearby', 'manual',
    extensions.ST_SetSRID(extensions.ST_MakePoint(126.830930, 37.318680), 4326)::extensions.geography,
    '["평일 저녁", "주말 오후"]'::jsonb,
    'open', now() - interval '5 hours', now() - interval '5 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000004',
    '81000000-0000-4000-8000-000000000001',
    '자취생 식재료 관리 인터뷰',
    '장을 본 뒤 식재료를 보관하고 소비하는 실제 습관을 알아봅니다.',
    '혼자 살며 주 1회 이상 직접 장을 보는 사람',
    28000, 35, 5, 'online',
    null, null, null, null, null, null, null, null, null,
    '["평일 저녁", "일요일 오후"]'::jsonb,
    'open', now() - interval '10 hours', now() - interval '10 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000005',
    '81000000-0000-4000-8000-000000000001',
    '운동 기록 앱 사용 경험 인터뷰',
    '운동 기록을 남기고 다시 확인하는 과정에서 필요한 기능을 알아봅니다.',
    '최근 3개월 동안 운동 기록 앱을 주 1회 이상 사용한 사람',
    50000, 45, 4, 'online',
    null, null, null, null, null, null, null, null, null,
    '["평일 19시 이후", "토요일 오전"]'::jsonb,
    'open', now() - interval '7 hours', now() - interval '7 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000006',
    '81000000-0000-4000-8000-000000000001',
    '카페 작업 공간 선택 인터뷰',
    '카페에서 공부하거나 일할 때 장소를 고르는 기준을 확인합니다.',
    '최근 한 달 안에 카페에서 2시간 이상 공부하거나 일한 사람',
    40000, 40, 4, 'both',
    '안산문화광장', '안산문화광장 인근',
    '경기 안산시 단원구 광덕대로 157', '안산문화광장',
    37.318680, 126.830930, 'nearby', 'manual',
    extensions.ST_SetSRID(extensions.ST_MakePoint(126.830930, 37.318680), 4326)::extensions.geography,
    '["평일 18시 이후", "토요일 오후"]'::jsonb,
    'open', now() - interval '16 hours', now() - interval '16 hours'
  );

-- Type-specific fixtures use the released recruitment contract. They exercise
-- survey participation states and beta-test application/selection without
-- adding unsupported sessions or reward-confirmation workflows.
insert into interview_posts (
  id, founder_id, title, service_summary, target_description,
  reward_amount, compensations, duration_minutes, recruit_count, recruitment_type,
  external_provider, external_url, participation_deadline_at, external_data_notice,
  beta_test_platforms, beta_test_starts_at, beta_test_ends_at,
  interview_mode, location, schedule_options, status,
  entry_mode, schedule_mode, participation_mode, duration_mode, external_participation,
  created_at, updated_at
)
values
  (
    '82000000-0000-4000-8000-000000000007',
    '81000000-0000-4000-8000-000000000001',
    '모바일 앱 알림 설정 경험 설문조사',
    '알림을 켜고 끄는 기준과 실제 사용 경험을 짧게 확인합니다.',
    '최근 한 달 안에 모바일 앱 알림 설정을 바꿔본 사람',
    0, '[{"type":"gift_card","label":"커피 기프티콘"}]'::jsonb, 10, 50, 'survey',
    'google_forms', 'https://docs.google.com/forms/', now() + interval '7 days',
    '외부 Google Forms에서 응답을 수집하며, Hypofit에는 참여 상태만 기록됩니다.',
    null, null, null,
    'online', null, '[]'::jsonb, 'open',
    'direct', 'none', 'online', 'minutes', true,
    now() - interval '3 hours', now() - interval '3 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000008',
    '81000000-0000-4000-8000-000000000001',
    '구독 서비스 사용 경험 설문조사',
    '유료 구독을 시작하고 유지하는 기준을 확인합니다.',
    '현재 하나 이상의 유료 구독 서비스를 이용하는 사람',
    0, '[{"type":"none"}]'::jsonb, 8, 80, 'survey',
    'google_forms', 'https://docs.google.com/forms/', now() + interval '5 days',
    '외부 Google Forms에서 응답을 수집하며, Hypofit에는 참여 상태만 기록됩니다.',
    null, null, null,
    'online', null, '[]'::jsonb, 'open',
    'direct', 'none', 'online', 'minutes', true,
    now() - interval '6 hours', now() - interval '6 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000009',
    (select target_user_id from account_seed_context),
    '대학생 학습 도구 사용 경험 설문조사',
    '학습 계획과 과제 관리 도구를 사용하는 방식을 조사합니다.',
    '최근 한 학기 안에 디지털 학습 도구를 사용한 대학생',
    0, '[{"type":"points","points":3000}]'::jsonb, 12, 60, 'survey',
    'google_forms', 'https://docs.google.com/forms/', now() + interval '4 days',
    '외부 Google Forms에서 응답을 수집하며, Hypofit에는 참여 상태만 기록됩니다.',
    null, null, null,
    'online', null, '[]'::jsonb, 'open',
    'direct', 'none', 'online', 'minutes', true,
    now() - interval '12 hours', now() - interval '12 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000010',
    (select target_user_id from account_seed_context),
    '지역 카페 이용 경험 설문조사',
    '카페에서 공부하거나 일할 때 중요하게 보는 기준을 확인합니다.',
    '최근 한 달 안에 카페에서 2시간 이상 머문 사람',
    0, '[{"type":"coupon_or_access","label":"음료 쿠폰"}]'::jsonb, 7, 100, 'survey',
    'google_forms', 'https://docs.google.com/forms/', now() + interval '3 days',
    '외부 Google Forms에서 응답을 수집하며, Hypofit에는 참여 상태만 기록됩니다.',
    null, null, null,
    'online', null, '[]'::jsonb, 'open',
    'direct', 'none', 'online', 'minutes', true,
    now() - interval '18 hours', now() - interval '18 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000011',
    '81000000-0000-4000-8000-000000000001',
    '운동 기록 앱 베타테스터 모집',
    '운동 기록과 주간 리포트 기능을 사용할 베타테스터를 찾습니다.',
    '최근 3개월 안에 운동 기록 앱을 주 1회 이상 사용한 사람',
    0, '[{"type":"product","label":"프리미엄 이용권 제공"}]'::jsonb, 0, 8, 'beta_test',
    null, null, null, null,
    array['iOS', 'Android'], now() + interval '5 days', now() + interval '19 days',
    'online', null, '[]'::jsonb, 'open',
    'application_required', 'none', 'online', 'period', false,
    now() - interval '4 hours', now() - interval '4 hours'
  ),
  (
    '82000000-0000-4000-8000-000000000012',
    '81000000-0000-4000-8000-000000000001',
    '일정 관리 앱 베타테스터 모집',
    '새로운 일정 공유 기능을 실제 생활에서 사용해 볼 베타테스터를 찾습니다.',
    '개인 일정과 할 일을 모바일로 관리하는 사람',
    20000, '[{"type":"cash","amount":20000,"currency":"KRW"}]'::jsonb, 0, 5, 'beta_test',
    null, null, null, null,
    array['iOS'], now() - interval '1 day', now() + interval '13 days',
    'online', null, '[]'::jsonb, 'open',
    'application_required', 'none', 'online', 'period', false,
    now() - interval '2 days', now() - interval '1 day'
  ),
  (
    '82000000-0000-4000-8000-000000000013',
    (select target_user_id from account_seed_context),
    '지역 행사 탐색 서비스 베타테스터 모집',
    '근처 행사 탐색과 관심 일정 저장 기능을 점검합니다.',
    '안산 지역 행사를 월 1회 이상 찾아보는 사람',
    0, '[{"type":"gift_card","label":"참여 완료 시 커피 기프티콘"}]'::jsonb, 0, 6, 'beta_test',
    null, null, null, null,
    array['Android'], now() + interval '3 days', now() + interval '17 days',
    'online', null, '[]'::jsonb, 'open',
    'application_required', 'none', 'online', 'period', false,
    now() - interval '9 hours', now() - interval '9 hours'
  );

insert into applications (
  id, interview_post_id, respondent_id, answers, available_times,
  status, rejection_reason, moderation_status, created_at, updated_at
)
values
  (
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000002',
    '{"relevant_experience":"수업과 아르바이트 일정을 함께 관리하고 있어요.","motivation":"일정이 겹칠 때 해결하는 과정을 구체적으로 말씀드릴 수 있어요."}'::jsonb,
    '["평일 19시 이후", "토요일 오후"]'::jsonb,
    'applied', null, 'visible', now() - interval '90 minutes', now() - interval '90 minutes'
  ),
  (
    '83000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000003',
    (select target_user_id from account_seed_context),
    '{"relevant_experience":"최근 직접 중고거래 약속을 조율했어요.","motivation":"장소와 시간 조율 과정의 불편을 자세히 설명할 수 있어요."}'::jsonb,
    '["평일 19시 이후", "일요일 오후"]'::jsonb,
    'selected', null, 'visible', now() - interval '2 days', now() - interval '1 day'
  ),
  (
    '83000000-0000-4000-8000-000000000003',
    '82000000-0000-4000-8000-000000000004',
    (select target_user_id from account_seed_context),
    '{"relevant_experience":"혼자 살며 매주 장을 보고 식재료를 관리해요.","motivation":"버리게 되는 식재료와 관리 습관을 솔직하게 이야기할 수 있어요."}'::jsonb,
    '["평일 저녁"]'::jsonb,
    'applied', null, 'visible', now() - interval '8 hours', now() - interval '8 hours'
  ),
  (
    '83000000-0000-4000-8000-000000000004',
    '82000000-0000-4000-8000-000000000011',
    (select target_user_id from account_seed_context),
    '{"relevant_experience":"운동 기록 앱을 꾸준히 사용하고 있어요.","motivation":"주간 리포트와 기록 흐름을 실제 사용 환경에서 점검할 수 있어요."}'::jsonb,
    '[]'::jsonb,
    'applied', null, 'visible', now() - interval '2 hours', now() - interval '2 hours'
  ),
  (
    '83000000-0000-4000-8000-000000000005',
    '82000000-0000-4000-8000-000000000012',
    (select target_user_id from account_seed_context),
    '{"relevant_experience":"모바일 일정과 할 일을 매일 관리해요.","motivation":"새 기능을 정해진 기간에 사용하고 피드백을 남길 수 있어요."}'::jsonb,
    '[]'::jsonb,
    'selected', null, 'visible', now() - interval '3 days', now() - interval '1 day'
  ),
  (
    '83000000-0000-4000-8000-000000000006',
    '82000000-0000-4000-8000-000000000013',
    '81000000-0000-4000-8000-000000000002',
    '{"relevant_experience":"안산 지역 행사와 전시를 자주 찾아봐요.","motivation":"행사 탐색 흐름을 실제 생활 기준으로 피드백할 수 있어요."}'::jsonb,
    '[]'::jsonb,
    'applied', null, 'visible', now() - interval '5 hours', now() - interval '5 hours'
  ),
  (
    '83000000-0000-4000-8000-000000000007',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000003',
    '{"relevant_experience":"수업, 팀플, 공모전 일정을 캘린더 앱으로 함께 관리해요.","motivation":"일정이 겹칠 때 우선순위를 정하는 실제 기준을 설명할 수 있어요."}'::jsonb,
    '["평일 18시 이후", "토요일 오전"]'::jsonb,
    'selected', null, 'visible', now() - interval '3 days', now() - interval '1 day'
  ),
  (
    '83000000-0000-4000-8000-000000000008',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000004',
    '{"relevant_experience":"여러 클라이언트 프로젝트의 마감과 회의 시간을 매주 조율해요.","motivation":"일정을 빠르게 바꿔야 했던 경험을 구체적으로 나눌 수 있어요."}'::jsonb,
    '["평일 20시 이후", "일요일 오후"]'::jsonb,
    'applied', null, 'visible', now() - interval '35 minutes', now() - interval '35 minutes'
  ),
  (
    '83000000-0000-4000-8000-000000000009',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000005',
    '{"relevant_experience":"업무와 개인 약속을 하나의 일정 앱에서 관리하고 있어요.","motivation":"알림과 반복 일정 기능을 주로 사용하는 이유를 말씀드릴 수 있어요."}'::jsonb,
    '["평일 19시 이후"]'::jsonb,
    'applied', null, 'visible', now() - interval '4 hours', now() - interval '4 hours'
  ),
  (
    '83000000-0000-4000-8000-000000000010',
    '82000000-0000-4000-8000-000000000001',
    '81000000-0000-4000-8000-000000000006',
    '{"relevant_experience":"연구 일정과 아르바이트 시간을 주 단위로 계획하고 있어요.","motivation":"이번 인터뷰 일정과 맞지 않아 참여가 어려울 것 같아요."}'::jsonb,
    '["평일 오전"]'::jsonb,
    'rejected', '가능 시간이 공고 일정과 맞지 않아요.', 'visible', now() - interval '2 days', now() - interval '1 day'
  );

insert into survey_participations (
  id, post_id, participant_id, status, opened_at, submitted_at, confirmed_at, withdrawn_at, created_at, updated_at
)
values
  ('86000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000007', (select target_user_id from account_seed_context), 'opened', now() - interval '90 minutes', null, null, null, now() - interval '90 minutes', now() - interval '90 minutes'),
  ('86000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000008', (select target_user_id from account_seed_context), 'submitted', now() - interval '4 hours', now() - interval '3 hours', null, null, now() - interval '4 hours', now() - interval '3 hours'),
  ('86000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000009', '81000000-0000-4000-8000-000000000002', 'submitted', now() - interval '6 hours', now() - interval '5 hours', null, null, now() - interval '6 hours', now() - interval '5 hours'),
  ('86000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000002', 'confirmed', now() - interval '1 day', now() - interval '22 hours', now() - interval '18 hours', null, now() - interval '1 day', now() - interval '18 hours');

insert into chat_rooms (
  id, interview_post_id, application_id, founder_id, respondent_id,
  status, last_message_at, created_at, updated_at
)
values
  ('84000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', (select target_user_id from account_seed_context), '81000000-0000-4000-8000-000000000002', 'open', now() - interval '30 minutes', now() - interval '90 minutes', now() - interval '30 minutes'),
  ('84000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000003', '83000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', (select target_user_id from account_seed_context), 'selected', now() - interval '1 hour', now() - interval '2 days', now() - interval '1 hour'),
  ('84000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', (select target_user_id from account_seed_context), 'open', now() - interval '3 hours', now() - interval '8 hours', now() - interval '3 hours'),
  ('84000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000012', '83000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000001', (select target_user_id from account_seed_context), 'selected', now() - interval '25 minutes', now() - interval '3 days', now() - interval '25 minutes'),
  ('84000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000007', (select target_user_id from account_seed_context), '81000000-0000-4000-8000-000000000003', 'selected', now() - interval '20 minutes', now() - interval '1 day', now() - interval '20 minutes');

insert into chat_messages (id, room_id, sender_id, message_type, body, metadata, created_at)
values
  ('84100000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', null, 'application_created', '새 신청이 도착했어요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '90 minutes'),
  ('84100000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'user', '평일 저녁 7시 이후에 참여할 수 있어요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '30 minutes'),
  ('84100000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000001', 'user', '수요일 저녁 7시 일정으로 진행하면 좋겠습니다.', '{"seed_source":"sehyeon_home_test"}', now() - interval '1 hour'),
  ('84100000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 'user', '신청 내용을 확인했어요. 검토 후 안내드릴게요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '3 hours'),
  ('84100000-0000-4000-8000-000000000005', '84000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000001', 'user', '베타테스트 시작 전에 설치 방법과 피드백 방식을 안내드릴게요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '25 minutes'),
  ('84100000-0000-4000-8000-000000000006', '84000000-0000-4000-8000-000000000005', null, 'application_selected', '지원자를 선정했어요. 이 방에서 인터뷰 일정을 조율해 주세요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '1 day'),
  ('84100000-0000-4000-8000-000000000007', '84000000-0000-4000-8000-000000000005', '81000000-0000-4000-8000-000000000003', 'user', '평일 저녁과 토요일 오전 모두 참여할 수 있어요.', '{"seed_source":"sehyeon_home_test"}', now() - interval '20 minutes');

insert into chat_room_participant_settings (room_id, user_id, is_muted, is_hidden, last_read_at)
select room_id, user_id, false, false, last_read_at
from (
  values
    ('84000000-0000-4000-8000-000000000001'::uuid, (select target_user_id from account_seed_context), now() - interval '2 hours'),
    ('84000000-0000-4000-8000-000000000001'::uuid, '81000000-0000-4000-8000-000000000002'::uuid, now() - interval '1 hour'),
    ('84000000-0000-4000-8000-000000000002'::uuid, (select target_user_id from account_seed_context), now() - interval '2 hours'),
    ('84000000-0000-4000-8000-000000000002'::uuid, '81000000-0000-4000-8000-000000000001'::uuid, now() - interval '30 minutes'),
    ('84000000-0000-4000-8000-000000000003'::uuid, (select target_user_id from account_seed_context), now() - interval '4 hours'),
    ('84000000-0000-4000-8000-000000000003'::uuid, '81000000-0000-4000-8000-000000000001'::uuid, now() - interval '2 hours'),
    ('84000000-0000-4000-8000-000000000004'::uuid, (select target_user_id from account_seed_context), now() - interval '2 hours'),
    ('84000000-0000-4000-8000-000000000004'::uuid, '81000000-0000-4000-8000-000000000001'::uuid, now() - interval '20 minutes'),
    ('84000000-0000-4000-8000-000000000005'::uuid, (select target_user_id from account_seed_context), now() - interval '1 day'),
    ('84000000-0000-4000-8000-000000000005'::uuid, '81000000-0000-4000-8000-000000000003'::uuid, now() - interval '20 minutes')
) as settings(room_id, user_id, last_read_at);

insert into interview_sessions (
  id, application_id, scheduled_at, meeting_type, meeting_url, place,
  status, moderation_status, created_at, updated_at
)
values (
  '84200000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000002',
  now() + interval '2 days', 'offline', null, '안산문화광장 인근',
  'scheduled', 'visible', now() - interval '1 day', now() - interval '1 day'
);

insert into notifications (
  id, user_id, type, title, body, target_type, target_id, metadata, read_at, created_at
)
values
  ('85000000-0000-4000-8000-000000000001', (select target_user_id from account_seed_context), 'application_created', '새 신청이 도착했어요', '대학생 일정 관리 경험 인터뷰에 새로운 신청이 들어왔어요.', 'application', '83000000-0000-4000-8000-000000000001', '{"seed_source":"sehyeon_home_test"}', null, now() - interval '80 minutes'),
  ('85000000-0000-4000-8000-000000000002', (select target_user_id from account_seed_context), 'application_selected', '인터뷰에 선정됐어요', '중고거래 약속 조율 인터뷰 일정을 확인해 주세요.', 'chat_room', '84000000-0000-4000-8000-000000000002', '{"seed_source":"sehyeon_home_test"}', null, now() - interval '20 hours'),
  ('85000000-0000-4000-8000-000000000003', (select target_user_id from account_seed_context), 'chat_message', '새 메시지가 도착했어요', '대학생 일정 관리 경험 인터뷰 채팅방에 새 메시지가 있어요.', 'chat_room', '84000000-0000-4000-8000-000000000001', '{"seed_source":"sehyeon_home_test"}', now() - interval '10 minutes', now() - interval '30 minutes'),
  ('85000000-0000-4000-8000-000000000004', (select target_user_id from account_seed_context), 'application_selected', '베타테스터로 선정됐어요', '일정 관리 앱 베타테스트 안내를 채팅에서 확인해 주세요.', 'chat_room', '84000000-0000-4000-8000-000000000004', '{"seed_source":"sehyeon_home_test"}', null, now() - interval '25 minutes');

commit;

select
  u.email,
  u.role,
  (select count(*) from interview_posts p where p.founder_id = u.id and p.id::text like '82%') as created_posts,
  (select jsonb_object_agg(recruitment_type, count) from (
    select recruitment_type, count(*) from interview_posts where id::text like '82%' group by recruitment_type
  ) as seeded_post_types) as seeded_post_types,
  (select count(*) from applications a join interview_posts p on p.id = a.interview_post_id where p.founder_id = u.id and a.id::text like '83%') as received_applications,
  (select jsonb_object_agg(status, count) from (
    select a.status, count(*) from applications a join interview_posts p on p.id = a.interview_post_id where p.founder_id = u.id and a.id::text like '83%' group by a.status
  ) as received_application_statuses) as received_application_statuses,
  (select count(*) from applications a where a.respondent_id = u.id and a.id::text like '83%') as applications,
  (select jsonb_object_agg(status, count) from (
    select status, count(*) from survey_participations where id::text like '86%' group by status
  ) as seeded_survey_statuses) as seeded_survey_statuses,
  (select count(*) from chat_rooms r where (r.founder_id = u.id or r.respondent_id = u.id) and r.id::text like '84%') as chat_rooms,
  (select count(*) from notifications n where n.user_id = u.id and n.id::text like '85%') as notifications
from app_users u
where lower(u.email) = lower(:'target_email');
