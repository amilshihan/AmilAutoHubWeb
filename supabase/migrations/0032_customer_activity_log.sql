-- Customer activity / audit log, visible in the admin panel. An append-only record of what
-- happened, when, from where, and who did it (customer / admin / system) -- exactly the
-- kind of trail you want on hand when investigating a dispute ("the customer says they
-- never cancelled this order").

create table customer_activity_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_accounts(id) on delete cascade,
  event_type text not null check (event_type in (
    'account_created', 'login', 'logout', 'password_changed', 'email_changed', 'mobile_changed',
    'address_added', 'address_changed', 'vehicle_added', 'order_placed', 'order_cancelled',
    'refund_requested', 'support_ticket_created', 'loyalty_points_changed'
  )),
  description text,
  actor_type text not null default 'customer' check (actor_type in ('customer', 'admin', 'system')),
  -- Loosely typed on purpose: an actor can be a customer_accounts.id or a profiles.id
  -- depending on actor_type, and a plain FK can't conditionally point at either. actor_name
  -- is a snapshot (not a live join) so the log stays readable even if that account is later
  -- renamed or deleted.
  actor_id uuid,
  actor_name text,
  source text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index customer_activity_log_customer_idx on customer_activity_log (customer_id, created_at desc);

alter table customer_activity_log enable row level security;
create policy "customer_activity_log_select" on customer_activity_log for select using (auth.uid() is not null);
-- Lets admin-initiated events logged from the browser client (e.g. CustomerCrmForm editing
-- loyalty points) write a row directly; everything else goes through the service-role
-- client from server actions, which bypasses RLS anyway.
create policy "customer_activity_log_insert_staff" on customer_activity_log for insert with check (auth.uid() is not null);

-- Callable from other security definer functions below, and from app code via admin.rpc().
create or replace function log_customer_activity(
  p_customer_id uuid,
  p_event_type text,
  p_description text default null,
  p_actor_type text default 'system',
  p_actor_id uuid default null,
  p_actor_name text default null,
  p_source text default null,
  p_metadata jsonb default null
) returns void language plpgsql as $$
begin
  insert into customer_activity_log (customer_id, event_type, description, actor_type, actor_id, actor_name, source, metadata)
  values (p_customer_id, p_event_type, p_description, p_actor_type, p_actor_id, p_actor_name, p_source, p_metadata);
end;
$$;

-- Logs "order_cancelled" (staff action) whenever a cancellation actually changes the order's
-- state, for any order tied to a registered customer.
create or replace function set_online_order_status(p_order_id uuid, p_status online_order_status)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  o online_orders%rowtype;
  it record;
  deduct boolean;
  v_staff_name text;
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

  if p_status = 'cancelled' and o.status <> 'cancelled' and o.customer_account_id is not null then
    select full_name into v_staff_name from profiles where id = auth.uid();
    perform log_customer_activity(
      o.customer_account_id, 'order_cancelled', 'Order #' || o.order_number || ' cancelled',
      'admin', auth.uid(), v_staff_name, 'admin_panel'
    );
  end if;
end;
$$;

revoke execute on function set_online_order_status(uuid, online_order_status) from public, anon;
grant execute on function set_online_order_status(uuid, online_order_status) to authenticated;

-- Logs "refund_requested" whenever staff record a refund amount against an order.
create or replace function set_online_order_refund(p_order_id uuid, p_refund_amount numeric, p_refund_reason text default null)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_order online_orders%rowtype;
  v_refund_status text;
  v_staff_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authorised';
  end if;
  if p_refund_amount is not null and p_refund_amount < 0 then
    raise exception 'Refund amount must be zero or more';
  end if;

  select * into v_order from online_orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  v_refund_status := case
    when p_refund_amount is null or p_refund_amount = 0 then 'none'
    when p_refund_amount >= v_order.total then 'full'
    else 'partial'
  end;

  update online_orders
    set refund_amount = p_refund_amount,
        refund_reason = p_refund_reason,
        refunded_at = case when v_refund_status = 'none' then null else coalesce(refunded_at, now()) end,
        updated_at = now()
    where id = p_order_id;

  update online_payments
    set refund_amount = p_refund_amount,
        refund_status = v_refund_status,
        updated_at = now()
    where order_id = p_order_id;

  if v_refund_status <> 'none' and v_order.customer_account_id is not null then
    select full_name into v_staff_name from profiles where id = auth.uid();
    perform log_customer_activity(
      v_order.customer_account_id, 'refund_requested',
      'Refund of ' || p_refund_amount::text || ' recorded for order #' || v_order.order_number,
      'admin', auth.uid(), v_staff_name, 'admin_panel'
    );
  end if;
end;
$$;

revoke execute on function set_online_order_refund(uuid, numeric, text) from public, anon;
grant execute on function set_online_order_refund(uuid, numeric, text) to authenticated;

-- Loyalty functions (0030) now also log "loyalty_points_changed".
create or replace function credit_loyalty_points(p_customer_id uuid, p_points integer, p_order_id uuid default null, p_description text default null)
returns void language plpgsql as $$
begin
  if p_points <= 0 then
    return;
  end if;
  update customer_accounts set loyalty_points = loyalty_points + p_points, updated_at = now() where id = p_customer_id;
  insert into loyalty_transactions (customer_id, type, points, order_id, description)
  values (p_customer_id, 'earned', p_points, p_order_id, coalesce(p_description, 'Points earned'));
  perform log_customer_activity(p_customer_id, 'loyalty_points_changed', coalesce(p_description, 'Points earned') || ' (+' || p_points::text || ')', 'system');
end;
$$;

create or replace function redeem_loyalty_points(p_customer_id uuid, p_points integer, p_order_id uuid default null, p_description text default null)
returns void language plpgsql as $$
declare
  v_balance integer;
begin
  if p_points <= 0 then
    return;
  end if;
  select loyalty_points into v_balance from customer_accounts where id = p_customer_id for update;
  if v_balance is null then
    raise exception 'Customer not found';
  end if;
  if v_balance < p_points then
    raise exception 'Insufficient loyalty points';
  end if;
  update customer_accounts set loyalty_points = loyalty_points - p_points, updated_at = now() where id = p_customer_id;
  insert into loyalty_transactions (customer_id, type, points, order_id, description)
  values (p_customer_id, 'redeemed', -p_points, p_order_id, coalesce(p_description, 'Points redeemed at checkout'));
  perform log_customer_activity(p_customer_id, 'loyalty_points_changed', coalesce(p_description, 'Points redeemed') || ' (-' || p_points::text || ')', 'customer');
end;
$$;

create or replace function grant_referral_bonus(p_customer_id uuid, p_points integer, p_description text default null)
returns void language plpgsql as $$
begin
  if p_points <= 0 then
    return;
  end if;
  update customer_accounts set loyalty_points = loyalty_points + p_points, updated_at = now() where id = p_customer_id;
  insert into loyalty_transactions (customer_id, type, points, description)
  values (p_customer_id, 'referral_bonus', p_points, coalesce(p_description, 'Referral bonus'));
  perform log_customer_activity(p_customer_id, 'loyalty_points_changed', coalesce(p_description, 'Referral bonus') || ' (+' || p_points::text || ')', 'system');
end;
$$;
