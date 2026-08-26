alter table interview_posts
  add column external_provider varchar(40),
  add column external_url text,
  add column participation_deadline_at timestamptz,
  add column external_data_notice text,
  add column beta_test_platforms text[],
  add column beta_test_starts_at timestamptz,
  add column beta_test_ends_at timestamptz;

alter table interview_posts
  add constraint ck_interview_posts_survey_fields
    check (
      recruitment_type <> 'survey'
      or (
        external_provider = 'google_forms'
        and external_url is not null
        and participation_deadline_at is not null
        and external_data_notice is not null
        and length(trim(external_data_notice)) > 0
      )
    ),
  add constraint ck_interview_posts_beta_test_fields
    check (
      recruitment_type <> 'beta_test'
      or (
        coalesce(cardinality(beta_test_platforms), 0) > 0
        and beta_test_starts_at is not null
        and beta_test_ends_at is not null
        and beta_test_starts_at < beta_test_ends_at
      )
    );

create table survey_participations (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null,
  participant_id uuid not null,
  status varchar(30) not null default 'opened',
  opened_at timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_survey_participations_post_participant unique (post_id, participant_id),
  constraint ck_survey_participations_status
    check (status in ('opened', 'submitted', 'confirmed', 'withdrawn')),
  constraint survey_participations_post_id_fkey
    foreign key (post_id) references interview_posts(id) on delete cascade,
  constraint survey_participations_participant_id_fkey
    foreign key (participant_id) references app_users(id) on delete restrict
);

create index ix_survey_participations_post_status_created
  on survey_participations (post_id, status, created_at desc);

create index ix_survey_participations_participant_updated
  on survey_participations (participant_id, updated_at desc);
