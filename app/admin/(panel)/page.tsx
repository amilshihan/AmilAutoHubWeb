import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getCatalog } from "@/lib/shop/data";
import { COLLECTION_BY_SLUG, isCollectionSlug } from "@/lib/shop/collections";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type OrderStatus } from "@/lib/shop/config";
import { formatLKR } from "@/lib/shop/format";
import { percentChange, slDate, summarize, type ItemRow } from "@/lib/admin/analytics";
import {
  bestSellers,
  channelSummary,
  couponSummary,
  customerStats,
  deliverySummary,
  productSummary,
  profitSummary,
  returnsSummary,
  stockSummary,
  supplierSummary,
  type DOrder,
} from "@/lib/admin/dashboardMetrics";
import { loadDashboardData } from "@/lib/admin/dashboardData";
import { nowMs } from "@/lib/admin/time";
import { cardSurface } from "@/lib/ui";
import RevenueChart from "@/components/admin/RevenueChart";

const RANGES = [7, 30, 90];

const pct = (v: number | null) => (v === null ? "-" : `${v.toFixed(1)}%`);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Colombo" });

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">new</span>;
  const up = value >= 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-700" : "text-error"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(0)}% vs previous
    </span>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className={`${cardSurface} p-5`}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

function Card({ title, href, cta, children }: { title: string; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <section className={`${cardSurface} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-xs font-semibold text-accent hover:underline">
            {cta ?? "View →"}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "bad" | "good" }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold tabular-nums ${tone === "bad" ? "text-error" : tone === "good" ? "text-green-700" : "text-ink"}`}>{value}</span>
    </li>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted">{children}</p>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;

  const { profile } = await getCurrentUserAndProfile();
  const admin = isAdmin(profile);
  const supabase = await createClient();

  const now = nowMs();
  const since = new Date(now - days * 2 * 86400000).toISOString();
  const [raw, pendingRes, bookingsRes, catalog] = await Promise.all([
    loadDashboardData(supabase, { sinceIso: since, admin }),
    supabase.from("online_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("service_bookings").select("id", { count: "exact", head: true }).eq("status", "requested"),
    getCatalog().catch(() => null),
  ]);

  if (raw.ordersError) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Online orders are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0015_storefront.sql</code> in the Supabase SQL editor,
            then reload.
          </p>
        </div>
      </div>
    );
  }

  const today = slDate(now);
  const cutoff = Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400000;
  const inPeriod = (iso: string) => Date.parse(`${slDate(iso)}T00:00:00Z`) >= cutoff;
  const curOrders = raw.orders.filter((o) => inPeriod(o.created_at));
  const prevOrders = raw.orders.filter((o) => !inPeriod(o.created_at));
  const curSales = raw.sales.filter((s) => inPeriod(s.created_at));
  const prevSales = raw.sales.filter((s) => !inPeriod(s.created_at));

  const partById = new Map(raw.parts.map((p) => [p.id, p]));
  const supplierById = new Map(raw.suppliers.map((s) => [s.id, s.name]));
  const supplierName = (id: string | null | undefined) => (id ? (supplierById.get(id) ?? null) : null);
  const nameOf = (id: string) => partById.get(id)?.name ?? null;
  const costOf = (id: string) => Number(partById.get(id)?.cost_price ?? 0);
  const collectionOf = (partId: string) => catalog?.byId.get(partId)?.collection ?? "other";

  const toItems = (rows: DOrder[]): ItemRow[] => rows.flatMap((o) => (o.online_order_items ?? []).map((i) => ({ ...i, order_id: o.id })));
  const web = summarize(curOrders, toItems(curOrders), days, today, collectionOf);
  const channels = channelSummary(curOrders, curSales, days, today);
  const prevChannels = channelSummary(prevOrders, prevSales, days, today);

  const profit = admin ? profitSummary(curOrders, curSales, costOf, nameOf) : null;
  const stock = stockSummary(raw.parts, supplierName);
  const products = productSummary(raw.parts);
  const sellers = bestSellers(curOrders, curSales, nameOf);
  const delivery = deliverySummary(curOrders, now);
  const returns = returnsSummary(curOrders);
  const coupons = couponSummary(raw.coupons, curOrders, now);
  const customers = customerStats(raw.accounts, curOrders, cutoff, now);
  const suppliers = admin ? supplierSummary(raw.parts, raw.suppliers, raw.purchases.filter((p) => inPeriod(p.created_at))) : [];

  const pendingCount = pendingRes.error ? null : (pendingRes.count ?? 0);
  const bookingCount = bookingsRes.error || bookingsRes.count === null ? null : bookingsRes.count;
  const maxCollection = Math.max(1, ...web.topCollections.map((c) => c.revenue));
  const topProfit = profit ? [...profit.products].sort((a, b) => b.profit - a.profit).slice(0, 5) : [];
  const lowMargin = profit ? [...profit.products].filter((p) => p.revenue > 0).sort((a, b) => a.marginPct - b.marginPct).slice(0, 5) : [];
  const stockAlertTotal = stock.alertCount;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Website orders and in-store sales combined. Cancelled orders are excluded from revenue.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {admin && (
            <Link href="/admin/reports" className="rounded-lg border border-card bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
              Reports &amp; CSV →
            </Link>
          )}
          <div className="flex gap-1 rounded-lg border border-card bg-white p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={r === 30 ? "/admin" : `/admin?range=${r}`}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${days === r ? "bg-primary text-white" : "text-muted hover:text-ink"}`}
              >
                {r} days
              </Link>
            ))}
          </div>
        </div>
      </div>

      {raw.unavailable.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Some data could not be read, so those figures are missing or zero: {raw.unavailable.join(", ")}.
        </p>
      )}

      {/* Sales dashboard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue (all channels)" value={formatLKR(channels.revenue)} sub={<Delta value={percentChange(channels.revenue, prevChannels.revenue)} />} />
        <Kpi label="Orders + in-store sales" value={String(channels.count)} sub={<Delta value={percentChange(channels.count, prevChannels.count)} />} />
        <Kpi label="Average sale value" value={formatLKR(channels.aov)} sub={<Delta value={percentChange(channels.aov, prevChannels.aov)} />} />
        {profit ? (
          <Kpi
            label="Estimated profit"
            value={formatLKR(profit.profit)}
            sub={<span className="text-xs text-muted">Margin {pct(profit.marginPct)} · cost known for {pct(profit.coveragePct)} of sales</span>}
          />
        ) : (
          <Kpi label="Paid online" value={formatLKR(web.paidRevenue)} sub={<span className="text-xs text-muted">Discounts given: {formatLKR(web.discounts)}</span>} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Website revenue" value={formatLKR(channels.online.revenue)} sub={<span className="text-xs text-muted">{channels.online.count} orders</span>} />
        <Kpi label="In-store (POS) revenue" value={formatLKR(channels.pos.revenue)} sub={<span className="text-xs text-muted">{channels.pos.count} sales</span>} />
        <Kpi label="Paid online" value={formatLKR(web.paidRevenue)} sub={<span className="text-xs text-muted">Website orders marked paid</span>} />
        <Kpi label="Discounts given" value={formatLKR(coupons.discountGiven)} sub={<span className="text-xs text-muted">{coupons.ordersWithDiscount} website orders</span>} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/admin/orders" className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">Pending orders</div>
          <div className="mt-1 text-2xl font-bold text-ink">{pendingCount ?? "-"}</div>
          <div className="mt-1 text-xs text-accent">Review orders →</div>
        </Link>
        <Link href="/admin/orders" className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">Awaiting delivery</div>
          <div className="mt-1 text-2xl font-bold text-ink">{delivery.awaitingCount}</div>
          <div className={`mt-1 text-xs ${delivery.late > 0 ? "font-semibold text-error" : "text-muted"}`}>{delivery.late > 0 ? `${delivery.late} past estimate` : "None late"}</div>
        </Link>
        <Link href={admin ? "/admin/inventory" : "/admin"} className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">Stock alerts</div>
          <div className="mt-1 text-2xl font-bold text-ink">{stockAlertTotal}</div>
          <div className="mt-1 text-xs text-accent">{admin ? "At or below minimum · open inventory →" : "At or below their minimum"}</div>
        </Link>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Website refunds</div>
          <div className="mt-1 text-2xl font-bold text-ink">{returns.refunded}</div>
          <div className="mt-1 text-xs text-muted">{formatLKR(returns.refundTotal)} refunded</div>
        </div>
        <Link href="/admin/bookings" className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">New service bookings</div>
          <div className="mt-1 text-2xl font-bold text-ink">{bookingCount ?? "-"}</div>
          <div className="mt-1 text-xs text-accent">{bookingCount === null ? "Run migration 0017" : "View bookings →"}</div>
        </Link>
      </div>

      <div className={`${cardSurface} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Revenue, last {days} days (website + in-store)</h2>
          <span className="text-xs text-muted">Sri Lanka time</span>
        </div>
        {channels.count === 0 ? <p className="py-10 text-center text-sm text-muted">No sales in this period yet.</p> : <RevenueChart data={channels.byDay} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Best-selling products */}
        <div className={`${cardSurface} overflow-hidden`}>
          <div className="border-b border-card px-5 py-3 font-semibold text-ink">Best-selling products</div>
          {sellers.length === 0 ? (
            <p className="p-5 text-sm text-muted">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {sellers.map((p) => (
                  <tr key={p.partId} className="border-b border-card last:border-0">
                    <td className="px-5 py-2.5 text-ink">
                      {p.name}
                      <div className="text-xs text-muted">
                        {p.onlineQty} website · {p.posQty} in-store
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted tabular-nums">{p.qty} sold</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatLKR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Card title="Category performance (website)">
          {web.topCollections.length === 0 ? (
            <Empty>No sales yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {web.topCollections.map((c) => (
                <li key={c.collection}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink">{isCollectionSlug(c.collection) ? COLLECTION_BY_SLUG[c.collection].label : "Other"}</span>
                    <span className="font-semibold tabular-nums">{formatLKR(c.revenue)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${(c.revenue / maxCollection) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Stock + low-stock alerts */}
        <div className={`${cardSurface} overflow-hidden lg:col-span-2`}>
          <div className="flex items-center justify-between border-b border-card px-5 py-3">
            <h2 className="font-semibold text-ink">Stock &amp; low-stock alerts</h2>
            {admin && (
              <Link href="/admin/inventory" className="text-xs font-semibold text-accent hover:underline">
                Open inventory →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 border-b border-card p-5 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted">Products in stock list</div>
              <div className="text-lg font-bold tabular-nums">{stock.products}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Out of stock</div>
              <div className="text-lg font-bold tabular-nums text-error">{stock.outOfStock}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Low stock</div>
              <div className="text-lg font-bold tabular-nums text-amber-700">{stock.lowStock}</div>
            </div>
            <div>
              <div className="text-xs text-muted">{admin ? "Stock value (cost / retail)" : "Units on hand"}</div>
              <div className="text-lg font-bold tabular-nums">{admin ? `${formatLKR(stock.valueAtCost)} / ${formatLKR(stock.valueAtSell)}` : stock.units}</div>
            </div>
          </div>
          {stock.alerts.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nothing is below its minimum stock level.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Supplier</th>
                  <th className="px-3 py-2 text-right font-semibold">On hand</th>
                  <th className="px-5 py-2 text-right font-semibold">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {stock.alerts.map((a) => (
                  <tr key={a.id} className="border-b border-card last:border-0">
                    <td className="px-5 py-2 text-ink">
                      {a.name}
                      {a.sku && <span className="ml-2 text-xs text-muted">SKU {a.sku}</span>}
                    </td>
                    <td className="px-3 py-2 text-muted">{a.supplier ?? "-"}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${a.level === "out" ? "text-error" : "text-amber-700"}`}>
                      {a.qty <= 0 ? "Out" : a.qty}
                    </td>
                    <td className="px-5 py-2 text-right text-muted tabular-nums">{a.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {stockAlertTotal > stock.alerts.length && (
            <p className="border-t border-card px-5 py-2.5 text-xs text-muted">
              Showing the {stock.alerts.length} most urgent of {stockAlertTotal} alerts (products with stock alerts switched off are not listed).
              {admin ? " Download the full list from Reports." : ""}
            </p>
          )}
        </div>

        {/* Products */}
        <Card title="Products" href={admin ? "/admin/products" : undefined} cta="Manage products →">
          <ul className="space-y-1.5 text-sm">
            <Row label="Active products" value={products.total} />
            <Row label="Shown on website" value={products.onWebsite} />
            <Row label="Hidden / draft" value={products.hidden} />
            <Row label="Without an image" value={products.noImage} tone={products.noImage > 0 ? "bad" : undefined} />
            <Row label="Out of stock" value={products.outOfStock} tone={products.outOfStock > 0 ? "bad" : undefined} />
            <Row label="On discount" value={products.discounted} />
          </ul>
        </Card>

        {/* Customers */}
        <Card title="Customers" href="/admin/customers" cta="View customers →">
          <ul className="space-y-1.5 text-sm">
            {customers.accounts !== null && <Row label="Registered accounts" value={customers.accounts} />}
            {customers.newAccounts !== null && <Row label={`New accounts, last ${days} days`} value={customers.newAccounts} />}
            <Row label="Customers who ordered" value={customers.buyers} />
            <Row label="Repeat customers" value={`${customers.repeat} (${pct(customers.repeatRatePct)})`} />
            <Row label="VIP" value={customers.vip} />
          </ul>
          {customers.top.length > 0 && (
            <div className="mt-3 border-t border-card pt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Top customers</div>
              <ul className="space-y-1 text-sm">
                {customers.top.map((c) => (
                  <li key={c.name} className="flex justify-between gap-3">
                    <span className="truncate text-ink">{c.name}</span>
                    <span className="tabular-nums text-muted">
                      {c.orders} · <span className="font-semibold text-ink">{formatLKR(c.spent)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Profit and margin */}
        {profit && (
          <Card title="Profit & margin">
            <ul className="space-y-1.5 text-sm">
              <Row label="Sales with known cost" value={formatLKR(profit.costedRevenue)} />
              <Row label="Cost of those sales" value={formatLKR(profit.cost)} />
              <Row label="Discounts on those sales" value={formatLKR(profit.discounts)} />
              <Row label="Estimated profit" value={formatLKR(profit.profit)} tone={profit.profit >= 0 ? "good" : "bad"} />
              <Row label="Overall margin" value={pct(profit.marginPct)} />
              <Row label="Website margin" value={pct(profit.online.marginPct)} />
              <Row label="In-store margin" value={pct(profit.pos.marginPct)} />
            </ul>
            {topProfit.length > 0 && (
              <div className="mt-3 border-t border-card pt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Most profitable</div>
                <ul className="space-y-1 text-sm">
                  {topProfit.map((p) => (
                    <li key={p.partId} className="flex justify-between gap-3">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className="tabular-nums font-semibold text-green-700">
                        {formatLKR(p.profit)} <span className="text-xs font-normal text-muted">({pct(p.marginPct)})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {lowMargin.length > 0 && (
              <div className="mt-3 border-t border-card pt-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Lowest margin</div>
                <ul className="space-y-1 text-sm">
                  {lowMargin.map((p) => (
                    <li key={p.partId} className="flex justify-between gap-3">
                      <span className="truncate text-ink">{p.name}</span>
                      <span className={`tabular-nums font-semibold ${p.marginPct < 10 ? "text-error" : "text-ink"}`}>{pct(p.marginPct)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Profit = item sales minus discounts minus cost. Website lines use today&apos;s cost price; in-store lines use the cost recorded at the
              sale. Items with no cost price, delivery fees and tax are left out.
            </p>
          </Card>
        )}

        {/* Suppliers */}
        {admin && (
          <div className={`${cardSurface} overflow-hidden`}>
            <div className="border-b border-card px-5 py-3 font-semibold text-ink">Suppliers</div>
            {suppliers.length === 0 ? (
              <p className="p-5 text-sm text-muted">No suppliers found.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-2 font-semibold">Supplier</th>
                    <th className="px-3 py-2 text-right font-semibold">Products</th>
                    <th className="px-3 py-2 text-right font-semibold">Low</th>
                    <th className="px-5 py-2 text-right font-semibold">Stock value</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-b border-card last:border-0">
                      <td className="px-5 py-2 text-ink">
                        {s.name}
                        {s.unpaid > 0 && <div className="text-xs text-error">Unpaid purchases: {formatLKR(s.unpaid)}</div>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.products}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${s.lowStock > 0 ? "font-semibold text-amber-700" : "text-muted"}`}>{s.lowStock}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{formatLKR(s.stockValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t border-card px-5 py-2.5 text-xs text-muted">
              {suppliers.length} suppliers · purchases in period: {suppliers.reduce((s, x) => s + x.purchases, 0)} ({formatLKR(suppliers.reduce((s, x) => s + x.purchased, 0))})
            </p>
          </div>
        )}

        {/* Discounts and coupons */}
        <Card title="Discounts & coupons" href={admin ? "/admin/coupons" : undefined} cta="Manage coupons →">
          <ul className="space-y-1.5 text-sm">
            <Row label="Active coupons" value={coupons.active} />
            <Row label="Fully used coupons" value={coupons.exhausted} />
            <Row label="Discount given (period)" value={formatLKR(coupons.discountGiven)} />
            <Row label="Orders with a discount" value={coupons.ordersWithDiscount} />
          </ul>
          {coupons.expiringSoon.length > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
              Expiring within 14 days: {coupons.expiringSoon.map((c) => `${c.code} (${shortDate(c.endsAt)})`).join(", ")}
            </p>
          )}
          {coupons.uses.length > 0 && (
            <div className="mt-3 border-t border-card pt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Coupons used</div>
              <ul className="space-y-1 text-sm">
                {coupons.uses.slice(0, 5).map((u) => (
                  <li key={u.code} className="flex justify-between gap-3">
                    <span className="font-mono text-ink">{u.code}</span>
                    <span className="tabular-nums text-muted">
                      {u.orders} orders · <span className="font-semibold text-ink">{formatLKR(u.discount)}</span> off
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Delivery */}
        <Card title="Delivery" href="/admin/orders" cta="Open orders →">
          <ul className="space-y-1.5 text-sm">
            <Row label="Delivery orders" value={`${delivery.delivery.orders} · ${formatLKR(delivery.delivery.revenue)}`} />
            <Row label="Pickup orders" value={`${delivery.pickup.orders} · ${formatLKR(delivery.pickup.revenue)}`} />
            <Row label="Delivered" value={delivery.deliveredCount} />
            <Row label="Average delivery time" value={delivery.avgDeliveryDays === null ? "-" : `${delivery.avgDeliveryDays.toFixed(1)} days`} />
            <Row label="Past estimated date" value={delivery.late} tone={delivery.late > 0 ? "bad" : undefined} />
            <Row label="Failed deliveries" value={delivery.failed} tone={delivery.failed > 0 ? "bad" : undefined} />
          </ul>
          {delivery.awaiting.length > 0 && (
            <div className="mt-3 border-t border-card pt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Oldest undelivered</div>
              <ul className="space-y-1 text-sm">
                {delivery.awaiting.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex justify-between gap-3">
                    <span className="truncate text-ink">
                      #{d.orderNumber} · {d.customer}
                    </span>
                    <span className={`shrink-0 tabular-nums ${d.late ? "font-semibold text-error" : "text-muted"}`}>
                      {ORDER_STATUS_LABEL[d.status as OrderStatus] ?? d.status} · {d.ageDays}d
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Returns */}
        <Card title="Returns (website refunds & cancellations)">
          <ul className="space-y-1.5 text-sm">
            <Row label="Refunded orders" value={returns.refunded} />
            <Row label="Total refunded" value={formatLKR(returns.refundTotal)} />
            <Row label="Refund rate" value={pct(returns.refundRatePct)} />
            <Row label="Cancelled orders" value={returns.cancelled} />
          </ul>
          {returns.recent.length > 0 && (
            <div className="mt-3 border-t border-card pt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Recent refunds</div>
              <ul className="space-y-1 text-sm">
                {returns.recent.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span className="truncate text-ink">
                      #{r.orderNumber}
                      {r.reason && <span className="text-muted"> · {r.reason}</span>}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatLKR(r.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {returns.cancelReasons.length > 0 && (
            <div className="mt-3 border-t border-card pt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Cancellation reasons</div>
              <ul className="space-y-1 text-sm">
                {returns.cancelReasons.map((r) => (
                  <li key={r.reason} className="flex justify-between gap-3">
                    <span className="truncate text-muted">{r.reason}</span>
                    <span className="tabular-nums text-ink">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">In-store returns are not recorded in the POS, so only website refunds are counted here.</p>
        </Card>

        <Card title="Website order status">
          <ul className="space-y-1.5 text-sm">
            {(["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"] as OrderStatus[]).map((s) => (
              <Row key={s} label={ORDER_STATUS_LABEL[s]} value={web.statusCounts[s] ?? 0} />
            ))}
          </ul>
        </Card>

        <Card title="Website payment methods">
          {web.paymentSplit.length === 0 ? (
            <Empty>No orders yet.</Empty>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {web.paymentSplit.map((p) => (
                <li key={p.method} className="flex justify-between">
                  <span className="text-muted">{PAYMENT_LABEL[p.method] ?? p.method}</span>
                  <span className="tabular-nums text-ink">
                    {p.orders} · <span className="font-semibold">{formatLKR(p.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="rounded-lg border border-dashed border-card p-4 text-sm text-muted">
        Visitors, conversion rate, sales funnel and abandoned carts need visit tracking on the website, which isn&apos;t set up yet. Everything
        above is calculated from real orders, POS sales and stock records.
      </p>
    </div>
  );
}
