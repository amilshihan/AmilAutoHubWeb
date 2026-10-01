import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Coupons", robots: { index: false } };

type Coupon = {
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
};

export default async function CouponsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data } = await admin
    .from("coupons")
    .select("code, description, discount_type, discount_value, min_order, max_uses, used_count, starts_at, ends_at")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false });

  const coupons = ((data ?? []) as (Coupon & { max_uses: number | null; used_count: number })[]).filter(
    (c) => c.max_uses == null || c.used_count < c.max_uses
  );

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Coupons</h2>
      <p className="mt-1 text-sm text-charcoal/60">Current offers you can apply at checkout.</p>
      {coupons.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal/55">No active offers right now — check back soon.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {coupons.map((c) => (
            <li key={c.code} className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-amil bg-amil-soft p-4">
              <div>
                <p className="font-mono text-lg font-extrabold tracking-wide text-charcoal">{c.code}</p>
                <p className="text-sm text-charcoal/70">
                  {c.description ?? (c.discount_type === "percent" ? `${c.discount_value}% off` : `Rs. ${c.discount_value} off`)}
                  {c.min_order > 0 ? ` · Min. spend Rs. ${c.min_order}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
