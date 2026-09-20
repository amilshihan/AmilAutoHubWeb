-- Online store configuration (editable from the POS "Online Store" page) and payment tracking
-- for online orders. Requires 0015_storefront.sql.

-- ─────────────────────────────────────────────────────────────
-- STORE SETTINGS (single row). Anything left null falls back to the defaults in lib/shop/config.ts.
-- Gateway secrets are never stored here; they live in server environment variables.
-- ─────────────────────────────────────────────────────────────
create table store_settings (
  id boolean primary key default true check (id),
  whatsapp_number text,
  pickup_location text,
  delivery_zones jsonb,
  payment_methods jsonb,
  bank_transfer jsonb,
  payhere_sandbox boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into store_settings (id) values (true);

alter table store_settings enable row level security;
create policy "store_settings_select" on store_settings for select using (auth.uid() is not null);
create policy "store_settings_update_admin" on store_settings for update using (is_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- ONLINE ORDER PAYMENTS
-- ─────────────────────────────────────────────────────────────
alter table online_orders drop constraint if exists online_orders_payment_method_check;
alter table online_orders
  add constraint online_orders_payment_method_check
  check (payment_method in ('cod', 'pay_at_pickup', 'bank_transfer', 'payhere'));

alter table online_orders
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  add column payment_reference text;

-- Staff can mark an order paid or unpaid (e.g. after a bank transfer arrives).
create function set_online_order_payment(p_order_id uuid, p_status text, p_reference text default null)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorised';
  end if;
  if p_status not in ('unpaid', 'pending', 'paid', 'failed', 'refunded') then
    raise exception 'Invalid payment status';
  end if;
  update online_orders
    set payment_status = p_status,
        payment_reference = coalesce(p_reference, payment_reference),
        updated_at = now()
    where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;
end;
$$;

revoke execute on function set_online_order_payment(uuid, text, text) from public, anon;
grant execute on function set_online_order_payment(uuid, text, text) to authenticated;
