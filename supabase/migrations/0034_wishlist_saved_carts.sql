-- v2: customer wishlist and named saved carts. Customer-facing writes go through the
-- service-role client in server actions (same as every other customer table), so only an
-- admin-read policy is needed.

create table customer_wishlist (
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, part_id)
);

create index customer_wishlist_customer_idx on customer_wishlist (customer_id, created_at desc);

create table customer_saved_carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- [{ "partId": uuid, "qty": int }]; prices are re-read from parts on restore.
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index customer_saved_carts_customer_idx on customer_saved_carts (customer_id, created_at desc);

alter table customer_wishlist enable row level security;
alter table customer_saved_carts enable row level security;

create policy "customer_wishlist_admin_read" on customer_wishlist for select using (is_admin(auth.uid()));
create policy "customer_saved_carts_admin_read" on customer_saved_carts for select using (is_admin(auth.uid()));
