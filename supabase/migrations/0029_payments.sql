-- Structured payment ledger for website orders. Named online_payments (not "payments" --
-- that name is already taken by the POS's own in-store payments table, a different table
-- entirely: it references customers/sales/received_by for walk-in POS sales, nothing to do
-- with the website). Never stores raw card numbers, CVV or PINs -- those never pass through
-- this server at all (PayHere hosts the card entry page; we only ever receive a
-- payment/transaction reference via their webhook). online_orders.payment_status/
-- payment_reference remain the "current state" fields the rest of the app already reads;
-- this table is the append-safe audit record (Payment ID, Order ID, provider, transaction
-- ID, status, amount, currency, payment date, refund status, refund amount) kept in sync
-- with every write path: checkout, the PayHere webhook, and the admin payment/refund
-- editors.

create table online_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references online_orders(id) on delete cascade,
  payment_provider text not null check (payment_provider in ('cod', 'pay_at_pickup', 'bank_transfer', 'payhere')),
  transaction_id text,
  status text not null default 'unpaid' check (status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  amount numeric(12, 2) not null,
  currency text not null default 'LKR',
  payment_date timestamptz,
  refund_status text not null default 'none' check (refund_status in ('none', 'pending', 'partial', 'full')),
  refund_amount numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index online_payments_order_idx on online_payments (order_id);
create index online_payments_transaction_idx on online_payments (transaction_id) where transaction_id is not null;

alter table online_payments enable row level security;

create policy "online_payments_select" on online_payments for select using (auth.uid() is not null);

-- Backfill: one payment record per order that already exists, derived from its current
-- payment_status/payment_reference/refund fields.
insert into online_payments (order_id, payment_provider, transaction_id, status, amount, currency, payment_date, refund_status, refund_amount, created_at, updated_at)
select
  o.id,
  o.payment_method,
  o.payment_reference,
  o.payment_status,
  o.total,
  'LKR',
  case
    when o.payment_status = 'paid' then o.updated_at
    when o.payment_status = 'refunded' then coalesce(o.refunded_at, o.updated_at)
    else null
  end,
  case when o.payment_status = 'refunded' then 'full' else 'none' end,
  o.refund_amount,
  o.created_at,
  o.updated_at
from online_orders o;

-- Keeps the ledger in sync whenever staff mark an order paid/unpaid/refunded through the
-- admin panel. security definer (like the original function) so it can write to
-- online_payments regardless of the caller's own RLS grants -- only authenticated staff can
-- call it at all.
create or replace function set_online_order_payment(p_order_id uuid, p_status text, p_reference text default null)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_order online_orders%rowtype;
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
    where id = p_order_id
    returning * into v_order;
  if not found then
    raise exception 'Order not found';
  end if;

  update online_payments
    set status = p_status,
        transaction_id = coalesce(p_reference, transaction_id),
        payment_date = case when p_status = 'paid' then now() else payment_date end,
        refund_status = case when p_status = 'refunded' then 'full' else refund_status end,
        updated_at = now()
    where order_id = p_order_id;
end;
$$;

revoke execute on function set_online_order_payment(uuid, text, text) from public, anon;
grant execute on function set_online_order_payment(uuid, text, text) to authenticated;

-- Records a refund against an order and its payment record together, so refund_status is
-- always derived consistently (full vs partial) rather than set by hand in two places.
create or replace function set_online_order_refund(p_order_id uuid, p_refund_amount numeric, p_refund_reason text default null)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_total numeric;
  v_refund_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authorised';
  end if;
  if p_refund_amount is not null and p_refund_amount < 0 then
    raise exception 'Refund amount must be zero or more';
  end if;

  select total into v_total from online_orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  v_refund_status := case
    when p_refund_amount is null or p_refund_amount = 0 then 'none'
    when p_refund_amount >= v_total then 'full'
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
end;
$$;

revoke execute on function set_online_order_refund(uuid, numeric, text) from public, anon;
grant execute on function set_online_order_refund(uuid, numeric, text) to authenticated;
