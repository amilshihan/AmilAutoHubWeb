// Pure aggregation helpers for the admin dashboard and customers pages (no I/O, easy to test).

export type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number | string;
  subtotal: number | string;
  discount?: number | string | null;
  payment_method: string;
  payment_status?: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_account_id?: string | null;
  fulfilment: string;
};

export type ItemRow = {
  order_id: string;
  part_id: string;
  name_snapshot: string;
  qty: number | string;
  line_total: number | string;
};

const SL_OFFSET_MS = 5.5 * 3600_000; // Sri Lanka is UTC+5:30 all year

export const slDate = (iso: string | number | Date) => new Date(new Date(iso).getTime() + SL_OFFSET_MS).toISOString().slice(0, 10);

const n = (v: unknown) => Number(v ?? 0);
const counted = (o: OrderRow) => o.status !== "cancelled";

export type DaySeries = { date: string; revenue: number; orders: number };

export type Summary = {
  revenue: number;
  orders: number;
  aov: number;
  cancelled: number;
  paidRevenue: number;
  discounts: number;
  byDay: DaySeries[];
  statusCounts: Record<string, number>;
  paymentSplit: { method: string; orders: number; revenue: number }[];
  topProducts: { partId: string; name: string; qty: number; revenue: number }[];
  topCollections: { collection: string; qty: number; revenue: number }[];
};

// `orders` must already be limited to the period; `days` sizes the daily series ending at `endDate`.
export function summarize(
  orders: OrderRow[],
  items: ItemRow[],
  days: number,
  endDate: string,
  collectionOf: (partId: string) => string
): Summary {
  const live = orders.filter(counted);
  const liveIds = new Set(live.map((o) => o.id));

  const series = new Map<string, DaySeries>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.parse(`${endDate}T00:00:00Z`) - i * 86400000).toISOString().slice(0, 10);
    series.set(d, { date: d, revenue: 0, orders: 0 });
  }
  for (const o of live) {
    const day = series.get(slDate(o.created_at));
    if (day) {
      day.revenue += n(o.total);
      day.orders += 1;
    }
  }

  const revenue = live.reduce((s, o) => s + n(o.total), 0);
  const statusCounts: Record<string, number> = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const pay = new Map<string, { orders: number; revenue: number }>();
  for (const o of live) {
    const p = pay.get(o.payment_method) ?? { orders: 0, revenue: 0 };
    p.orders += 1;
    p.revenue += n(o.total);
    pay.set(o.payment_method, p);
  }

  const products = new Map<string, { name: string; qty: number; revenue: number }>();
  const collections = new Map<string, { qty: number; revenue: number }>();
  for (const it of items) {
    if (!liveIds.has(it.order_id)) continue;
    const p = products.get(it.part_id) ?? { name: it.name_snapshot, qty: 0, revenue: 0 };
    p.qty += n(it.qty);
    p.revenue += n(it.line_total);
    products.set(it.part_id, p);

    const key = collectionOf(it.part_id);
    const c = collections.get(key) ?? { qty: 0, revenue: 0 };
    c.qty += n(it.qty);
    c.revenue += n(it.line_total);
    collections.set(key, c);
  }

  return {
    revenue,
    orders: live.length,
    aov: live.length ? revenue / live.length : 0,
    cancelled: orders.length - live.length,
    paidRevenue: live.filter((o) => o.payment_status === "paid").reduce((s, o) => s + n(o.total), 0),
    discounts: live.reduce((s, o) => s + n(o.discount), 0),
    byDay: [...series.values()],
    statusCounts,
    paymentSplit: [...pay].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.revenue - a.revenue),
    topProducts: [...products].map(([partId, v]) => ({ partId, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    topCollections: [...collections].map(([collection, v]) => ({ collection, ...v })).sort((a, b) => b.revenue - a.revenue),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

// ─── Customers ───────────────────────────────────────────────

export type Segment = "VIP" | "Repeat" | "New" | "Lead";

export const VIP_SPEND = 50_000;
export const VIP_ORDERS = 5;
export const ACTIVE_DAYS = 90;

export type CustomerSummary = {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  orders: number;
  spent: number;
  aov: number;
  firstOrder: string;
  lastOrder: string;
  segment: Segment;
  active: boolean;
  history: { id: string; orderNumber: string; total: number; status: string; createdAt: string }[];
};

const phoneKey = (p: string) => p.replace(/\D/g, "").slice(-9);

export function buildCustomers(orders: OrderRow[], nowMs: number = Date.now()): CustomerSummary[] {
  const map = new Map<string, OrderRow[]>();
  for (const o of orders) {
    const key = phoneKey(o.customer_phone);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(o);
    map.set(key, list);
  }

  const out: CustomerSummary[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const live = sorted.filter(counted);
    const spent = live.reduce((s, o) => s + n(o.total), 0);
    const latest = sorted[0];
    const segment: Segment =
      live.length === 0 ? "Lead" : spent >= VIP_SPEND || live.length >= VIP_ORDERS ? "VIP" : live.length >= 2 ? "Repeat" : "New";
    out.push({
      key,
      name: latest.customer_name,
      phone: latest.customer_phone,
      email: sorted.find((o) => o.customer_email)?.customer_email ?? null,
      orders: live.length,
      spent,
      aov: live.length ? spent / live.length : 0,
      firstOrder: sorted[sorted.length - 1].created_at,
      lastOrder: latest.created_at,
      segment,
      active: nowMs - Date.parse(latest.created_at) <= ACTIVE_DAYS * 86400000,
      history: sorted.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        total: n(o.total),
        status: o.status,
        createdAt: o.created_at,
      })),
    });
  }
  return out.sort((a, b) => b.spent - a.spent || Date.parse(b.lastOrder) - Date.parse(a.lastOrder));
}

export type AccountOrderStats = {
  totalOrders: number;
  totalSpent: number;
  lifetimeValue: number;
  lastPurchaseDate: string | null;
  history: { id: string; orderNumber: string; total: number; status: string; createdAt: string }[];
};

// Matches a registered account's orders by customer_account_id where the order carries it
// (set at checkout when the buyer was signed in), falling back to phone/email matching for
// orders placed before that link existed, or placed as a guest with the account's contact
// details. Lifetime value is defined here as all-time non-cancelled spend (same as `spent`
// in buildCustomers) -- kept as a distinct field name since a future loyalty/refund-aware
// definition may want to diverge from the simple order total.
export function computeAccountOrderStats(
  orders: OrderRow[],
  account: { id: string; mobile: string | null; email: string; additionalMobiles: string[]; additionalEmails: string[] }
): AccountOrderStats {
  const mobileKeys = new Set([account.mobile, ...account.additionalMobiles].filter(Boolean).map((m) => phoneKey(m as string)));
  const emailKeys = new Set([account.email, ...account.additionalEmails].filter(Boolean).map((e) => (e as string).toLowerCase()));

  const matched = orders.filter(
    (o) =>
      o.customer_account_id === account.id ||
      mobileKeys.has(phoneKey(o.customer_phone)) ||
      (o.customer_email && emailKeys.has(o.customer_email.toLowerCase()))
  );

  const sorted = [...matched].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const live = sorted.filter(counted);
  const spent = live.reduce((s, o) => s + n(o.total), 0);

  return {
    totalOrders: live.length,
    totalSpent: spent,
    lifetimeValue: spent,
    lastPurchaseDate: live[0]?.created_at ?? null,
    history: sorted.map((o) => ({ id: o.id, orderNumber: o.order_number, total: n(o.total), status: o.status, createdAt: o.created_at })),
  };
}
