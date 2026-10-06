import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SavedCartItem = { partId: string; qty: number };
export type SavedCart = { id: string; name: string; items: SavedCartItem[]; createdAt: string };

export const MAX_SAVED_CARTS = 10;

export function parseItems(raw: unknown): SavedCartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedCartItem[] = [];
  for (const r of raw) {
    const partId = typeof r?.partId === "string" ? r.partId : null;
    const qty = Math.floor(Number(r?.qty));
    if (partId && Number.isFinite(qty) && qty > 0) out.push({ partId, qty: Math.min(99, qty) });
  }
  return out;
}

export async function getSavedCarts(customerId: string): Promise<SavedCart[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_saved_carts")
    .select("id, name, items, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(MAX_SAVED_CARTS);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    items: parseItems(r.items),
    createdAt: String(r.created_at),
  }));
}
