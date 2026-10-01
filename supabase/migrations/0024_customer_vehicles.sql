-- Customers can register their own vehicles. This is distinct from part_vehicle_compat
-- (0015_storefront.sql, product fitment data: make/model/year_from/year_to) and from the
-- POS-owned vehicle_brands/vehicle_models master data read in lib/shop/vehicles.ts -- this
-- table is each customer's actual garage, keyed to their account.

create table customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  registration_number text not null,
  make text not null,
  model text not null,
  year integer not null check (year between 1950 and 2100),
  variant text,
  engine_type text,
  engine_capacity text,
  fuel_type text not null check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'cng')),
  transmission text not null check (transmission in ('manual', 'automatic', 'cvt', 'semi_automatic')),
  mileage numeric(10, 1),
  vin text,
  engine_number text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_vehicles_customer_idx on customer_vehicles (customer_id);

-- A registration plate identifies one physical vehicle, so it can't be registered twice
-- (by the same customer or a different one).
create unique index customer_vehicles_registration_uidx on customer_vehicles (lower(registration_number));

alter table customer_vehicles enable row level security;

create policy "customer_vehicles_admin_read" on customer_vehicles for select using (is_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-photos', 'vehicle-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_photos_public_read" on storage.objects;
create policy "vehicle_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'vehicle-photos');
