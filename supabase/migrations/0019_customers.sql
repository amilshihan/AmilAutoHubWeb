-- Website customer accounts (login/registration). Named "customer_accounts", not
-- "customers" -- the POS already has a "customers" table (walk-in shop customers with
-- credit tracking; see 0001_init.sql / 0008-0010) which is a different population and not
-- touched here.
--
-- This table is deliberately separate from Supabase Auth (auth.users): every Supabase Auth
-- user in this project is treated as POS staff (see 0001_init.sql's handle_new_user trigger
-- and the RLS policies that grant access to any authenticated user). Customer sign-in is
-- handled entirely by the website's own server code (password hashing + signed session
-- cookies) using the service-role client, which bypasses RLS. Browsers never talk to this
-- table directly, so it needs no anon/authenticated write policies at all.

create table customer_accounts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  mobile text not null,
  password_hash text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  email_verified boolean not null default false,
  mobile_verified boolean not null default false,
  -- Captured later via a "complete your profile" step, not at registration.
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  profile_photo_url text,
  preferred_language text,
  communication_preference text check (communication_preference in ('email', 'sms', 'whatsapp', 'phone')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_accounts_email_unique_idx on customer_accounts (lower(email));
create index customer_accounts_mobile_idx on customer_accounts (mobile);

alter table customer_accounts enable row level security;

-- Staff can look up customer accounts for support; nothing is writable through RLS at all
-- (registration, login and profile edits all go through the service-role client instead).
create policy "customer_accounts_admin_read" on customer_accounts for select using (is_admin(auth.uid()));
