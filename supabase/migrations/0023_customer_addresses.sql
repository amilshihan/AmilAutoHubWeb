-- Customers can save multiple addresses (home/work/business/other), each with its own
-- recipient, contact and default-billing/default-shipping flags -- instead of the single
-- free-text address typed at checkout. Same access pattern as customer_accounts: no
-- Supabase Auth user for customers, so all reads/writes go through the website's own
-- server actions using the service-role client; RLS here only needs to let staff read.

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  address_type text not null default 'home' check (address_type in ('home', 'work', 'business', 'other')),
  recipient_name text not null,
  company_name text,
  mobile text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  district text not null,
  province text,
  postal_code text,
  delivery_instructions text,
  is_default_billing boolean not null default false,
  is_default_shipping boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_addresses_customer_idx on customer_addresses (customer_id);

-- At most one default billing / default shipping address per customer. The server action
-- enforces this by clearing the old default before setting a new one; these indexes are the
-- hard backstop against a race doing both at once.
create unique index customer_addresses_default_billing_uidx on customer_addresses (customer_id) where is_default_billing;
create unique index customer_addresses_default_shipping_uidx on customer_addresses (customer_id) where is_default_shipping;

alter table customer_addresses enable row level security;

create policy "customer_addresses_admin_read" on customer_addresses for select using (is_admin(auth.uid()));
