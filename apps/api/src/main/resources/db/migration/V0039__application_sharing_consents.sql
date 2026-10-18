-- Independent application-sharing disclosure; no historical consent inference.
create table application_sharing_consents (
    application_id uuid primary key references applications(id) on delete cascade,
    applicant_id uuid not null references app_users(id) on delete cascade,
    recipient_id uuid not null references app_users(id) on delete cascade,
    revision varchar(100) not null check (revision = '2026-10-16.application-sharing.v1'),
    source varchar(32) not null check (source in ('web_application', 'ios_application', 'android_application')),
    accepted_at timestamptz not null default now(),
    disclosure_snapshot jsonb not null check (jsonb_typeof(disclosure_snapshot) = 'object')
);
alter table application_sharing_consents enable row level security;
