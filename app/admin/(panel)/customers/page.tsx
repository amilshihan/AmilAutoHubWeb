import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildCustomers, type OrderRow } from "@/lib/admin/analytics";
import CustomersClient from "@/components/admin/CustomersClient";
import { cardSurface } from "@/lib/ui";
import { formatDate } from "@/lib/shop/format";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  garage: "Garage",
  workshop: "Workshop",
  business: "Business",
  dealer: "Dealer",
  fleet: "Fleet",
};

export default async function CustomersPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: accounts }] = await Promise.all([
    supabase
      .from("online_orders")
      .select("id, order_number, status, total, subtotal, payment_method, created_at, customer_name, customer_phone, customer_email, fulfilment")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("customer_accounts")
      .select("id, first_name, last_name, email, mobile, customer_type, tier, loyalty_points, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          Online orders are not set up yet. Run <code className="rounded bg-amber-100 px-1">0015_storefront.sql</code> in Supabase first.
        </p>
      </div>
    );
  }

  return (
    <>
      {accounts && accounts.length > 0 && (
        <div className="px-6 pt-6">
          <h2 className="text-lg font-semibold text-ink">Registered accounts</h2>
          <p className="text-sm text-muted mt-1">Customers who created a website account — full CRM profile, notes, tier and loyalty points.</p>
          <div className={`${cardSurface} mt-3 overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Tier</th>
                  <th className="px-3 py-3 text-right font-semibold">Loyalty points</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-card last:border-0 hover:bg-surface">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/customers/${a.id}`} className="font-semibold text-accent hover:underline">
                        {a.first_name} {a.last_name}
                      </Link>
                      <div className="text-xs text-muted">{a.email}</div>
                    </td>
                    <td className="px-3 py-2.5 text-ink">{CUSTOMER_TYPE_LABEL[a.customer_type] ?? a.customer_type}</td>
                    <td className="px-3 py-2.5 text-ink">{a.tier}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{a.loyalty_points}</td>
                    <td className="px-4 py-2.5 text-muted">{formatDate(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CustomersClient customers={buildCustomers((data ?? []) as OrderRow[])} />
    </>
  );
}
