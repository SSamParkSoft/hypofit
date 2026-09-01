alter table interview_posts
  add column client_submission_id uuid;

create unique index uq_interview_posts_founder_client_submission_id
  on interview_posts(founder_id, client_submission_id)
  where client_submission_id is not null;
