-- Adds Google sign-in to customer_accounts. Google sign-in never touches Supabase Auth
-- (auth.users) -- see 0019_customers.sql for why: every Supabase Auth user in this project
-- is treated as POS staff. Google accounts get their own row in customer_accounts, matched
-- by google_id, and are issued the same signed session cookie as password accounts.

alter table customer_accounts
  alter column password_hash drop not null,
  alter column mobile drop not null, -- Google doesn't hand us a phone number
  add column auth_provider text not null default 'password' check (auth_provider in ('password', 'google')),
  add column google_id text,
  add column avatar_url text,
  add constraint customer_accounts_password_or_google
    check (password_hash is not null or google_id is not null);

create unique index customer_accounts_google_id_idx on customer_accounts (google_id) where google_id is not null;
