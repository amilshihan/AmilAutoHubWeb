-- Amil Auto Hub public storefront: product web fields, vehicle compatibility, online orders.
-- Run once in the Supabase SQL editor (or `supabase db push`). The website shares the POS
-- database, so stock sold at the counter is immediately reflected online.

-- ─────────────────────────────────────────────────────────────
-- PRODUCT WEB FIELDS
-- ─────────────────────────────────────────────────────────────
alter table parts
  add column if not exists image_url text,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_online boolean not null default true;

-- ─────────────────────────────────────────────────────────────
-- VEHICLE COMPATIBILITY (which vehicles a product fits)
-- model null = fits every model of that make; year_from/year_to null = any year.
-- ─────────────────────────────────────────────────────────────
create table part_vehicle_compat (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts(id) on delete cascade,
  make text not null,
  model text,
  year_from integer,
  year_to integer,
  created_at timestamptz not null default now(),
  check (year_from is null or year_to is null or year_from <= year_to)
);

create index part_vehicle_compat_part_idx on part_vehicle_compat(part_id);
create index part_vehicle_compat_vehicle_idx on part_vehicle_compat(lower(make), lower(model));

alter table part_vehicle_compat enable row level security;
create policy "part_vehicle_compat_select" on part_vehicle_compat for select using (auth.uid() is not null);
create policy "part_vehicle_compat_write_admin" on part_vehicle_compat for all using (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- ONLINE ORDERS
-- Customers never get database accounts: the website inserts orders through the
-- server (service role) and customers track them with an unguessable token.
-- ─────────────────────────────────────────────────────────────
create type online_order_status as enum ('pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled');
create type fulfilment_method as enum ('delivery', 'pickup');

create sequence online_order_seq start 10001;

create table online_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('AH' || nextval('online_order_seq')::text),
  public_token uuid not null unique default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  fulfilment fulfilment_method not null,
  delivery_zone text,
  address_line text,
  city text,
  district text,
  notes text,
  payment_method text not null default 'cod' check (payment_method in ('cod', 'pay_at_pickup')),
  subtotal numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status online_order_status not null default 'pending',
  stock_deducted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfilment = 'pickup' or (address_line is not null and city is not null))
);

create index online_orders_status_idx on online_orders(status, created_at desc);
create index online_orders_phone_idx on online_orders(customer_phone);

create table online_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references online_orders(id) on delete cascade,
  part_id uuid not null references parts(id),
  name_snapshot text not null,
  unit_price numeric(12,2) not null,
  qty numeric(12,2) not null check (qty > 0),
  line_total numeric(12,2) not null
);

create index online_order_items_order_idx on online_order_items(order_id);

alter table online_orders enable row level security;
alter table online_order_items enable row level security;

-- Staff can read and manage orders; nobody else has any direct access.
create policy "online_orders_select" on online_orders for select using (auth.uid() is not null);
create policy "online_orders_update" on online_orders for update using (auth.uid() is not null);
create policy "online_orders_delete_admin" on online_orders for delete using (is_admin(auth.uid()));
create policy "online_order_items_select" on online_order_items for select using (auth.uid() is not null);

-- Moves an order through its lifecycle and keeps central stock correct.
-- Stock is deducted the first time an order is confirmed and restored if it is
-- sent back to pending or cancelled afterwards, so the POS and website always agree.
create function set_online_order_status(p_order_id uuid, p_status online_order_status)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  o online_orders%rowtype;
  it record;
  deduct boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authorised';
  end if;

  select * into o from online_orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  deduct := o.stock_deducted;

  if p_status in ('confirmed', 'packed', 'dispatched', 'delivered') and not o.stock_deducted then
    for it in select part_id, qty from online_order_items where order_id = o.id loop
      update parts set qty_on_hand = qty_on_hand - it.qty, updated_at = now()
        where id = it.part_id and not is_service;
      insert into stock_movements (part_id, change_qty, reason, ref_id, created_by)
        values (it.part_id, -it.qty, 'sale', o.id, auth.uid());
    end loop;
    deduct := true;
  elsif p_status in ('pending', 'cancelled') and o.stock_deducted then
    for it in select part_id, qty from online_order_items where order_id = o.id loop
      update parts set qty_on_hand = qty_on_hand + it.qty, updated_at = now()
        where id = it.part_id and not is_service;
      insert into stock_movements (part_id, change_qty, reason, ref_id, created_by)
        values (it.part_id, it.qty, 'adjustment', o.id, auth.uid());
    end loop;
    deduct := false;
  end if;

  update online_orders
    set status = p_status, stock_deducted = deduct, updated_at = now()
    where id = o.id;
end;
$$;

revoke execute on function set_online_order_status(uuid, online_order_status) from public, anon;
grant execute on function set_online_order_status(uuid, online_order_status) to authenticated;
