import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerOrders } from "@/lib/customer/orders";
import { getPurchasedPartIds } from "@/lib/customer/fitmentHistory";
import { getProducts, findOrder } from "@/lib/shop/data";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/shop/config";
import { formatLKR } from "@/lib/shop/format";
import { getFormatters } from "@/lib/shop/siteSettings";
import type { Formatters } from "@/lib/shop/datetime";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { PhoneIcon, SearchIcon } from "@/components/shop/Icons";
import ProductCard from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "My Orders", robots: { index: false } };

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";

const BADGE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  packed: "bg-indigo-100 text-indigo-800",
  dispatched: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-slate-200 text-slate-600",
};

function OrderRow({ fmt, order }: { fmt: Formatters; order: { orderNumber: string; publicToken: string; status: OrderStatus; total: number; itemCount: number; createdAt: string } }) {
  return (
    <Link
      href={`/order/${order.publicToken}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-charcoal/10 bg-white p-4 hover:border-charcoal/30"
    >
      <div>
        <p className="font-bold text-charcoal">#{order.orderNumber}</p>
        <p className="text-xs text-charcoal/55">
          {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {fmt.date(order.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        <span className="font-bold tabular-nums text-charcoal">{formatLKR(order.total)}</span>
      </div>
    </Link>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ order?: string; phone?: string }> }) {
  const [customer, { order, phone }] = await Promise.all([getCurrentCustomer(), searchParams]);
  if (!customer) redirect("/account");
  const fmt = await getFormatters();

  const [{ current, history }, purchasedIds] = await Promise.all([getCustomerOrders(customer.id), getPurchasedPartIds(customer.id)]);
  const buyAgain = await getProducts(purchasedIds);

  let trackError: string | null = null;
  if (order && phone) {
    const h = await headers();
    if (!rateLimit(`track:${clientIp(h)}`, 10, 10 * 60_000)) {
      trackError = "Too many attempts. Please wait a few minutes and try again.";
    } else {
      const found = await findOrder(order, phone);
      if (found) redirect(`/order/${found.token}`);
      trackError = "We couldn't find an order matching those details. Check the order number and the phone number you used at checkout.";
    }
  }

  return (
    <div className="space-y-6">
      {buyAgain.length > 0 && (
        <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-charcoal">Buy again</h2>
          <p className="mt-1 text-sm text-charcoal/60">Products you&apos;ve ordered before.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {buyAgain.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Current orders</h2>
        <p className="mt-1 text-sm text-charcoal/60">Orders that haven&apos;t been delivered yet.</p>
        <div className="mt-4 space-y-3">
          {current.length === 0 ? <p className="text-sm text-charcoal/55">No orders in progress.</p> : current.map((o) => <OrderRow key={o.id} order={o} fmt={fmt} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Order history</h2>
        <p className="mt-1 text-sm text-charcoal/60">Delivered and cancelled orders.</p>
        <div className="mt-4 space-y-3">
          {history.length === 0 ? <p className="text-sm text-charcoal/55">No past orders yet.</p> : history.map((o) => <OrderRow key={o.id} order={o} fmt={fmt} />)}
        </div>
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Track an order</h2>
        <p className="mt-1 text-sm text-charcoal/60">Enter an order number and phone number — useful for an order placed as a guest.</p>

        {trackError && (
          <div role="alert" className="mt-4 rounded-xl border border-deal/30 bg-deal-soft p-4 text-sm font-semibold text-charcoal">
            {trackError}
          </div>
        )}

        <form method="get" className="mt-4 space-y-4 rounded-2xl border border-charcoal/10 bg-surface p-5">
          <div>
            <label htmlFor="order" className="mb-1 block text-sm font-bold text-charcoal">
              Order number
            </label>
            <input id="order" name="order" required placeholder="AH10245" defaultValue={order} className={field} />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-bold text-charcoal">
              Phone number
            </label>
            <input id="phone" name="phone" type="tel" required placeholder="077 123 4567" defaultValue={phone} className={field} />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover"
          >
            <SearchIcon width={17} height={17} /> Track order
          </button>
        </form>

        <p className="mt-4 flex items-start gap-2 text-sm text-charcoal/60">
          <PhoneIcon width={16} height={16} className="mt-0.5 shrink-0" />
          <span>
            Need help?{" "}
            <Link href="/contact" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
              Contact us
            </Link>{" "}
            and quote your order number.
          </span>
        </p>
      </section>
    </div>
  );
}
