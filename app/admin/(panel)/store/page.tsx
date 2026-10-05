import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { gatewayStatus } from "@/lib/shop/settings";
import { normaliseSettings } from "@/lib/shop/settings-types";
import { normaliseSiteSettings } from "@/lib/shop/site-settings-types";
import { nowMs } from "@/lib/admin/time";
import StoreSettingsClient from "@/components/store/StoreSettingsClient";

export default async function OnlineStorePage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const [{ data, error }, siteRes] = await Promise.all([
    supabase.from("store_settings").select("*").maybeSingle(),
    supabase.from("site_settings").select("*").maybeSingle(),
  ]);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Website settings</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Store settings are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0015_storefront.sql</code> and then{" "}
            <code className="rounded bg-amber-100 px-1">0016_store_settings.sql</code> in the Supabase SQL editor, then
            reload this page.
          </p>
          <p className="mt-2 text-xs text-amber-800">Details: {error.message}</p>
        </div>
      </div>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`).replace(/\/$/, "");

  return (
    <StoreSettingsClient
      initial={normaliseSettings(data as Record<string, unknown> | null)}
      initialSite={normaliseSiteSettings(siteRes.error ? null : (siteRes.data as Record<string, unknown> | null))}
      siteReady={!siteRes.error}
      nowIso={new Date(nowMs()).toISOString()}
      gateways={gatewayStatus()}
      siteUrl={siteUrl}
    />
  );
}
