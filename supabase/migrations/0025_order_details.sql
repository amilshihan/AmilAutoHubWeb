-- Expands online_orders / online_order_items to capture the full "Order Information" set:
-- fulfillment/shipping status (independent of the existing pending->delivered `status`
-- pipeline), a structured billing/shipping address snapshot (point-in-time, since a
-- customer's saved address can change after the order is placed), tax, loyalty points
-- earned/used, SKU on line items, delivery dates, cancellation reason and refund details.
-- Order ID, Customer ID, date/time, payment status, products, quantity, unit price,
-- discount, subtotal, delivery fee, grand total, coupon code, payment method,
-- transaction/reference ID, courier and tracking number already exist (0015-0022).

alter table online_orders
  add column fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'partially_fulfilled', 'fulfilled')),
  add column shipping_status text not null default 'not_shipped'
    check (shipping_status in ('not_shipped', 'shipped', 'in_transit', 'delivered', 'failed')),
  -- Snapshots, not references to customer_addresses -- an order must keep showing the
  -- address it was actually placed against even if the customer later edits or deletes
  -- that saved address.
  add column billing_address jsonb,
  add column shipping_address jsonb,
  add column tax_amount numeric(12, 2) not null default 0,
  add column loyalty_points_used integer not null default 0 check (loyalty_points_used >= 0),
  add column loyalty_points_earned integer not null default 0 check (loyalty_points_earned >= 0),
  add column estimated_delivery_date date,
  add column actual_delivery_date date,
  add column cancellation_reason text,
  add column refund_amount numeric(12, 2),
  add column refund_reason text,
  add column refunded_at timestamptz;

alter table online_order_items
  add column sku_snapshot text;

-- Called from checkout (service-role client, which already bypasses RLS) right after an
-- order earns points, so the balance update is atomic instead of a read-then-write race.
create or replace function credit_loyalty_points(p_customer_id uuid, p_points integer)
returns void
language plpgsql
as $$
begin
  if p_points <= 0 then
    return;
  end if;
  update customer_accounts
    set loyalty_points = loyalty_points + p_points,
        updated_at = now()
    where id = p_customer_id;
end;
$$;
