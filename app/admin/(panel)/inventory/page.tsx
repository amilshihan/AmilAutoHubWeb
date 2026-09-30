import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import InventoryClient, { type StockPart, type Movement } from "@/components/admin/InventoryClient";

export default async function InventoryPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const partsRes = await supabase
    .from("parts")
    .select("id, name, sku, unit, qty_on_hand, low_stock_threshold, sell_price, is_active, is_service, is_drum")
    .eq("is_active", true)
    .eq("is_service", false)
    .order("name")
    .limit(5000);

  // `note` exists only after migration 0017; fall back without it.
  const withNote = await supabase
    .from("stock_movements")
    .select("id, created_at, change_qty, reason, note, parts(name)")
    .order("created_at", { ascending: false })
    .limit(40);
  const movements = withNote.error
    ? (
        await supabase
          .from("stock_movements")
          .select("id, created_at, change_qty, reason, parts(name)")
          .order("created_at", { ascending: false })
          .limit(40)
      ).data
    : withNote.data;

  return (
    <InventoryClient
      parts={(partsRes.data ?? []) as StockPart[]}
      movements={(movements ?? []) as unknown as Movement[]}
    />
  );
}
