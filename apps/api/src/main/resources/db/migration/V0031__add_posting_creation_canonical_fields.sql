alter table interview_posts
    add column if not exists duration_value integer,
    add column if not exists duration_unit varchar(16),
    add column if not exists schedule_fixed_slots jsonb not null default '[]'::jsonb,
    add column if not exists schedule_recurring_windows jsonb not null default '[]'::jsonb,
    add column if not exists schedule_note text,
    add column if not exists recruitment_limit_mode varchar(16),
    add column if not exists beta_test_environment text,
    add column if not exists beta_test_workflow_note text;

alter table interview_posts
    drop constraint if exists ck_interview_posts_schedule_mode;

alter table interview_posts
    add constraint interview_posts_duration_unit_check
        check (duration_unit is null or duration_unit in ('minutes', 'hours', 'days', 'weeks')),
    add constraint ck_interview_posts_schedule_mode
        check (schedule_mode in ('fixed', 'recurring', 'negotiated', 'none')),
    add constraint interview_posts_recruitment_limit_mode_check
        check (recruitment_limit_mode is null or recruitment_limit_mode in ('limited', 'unlimited'));

comment on column interview_posts.duration_minutes is
    'Legacy compatibility value. New writes derive it from duration_value and duration_unit.';
comment on column interview_posts.recruit_count is
    'Legacy compatibility value. New writes use recruitment_limit_mode; zero means unlimited only for old clients.';
