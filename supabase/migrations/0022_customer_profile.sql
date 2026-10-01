-- Extends customer_accounts with the CRM-style "Customer Profile" fields (business
-- classification, extra contacts, staff notes, loyalty/tier) and links online_orders back
-- to the registered account that placed them, so order stats (total orders, total spent,
-- last purchase, lifetime value) can be computed per account instead of only guessed by
-- matching phone numbers.

alter table customer_accounts
  add column customer_type text not null default 'individual'
    check (customer_type in ('individual', 'garage', 'workshop', 'business', 'dealer', 'fleet')),
  add column additional_mobiles text[] not null default '{}',
  add column additional_emails text[] not null default '{}',
  -- Internal staff notes about the customer -- never exposed on customer-facing pages/APIs.
  add column notes text,
  add column loyalty_points integer not null default 0 check (loyalty_points >= 0),
  add column tier text not null default 'Standard';

alter table online_orders
  add column customer_account_id uuid references customer_accounts(id) on delete set null;

create index online_orders_customer_account_idx on online_orders (customer_account_id);

-- Staff can maintain the CRM fields from the admin panel (client-side, anon-key browser
-- client, gated by RLS -- same pattern as every other admin-editable table here). Column
-- grants keep this to only the CRM columns: an admin session can never use this policy to
-- touch password_hash, email, status or any other sensitive/self-service column, even
-- though the row-level policy itself would otherwise allow the update.
create policy "customer_accounts_admin_update_crm" on customer_accounts
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

grant update (customer_type, notes, loyalty_points, tier) on customer_accounts to authenticated;
