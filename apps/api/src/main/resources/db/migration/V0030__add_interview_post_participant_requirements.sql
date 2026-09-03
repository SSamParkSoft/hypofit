alter table interview_posts
  add column participant_requirements jsonb not null default '[]'::jsonb;
