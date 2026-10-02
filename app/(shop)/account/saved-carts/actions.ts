"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { MAX_SAVED_CARTS, parseItems } from "@/lib/customer/savedCarts";
import { getProducts } from "@/lib/shop/data";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import type { CartLine } from "@/lib/shop/types";

export type SaveCartResult = { ok: true } | { ok: false; error: string; signedOut?: boolean };
export type RestoreResult = { ok: true; lines: CartLine[]; skipped: number } | { ok: false; error: string };

export async function saveCart(name: string, items: { partId: string; qty: number }[]): Promise<SaveCartResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in to save your cart.", signedOut: true };

  const cleanName = String(name ?? "").trim().slice(0, 60);
  if (!cleanName) return { ok: false, error: "Give your cart a name." };
  const cleanItems = parseItems(items);
  if (cleanItems.length === 0) return { ok: false, error: "Your cart is empty." };

  const h = await headers();
  if (!rateLimit(`savecart:${clientIp(h)}`, 20, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment." };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("customer_saved_carts")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customer.id);
  if ((count ?? 0) >= MAX_SAVED_CARTS) {
    return { ok: false, error: `You can keep up to ${MAX_SAVED_CARTS} saved carts. Delete one first.` };
  }

  const { error } = await admin
    .from("customer_saved_carts")
    .insert({ customer_id: customer.id, name: cleanName, items: cleanItems });
  if (error) return { ok: false, error: "We could not save your cart. Please try again." };

  revalidatePath("/account/saved-carts");
  return { ok: true };
}

export async function deleteSavedCart(id: string): Promise<SaveCartResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again.", signedOut: true };
  const admin = createAdminClient();
  const { error } = await admin.from("customer_saved_carts").delete().eq("id", id).eq("customer_id", customer.id);
  if (error) return { ok: false, error: "We could not delete that cart." };
  revalidatePath("/account/saved-carts");
  return { ok: true };
}

// Re-reads current prices and stock from the catalogue, so a restored cart never carries
// a stale price; unsellable items are skipped and reported.
export async function getSavedCartLines(id: string): Promise<RestoreResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_saved_carts")
    .select("items")
    .eq("id", id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (!data) return { ok: false, error: "Cart not found." };

  const items = parseItems(data.items);
  const products = await getProducts(items.map((i) => i.partId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: CartLine[] = [];
  for (const item of items) {
    const p = byId.get(item.partId);
    if (!p || !p.inStock) continue;
    lines.push({
      id: p.id,
      name: p.name,
      price: p.price,
      qty: item.qty,
      brand: p.brand,
      packSize: p.packSize,
      imageUrl: p.imageUrl,
      collection: p.collection,
    });
  }
  return { ok: true, lines, skipped: items.length - lines.length };
}
