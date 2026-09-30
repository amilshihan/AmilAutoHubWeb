-- Website admin modules: coupons, homepage banners, service bookings, courier tracking,
-- stock adjustments. Requires 0015 and 0016.

-- ─────────────────────────────────────────────────────────────
-- COUPONS
-- Customers never read this table; the website validates codes on the server
-- through validate_coupon() (service role only).
-- ─────────────────────────────────────────────────────────────
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 32),
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_order numeric(12,2) not null default 0,
  max_discount numeric(12,2),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);

alter table coupons enable row level security;
create policy "coupons_select" on coupons for select using (auth.uid() is not null);
create policy "coupons_write_admin" on coupons for all using (is_admin(auth.uid()));

alter table online_orders
  add column coupon_code text,
  add column discount numeric(12,2) not null default 0,
  add column courier text,
  add column tracking_number text;

-- Checks a code against a subtotal and (optionally) reserves one use.
-- Returns the discount amount, or raises an exception with a customer-friendly message.
create function validate_coupon(p_code text, p_subtotal numeric, p_redeem boolean default false)
  returns numeric
  language plpgsql security definer set search_path = public as $$
declare
  c coupons%rowtype;
  amount numeric;
begin
  select * into c from coupons where code = upper(trim(p_code)) for update;
  if not found or not c.is_active then
    raise exception 'That coupon code is not valid.';
  end if;
  if c.starts_at is not null and now() < c.starts_at then
    raise exception 'That coupon is not active yet.';
  end if;
  if c.ends_at is not null and now() > c.ends_at then
    raise exception 'That coupon has expired.';
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    raise exception 'That coupon has been fully used.';
  end if;
  if p_subtotal < c.min_order then
    raise exception 'Spend at least Rs. % to use this coupon.', trim(to_char(c.min_order, 'FM999,999,990.##'));
  end if;

  if c.discount_type = 'percent' then
    amount := round(p_subtotal * c.discount_value / 100, 2);
    if c.max_discount is not null then
      amount := least(amount, c.max_discount);
    end if;
  else
    amount := c.discount_value;
  end if;
  amount := least(amount, p_subtotal);

  if p_redeem then
    update coupons set used_count = used_count + 1 where id = c.id;
  end if;
  return amount;
end;
$$;

create function release_coupon(p_code text)
  returns void
  language sql security definer set search_path = public as $$
  update coupons set used_count = greatest(used_count - 1, 0) where code = upper(trim(p_code));
$$;

revoke execute on function validate_coupon(text, numeric, boolean) from public, anon, authenticated;
revoke execute on function release_coupon(text) from public, anon, authenticated;
grant execute on function validate_coupon(text, numeric, boolean) to service_role;
grant execute on function release_coupon(text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- HOMEPAGE BANNERS
-- ─────────────────────────────────────────────────────────────
create table site_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  button_label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table site_banners enable row level security;
create policy "site_banners_select" on site_banners for select using (auth.uid() is not null);
create policy "site_banners_write_admin" on site_banners for all using (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- SERVICE BOOKINGS (requested from the website, managed by staff)
-- ─────────────────────────────────────────────────────────────
create sequence service_booking_seq start 1001;

create table service_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique default ('SB' || nextval('service_booking_seq')::text),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_number text,
  service_name text not null,
  preferred_date date,
  preferred_time text,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_bookings_status_idx on service_bookings(status, created_at desc);

alter table service_bookings enable row level security;
create policy "service_bookings_select" on service_bookings for select using (auth.uid() is not null);
create policy "service_bookings_update" on service_bookings for update using (auth.uid() is not null);
create policy "service_bookings_delete_admin" on service_bookings for delete using (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- STOCK ADJUSTMENTS (admin only, always logged in stock_movements)
-- ─────────────────────────────────────────────────────────────
alter table stock_movements add column note text;

create function adjust_part_stock(p_part_id uuid, p_delta numeric, p_note text default null)
  returns numeric
  language plpgsql security definer set search_path = public as $$
declare
  new_qty numeric;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only administrators can adjust stock';
  end if;
  if p_delta = 0 then
    raise exception 'Adjustment cannot be zero';
  end if;

  update parts set qty_on_hand = qty_on_hand + p_delta, updated_at = now()
    where id = p_part_id and not is_service
    returning qty_on_hand into new_qty;
  if not found then
    raise exception 'Product not found or not stock-tracked';
  end if;

  insert into stock_movements (part_id, change_qty, reason, created_by, note)
    values (p_part_id, p_delta, 'adjustment', auth.uid(), nullif(trim(p_note), ''));
  return new_qty;
end;
$$;

revoke execute on function adjust_part_stock(uuid, numeric, text) from public, anon;
grant execute on function adjust_part_stock(uuid, numeric, text) to authenticated;
