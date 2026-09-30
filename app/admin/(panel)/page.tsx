import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { getCatalog } from "@/lib/shop/data";
import { COLLECTION_BY_SLUG, isCollectionSlug } from "@/lib/shop/collections";
import { ORDER_STATUS_LABEL, PAYMENT_LABEL, type OrderStatus } from "@/lib/shop/config";
import { formatLKR } from "@/lib/shop/format";
import { percentChange, slDate, summarize, type ItemRow, type OrderRow } from "@/lib/admin/analytics";
import { nowMs } from "@/lib/admin/time";
import { cardSurface } from "@/lib/ui";
import RevenueChart from "@/components/admin/RevenueChart";

const RANGES = [7, 30, 90];

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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;

  const { profile } = await getCurrentUserAndProfile();
  const admin = isAdmin(profile);
  const supabase = await createClient();

  const since = new Date(nowMs() - days * 2 * 86400000).toISOString();
  const [ordersRes, pendingRes, bookingsRes, stockRes, catalog] = await Promise.all([
    supabase
      .from("online_orders")
      .select("*, online_order_items(part_id, name_snapshot, qty, line_total)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("online_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("service_bookings").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase
      .from(admin ? "parts" : "parts_cashier")
      .select("id, name, qty_on_hand, low_stock_threshold, is_active, is_service")
      .eq("is_active", true)
      .eq("is_service", false)
      .order("qty_on_hand", { ascending: true })
      .limit(5000),
    getCatalog().catch(() => null),
  ]);

  if (ordersRes.error) {
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

  type Row = OrderRow & { online_order_items: Omit<ItemRow, "order_id">[] };
  const all = (ordersRes.data ?? []) as Row[];
  const today = slDate(nowMs());
  const cutoff = Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400000;
  const inPeriod = (o: Row) => Date.parse(`${slDate(o.created_at)}T00:00:00Z`) >= cutoff;
  const current = all.filter(inPeriod);
  const previous = all.filter((o) => !inPeriod(o));

  const toItems = (rows: Row[]): ItemRow[] =>
    rows.flatMap((o) => (o.online_order_items ?? []).map((i) => ({ ...i, order_id: o.id })));
  const collectionOf = (partId: string) => catalog?.byId.get(partId)?.collection ?? "other";

  const cur = summarize(current, toItems(current), days, today, collectionOf);
  const prev = summarize(previous, toItems(previous), days, today, collectionOf);

  const lowStock = (stockRes.data ?? []).filter((p) => Number(p.qty_on_hand) <= Number(p.low_stock_threshold));
  const pendingCount = pendingRes.error ? null : (pendingRes.count ?? 0);
  const bookingCount = bookingsRes.error || bookingsRes.count === null ? null : bookingsRes.count;
  const maxCollection = Math.max(1, ...cur.topCollections.map((c) => c.revenue));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-muted mt-1">How the website is performing. Cancelled orders are excluded from revenue.</p>
        </div>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={formatLKR(cur.revenue)} sub={<Delta value={percentChange(cur.revenue, prev.revenue)} />} />
        <Kpi label="Orders" value={String(cur.orders)} sub={<Delta value={percentChange(cur.orders, prev.orders)} />} />
        <Kpi label="Average order value" value={formatLKR(cur.aov)} sub={<Delta value={percentChange(cur.aov, prev.aov)} />} />
        <Kpi label="Paid online" value={formatLKR(cur.paidRevenue)} sub={<span className="text-xs text-muted">Discounts given: {formatLKR(cur.discounts)}</span>} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/admin/orders" className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">Pending orders</div>
          <div className="mt-1 text-2xl font-bold text-ink">{pendingCount ?? "-"}</div>
          <div className="mt-1 text-xs text-accent">Review orders →</div>
        </Link>
        <Link href="/admin/bookings" className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">New service bookings</div>
          <div className="mt-1 text-2xl font-bold text-ink">{bookingCount ?? "-"}</div>
          <div className="mt-1 text-xs text-accent">{bookingCount === null ? "Run migration 0017" : "View bookings →"}</div>
        </Link>
        <Link href={admin ? "/admin/inventory" : "/admin"} className={`${cardSurface} p-5 hover:bg-surface`}>
          <div className="text-sm text-muted">Low or out of stock</div>
          <div className="mt-1 text-2xl font-bold text-ink">{lowStock.length}</div>
          <div className="mt-1 text-xs text-accent">{admin ? "Open inventory →" : "Products at or below their minimum"}</div>
        </Link>
      </div>

      <div className={`${cardSurface} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Revenue, last {days} days</h2>
          <span className="text-xs text-muted">Sri Lanka time</span>
        </div>
        {cur.orders === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No orders in this period yet.</p>
        ) : (
          <RevenueChart data={cur.byDay} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardSurface} overflow-hidden`}>
          <div className="border-b border-card px-5 py-3 font-semibold text-ink">Top products</div>
          {cur.topProducts.length === 0 ? (
            <p className="p-5 text-sm text-muted">No sales yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {cur.topProducts.map((p) => (
                  <tr key={p.partId} className="border-b border-card last:border-0">
                    <td className="px-5 py-2.5 text-ink">{p.name}</td>
                    <td className="px-3 py-2.5 text-right text-muted tabular-nums">{p.qty} sold</td>
                    <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{formatLKR(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={`${cardSurface} p-5`}>
          <h2 className="mb-3 font-semibold text-ink">Category performance</h2>
          {cur.topCollections.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {cur.topCollections.map((c) => (
                <li key={c.collection}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink">
                      {isCollectionSlug(c.collection) ? COLLECTION_BY_SLUG[c.collection].label : "Other"}
                    </span>
                    <span className="font-semibold tabular-nums">{formatLKR(c.revenue)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${(c.revenue / maxCollection) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${cardSurface} p-5`}>
          <h2 className="mb-3 font-semibold text-ink">Order status</h2>
          <ul className="space-y-1.5 text-sm">
            {(["pending", "confirmed", "packed", "dispatched", "delivered", "cancelled"] as OrderStatus[]).map((s) => (
              <li key={s} className="flex justify-between">
                <span className="text-muted">{ORDER_STATUS_LABEL[s]}</span>
                <span className="font-semibold tabular-nums text-ink">{cur.statusCounts[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${cardSurface} p-5`}>
          <h2 className="mb-3 font-semibold text-ink">Payment methods</h2>
          {cur.paymentSplit.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {cur.paymentSplit.map((p) => (
                <li key={p.method} className="flex justify-between">
                  <span className="text-muted">{PAYMENT_LABEL[p.method] ?? p.method}</span>
                  <span className="tabular-nums text-ink">
                    {p.orders} · <span className="font-semibold">{formatLKR(p.revenue)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="rounded-lg border border-dashed border-card p-4 text-sm text-muted">
        Visitors, conversion rate, sales funnel and abandoned carts need visit tracking on the website, which isn&apos;t
        set up yet. Everything above is calculated from real orders.
      </p>
    </div>
  );
}
