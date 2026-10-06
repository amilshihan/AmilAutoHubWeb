-- v2: product images and video. One row per media item with its type, order, alt text and a
-- primary flag. parts.image_url (used by product cards and lists) is kept in sync with the
-- primary image by a trigger, so existing code keeps working.

create table product_media (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  image_type text not null default 'gallery' check (image_type in ('main', 'gallery', 'label', 'technical', 'video')),
  url text not null check (url ~* '^https?://'),
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check ((media_type = 'video') = (image_type = 'video')),
  check (not is_primary or media_type = 'image')
);

create index product_media_part_idx on product_media (part_id, sort_order);
-- At most one primary image per product.
create unique index product_media_one_primary on product_media (part_id) where is_primary;

alter table product_media enable row level security;
create policy "product_media_select_staff" on product_media for select using (auth.uid() is not null);
create policy "product_media_write_admin" on product_media for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- Keep parts.image_url equal to the primary image (or, failing that, the first image).
create or replace function sync_part_primary_image() returns trigger
language plpgsql as $$
declare
  pid uuid := coalesce(new.part_id, old.part_id);
  chosen text;
begin
  select url into chosen
  from product_media
  where part_id = pid and media_type = 'image'
  order by is_primary desc, sort_order, created_at
  limit 1;
  if chosen is not null then
    update parts set image_url = chosen where id = pid and image_url is distinct from chosen;
  end if;
  return null;
end;
$$;

create trigger product_media_sync_image
  after insert or update or delete on product_media
  for each row execute function sync_part_primary_image();

-- Existing product photos become each product's primary "main" image.
insert into product_media (part_id, media_type, image_type, url, alt_text, sort_order, is_primary)
select id, 'image', 'main', image_url, name, 0, true
from parts
where image_url ~* '^https?://';

-- Storage for uploaded product videos (images keep using the product-images bucket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-videos', 'product-videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_videos_public_read" on storage.objects;
create policy "product_videos_public_read" on storage.objects for select using (bucket_id = 'product-videos');

drop policy if exists "product_videos_admin_write" on storage.objects;
create policy "product_videos_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-videos' and is_admin(auth.uid()));

drop policy if exists "product_videos_admin_update" on storage.objects;
create policy "product_videos_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-videos' and is_admin(auth.uid()));

drop policy if exists "product_videos_admin_delete" on storage.objects;
create policy "product_videos_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-videos' and is_admin(auth.uid()));
