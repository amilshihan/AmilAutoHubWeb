import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProducts } from "@/lib/shop/data";
import type { PublicProduct } from "@/lib/shop/types";

// "Recommended for your Toyota Aqua": ranks products by how often OTHER customers with the
// same make/model actually bought them (vehicle-tagged orders), falling back to the store's
// official fitment list (part_vehicle_compat) when purchase history is too thin -- the cold
// start case for a model with few orders so far.
export async function getVehicleRecommendations(make: string, model: string, excludePartIds: string[], limit = 4): Promise<PublicProduct[]> {
  const admin = createAdminClient();
  const exclude = new Set(excludePartIds);

  const { data: vehicles } = await admin.from("customer_vehicles").select("id").ilike("make", make).ilike("model", model);
  const vehicleIds = (vehicles ?? []).map((v) => v.id as string);

  const counts = new Map<string, number>();
  if (vehicleIds.length > 0) {
    const { data: orders } = await admin
      .from("online_orders")
      .select("id, online_order_items(part_id, qty)")
      .in("vehicle_id", vehicleIds)
      .neq("status", "cancelled");
    for (const order of orders ?? []) {
      const items = (order.online_order_items ?? []) as { part_id: string; qty: number }[];
      for (const item of items) {
        if (exclude.has(item.part_id)) continue;
        counts.set(item.part_id, (counts.get(item.part_id) ?? 0) + Number(item.qty));
      }
    }
  }

  const rankedIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  if (rankedIds.length < limit) {
    const { data: compat } = await admin.from("part_vehicle_compat").select("part_id").ilike("make", make).ilike("model", model).limit(200);
    for (const row of compat ?? []) {
      const id = row.part_id as string;
      if (!exclude.has(id) && !rankedIds.includes(id)) rankedIds.push(id);
      if (rankedIds.length >= limit * 2) break;
    }
  }

  const products = await getProducts(rankedIds.slice(0, limit * 2));
  return products.slice(0, limit);
}
