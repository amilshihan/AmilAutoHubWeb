import { createClient } from "@/lib/supabase/server";
import OnlineOrdersClient, { type OnlineOrder } from "@/components/orders/OnlineOrdersClient";

export default async function OnlineOrdersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("online_orders")
    .select(
      "*, online_order_items(name_snapshot, sku_snapshot, qty, unit_price, line_total), online_payments(id, payment_provider, transaction_id, status, amount, currency, payment_date, refund_status, refund_amount)"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Online Orders</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Online orders are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0015_storefront.sql</code> in the Supabase
            SQL editor to create the orders tables, then reload this page.
          </p>
          <p className="mt-2 text-xs text-amber-800">Details: {error.message}</p>
        </div>
      </div>
    );
  }

  return <OnlineOrdersClient orders={(data ?? []) as OnlineOrder[]} />;
}
