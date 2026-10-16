alter table interview_posts
  drop constraint ck_interview_posts_survey_fields,
  add constraint ck_interview_posts_survey_fields
    check (
      recruitment_type <> 'survey'
      or (
        external_provider in ('google_forms', 'external')
        and external_url is not null
        and participation_deadline_at is not null
        and external_data_notice is not null
        and length(trim(external_data_notice)) > 0
      )
    );
