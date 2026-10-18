-- Explicit signup evidence only. No historical backfill or inference from profiles.
create table user_legal_acknowledgements (
    user_id uuid not null references app_users(id) on delete cascade,
    document_revision varchar(100) not null,
    document_status varchar(16) not null check (document_status = 'published'),
    action varchar(16) not null check (action = 'signup'),
    source varchar(32) not null check (source in ('web_onboarding', 'ios_onboarding', 'android_onboarding')),
    terms_accepted boolean not null check (terms_accepted),
    privacy_notice_acknowledged boolean not null check (privacy_notice_acknowledged),
    age_19_confirmed boolean not null check (age_19_confirmed),
    acknowledged_at timestamptz not null default now(),
    primary key (user_id, action, document_revision)
);
alter table user_legal_acknowledgements enable row level security;
