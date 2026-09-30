import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getVehicleCatalog } from "@/lib/shop/data";
import FitmentClient, { type FitmentPart } from "@/components/admin/FitmentClient";

export default async function FitmentPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const [partsRes, compatRes, catalog] = await Promise.all([
    supabase
      .from("parts")
      .select("id, name, sku")
      .eq("is_active", true)
      .eq("is_service", false)
      .order("name")
      .limit(5000),
    supabase.from("part_vehicle_compat").select("part_id").limit(50000),
    getVehicleCatalog(),
  ]);

  if (compatRes.error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Vehicle fitment</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Fitment data is not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0015_storefront.sql</code> in the Supabase SQL editor, then reload.
          </p>
        </div>
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const r of compatRes.data ?? []) counts.set(r.part_id as string, (counts.get(r.part_id as string) ?? 0) + 1);
  const parts: FitmentPart[] = ((partsRes.data ?? []) as { id: string; name: string; sku: string | null }[]).map((p) => ({
    ...p,
    fitments: counts.get(p.id) ?? 0,
  }));

  return <FitmentClient parts={parts} catalog={catalog} />;
}
