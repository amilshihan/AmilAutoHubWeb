// Pure calculations for the admin dashboard and reports (no I/O). Website orders and in-store
// POS sales are combined; cost and profit figures are only ever built from admin-only data.

import { buildCustomers, slDate, type DaySeries, type OrderRow } from "@/lib/admin/analytics";

const n = (v: unknown) => Number(v ?? 0);
const DAY = 86400000;

export type OnlineItem = { part_id: string; name_snapshot: string; unit_price?: number | string; qty: number | string; line_total: number | string };

export type DOrder = OrderRow & {
  delivery_fee?: number | string | null;
  shipping_status?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  estimated_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  refund_amount?: number | string | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  cancellation_reason?: string | null;
  coupon_code?: string | null;
  delivery_zone?: string | null;
  online_order_items: OnlineItem[];
};

export type DSaleItem = { part_id: string; qty: number | string; unit_price: number | string; cost_price_snapshot: number | string | null; line_total: number | string };
export type DSale = {
  id: string;
  sale_number: string;
  subtotal: number | string;
  discount: number | string | null;
  tax: number | string | null;
  total: number | string;
  status: string;
  payment_method: string;
  created_at: string;
  items: DSaleItem[];
};

export type DPart = {
  id: string;
  name: string;
  sku: string | null;
  qty_on_hand: number | string;
  low_stock_threshold: number | string | null;
  low_stock_warning_enabled?: boolean | null;
  reorder_point?: number | string | null;
  cost_price?: number | string | null;
  sell_price: number | string;
  retail_price?: number | string | null;
  supplier_id?: string | null;
  is_online?: boolean | null;
  image_url?: string | null;
  is_active: boolean;
  is_service: boolean;
};

export type DSupplier = { id: string; name: string; phone?: string | null };
export type DPurchase = { id: string; purchase_number: string; supplier_id: string | null; total: number | string; payment_status: string; created_at: string };
export type DCoupon = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number | string;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
export type DAccount = { id: string; created_at: string };

const liveOrder = (o: DOrder) => o.status !== "cancelled";
const liveSale = (s: DSale) => s.status === "completed";

// ─── Sales by channel ────────────────────────────────────────

export type ChannelSummary = {
  online: { revenue: number; count: number };
  pos: { revenue: number; count: number };
  revenue: number;
  count: number;
  aov: number;
  byDay: DaySeries[];
};

export function channelSummary(orders: DOrder[], sales: DSale[], days: number, endDate: string): ChannelSummary {
  const series = new Map<string, DaySeries>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.parse(`${endDate}T00:00:00Z`) - i * DAY).toISOString().slice(0, 10);
    series.set(d, { date: d, revenue: 0, orders: 0 });
  }
  const online = { revenue: 0, count: 0 };
  const pos = { revenue: 0, count: 0 };
  for (const o of orders.filter(liveOrder)) {
    online.revenue += n(o.total);
    online.count += 1;
    const day = series.get(slDate(o.created_at));
    if (day) {
      day.revenue += n(o.total);
      day.orders += 1;
    }
  }
  for (const s of sales.filter(liveSale)) {
    pos.revenue += n(s.total);
    pos.count += 1;
    const day = series.get(slDate(s.created_at));
    if (day) {
      day.revenue += n(s.total);
      day.orders += 1;
    }
  }
  const revenue = online.revenue + pos.revenue;
  const count = online.count + pos.count;
  return { online, pos, revenue, count, aov: count ? revenue / count : 0, byDay: [...series.values()] };
}

// ─── Best sellers ────────────────────────────────────────────

export type BestSeller = { partId: string; name: string; qty: number; revenue: number; onlineQty: number; posQty: number };

export function bestSellers(orders: DOrder[], sales: DSale[], nameOf: (partId: string) => string | null, limit = 10): BestSeller[] {
  const map = new Map<string, BestSeller>();
  const get = (id: string, fallback: string) => {
    let row = map.get(id);
    if (!row) {
      row = { partId: id, name: nameOf(id) ?? fallback, qty: 0, revenue: 0, onlineQty: 0, posQty: 0 };
      map.set(id, row);
    }
    return row;
  };
  for (const o of orders.filter(liveOrder)) {
    for (const it of o.online_order_items ?? []) {
      const row = get(it.part_id, it.name_snapshot);
      row.qty += n(it.qty);
      row.onlineQty += n(it.qty);
      row.revenue += n(it.line_total);
    }
  }
  for (const s of sales.filter(liveSale)) {
    for (const it of s.items) {
      const row = get(it.part_id, "Unknown product");
      row.qty += n(it.qty);
      row.posQty += n(it.qty);
      row.revenue += n(it.line_total);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, limit);
}

// ─── Profit and margin ───────────────────────────────────────

export type ProductMargin = { partId: string; name: string; qty: number; revenue: number; cost: number; profit: number; marginPct: number };
export type ProfitSummary = {
  itemRevenue: number;
  costedRevenue: number;
  cost: number;
  discounts: number;
  profit: number;
  marginPct: number | null;
  coveragePct: number | null;
  online: { revenue: number; profit: number; marginPct: number | null };
  pos: { revenue: number; profit: number; marginPct: number | null };
  products: ProductMargin[];
};

// Lines with no known cost price are left out of profit/margin (and reported as "coverage")
// rather than counted as 100% margin. Website lines use today's cost price; POS lines use
// the cost recorded at the time of sale.
export function profitSummary(
  orders: DOrder[],
  sales: DSale[],
  costOf: (partId: string) => number,
  nameOf: (partId: string) => string | null
): ProfitSummary {
  const products = new Map<string, ProductMargin>();
  let itemRevenue = 0;
  let costedRevenue = 0;
  let cost = 0;
  let discounts = 0;
  const channel = { online: { rev: 0, profit: 0 }, pos: { rev: 0, profit: 0 } };

  function addLine(channelKey: "online" | "pos", partId: string, fallbackName: string, qty: number, revenue: number, unitCost: number) {
    itemRevenue += revenue;
    if (unitCost <= 0) return { costed: 0 };
    const lineCost = unitCost * qty;
    costedRevenue += revenue;
    cost += lineCost;
    channel[channelKey].rev += revenue;
    channel[channelKey].profit += revenue - lineCost;
    const row = products.get(partId) ?? { partId, name: nameOf(partId) ?? fallbackName, qty: 0, revenue: 0, cost: 0, profit: 0, marginPct: 0 };
    row.qty += qty;
    row.revenue += revenue;
    row.cost += lineCost;
    row.profit += revenue - lineCost;
    products.set(partId, row);
    return { costed: revenue };
  }

  for (const o of orders.filter(liveOrder)) {
    let orderItems = 0;
    let orderCosted = 0;
    for (const it of o.online_order_items ?? []) {
      const rev = n(it.line_total);
      orderItems += rev;
      orderCosted += addLine("online", it.part_id, it.name_snapshot, n(it.qty), rev, costOf(it.part_id)).costed;
    }
    const share = orderItems > 0 ? (n(o.discount) * orderCosted) / orderItems : 0;
    discounts += share;
    channel.online.profit -= share;
  }
  for (const s of sales.filter(liveSale)) {
    let saleItems = 0;
    let saleCosted = 0;
    for (const it of s.items) {
      const rev = n(it.line_total);
      saleItems += rev;
      const unit = n(it.cost_price_snapshot) > 0 ? n(it.cost_price_snapshot) : costOf(it.part_id);
      saleCosted += addLine("pos", it.part_id, "Unknown product", n(it.qty), rev, unit).costed;
    }
    const share = saleItems > 0 ? (n(s.discount) * saleCosted) / saleItems : 0;
    discounts += share;
    channel.pos.profit -= share;
  }

  const profit = costedRevenue - cost - discounts;
  const pct = (p: number, r: number) => (r > 0 ? (p / r) * 100 : null);
  const list = [...products.values()].map((p) => ({ ...p, marginPct: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }));
  return {
    itemRevenue,
    costedRevenue,
    cost,
    discounts,
    profit,
    marginPct: pct(profit, costedRevenue),
    coveragePct: itemRevenue > 0 ? (costedRevenue / itemRevenue) * 100 : null,
    online: { revenue: channel.online.rev, profit: channel.online.profit, marginPct: pct(channel.online.profit, channel.online.rev) },
    pos: { revenue: channel.pos.rev, profit: channel.pos.profit, marginPct: pct(channel.pos.profit, channel.pos.rev) },
    products: list,
  };
}

// ─── Stock ───────────────────────────────────────────────────

export type StockAlert = { id: string; name: string; sku: string | null; qty: number; threshold: number; supplier: string | null; level: "out" | "low" };
export type StockSummary = {
  products: number;
  units: number;
  valueAtCost: number;
  valueAtSell: number;
  outOfStock: number;
  lowStock: number;
  alertCount: number;
  noCost: number;
  alerts: StockAlert[];
};

const stockParts = (parts: DPart[]) => parts.filter((p) => p.is_active && !p.is_service);

export function stockSummary(parts: DPart[], supplierName: (id: string | null | undefined) => string | null, alertLimit = 15): StockSummary {
  const list = stockParts(parts);
  let units = 0;
  let valueAtCost = 0;
  let valueAtSell = 0;
  let noCost = 0;
  let outOfStock = 0;
  const alerts: StockAlert[] = [];
  for (const p of list) {
    const qty = n(p.qty_on_hand);
    const threshold = n(p.low_stock_threshold);
    if (qty > 0) {
      units += qty;
      valueAtCost += qty * n(p.cost_price);
      valueAtSell += qty * n(p.sell_price);
    }
    if (p.cost_price !== undefined && n(p.cost_price) <= 0) noCost += 1;
    if (qty <= 0) outOfStock += 1;
    if (p.low_stock_warning_enabled !== false && qty <= threshold) {
      alerts.push({
        id: p.id,
        name: p.name,
        sku: p.sku,
        qty,
        threshold,
        supplier: supplierName(p.supplier_id),
        level: qty <= 0 ? "out" : "low",
      });
    }
  }
  alerts.sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name));
  return {
    products: list.length,
    units,
    valueAtCost,
    valueAtSell,
    outOfStock,
    lowStock: alerts.filter((a) => a.level === "low").length,
    alertCount: alerts.length,
    noCost,
    alerts: alerts.slice(0, alertLimit),
  };
}

export function allStockAlerts(parts: DPart[], supplierName: (id: string | null | undefined) => string | null): StockAlert[] {
  return stockSummary(parts, supplierName, Number.MAX_SAFE_INTEGER).alerts;
}

// ─── Products ────────────────────────────────────────────────

export type ProductSummary = { total: number; onWebsite: number; hidden: number; noImage: number; outOfStock: number; discounted: number };

export function productSummary(parts: DPart[]): ProductSummary {
  const list = stockParts(parts);
  return {
    total: list.length,
    onWebsite: list.filter((p) => p.is_online !== false).length,
    hidden: list.filter((p) => p.is_online === false).length,
    noImage: list.filter((p) => !p.image_url).length,
    outOfStock: list.filter((p) => n(p.qty_on_hand) <= 0).length,
    discounted: list.filter((p) => n(p.retail_price) > n(p.sell_price)).length,
  };
}

// ─── Suppliers ───────────────────────────────────────────────

export type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  products: number;
  lowStock: number;
  stockValue: number;
  purchases: number;
  purchased: number;
  unpaid: number;
};

export function supplierSummary(parts: DPart[], suppliers: DSupplier[], purchases: DPurchase[]): SupplierRow[] {
  const rows = new Map<string, SupplierRow>(
    suppliers.map((s) => [s.id, { id: s.id, name: s.name, phone: s.phone ?? null, products: 0, lowStock: 0, stockValue: 0, purchases: 0, purchased: 0, unpaid: 0 }])
  );
  for (const p of stockParts(parts)) {
    const row = p.supplier_id ? rows.get(p.supplier_id) : undefined;
    if (!row) continue;
    const qty = n(p.qty_on_hand);
    row.products += 1;
    if (p.low_stock_warning_enabled !== false && qty <= n(p.low_stock_threshold)) row.lowStock += 1;
    if (qty > 0) row.stockValue += qty * n(p.cost_price);
  }
  for (const pu of purchases) {
    const row = pu.supplier_id ? rows.get(pu.supplier_id) : undefined;
    if (!row) continue;
    row.purchases += 1;
    row.purchased += n(pu.total);
    if (pu.payment_status !== "paid") row.unpaid += n(pu.total);
  }
  return [...rows.values()].sort((a, b) => b.lowStock - a.lowStock || b.stockValue - a.stockValue || a.name.localeCompare(b.name));
}

// ─── Discounts and coupons ───────────────────────────────────

export type CouponUse = { code: string; orders: number; discount: number; revenue: number };
export type CouponSummary = {
  active: number;
  expiringSoon: { code: string; endsAt: string }[];
  exhausted: number;
  discountGiven: number;
  ordersWithDiscount: number;
  uses: CouponUse[];
};

export function couponSummary(coupons: DCoupon[], orders: DOrder[], nowMs: number): CouponSummary {
  const live = orders.filter(liveOrder);
  const isLive = (c: DCoupon) =>
    c.is_active &&
    (!c.starts_at || Date.parse(c.starts_at) <= nowMs) &&
    (!c.ends_at || Date.parse(c.ends_at) >= nowMs) &&
    (c.max_uses === null || c.used_count < c.max_uses);
  const uses = new Map<string, CouponUse>();
  for (const o of live) {
    if (!o.coupon_code) continue;
    const u = uses.get(o.coupon_code) ?? { code: o.coupon_code, orders: 0, discount: 0, revenue: 0 };
    u.orders += 1;
    u.discount += n(o.discount);
    u.revenue += n(o.total);
    uses.set(o.coupon_code, u);
  }
  return {
    active: coupons.filter(isLive).length,
    expiringSoon: coupons
      .filter((c) => isLive(c) && c.ends_at && Date.parse(c.ends_at) - nowMs <= 14 * DAY)
      .map((c) => ({ code: c.code, endsAt: c.ends_at! })),
    exhausted: coupons.filter((c) => c.max_uses !== null && c.used_count >= c.max_uses).length,
    discountGiven: live.reduce((s, o) => s + n(o.discount), 0),
    ordersWithDiscount: live.filter((o) => n(o.discount) > 0).length,
    uses: [...uses.values()].sort((a, b) => b.discount - a.discount),
  };
}

// ─── Delivery ────────────────────────────────────────────────

export type DeliveryRow = { id: string; orderNumber: string; customer: string; status: string; ageDays: number; courier: string | null; tracking: string | null; late: boolean };
export type DeliverySummary = {
  delivery: { orders: number; revenue: number };
  pickup: { orders: number; revenue: number };
  awaiting: DeliveryRow[];
  awaitingCount: number;
  late: number;
  failed: number;
  deliveredCount: number;
  avgDeliveryDays: number | null;
  couriers: { courier: string; orders: number }[];
};

export function deliverySummary(orders: DOrder[], nowMs: number): DeliverySummary {
  const live = orders.filter(liveOrder);
  const today = slDate(nowMs);
  const deliveries = live.filter((o) => o.fulfilment === "delivery");
  const split = (list: DOrder[]) => ({ orders: list.length, revenue: list.reduce((s, o) => s + n(o.total), 0) });

  const open = deliveries.filter((o) => ["pending", "confirmed", "packed", "dispatched"].includes(o.status));
  const rows: DeliveryRow[] = open
    .map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customer: o.customer_name,
      status: o.status,
      ageDays: Math.floor((nowMs - Date.parse(o.created_at)) / DAY),
      courier: o.courier ?? null,
      tracking: o.tracking_number ?? null,
      late: Boolean(o.estimated_delivery_date && o.estimated_delivery_date < today),
    }))
    .sort((a, b) => b.ageDays - a.ageDays);

  const delivered = deliveries.filter((o) => o.status === "delivered" && o.actual_delivery_date);
  const days = delivered.map((o) => Math.max(0, (Date.parse(`${o.actual_delivery_date}T00:00:00Z`) - Date.parse(`${slDate(o.created_at)}T00:00:00Z`)) / DAY));

  const couriers = new Map<string, number>();
  for (const o of deliveries) if (o.courier) couriers.set(o.courier, (couriers.get(o.courier) ?? 0) + 1);

  return {
    delivery: split(deliveries),
    pickup: split(live.filter((o) => o.fulfilment !== "delivery")),
    awaiting: rows.slice(0, 10),
    awaitingCount: rows.length,
    late: rows.filter((r) => r.late).length,
    failed: deliveries.filter((o) => o.shipping_status === "failed").length,
    deliveredCount: deliveries.filter((o) => o.status === "delivered").length,
    avgDeliveryDays: days.length ? days.reduce((a, b) => a + b, 0) / days.length : null,
    couriers: [...couriers].map(([courier, orders]) => ({ courier, orders })).sort((a, b) => b.orders - a.orders),
  };
}

// ─── Returns (website refunds and cancellations) ─────────────

export type RefundRow = { id: string; orderNumber: string; customer: string; amount: number; reason: string | null; date: string };
export type ReturnsSummary = {
  refunded: number;
  refundTotal: number;
  refundRatePct: number | null;
  recent: RefundRow[];
  cancelled: number;
  cancelReasons: { reason: string; count: number }[];
};

export function returnsSummary(orders: DOrder[]): ReturnsSummary {
  const isRefund = (o: DOrder) => Boolean(o.refunded_at) || o.payment_status === "refunded" || n(o.refund_amount) > 0;
  const refunds = orders.filter(isRefund);
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const reasons = new Map<string, number>();
  for (const o of cancelled) {
    const reason = o.cancellation_reason?.trim() || "No reason given";
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  }
  return {
    refunded: refunds.length,
    refundTotal: refunds.reduce((s, o) => s + n(o.refund_amount), 0),
    refundRatePct: orders.length ? (refunds.length / orders.length) * 100 : null,
    recent: refunds
      .map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        customer: o.customer_name,
        amount: n(o.refund_amount),
        reason: o.refund_reason ?? null,
        date: o.refunded_at ?? o.created_at,
      }))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    cancelled: cancelled.length,
    cancelReasons: [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

// ─── Customers ───────────────────────────────────────────────

export type CustomerStats = {
  accounts: number | null;
  newAccounts: number | null;
  buyers: number;
  repeat: number;
  vip: number;
  repeatRatePct: number | null;
  top: { name: string; orders: number; spent: number }[];
};

export function customerStats(accounts: DAccount[] | null, orders: DOrder[], sinceMs: number, nowMs: number): CustomerStats {
  const customers = buildCustomers(orders, nowMs).filter((c) => c.orders > 0);
  const repeat = customers.filter((c) => c.segment === "Repeat" || c.segment === "VIP").length;
  return {
    accounts: accounts ? accounts.length : null,
    newAccounts: accounts ? accounts.filter((a) => Date.parse(a.created_at) >= sinceMs).length : null,
    buyers: customers.length,
    repeat,
    vip: customers.filter((c) => c.segment === "VIP").length,
    repeatRatePct: customers.length ? (repeat / customers.length) * 100 : null,
    top: customers.slice(0, 5).map((c) => ({ name: c.name, orders: c.orders, spent: c.spent })),
  };
}
