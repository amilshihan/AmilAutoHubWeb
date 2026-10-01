-- Loyalty / membership program. customer_accounts.loyalty_points (0022) remains the live
-- balance (fast to read); this migration adds the transaction ledger behind it (earned,
-- redeemed, expired, referral bonus -- each a row, so "points earned"/"points redeemed"/
-- "points expired" and a transaction history are all just filtered sums/lists over this
-- table rather than separately-tracked counters that could drift from the balance), plus a
-- referral code per customer and who referred them.

alter table customer_accounts
  add column referral_code text unique,
  add column referred_by_customer_id uuid references customer_accounts(id) on delete set null;

-- Every customer gets a short, stable code derived from their own id -- unique by
-- construction (the id already is), no retry-on-conflict loop needed.
create or replace function generate_referral_code() returns trigger
language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := 'AAH' || upper(substr(replace(new.id::text, '-', ''), 1, 6));
  end if;
  return new;
end;
$$;

create trigger customer_accounts_referral_code
  before insert on customer_accounts
  for each row execute function generate_referral_code();

update customer_accounts
  set referral_code = 'AAH' || upper(substr(replace(id::text, '-', ''), 1, 6))
  where referral_code is null;

-- "Amil Auto Hub Rewards" tiers (0022's placeholder Standard/Platinum renamed to match).
update customer_accounts set tier = 'Bronze' where tier = 'Standard';
update customer_accounts set tier = 'Business' where tier = 'Platinum';

create table loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer_accounts(id) on delete cascade,
  type text not null check (type in ('earned', 'redeemed', 'expired', 'adjusted', 'referral_bonus')),
  -- Signed: positive credits the balance, negative debits it -- so balance = sum(points).
  points integer not null,
  order_id uuid references online_orders(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index loyalty_transactions_customer_idx on loyalty_transactions (customer_id, created_at desc);

alter table loyalty_transactions enable row level security;
create policy "loyalty_transactions_select" on loyalty_transactions for select using (auth.uid() is not null);

-- Re-created (0025 had a simpler version with no ledger entry, no order/description) so
-- every credit leaves an auditable transaction row.
create or replace function credit_loyalty_points(p_customer_id uuid, p_points integer, p_order_id uuid default null, p_description text default null)
returns void language plpgsql as $$
begin
  if p_points <= 0 then
    return;
  end if;
  update customer_accounts set loyalty_points = loyalty_points + p_points, updated_at = now() where id = p_customer_id;
  insert into loyalty_transactions (customer_id, type, points, order_id, description)
  values (p_customer_id, 'earned', p_points, p_order_id, coalesce(p_description, 'Points earned'));
end;
$$;

-- Used at checkout when a customer redeems points for a discount. Raises if the balance is
-- too low, so the caller (checkout) must check the balance itself before offering a value
-- that could fail here under a race (two tabs redeeming at once, say).
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
end;
$$;

-- Referral bonus -- used both for the referee's signup bonus and the referrer's
-- first-purchase bonus (see app code for when each fires).
create or replace function grant_referral_bonus(p_customer_id uuid, p_points integer, p_description text default null)
returns void language plpgsql as $$
begin
  if p_points <= 0 then
    return;
  end if;
  update customer_accounts set loyalty_points = loyalty_points + p_points, updated_at = now() where id = p_customer_id;
  insert into loyalty_transactions (customer_id, type, points, description)
  values (p_customer_id, 'referral_bonus', p_points, coalesce(p_description, 'Referral bonus'));
end;
$$;
