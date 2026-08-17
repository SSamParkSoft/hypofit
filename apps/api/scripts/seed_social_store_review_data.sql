\set ON_ERROR_STOP on

-- Idempotent product-data fixture for an existing provider-backed reviewer.
-- Invoke with: psql "$DATABASE_URL" -v review_email='...' -f <this-file>

begin;

create temporary table review_seed_context on commit drop as
select id as reviewer_id
from app_users
where lower(email) = lower(:'review_email')
  and deleted_at is null
  and deactivated_at is null;

do $$
begin
  if (select count(*) from review_seed_context) <> 1 then
    raise exception 'Expected exactly one active app user for the reviewer email';
  end if;
end
$$;

-- Stable fixture identities. They are product-data counterparts, not login users.
insert into app_users (id, email, name, role, bio, organization_type, organization_name)
values
  ('71000000-0000-4000-8000-000000000001', 'review-fixture-founder@hypofit.invalid', '이도윤', 'founder', '초기 서비스의 고객 문제를 검증하고 있어요.', 'team', '모먼트랩'),
  ('71000000-0000-4000-8000-000000000002', 'review-fixture-respondent@hypofit.invalid', '박민서', 'respondent', '새로운 서비스를 직접 써보고 솔직하게 이야기해요.', null, null)
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
    bio = coalesce(nullif(bio, ''), '창업자와 인터뷰어 역할을 모두 이용하고 있어요.'),
    organization_type = 'company',
    organization_name = '콘텐츠럭',
    deactivated_at = null,
    deleted_at = null
where id = (select reviewer_id from review_seed_context);

insert into founder_profiles (user_id, team_name, service_domain, startup_stage, university)
select reviewer_id, 'Hypofit Review Team', '고객 인터뷰', 'idea', null
from review_seed_context
on conflict (user_id) do update set
  team_name = excluded.team_name,
  service_domain = excluded.service_domain,
  startup_stage = excluded.startup_stage;

insert into founder_profiles (user_id, team_name, service_domain, startup_stage, university)
values ('71000000-0000-4000-8000-000000000001', '모먼트랩', '생활 서비스', 'idea', null)
on conflict (user_id) do update set
  team_name = excluded.team_name,
  service_domain = excluded.service_domain,
  startup_stage = excluded.startup_stage;

insert into respondent_profiles (
  user_id, birth_year, gender, occupation, location,
  available_modes, interests, experience_tags
)
select reviewer_id, 1998, null, '직장인', '안산',
       '["online", "offline"]'::jsonb,
       '["창업", "생활서비스", "고객인터뷰"]'::jsonb,
       '["초기서비스", "사용자검증"]'::jsonb
from review_seed_context
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
values (
  '71000000-0000-4000-8000-000000000002', 1999, null, '대학생', '안산',
  '["online", "offline"]'::jsonb,
  '["캠퍼스", "생산성", "생활서비스"]'::jsonb,
  '["고객인터뷰", "초기서비스"]'::jsonb
)
on conflict (user_id) do update set
  occupation = excluded.occupation,
  location = excluded.location,
  available_modes = excluded.available_modes,
  interests = excluded.interests,
  experience_tags = excluded.experience_tags;

-- Delete only deterministic reviewer fixture rows before recreating them.
delete from notifications
where id between '75000000-0000-4000-8000-000000000001'::uuid
             and '75000000-0000-4000-8000-000000000099'::uuid;

delete from support_tickets
where id between '76000000-0000-4000-8000-000000000001'::uuid
             and '76000000-0000-4000-8000-000000000099'::uuid;

delete from interview_posts
where id between '72000000-0000-4000-8000-000000000001'::uuid
             and '72000000-0000-4000-8000-000000000099'::uuid;

insert into interview_posts (
  id, founder_id, title, service_summary, target_description,
  reward_amount, duration_minutes, recruit_count, interview_mode,
  location, location_text, location_address, location_place_name,
  location_latitude, location_longitude, location_precision, location_source,
  location_point, schedule_options, status, created_at, updated_at
)
values
  (
    '72000000-0000-4000-8000-000000000001',
    (select reviewer_id from review_seed_context),
    '대학생 시간표 관리 인터뷰',
    '공강, 팀플, 아르바이트 일정을 함께 관리하는 방식을 확인합니다.',
    '최근 한 달 안에 학업과 개인 일정을 함께 조율한 대학생',
    15000, 30, 5, 'both',
    '한양대학교 ERICA캠퍼스', '한양대학교 ERICA캠퍼스 인근',
    '경기 안산시 상록구 한양대학로 55', '한양대학교 ERICA캠퍼스',
    37.296513, 126.837080, 'nearby', 'manual',
    extensions.ST_SetSRID(extensions.ST_MakePoint(126.837080, 37.296513), 4326)::extensions.geography,
    '["평일 18시 이후", "토요일 오후"]'::jsonb,
    'archived', now() - interval '2 days', now() - interval '2 days'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    (select reviewer_id from review_seed_context),
    '구독 서비스 정리 경험 인터뷰',
    '사용하지 않는 유료 구독을 발견하고 정리하는 과정을 확인합니다.',
    '최근 3개월 안에 유료 구독을 해지하거나 정리해본 사람',
    20000, 35, 4, 'online',
    null, null, null, null, null, null, null, null, null,
    '["평일 저녁", "일요일 오후"]'::jsonb,
    'archived', now() - interval '4 days', now() - interval '4 days'
  ),
  (
    '72000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000001',
    '중고거래 약속 조율 인터뷰',
    '중고거래에서 장소와 시간을 정할 때 생기는 불편을 확인합니다.',
    '최근 3개월 안에 중고거래 직거래를 해본 사람',
    30000, 40, 3, 'both',
    '안산문화광장', '안산문화광장 인근',
    '경기 안산시 단원구 광덕대로 157', '안산문화광장',
    37.318680, 126.830930, 'nearby', 'manual',
    extensions.ST_SetSRID(extensions.ST_MakePoint(126.830930, 37.318680), 4326)::extensions.geography,
    '["평일 저녁", "주말 오후"]'::jsonb,
    'archived', now() - interval '1 day', now() - interval '1 day'
  ),
  (
    '72000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000001',
    '직장인 점심 선택 인터뷰',
    '점심 메뉴와 장소를 빠르게 정하는 기준을 확인합니다.',
    '평일 점심을 외부에서 해결하는 직장인 또는 프리랜서',
    18000, 30, 5, 'online',
    null, null, null, null, null, null, null, null, null,
    '["평일 12시 전후", "평일 19시 이후"]'::jsonb,
    'archived', now() - interval '3 days', now() - interval '3 days'
  );

insert into applications (
  id, interview_post_id, respondent_id, answers, available_times,
  status, rejection_reason, moderation_status, created_at, updated_at
)
values
  (
    '73000000-0000-4000-8000-000000000001',
    '72000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000002',
    '{"relevant_experience":"학업과 아르바이트 일정을 함께 관리한 경험이 있어요.","motivation":"일정 관리 과정의 불편을 구체적으로 이야기할 수 있어요."}'::jsonb,
    '["평일 19시 이후", "토요일 오후"]'::jsonb,
    'selected', null, 'visible', now() - interval '36 hours', now() - interval '30 hours'
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    '{"relevant_experience":"여러 구독 서비스를 직접 정리해봤어요.","motivation":"해지 과정에서 막혔던 지점을 공유하고 싶어요."}'::jsonb,
    '["평일 저녁"]'::jsonb,
    'applied', null, 'visible', now() - interval '3 days', now() - interval '3 days'
  ),
  (
    '73000000-0000-4000-8000-000000000003',
    '72000000-0000-4000-8000-000000000003',
    (select reviewer_id from review_seed_context),
    '{"relevant_experience":"최근 직접 중고거래 약속을 조율한 경험이 있어요.","motivation":"장소와 시간 조율 과정의 불편을 자세히 설명할 수 있어요."}'::jsonb,
    '["평일 19시 이후", "일요일 오후"]'::jsonb,
    'selected', null, 'visible', now() - interval '20 hours', now() - interval '18 hours'
  ),
  (
    '73000000-0000-4000-8000-000000000004',
    '72000000-0000-4000-8000-000000000004',
    (select reviewer_id from review_seed_context),
    '{"relevant_experience":"직장 생활 중 점심 장소를 자주 찾아봤어요.","motivation":"메뉴를 고를 때 실제로 고려하는 기준을 공유하고 싶어요."}'::jsonb,
    '["평일 12시 전후"]'::jsonb,
    'completed', null, 'visible', now() - interval '8 days', now() - interval '5 days'
  );

insert into chat_rooms (
  id, interview_post_id, application_id, founder_id, respondent_id,
  status, last_message_at, created_at, updated_at
)
values
  ('74000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), '71000000-0000-4000-8000-000000000002', 'selected', now() - interval '35 minutes', now() - interval '36 hours', now() - interval '35 minutes'),
  ('74000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000002', (select reviewer_id from review_seed_context), '71000000-0000-4000-8000-000000000002', 'open', now() - interval '2 hours', now() - interval '3 days', now() - interval '2 hours'),
  ('74000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000003', '73000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'selected', now() - interval '20 minutes', now() - interval '20 hours', now() - interval '20 minutes'),
  ('74000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000004', '73000000-0000-4000-8000-000000000004', '71000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'closed', now() - interval '5 days', now() - interval '8 days', now() - interval '5 days');

insert into chat_messages (id, room_id, sender_id, message_type, body, metadata, created_at)
values
  ('74100000-0000-4000-8000-000000000001', '74000000-0000-4000-8000-000000000001', null, 'application_created', '신청이 완료됐어요. 이 방에서 인터뷰 일정을 조율할 수 있어요.', '{"seed_source":"social_store_review"}', now() - interval '36 hours'),
  ('74100000-0000-4000-8000-000000000002', '74000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000002', 'user', '수요일 저녁 7시 이후에 참여할 수 있어요.', '{"seed_source":"social_store_review"}', now() - interval '40 minutes'),
  ('74100000-0000-4000-8000-000000000003', '74000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'user', '좋습니다. 수요일 저녁으로 일정을 잡아볼게요.', '{"seed_source":"social_store_review"}', now() - interval '35 minutes'),
  ('74100000-0000-4000-8000-000000000004', '74000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', 'user', '구독을 정리했던 과정을 구체적으로 말씀드릴 수 있어요.', '{"seed_source":"social_store_review"}', now() - interval '2 hours'),
  ('74100000-0000-4000-8000-000000000005', '74000000-0000-4000-8000-000000000003', '71000000-0000-4000-8000-000000000001', 'user', '신청 내용을 확인했어요. 가능한 시간을 알려주세요.', '{"seed_source":"social_store_review"}', now() - interval '45 minutes'),
  ('74100000-0000-4000-8000-000000000006', '74000000-0000-4000-8000-000000000003', (select reviewer_id from review_seed_context), 'user', '평일 저녁 7시 이후가 편합니다.', '{"seed_source":"social_store_review"}', now() - interval '20 minutes'),
  ('74100000-0000-4000-8000-000000000007', '74000000-0000-4000-8000-000000000004', null, 'schedule_created', '인터뷰 일정이 확정됐어요.', '{"seed_source":"social_store_review"}', now() - interval '6 days');

insert into chat_room_participant_settings (room_id, user_id, is_muted, is_hidden, last_read_at)
select room_id, user_id, false, false, last_read_at
from (
  values
    ('74000000-0000-4000-8000-000000000001'::uuid, (select reviewer_id from review_seed_context), now() - interval '1 hour'),
    ('74000000-0000-4000-8000-000000000001'::uuid, '71000000-0000-4000-8000-000000000002'::uuid, now() - interval '2 hours'),
    ('74000000-0000-4000-8000-000000000002'::uuid, (select reviewer_id from review_seed_context), now() - interval '1 day'),
    ('74000000-0000-4000-8000-000000000002'::uuid, '71000000-0000-4000-8000-000000000002'::uuid, now() - interval '3 hours'),
    ('74000000-0000-4000-8000-000000000003'::uuid, '71000000-0000-4000-8000-000000000001'::uuid, now() - interval '1 hour'),
    ('74000000-0000-4000-8000-000000000003'::uuid, (select reviewer_id from review_seed_context), now() - interval '30 minutes'),
    ('74000000-0000-4000-8000-000000000004'::uuid, '71000000-0000-4000-8000-000000000001'::uuid, now() - interval '5 days'),
    ('74000000-0000-4000-8000-000000000004'::uuid, (select reviewer_id from review_seed_context), now() - interval '5 days')
) as settings(room_id, user_id, last_read_at);

insert into interview_sessions (
  id, application_id, scheduled_at, meeting_type, meeting_url, place,
  status, moderation_status, created_at, updated_at
)
values
  ('74200000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001', now() + interval '2 days', 'online', 'https://meet.google.com/hypofit-review', null, 'scheduled', 'visible', now() - interval '1 day', now() - interval '1 day'),
  ('74200000-0000-4000-8000-000000000002', '73000000-0000-4000-8000-000000000003', now() + interval '3 days', 'offline', null, '안산문화광장 인근', 'scheduled', 'visible', now() - interval '18 hours', now() - interval '18 hours'),
  ('74200000-0000-4000-8000-000000000003', '73000000-0000-4000-8000-000000000004', now() - interval '5 days', 'online', 'https://meet.google.com/hypofit-review', null, 'completed', 'visible', now() - interval '7 days', now() - interval '5 days');

insert into attendance_records (
  id, session_id, founder_confirmed, respondent_confirmed, completed_at,
  founder_confirmed_at, respondent_confirmed_at, completed_by,
  completion_source, updated_at
)
values (
  '74300000-0000-4000-8000-000000000001',
  '74200000-0000-4000-8000-000000000003',
  true, true, now() - interval '5 days', now() - interval '5 days',
  now() - interval '5 days', (select reviewer_id from review_seed_context),
  'mutual_confirmation', now() - interval '5 days'
);

insert into interview_post_views (
  id, user_id, interview_post_id, first_viewed_at, last_viewed_at, view_count, source
)
values
  ('74400000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), '72000000-0000-4000-8000-000000000003', now() - interval '2 days', now() - interval '20 hours', 3, 'interviews'),
  ('74400000-0000-4000-8000-000000000002', (select reviewer_id from review_seed_context), '72000000-0000-4000-8000-000000000004', now() - interval '8 days', now() - interval '5 days', 2, 'detail');

insert into notifications (
  id, user_id, type, title, body, target_type, target_id, metadata, read_at, created_at
)
values
  ('75000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'application_created', '새 신청이 도착했어요', '대학생 시간표 관리 인터뷰에 새로운 신청이 들어왔어요.', 'application', '73000000-0000-4000-8000-000000000001', '{"seed_source":"social_store_review"}', null, now() - interval '50 minutes'),
  ('75000000-0000-4000-8000-000000000002', (select reviewer_id from review_seed_context), 'application_selected', '인터뷰에 선정됐어요', '중고거래 약속 조율 인터뷰 일정을 확인해 주세요.', 'chat_room', '74000000-0000-4000-8000-000000000003', '{"seed_source":"social_store_review"}', null, now() - interval '18 hours'),
  ('75000000-0000-4000-8000-000000000003', (select reviewer_id from review_seed_context), 'chat_message', '새 메시지가 도착했어요', '대학생 시간표 관리 인터뷰 채팅방에 새 메시지가 있어요.', 'chat_room', '74000000-0000-4000-8000-000000000001', '{"seed_source":"social_store_review"}', now() - interval '30 minutes', now() - interval '36 hours');

insert into support_tickets (
  id, user_id, kind, category, subject, body, contact_email,
  status, metadata, created_at, updated_at
)
values
  ('76000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'inquiry', 'account', '프로필 정보를 수정하고 싶어요', '계정 정보 화면에서 이름과 소개를 수정하는 방법이 궁금합니다.', :'review_email', 'resolved', '{"seed_source":"social_store_review"}', now() - interval '7 days', now() - interval '6 days'),
  ('76000000-0000-4000-8000-000000000002', (select reviewer_id from review_seed_context), 'inquiry', 'chat', '채팅 알림을 확인하고 싶어요', '채팅방 알림 설정 위치를 확인하고 싶습니다.', :'review_email', 'open', '{"seed_source":"social_store_review"}', now() - interval '2 days', now() - interval '2 days');

insert into support_ticket_events (
  id, ticket_id, actor_user_id, actor_type, event_type,
  from_status, to_status, message, metadata, created_at
)
values
  ('76100000-0000-4000-8000-000000000001', '76000000-0000-4000-8000-000000000001', (select reviewer_id from review_seed_context), 'user', 'created', null, 'open', null, '{"seed_source":"social_store_review"}', now() - interval '7 days'),
  ('76100000-0000-4000-8000-000000000002', '76000000-0000-4000-8000-000000000001', null, 'operator', 'operator_replied', 'open', 'resolved', '계정 정보 화면의 수정 버튼에서 이름과 한 줄 소개를 변경할 수 있어요.', '{"seed_source":"social_store_review"}', now() - interval '6 days'),
  ('76100000-0000-4000-8000-000000000003', '76000000-0000-4000-8000-000000000002', (select reviewer_id from review_seed_context), 'user', 'created', null, 'open', null, '{"seed_source":"social_store_review"}', now() - interval '2 days');

commit;

select
  u.email,
  u.role,
  (select count(*) from interview_posts p where p.founder_id = u.id) as created_posts,
  (select count(*) from applications a where a.respondent_id = u.id) as applications,
  (select count(*) from chat_rooms r where r.founder_id = u.id or r.respondent_id = u.id) as chat_rooms,
  (select count(*) from notifications n where n.user_id = u.id) as notifications,
  (select count(*) from support_tickets s where s.user_id = u.id) as support_tickets
from app_users u
where lower(u.email) = lower(:'review_email');
