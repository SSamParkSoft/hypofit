-- Keep the access restriction after expiring the separate consent evidence.
alter table public.applications add column sharing_withdrawn_at timestamptz;
