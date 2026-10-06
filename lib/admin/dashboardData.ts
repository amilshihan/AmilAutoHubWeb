import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { DAccount, DCoupon, DOrder, DPart, DPurchase, DSale, DSaleItem, DSupplier } from "@/lib/admin/dashboardMetrics";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DashboardRaw = {
  orders: DOrder[];
  ordersError: string | null;
  sales: DSale[];
  parts: DPart[];
  suppliers: DSupplier[];
  purchases: DPurchase[];
  coupons: DCoupon[];
  accounts: DAccount[] | null;
  // Sections whose data could not be read (for example a table the staff role cannot see).
  unavailable: string[];
};

const ADMIN_PART_COLUMNS =
  "id, name, sku, qty_on_hand, low_stock_threshold, low_stock_warning_enabled, reorder_point, cost_price, sell_price, retail_price, supplier_id, is_online, image_url, is_active, is_service";
const CASHIER_PART_COLUMNS = "id, name, sku, qty_on_hand, low_stock_threshold, low_stock_warning_enabled, sell_price, retail_price, is_active, is_service";

// Loads everything the dashboard and reports need for [sinceIso, untilIso]. Cost, supplier,
// purchase and customer-account data is only requested for admins.
export async function loadDashboardData(
  supabase: Supabase,
  { sinceIso, untilIso, admin }: { sinceIso: string; untilIso?: string; admin: boolean }
): Promise<DashboardRaw> {
  const unavailable: string[] = [];
  const range = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T) => {
    const from = q.gte("created_at", sinceIso);
    return untilIso ? from.lte("created_at", untilIso) : from;
  };

  const [ordersRes, salesRes, partsRes, suppliersRes, purchasesRes, couponsRes, accountsRes] = await Promise.all([
    range(
      supabase.from("online_orders").select("*, online_order_items(part_id, name_snapshot, unit_price, qty, line_total)")
    )
      .order("created_at", { ascending: false })
      .limit(5000),
    range(supabase.from("sales").select("id, sale_number, subtotal, discount, tax, total, status, payment_method, created_at"))
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from(admin ? "parts" : "parts_cashier").select(admin ? ADMIN_PART_COLUMNS : CASHIER_PART_COLUMNS).limit(5000),
    admin ? supabase.from("suppliers").select("id, name, phone").order("name").limit(1000) : Promise.resolve(null),
    admin
      ? range(supabase.from("purchases").select("id, purchase_number, supplier_id, total, payment_status, created_at")).limit(5000)
      : Promise.resolve(null),
    admin ? supabase.from("coupons").select("id, code, discount_type, discount_value, max_uses, used_count, starts_at, ends_at, is_active") : Promise.resolve(null),
    admin ? supabase.from("customer_accounts").select("id, created_at").limit(20000) : Promise.resolve(null),
  ]);

  const optional = <T>(label: string, res: { data: unknown; error: { message: string } | null } | null): T[] => {
    if (!res) return [];
    if (res.error) {
      unavailable.push(label);
      return [];
    }
    return (res.data ?? []) as T[];
  };

  const salesRows = optional<Omit<DSale, "items">>("In-store sales", salesRes);
  const itemsBySale = new Map<string, DSaleItem[]>();
  if (salesRows.length > 0) {
    const columns = admin
      ? "sale_id, part_id, qty, unit_price, cost_price_snapshot, line_total"
      : "sale_id, part_id, qty, unit_price, line_total";
    const ids = salesRows.map((s) => s.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from("sale_items").select(columns).in("sale_id", ids.slice(i, i + 200));
      if (error) {
        unavailable.push("In-store sale items");
        break;
      }
      for (const row of (data ?? []) as unknown as (DSaleItem & { sale_id: string })[]) {
        const list = itemsBySale.get(row.sale_id) ?? [];
        list.push({ ...row, cost_price_snapshot: row.cost_price_snapshot ?? null });
        itemsBySale.set(row.sale_id, list);
      }
    }
  }

  const accounts = accountsRes && !accountsRes.error ? ((accountsRes.data ?? []) as DAccount[]) : null;
  if (admin && accountsRes?.error) unavailable.push("Customer accounts");

  return {
    orders: ordersRes.error ? [] : ((ordersRes.data ?? []) as unknown as DOrder[]),
    ordersError: ordersRes.error?.message ?? null,
    sales: salesRows.map((s) => ({ ...s, items: itemsBySale.get(s.id) ?? [] })),
    parts: optional<DPart>("Products", partsRes),
    suppliers: optional<DSupplier>("Suppliers", suppliersRes),
    purchases: optional<DPurchase>("Purchases", purchasesRes),
    coupons: optional<DCoupon>("Coupons", couponsRes),
    accounts,
    unavailable,
  };
}
