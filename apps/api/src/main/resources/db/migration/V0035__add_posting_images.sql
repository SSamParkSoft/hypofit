create table posting_images (
    id uuid primary key,
    owner_id uuid not null references app_users(id),
    post_id uuid references interview_posts(id),
    position integer,
    status varchar(24) not null check (status in ('pending_upload', 'processing', 'ready', 'delete_pending', 'deleted')),
    upload_path text not null unique,
    storage_path text not null unique,
    thumbnail_path text not null unique,
    source_deleted boolean not null default false,
    byte_size integer,
    width integer,
    height integer,
    alt_text varchar(200),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz not null,
    check ((post_id is null and position is null) or (post_id is not null and position is not null and position between 0 and 2)),
    check (status <> 'ready' or (width is not null and height is not null and width > 0 and height > 0)),
    unique (post_id, position) deferrable initially deferred
);
create index posting_images_owner_idx on posting_images(owner_id);
create index posting_images_cleanup_idx on posting_images(status, expires_at) where post_id is null;
alter table posting_images enable row level security;

-- The API database role does not own Supabase storage.objects.
-- An authorized Storage owner must apply infra/posting-images-storage-policy.sql
-- before bucket provisioning and feature activation. Keep POSTING_IMAGES_ENABLED=false.
-- Never write/delete Storage metadata or elevate the API database role.
