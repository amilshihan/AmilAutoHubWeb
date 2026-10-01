-- Customer support tickets. Customers aren't Supabase Auth users (see 0019_customers.sql),
-- so creation goes through the service-role client same as every other customer table;
-- staff ARE Supabase Auth users (the POS-owned `profiles` table), so the admin panel reads
-- and updates tickets directly through RLS, same pattern as online_orders.

create sequence support_ticket_seq start 1001;

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('ST' || nextval('support_ticket_seq')::text),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  inquiry_type text not null
    check (inquiry_type in ('order_issue', 'product_issue', 'vehicle_question', 'billing', 'delivery', 'account', 'other')),
  subject text not null,
  message text not null,
  -- Optional context the customer can point at -- which product/order/vehicle this is about.
  part_id uuid references parts(id) on delete set null,
  order_id uuid references online_orders(id) on delete set null,
  vehicle_id uuid references customer_vehicles(id) on delete set null,
  attachments text[] not null default '{}',
  assigned_staff_id uuid references profiles(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index support_tickets_customer_idx on support_tickets (customer_id);
create index support_tickets_status_idx on support_tickets (status, created_at desc);

alter table support_tickets enable row level security;

-- Any signed-in staff member (admin or cashier) can view and manage tickets, same as
-- online_orders -- support isn't an admin-only function. Customers never get an RLS policy
-- here at all; their reads/writes always go through the service-role client.
create policy "support_tickets_select" on support_tickets for select using (auth.uid() is not null);
create policy "support_tickets_update" on support_tickets for update using (auth.uid() is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-attachments', 'support-attachments', true, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "support_attachments_public_read" on storage.objects;
create policy "support_attachments_public_read"
  on storage.objects for select
  using (bucket_id = 'support-attachments');
