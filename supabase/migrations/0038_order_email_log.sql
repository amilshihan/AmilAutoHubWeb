-- v2: record of the order emails sent to customers (invoice, status updates, payment and
-- refund notices). Each kind is sent at most once per order, except "invoice" and "tracking",
-- which staff can resend. The website writes this with the service role; admins can read it.

create table order_email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references online_orders(id) on delete cascade,
  kind text not null check (kind in ('placed', 'invoice', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'paid', 'refunded', 'tracking')),
  to_email text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

create index order_email_log_order_idx on order_email_log (order_id, created_at desc);

-- A given automatic email is only ever successfully sent once per order.
create unique index order_email_log_sent_once
  on order_email_log (order_id, kind)
  where status = 'sent' and kind not in ('invoice', 'tracking');

alter table order_email_log enable row level security;
create policy "order_email_log_admin_read" on order_email_log for select using (is_admin(auth.uid()));
