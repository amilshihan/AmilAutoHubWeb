import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import BannersClient, { type Banner } from "@/components/admin/BannersClient";

export default async function BannersPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const { data, error } = await supabase.from("site_banners").select("*").order("sort_order").order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Homepage banners</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Banners are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0017_admin_features.sql</code> in the Supabase SQL editor, then reload.
          </p>
        </div>
      </div>
    );
  }

  return <BannersClient banners={(data ?? []) as Banner[]} />;
}
