import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShopInfo } from "@/lib/shop/data";
import { PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/shop/config";
import { formatDate, formatLKR } from "@/lib/shop/format";
import PrintButton from "@/components/admin/PrintButton";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: order }, shop] = await Promise.all([
    supabase
      .from("online_orders")
      .select("*, online_order_items(name_snapshot, qty, unit_price, line_total)")
      .eq("id", id)
      .maybeSingle(),
    getShopInfo(),
  ]);
  if (!order) notFound();

  const items = (order.online_order_items ?? []) as { name_snapshot: string; qty: number; unit_price: number; line_total: number }[];
  const address = [order.address_line, order.city, order.district].filter(Boolean).join(", ");
  const discount = Number(order.discount ?? 0);

  return (
    <div className="p-6 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-card bg-white p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-card pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">{shop.name}</h1>
            <p className="mt-1 text-sm text-muted">{shop.address}</p>
            <p className="text-sm text-muted">Tel: {shop.phone}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted">Invoice</div>
            <div className="text-xl font-bold text-ink">#{order.order_number}</div>
            <div className="text-sm text-muted">{formatDate(order.created_at)}</div>
          </div>
        </div>

        <div className="grid gap-6 py-6 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</div>
            <div className="mt-1 font-semibold text-ink">{order.customer_name}</div>
            <div className="text-muted">{order.customer_phone}</div>
            {order.customer_email && <div className="text-muted">{order.customer_email}</div>}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {order.fulfilment === "delivery" ? "Deliver to" : "Pickup"}
            </div>
            <div className="mt-1 text-ink">{order.fulfilment === "delivery" ? address : shop.pickupLocation}</div>
            {order.tracking_number && (
              <div className="mt-1 text-muted">
                {order.courier ?? "Courier"}: {order.tracking_number}
              </div>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Price</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx} className="border-b border-card">
                <td className="py-2 text-ink">{i.name_snapshot}</td>
                <td className="py-2 text-right tabular-nums">{formatLKR(Number(i.unit_price))}</td>
                <td className="py-2 text-right tabular-nums">{Number(i.qty)}</td>
                <td className="py-2 text-right tabular-nums">{formatLKR(Number(i.line_total))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatLKR(Number(order.subtotal))}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted">Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd className="tabular-nums">- {formatLKR(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="tabular-nums">{Number(order.delivery_fee) ? formatLKR(Number(order.delivery_fee)) : "Free"}</dd>
          </div>
          <div className="flex justify-between border-t border-card pt-2 text-base font-bold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatLKR(Number(order.total))}</dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-card pt-4 text-sm text-muted">
          <p>
            Payment: {PAYMENT_LABEL[order.payment_method] ?? order.payment_method}
            {order.payment_status ? ` · ${PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}` : ""}
          </p>
          {order.notes && <p className="mt-1">Note: {order.notes}</p>}
          <p className="mt-4 text-center">Thank you for shopping with {shop.name}.</p>
        </div>
      </div>
    </div>
  );
}
