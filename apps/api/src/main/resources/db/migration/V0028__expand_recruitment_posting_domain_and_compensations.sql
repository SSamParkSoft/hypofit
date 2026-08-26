-- Keep the legacy table and API path during the released-client compatibility window.
-- New product code treats every row as a recruitment posting; existing rows remain interviews.
alter table interview_posts
  drop constraint ck_interview_posts_recruitment_type;

alter table interview_posts
  add constraint ck_interview_posts_recruitment_type
    check (recruitment_type in (
      'interview',
      'survey',
      'beta_test',
      'usability_test',
      'research_experiment',
      'focus_group',
      'other'
    ));

alter table interview_posts
  add column compensations jsonb not null default '[]'::jsonb,
  add column entry_mode varchar(30) not null default 'application_required',
  add column schedule_mode varchar(30) not null default 'negotiated',
  add column participation_mode varchar(30) not null default 'online',
  add column duration_mode varchar(30) not null default 'minutes',
  add column external_participation boolean not null default false;

update interview_posts
set compensations = case
  when reward_amount > 0 then jsonb_build_array(
    jsonb_build_object('type', 'cash', 'amount', reward_amount, 'currency', 'KRW')
  )
  else jsonb_build_array(jsonb_build_object('type', 'none'))
end,
entry_mode = case recruitment_type
  when 'survey' then 'direct'
  else 'application_required'
end,
schedule_mode = case recruitment_type
  when 'interview' then 'negotiated'
  else 'none'
end,
participation_mode = case
  when recruitment_type = 'interview' and interview_mode = 'offline' then 'offline'
  when recruitment_type = 'interview' and interview_mode = 'both' then 'hybrid'
  else 'online'
end,
duration_mode = case recruitment_type
  when 'beta_test' then 'period'
  else 'minutes'
end,
external_participation = recruitment_type = 'survey';

alter table interview_posts
  add constraint ck_interview_posts_compensations_array
    check (jsonb_typeof(compensations) = 'array'),
  add constraint ck_interview_posts_entry_mode
    check (entry_mode in ('direct', 'application_required')),
  add constraint ck_interview_posts_schedule_mode
    check (schedule_mode in ('none', 'fixed', 'negotiated')),
  add constraint ck_interview_posts_participation_mode
    check (participation_mode in ('online', 'offline', 'hybrid')),
  add constraint ck_interview_posts_duration_mode
    check (duration_mode in ('minutes', 'period'));
