-- v2 security hardening:
--  1. Durable rate limiting shared by every server instance (the old limiter kept counts in
--     each server's memory, which does not work on Vercel where many instances run).
--  2. One-time tokens for "forgot password" and email verification (only a hash is stored).
--  3. Two new customer audit events.
-- Everything here is reached only through the website's service-role key.

-- ─────────────────────────────────────────────────────────────
-- 1. RATE LIMITING (fixed windows)
-- ─────────────────────────────────────────────────────────────
create table rate_limit_hits (
  key text not null,
  bucket bigint not null,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (key, bucket)
);

alter table rate_limit_hits enable row level security; -- no policies: nobody but the service role

-- Counts one attempt; returns true while the caller is still within p_max per window.
create or replace function rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b bigint := floor(extract(epoch from now()) / p_window_seconds);
  h integer;
begin
  insert into rate_limit_hits as r (key, bucket, hits)
  values (p_key, b, 1)
  on conflict (key, bucket) do update set hits = r.hits + 1
  returning r.hits into h;

  if random() < 0.01 then
    delete from rate_limit_hits where created_at < now() - interval '1 day';
  end if;

  return h <= p_max;
end;
$$;

-- True when the key has already used up its allowance in the current window (counts nothing).
create or replace function rate_limit_peek(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select hits from rate_limit_hits
       where key = p_key and bucket = floor(extract(epoch from now()) / p_window_seconds)),
    0
  ) >= p_max;
$$;

create or replace function rate_limit_clear(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limit_hits where key = p_key;
$$;

revoke all on function rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function rate_limit_peek(text, integer, integer) from public, anon, authenticated;
revoke all on function rate_limit_clear(text) from public, anon, authenticated;
grant execute on function rate_limit_hit(text, integer, integer) to service_role;
grant execute on function rate_limit_peek(text, integer, integer) to service_role;
grant execute on function rate_limit_clear(text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. ONE-TIME ACCOUNT TOKENS (password reset, email verification)
-- ─────────────────────────────────────────────────────────────
create table customer_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  kind text not null check (kind in ('password_reset', 'email_verify')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index customer_auth_tokens_customer_idx on customer_auth_tokens (customer_id, kind);

alter table customer_auth_tokens enable row level security; -- no policies: service role only

-- ─────────────────────────────────────────────────────────────
-- 3. AUDIT EVENTS
-- ─────────────────────────────────────────────────────────────
alter table customer_activity_log drop constraint customer_activity_log_event_type_check;
alter table customer_activity_log add constraint customer_activity_log_event_type_check check (event_type in (
  'account_created', 'login', 'logout', 'password_changed', 'email_changed', 'mobile_changed',
  'address_added', 'address_changed', 'vehicle_added', 'order_placed', 'order_cancelled',
  'refund_requested', 'support_ticket_created', 'loyalty_points_changed', 'account_deleted',
  'password_reset_requested', 'email_verified'
));
