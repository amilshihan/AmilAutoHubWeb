"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { MAX_WISHLIST } from "@/lib/customer/wishlist";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";

export type WishlistResult = { ok: true; saved: boolean } | { ok: false; error: string; signedOut?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setWishlisted(partId: string, saved: boolean): Promise<WishlistResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in to save products.", signedOut: true };
  if (!UUID.test(partId)) return { ok: false, error: "Unknown product." };

  const h = await headers();
  if (!rateLimit(`wishlist:${clientIp(h)}`, 60, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment." };
  }

  const admin = createAdminClient();
  if (saved) {
    const { count } = await admin
      .from("customer_wishlist")
      .select("part_id", { count: "exact", head: true })
      .eq("customer_id", customer.id);
    if ((count ?? 0) >= MAX_WISHLIST) return { ok: false, error: `Your wishlist is full (${MAX_WISHLIST} items).` };
    const { error } = await admin
      .from("customer_wishlist")
      .upsert({ customer_id: customer.id, part_id: partId }, { onConflict: "customer_id,part_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: "We could not save that. Please try again." };
  } else {
    const { error } = await admin.from("customer_wishlist").delete().eq("customer_id", customer.id).eq("part_id", partId);
    if (error) return { ok: false, error: "We could not remove that. Please try again." };
  }

  revalidatePath("/account/wishlist");
  return { ok: true, saved };
}
