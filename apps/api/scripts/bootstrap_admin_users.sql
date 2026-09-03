-- Run with psql variables after V0032 has been applied. This script is safe to
-- re-run and intentionally keeps administrator email addresses out of source.
--
-- psql "$DATABASE_URL" \
--   -v admin_email_1='...' \
--   -v admin_email_2='...' \
--   -f apps/api/scripts/bootstrap_admin_users.sql

with requested_emails(email) as (
  values
    (lower(trim(:'admin_email_1'))),
    (lower(trim(:'admin_email_2')))
), matched_users as (
  select app_users.id
  from app_users
  join requested_emails on lower(app_users.email) = requested_emails.email
  where app_users.deleted_at is null
    and app_users.deactivated_at is null
)
insert into admin_users (user_id)
select id from matched_users
on conflict (user_id) do nothing;

select email, id
from app_users
where lower(email) in (lower(trim(:'admin_email_1')), lower(trim(:'admin_email_2')))
order by email;
