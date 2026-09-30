import { createClient } from "@/lib/supabase/server";
import { buildCustomers, type OrderRow } from "@/lib/admin/analytics";
import CustomersClient from "@/components/admin/CustomersClient";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("online_orders")
    .select("id, order_number, status, total, subtotal, payment_method, created_at, customer_name, customer_phone, customer_email, fulfilment")
    .order("created_at", { ascending: false })
    .limit(10000);

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

  return <CustomersClient customers={buildCustomers((data ?? []) as OrderRow[])} />;
}
