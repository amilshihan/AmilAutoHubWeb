-- Storage bucket for customer profile photos. Public read (shown on the site); no
-- anon/authenticated write policies at all -- uploads only ever happen server-side
-- (service role, which bypasses RLS) from the customer's own signed-in session, since
-- customers aren't Supabase Auth users (see 0019_customers.sql).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars', 'customer-avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "customer_avatars_public_read" on storage.objects;
create policy "customer_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'customer-avatars');
