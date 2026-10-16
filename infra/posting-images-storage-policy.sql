-- Run only as an authorized Supabase Storage table owner, before creating the bucket.
-- This is an operator step, not an API Flyway migration. Do not elevate the API role.
-- If this policy already exists, inspect it rather than replacing it blindly.
begin;
create policy posting_images_server_authority on storage.objects as restrictive
    for all to anon, authenticated
    using (bucket_id <> 'posting-images')
    with check (bucket_id <> 'posting-images');
commit;

select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'posting_images_server_authority';
