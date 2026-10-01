-- Tags an order with which registered vehicle it was for (optional, picked at checkout).
-- This turns ordinary purchase history into a Customer x Vehicle x Product fitment record:
-- "Buy again" (repeat any past purchase) and "Recommended for your vehicle" (what other
-- owners of the same make/model actually bought) are both derived from this column rather
-- than stored separately.

alter table online_orders
  add column vehicle_id uuid references customer_vehicles(id) on delete set null;

create index online_orders_vehicle_idx on online_orders (vehicle_id);
