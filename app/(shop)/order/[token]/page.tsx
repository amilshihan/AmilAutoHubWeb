import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken, getShopInfo } from "@/lib/shop/data";
import { getStoreSettings } from "@/lib/shop/settings";
import { buildPayhereCheckout } from "@/lib/shop/payhere";
import { siteUrl } from "@/lib/site";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
} from "@/lib/shop/config";
import { formatDate, formatDateTime } from "@/lib/shop/format";
import { waLink } from "@/lib/shop/whatsapp";
import { CheckIcon, WhatsAppIcon } from "@/components/shop/Icons";
import Money from "@/components/shop/Money";
import CurrencyNotice from "@/components/shop/CurrencyNotice";

export const metadata: Metadata = { title: "Your Order", robots: { index: false, follow: false } };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const [{ token }, { payment }] = await Promise.all([params, searchParams]);
  const [order, shop, settings] = await Promise.all([getOrderByToken(token), getShopInfo(), getStoreSettings()]);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const cancelled = status === "cancelled";
  const currentIdx = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);
  const zone = settings.deliveryZones.find((z) => z.id === order.deliveryZone);
  const paid = order.paymentStatus === "paid";

  const payhere =
    order.paymentMethod === "payhere" && !paid && !cancelled
      ? buildPayhereCheckout(
          {
            orderNumber: order.orderNumber,
            total: order.total,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            address: order.address ?? "",
            city: order.city,
            itemsSummary: order.items.map((i) => `${i.qty} x ${i.name}`).join(", "),
            token: order.token,
          },
          await siteUrl(),
          settings.payhereSandbox
        )
      : null;

  const showBank = order.paymentMethod === "bank_transfer" && !paid && !cancelled;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stock text-white">
          <CheckIcon width={28} height={28} />
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-charcoal">
          {cancelled ? "Order cancelled" : "Thank you for your order"}
        </h1>
        <p className="mt-1 text-charcoal/65">
          Order <span className="font-extrabold text-charcoal">#{order.orderNumber}</span> · {formatDateTime(order.createdAt)}
        </p>
        {!cancelled && status === "pending" && (
          <p className="mx-auto mt-3 max-w-md text-sm text-charcoal/65">
            We&apos;ve received your order. Our team will confirm it shortly, usually by phone or WhatsApp.
          </p>
        )}
      </div>

      {payment === "return" && !paid && (
        <p role="status" className="mt-6 rounded-xl border border-amil bg-amil-soft p-4 text-center text-sm font-semibold text-charcoal">
          Thanks! We&apos;re waiting for confirmation from the payment provider. This page will show &quot;Paid&quot; once it arrives; refresh in a moment.
        </p>
      )}
      {payment === "cancelled" && !paid && (
        <p role="alert" className="mt-6 rounded-xl border border-deal/30 bg-deal-soft p-4 text-center text-sm font-semibold text-charcoal">
          The payment was cancelled. You can try again below.
        </p>
      )}

      {payhere && (
        <section className="mt-6 rounded-2xl border-2 border-charcoal bg-amil-soft p-5 text-center">
          <h2 className="text-lg font-extrabold text-charcoal">
            Pay <Money amount={order.total} /> online
          </h2>
          <p className="mt-1 text-sm text-charcoal/70">You&apos;ll be taken to PayHere&apos;s secure page to pay by card or bank app.</p>
          <form action={payhere.action} method="post" className="mt-4">
            {Object.entries(payhere.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              className="rounded-lg bg-charcoal px-8 py-3 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-charcoal-soft"
            >
              Pay now
            </button>
          </form>
        </section>
      )}

      {showBank && (
        <section className="mt-6 rounded-2xl border-2 border-charcoal bg-amil-soft p-5">
          <h2 className="text-lg font-extrabold text-charcoal">Pay by bank transfer</h2>
          <p className="mt-1 text-sm text-charcoal/70">
            Transfer <Money amount={order.total} /> using <span className="font-bold">{order.orderNumber}</span> as the reference, then send us the slip.
          </p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-charcoal/60">Bank</dt>
            <dd className="font-semibold">{settings.bankTransfer.bankName}</dd>
            <dt className="text-charcoal/60">Account name</dt>
            <dd className="font-semibold">{settings.bankTransfer.accountName}</dd>
            <dt className="text-charcoal/60">Account no.</dt>
            <dd className="font-semibold tabular-nums">{settings.bankTransfer.accountNumber}</dd>
            {settings.bankTransfer.branch && (
              <>
                <dt className="text-charcoal/60">Branch</dt>
                <dd className="font-semibold">{settings.bankTransfer.branch}</dd>
              </>
            )}
          </dl>
          {settings.bankTransfer.instructions && (
            <p className="mt-3 whitespace-pre-line text-sm text-charcoal/70">{settings.bankTransfer.instructions}</p>
          )}
          <a
            href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I've paid for order #${order.orderNumber}. Here is my bank slip.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-wa px-5 py-2.5 text-sm font-bold text-white hover:bg-wa-hover"
          >
            <WhatsAppIcon width={17} height={17} /> Send slip on WhatsApp
          </a>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-charcoal/10 p-5 sm:p-6" aria-label="Order status">
        {cancelled ? (
          <p className="text-center font-semibold text-deal">This order was cancelled.</p>
        ) : (
          <ol className="flex items-start justify-between">
            {ORDER_STATUSES.map((s, i) => {
              const done = i <= currentIdx;
              return (
                <li key={s} className="relative flex flex-1 flex-col items-center gap-2 text-center">
                  {i > 0 && (
                    <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= currentIdx ? "bg-stock" : "bg-charcoal/15"}`} />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-stock text-white" : "bg-charcoal/10 text-charcoal/45"
                    }`}
                  >
                    {done ? <CheckIcon width={16} height={16} /> : i + 1}
                  </span>
                  <span className={`text-[11px] font-bold sm:text-xs ${done ? "text-charcoal" : "text-charcoal/45"}`}>
                    {ORDER_STATUS_LABEL[s]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-charcoal/10 p-5">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-charcoal/55">
            {order.fulfilment === "delivery" ? "Delivery" : "Pickup"}
          </h2>
          <p className="font-semibold text-charcoal">{order.customerName}</p>
          <p className="text-sm text-charcoal/70">{order.customerPhone}</p>
          <p className="mt-2 text-sm text-charcoal/70">
            {order.fulfilment === "delivery" ? order.address : shop.pickupLocation}
          </p>
          {zone && (
            <p className="mt-1 text-sm text-charcoal/55">
              {zone.label} · {zone.eta}
            </p>
          )}
          {(order.courier || order.trackingNumber) && (
            <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-charcoal">
              <span className="font-bold">Courier:</span> {order.courier ?? "-"}
              {order.trackingNumber && (
                <>
                  <br />
                  <span className="font-bold">Tracking no.:</span> {order.trackingNumber}
                </>
              )}
            </p>
          )}
          {(order.estimatedDeliveryDate || order.actualDeliveryDate) && (
            <p className="mt-2 text-sm text-charcoal/70">
              {order.actualDeliveryDate
                ? `Delivered ${formatDate(order.actualDeliveryDate)}`
                : order.estimatedDeliveryDate
                  ? `Estimated delivery ${formatDate(order.estimatedDeliveryDate)}`
                  : null}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-charcoal/10 p-5">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-charcoal/55">Payment</h2>
          <p className="font-semibold text-charcoal">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          <p className={`mt-1 text-sm font-semibold ${paid ? "text-stock" : "text-charcoal/70"}`}>
            {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
          </p>
          {order.paymentMethod === "cod" && (
            <p className="mt-1 text-sm text-charcoal/70">
              Please have <Money amount={order.total} /> ready.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-charcoal/10">
        <h2 className="border-b border-charcoal/10 px-5 py-3 text-sm font-extrabold uppercase tracking-wider text-charcoal/55">
          Items
        </h2>
        <ul className="divide-y divide-charcoal/10">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <span>
                {i.qty} × {i.name}
                {i.sku && <span className="text-charcoal/50"> ({i.sku})</span>}
              </span>
              <Money amount={i.lineTotal} className="shrink-0 font-semibold tabular-nums" />
            </li>
          ))}
        </ul>
        <div className="space-y-1.5 border-t border-charcoal/10 px-5 py-4 text-sm">
          <div className="flex justify-between">
            <span className="text-charcoal/65">Subtotal</span>
            <Money amount={order.subtotal} className="tabular-nums" />
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-stock">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span className="tabular-nums">
                - <Money amount={order.discount} />
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-charcoal/65">Delivery</span>
            {order.deliveryFee ? <Money amount={order.deliveryFee} className="tabular-nums" /> : <span className="tabular-nums">Free</span>}
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-charcoal/65">Tax</span>
              <Money amount={order.taxAmount} className="tabular-nums" />
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-extrabold">
            <span>Total</span>
            <Money amount={order.total} className="tabular-nums" />
          </div>
        </div>
        {order.loyaltyPointsEarned > 0 && (
          <div className="border-t border-charcoal/10 px-5 py-3 text-sm text-charcoal/65">You earned {order.loyaltyPointsEarned} loyalty points with this order.</div>
        )}
        <div className="border-t border-charcoal/10 px-5 py-3">
          <CurrencyNotice />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I'm asking about my order #${order.orderNumber}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-wa px-5 py-3 text-sm font-bold text-white hover:bg-wa-hover"
        >
          <WhatsAppIcon width={18} height={18} /> Message us about this order
        </a>
        <Link href="/shop" className="inline-flex rounded-lg border border-charcoal/20 px-5 py-3 text-sm font-bold text-charcoal hover:bg-charcoal/5">
          Continue shopping
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-charcoal/50">
        Bookmark this page to check your order status any time, or use Track my order with your order number and phone.
      </p>
    </div>
  );
}
