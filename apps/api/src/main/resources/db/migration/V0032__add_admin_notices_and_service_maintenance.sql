create table public.admin_users (
    user_id uuid primary key references public.app_users(id) on delete cascade,
    created_at timestamp with time zone not null default now()
);

create table public.notices (
    id uuid primary key,
    type varchar(30) not null,
    title varchar(160) not null,
    body text not null,
    status varchar(30) not null,
    published_at timestamp with time zone,
    created_by uuid not null references public.app_users(id) on delete restrict,
    updated_by uuid not null references public.app_users(id) on delete restrict,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint ck_notices_type check (type in ('GENERAL', 'MAINTENANCE', 'IMPORTANT')),
    constraint ck_notices_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create index ix_notices_publication on public.notices (status, published_at desc, created_at desc);

create table public.service_maintenances (
    id uuid primary key,
    title varchar(160) not null,
    message text not null,
    status varchar(30) not null,
    mode varchar(30) not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone,
    notice_id uuid references public.notices(id) on delete set null,
    show_banner boolean not null default false,
    banner_starts_at timestamp with time zone,
    created_by uuid not null references public.app_users(id) on delete restrict,
    updated_by uuid not null references public.app_users(id) on delete restrict,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    version bigint not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint ck_service_maintenances_status check (status in ('SCHEDULED', 'IN_PROGRESS', 'VERIFYING', 'COMPLETED', 'CANCELLED')),
    constraint ck_service_maintenances_mode check (mode = 'FULL'),
    constraint ck_service_maintenances_ends_after_start check (ends_at is null or ends_at > starts_at),
    constraint ck_service_maintenances_banner_before_start check (banner_starts_at is null or banner_starts_at <= starts_at)
);

create unique index ux_service_maintenances_single_active
    on public.service_maintenances ((1))
    where status in ('IN_PROGRESS', 'VERIFYING');

create index ix_service_maintenances_status_window
    on public.service_maintenances (status, starts_at, banner_starts_at);
