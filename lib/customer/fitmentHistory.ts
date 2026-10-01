import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type FitmentHistoryRow = {
  vehicleId: string;
  vehicleLabel: string;
  partId: string;
  productName: string;
  sku: string | null;
  qty: number;
  purchasedAt: string;
};

// One row per (vehicle, product) purchase -- the "Customer / Vehicle / Product / Result"
// table from the data capture plan, scoped to a single customer. Only orders the customer
// tagged with a vehicle at checkout show up here; untagged orders feed "buy again" instead.
export async function getCustomerFitmentHistory(customerId: string): Promise<FitmentHistoryRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("online_orders")
    .select(
      "id, created_at, vehicle_id, customer_vehicles(make, model), online_order_items(part_id, name_snapshot, sku_snapshot, qty)"
    )
    .eq("customer_account_id", customerId)
    .not("vehicle_id", "is", null)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  const rows: FitmentHistoryRow[] = [];
  for (const order of data ?? []) {
    const vehicle = order.customer_vehicles as unknown as { make: string; model: string } | null;
    if (!vehicle) continue;
    const items = (order.online_order_items ?? []) as { part_id: string; name_snapshot: string; sku_snapshot: string | null; qty: number }[];
    for (const item of items) {
      rows.push({
        vehicleId: order.vehicle_id as string,
        vehicleLabel: `${vehicle.make} ${vehicle.model}`,
        partId: item.part_id,
        productName: item.name_snapshot,
        sku: item.sku_snapshot,
        qty: Number(item.qty),
        purchasedAt: order.created_at as string,
      });
    }
  }
  return rows;
}

// Distinct products this customer has ever bought (any order, tagged with a vehicle or
// not), newest purchase first -- powers "Buy again".
export async function getPurchasedPartIds(customerId: string, limit = 12): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("online_orders")
    .select("created_at, online_order_items(part_id)")
    .eq("customer_account_id", customerId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(50);

  const seen = new Set<string>();
  for (const order of data ?? []) {
    const items = (order.online_order_items ?? []) as { part_id: string }[];
    for (const item of items) {
      seen.add(item.part_id);
      if (seen.size >= limit) return [...seen];
    }
  }
  return [...seen];
}
