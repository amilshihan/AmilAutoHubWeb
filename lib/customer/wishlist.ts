import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_WISHLIST = 200;

export async function getWishlistIds(customerId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_wishlist")
    .select("part_id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(MAX_WISHLIST);
  return (data ?? []).map((r) => String(r.part_id));
}
