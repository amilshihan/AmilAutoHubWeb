// Report tables for the admin Reports page and CSV export. Pure: takes already-loaded data.

import { buildCustomers, slDate } from "@/lib/admin/analytics";
import {
  allStockAlerts,
  bestSellers,
  couponSummary,
  profitSummary,
  supplierSummary,
  type DOrder,
  type DPart,
  type DPurchase,
  type DSale,
  type DSupplier,
  type DCoupon,
} from "@/lib/admin/dashboardMetrics";

export type Cell = string | number | null;
export type ReportTable = { id: ReportId; title: string; description: string; columns: string[]; rows: Cell[][] };

export const REPORTS = [
  { id: "sales-by-day", title: "Sales by day", description: "Website and in-store revenue for each day." },
  { id: "orders", title: "Website orders", description: "Every website order in the period." },
  { id: "best-sellers", title: "Best-selling products", description: "Units and revenue by product, website and in-store." },
  { id: "profit", title: "Profit & margin", description: "Profit by product, for sales where the cost price is known." },
  { id: "stock", title: "Stock valuation", description: "Stock on hand and its value at cost, right now." },
  { id: "low-stock", title: "Low-stock alerts", description: "Products at or below their minimum stock, right now." },
  { id: "suppliers", title: "Suppliers", description: "Products, low stock, stock value and purchases per supplier." },
  { id: "coupons", title: "Discounts & coupons", description: "Coupon use and discounts given on website orders." },
  { id: "delivery", title: "Delivery", description: "Website delivery orders with status, courier and dates." },
  { id: "returns", title: "Returns & cancellations", description: "Refunded and cancelled website orders." },
  { id: "customers", title: "Customers", description: "Website customers by spend in the period." },
] as const;

export type ReportId = (typeof REPORTS)[number]["id"];
export const isReportId = (v: string | undefined): v is ReportId => REPORTS.some((r) => r.id === v);

const n = (v: unknown) => Number(v ?? 0);
const money = (v: number) => Math.round(v * 100) / 100;
const day = (iso: string | null | undefined) => (iso ? slDate(iso) : null);

export type ReportInput = {
  orders: DOrder[];
  sales: DSale[];
  parts: DPart[];
  suppliers: DSupplier[];
  purchases: DPurchase[];
  coupons: DCoupon[];
  nowMs: number;
  from: string;
  to: string;
};

export function buildReport(id: ReportId, input: ReportInput): ReportTable {
  const meta = REPORTS.find((r) => r.id === id)!;
  const { orders, sales, parts, suppliers, purchases, coupons, nowMs } = input;
  const partById = new Map(parts.map((p) => [p.id, p]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s.name]));
  const supplierName = (sid: string | null | undefined) => (sid ? (supplierById.get(sid) ?? null) : null);
  const nameOf = (pid: string) => partById.get(pid)?.name ?? null;
  const costOf = (pid: string) => n(partById.get(pid)?.cost_price);
  const liveOrders = orders.filter((o) => o.status !== "cancelled");
  const liveSales = sales.filter((s) => s.status === "completed");
  const make = (columns: string[], rows: Cell[][]): ReportTable => ({ ...meta, columns, rows });

  switch (id) {
    case "sales-by-day": {
      const byDay = new Map<string, { oc: number; orev: number; sc: number; srev: number }>();
      const row = (d: string) => byDay.get(d) ?? { oc: 0, orev: 0, sc: 0, srev: 0 };
      for (const o of liveOrders) {
        const d = slDate(o.created_at);
        const r = row(d);
        r.oc += 1;
        r.orev += n(o.total);
        byDay.set(d, r);
      }
      for (const s of liveSales) {
        const d = slDate(s.created_at);
        const r = row(d);
        r.sc += 1;
        r.srev += n(s.total);
        byDay.set(d, r);
      }
      const rows = [...byDay].sort((a, b) => a[0].localeCompare(b[0])).map(([d, r]) => [d, r.oc, money(r.orev), r.sc, money(r.srev), money(r.orev + r.srev)]);
      return make(["Date", "Website orders", "Website revenue", "In-store sales", "In-store revenue", "Total revenue"], rows);
    }
    case "orders":
      return make(
        ["Order", "Date", "Customer", "Phone", "Fulfilment", "Payment", "Payment status", "Status", "Subtotal", "Discount", "Delivery fee", "Total", "Coupon"],
        orders.map((o) => [
          o.order_number,
          slDate(o.created_at),
          o.customer_name,
          o.customer_phone,
          o.fulfilment,
          o.payment_method,
          o.payment_status ?? "",
          o.status,
          money(n(o.subtotal)),
          money(n(o.discount)),
          money(n(o.delivery_fee)),
          money(n(o.total)),
          o.coupon_code ?? "",
        ])
      );
    case "best-sellers":
      return make(
        ["Product", "Units sold", "Website units", "In-store units", "Revenue"],
        bestSellers(orders, sales, nameOf, 1000).map((b) => [b.name, b.qty, b.onlineQty, b.posQty, money(b.revenue)])
      );
    case "profit": {
      const p = profitSummary(orders, sales, costOf, nameOf);
      return make(
        ["Product", "Units", "Revenue", "Cost", "Profit", "Margin %"],
        [...p.products].sort((a, b) => b.profit - a.profit).map((r) => [r.name, r.qty, money(r.revenue), money(r.cost), money(r.profit), money(r.marginPct)])
      );
    }
    case "stock": {
      const list = parts.filter((p) => p.is_active && !p.is_service).sort((a, b) => a.name.localeCompare(b.name));
      return make(
        ["Product", "SKU", "Supplier", "On hand", "Minimum", "Cost price", "Sell price", "Stock value (cost)"],
        list.map((p) => [
          p.name,
          p.sku ?? "",
          supplierName(p.supplier_id) ?? "",
          n(p.qty_on_hand),
          n(p.low_stock_threshold),
          money(n(p.cost_price)),
          money(n(p.sell_price)),
          money(Math.max(0, n(p.qty_on_hand)) * n(p.cost_price)),
        ])
      );
    }
    case "low-stock":
      return make(
        ["Product", "SKU", "Supplier", "On hand", "Minimum", "Status"],
        allStockAlerts(parts, supplierName).map((a) => [a.name, a.sku ?? "", a.supplier ?? "", a.qty, a.threshold, a.level === "out" ? "Out of stock" : "Low"])
      );
    case "suppliers":
      return make(
        ["Supplier", "Phone", "Products", "Low-stock products", "Stock value (cost)", "Purchases", "Purchased", "Unpaid"],
        supplierSummary(parts, suppliers, purchases).map((s) => [s.name, s.phone ?? "", s.products, s.lowStock, money(s.stockValue), s.purchases, money(s.purchased), money(s.unpaid)])
      );
    case "coupons": {
      const c = couponSummary(coupons, orders, nowMs);
      return make(
        ["Coupon", "Orders", "Discount given", "Order revenue"],
        c.uses.map((u) => [u.code, u.orders, money(u.discount), money(u.revenue)])
      );
    }
    case "delivery":
      return make(
        ["Order", "Date", "Customer", "Status", "Shipping status", "Courier", "Tracking", "Estimated delivery", "Delivered on", "Days open"],
        orders
          .filter((o) => o.fulfilment === "delivery" && o.status !== "cancelled")
          .map((o) => [
            o.order_number,
            slDate(o.created_at),
            o.customer_name,
            o.status,
            o.shipping_status ?? "",
            o.courier ?? "",
            o.tracking_number ?? "",
            o.estimated_delivery_date ?? "",
            o.actual_delivery_date ?? "",
            Math.floor(((o.actual_delivery_date ? Date.parse(`${o.actual_delivery_date}T00:00:00Z`) : nowMs) - Date.parse(o.created_at)) / 86400000),
          ])
      );
    case "returns":
      return make(
        ["Order", "Date", "Customer", "Status", "Refund amount", "Refunded on", "Refund reason", "Cancellation reason"],
        orders
          .filter((o) => o.status === "cancelled" || o.refunded_at || o.payment_status === "refunded" || n(o.refund_amount) > 0)
          .map((o) => [o.order_number, slDate(o.created_at), o.customer_name, o.status, money(n(o.refund_amount)), day(o.refunded_at), o.refund_reason ?? "", o.cancellation_reason ?? ""])
      );
    case "customers":
      return make(
        ["Customer", "Phone", "Email", "Orders", "Spent", "Average order", "Segment", "Last order"],
        buildCustomers(orders, nowMs).map((c) => [c.name, c.phone, c.email ?? "", c.orders, money(c.spent), money(c.aov), c.segment, slDate(c.lastOrder)])
      );
  }
}

const csvCell = (v: Cell) => {
  const s = v === null ? "" : String(v);
  const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s; // stop spreadsheet formula injection
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(table: ReportTable): string {
  const lines = [table.columns, ...table.rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// "YYYY-MM-DD" in Sri Lanka time to the instant range used to query the database.
export function parseRange(from: string | undefined, to: string | undefined, nowMs: number) {
  const valid = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
  const today = slDate(nowMs);
  const toDay = valid(to) ?? today;
  let fromDay = valid(from) ?? slDate(nowMs - 29 * 86400000);
  if (fromDay > toDay) fromDay = toDay;
  const maxDays = 366;
  if ((Date.parse(toDay) - Date.parse(fromDay)) / 86400000 > maxDays) fromDay = slDate(Date.parse(toDay) - maxDays * 86400000);
  return {
    from: fromDay,
    to: toDay,
    sinceIso: new Date(`${fromDay}T00:00:00+05:30`).toISOString(),
    untilIso: new Date(`${toDay}T23:59:59.999+05:30`).toISOString(),
  };
}
