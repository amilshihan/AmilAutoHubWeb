-- Marketing consent is captured separately from account registration (its own section on
-- My Account, never bundled into the sign-up form), and tracked per channel/purpose rather
-- than one blanket "I agree to marketing" checkbox -- each row is a full consent record
-- (status, when granted, where from, and when withdrawn) so the store can prove what a
-- customer actually agreed to and when they opted out.

create table customer_marketing_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  consent_type text not null
    check (consent_type in ('sms', 'whatsapp', 'email', 'push', 'promotional', 'product_launch', 'service_reminder')),
  status text not null default 'withdrawn' check (status in ('granted', 'withdrawn')),
  consent_source text not null default 'account_settings',
  consented_at timestamptz,
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (customer_id, consent_type)
);

create index customer_marketing_consents_customer_idx on customer_marketing_consents (customer_id);

alter table customer_marketing_consents enable row level security;

create policy "customer_marketing_consents_admin_read" on customer_marketing_consents for select using (is_admin(auth.uid()));
