alter table interview_posts
  add column recruitment_type varchar(30) not null default 'interview';

alter table interview_posts
  add constraint ck_interview_posts_recruitment_type
    check (recruitment_type in ('interview', 'survey', 'beta_test'));
