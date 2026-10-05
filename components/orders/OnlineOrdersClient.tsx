"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardSurface } from "@/lib/ui";
import { formatDateTime, formatLKR } from "@/lib/shop/format";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus } from "@/lib/shop/config";
import { toWhatsAppNumber, waLink } from "@/lib/shop/whatsapp";
import { notifyOrderEvent, type OrderEvent } from "@/app/admin/(panel)/orders/actions";

export type AddressSnapshot = {
  recipientName: string;
  companyName: string | null;
  mobile: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  province: string | null;
  postalCode: string | null;
  deliveryInstructions: string | null;
};

export type OnlineOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_account_id?: string | null;
  fulfilment: "delivery" | "pickup";
  delivery_zone: string | null;
  address_line: string | null;
  city: string | null;
  district: string | null;
  notes: string | null;
  payment_method: string;
  payment_status?: string;
  payment_reference?: string | null;
  discount?: number;
  coupon_code?: string | null;
  courier?: string | null;
  tracking_number?: string | null;
  subtotal: number;
  delivery_fee: number;
  tax_amount?: number;
  total: number;
  status: OrderStatus;
  fulfillment_status?: string;
  shipping_status?: string;
  billing_address?: AddressSnapshot | null;
  shipping_address?: AddressSnapshot | null;
  loyalty_points_used?: number;
  loyalty_points_earned?: number;
  estimated_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  cancellation_reason?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  created_at: string;
  online_order_items: { name_snapshot: string; sku_snapshot?: string | null; qty: number; unit_price: number; line_total: number }[];
  online_payments?: PaymentRecord[];
};

export type PaymentRecord = {
  id: string;
  payment_provider: string;
  transaction_id: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_date: string | null;
  refund_status: string;
  refund_amount: number | null;
};

const FULFILLMENT_STATUSES = ["unfulfilled", "partially_fulfilled", "fulfilled"] as const;
const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  unfulfilled: "Unfulfilled",
  partially_fulfilled: "Partially fulfilled",
  fulfilled: "Fulfilled",
};

const SHIPPING_STATUSES = ["not_shipped", "shipped", "in_transit", "delivered", "failed"] as const;
const SHIPPING_STATUS_LABEL: Record<string, string> = {
  not_shipped: "Not shipped",
  shipped: "Shipped",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Failed",
};

function formatAddress(a: AddressSnapshot | null | undefined): string {
  if (!a) return "";
  return [
    a.companyName,
    a.addressLine1,
    a.addressLine2,
    [a.city, a.district].filter(Boolean).join(", "),
    a.province ? `${a.province} Province` : null,
    a.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

const FILTERS: (OrderStatus | "all")[] = ["all", ...ORDER_STATUSES, "cancelled"];

const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "confirmed", label: "Confirm order" },
  confirmed: { to: "packed", label: "Mark packed" },
  packed: { to: "dispatched", label: "Mark dispatched" },
  dispatched: { to: "delivered", label: "Mark delivered" },
};

const BADGE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  packed: "bg-indigo-100 text-indigo-800",
  dispatched: "bg-violet-100 text-violet-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-slate-200 text-slate-600",
};

export default function OnlineOrdersClient({ orders }: { orders: OnlineOrder[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // Emails the customer about what just changed; the server decides what (if anything) to send.
  async function notify(orderId: string, event: OrderEvent) {
    setNotice(null);
    const result = await notifyOrderEvent(orderId, event);
    if (result.message) setNotice({ ok: result.ok, text: result.message });
  }

  async function setPayment(order: OnlineOrder, status: string) {
    setBusyId(order.id);
    setError(null);
    const { error } = await supabase.rpc("set_online_order_payment", { p_order_id: order.id, p_status: status });
    if (error) {
      setBusyId(null);
      setError(error.message);
      return;
    }
    await notify(order.id, "payment");
    setBusyId(null);
    router.refresh();
  }

  async function setStatus(order: OnlineOrder, status: OrderStatus) {
    setBusyId(order.id);
    setError(null);
    const { error } = await supabase.rpc("set_online_order_status", { p_order_id: order.id, p_status: status });
    if (error) {
      setBusyId(null);
      setError(error.message);
      return;
    }
    await notify(order.id, "status");
    setBusyId(null);
    router.refresh();
  }

  async function setTrackingField(order: OnlineOrder, field: "fulfillment_status" | "shipping_status", value: string) {
    setBusyId(order.id);
    setError(null);
    const { error } = await supabase
      .from("online_orders")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Online Orders</h1>
        <p className="text-sm text-muted mt-1">
          Orders placed on the website. Stock is deducted when an order is confirmed and restored if it is cancelled.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f
                ? "border-primary bg-primary text-white"
                : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
            }`}
          >
            {f === "all" ? "All" : ORDER_STATUS_LABEL[f]} <span className="opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`rounded-lg border p-3 text-sm ${notice.ok ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          {notice.text}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={`${cardSurface} p-10 text-center text-sm text-muted`}>No orders here yet.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((o) => {
            const open = openId === o.id;
            const step = NEXT_STEP[o.status];
            const wa = toWhatsAppNumber(o.customer_phone);
            return (
              <div key={o.id} className={`${cardSurface} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : o.id)}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left hover:bg-surface"
                >
                  <span className="font-bold text-ink">#{o.order_number}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                  <span className="text-sm text-ink">{o.customer_name}</span>
                  <span className="text-sm text-muted">
                    {o.online_order_items.length} item{o.online_order_items.length === 1 ? "" : "s"} ·{" "}
                    {PAYMENT_LABEL[o.payment_method] ?? o.payment_method} · {o.fulfilment}
                  </span>
                  {o.payment_status && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        o.payment_status === "paid" ? "bg-green-100 text-green-800" : o.payment_status === "failed" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                    </span>
                  )}
                  {o.fulfillment_status && o.fulfillment_status !== "unfulfilled" && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {FULFILLMENT_STATUS_LABEL[o.fulfillment_status] ?? o.fulfillment_status}
                    </span>
                  )}
                  <span className="ml-auto text-sm text-muted">{formatDateTime(o.created_at)}</span>
                  <span className="font-bold tabular-nums text-ink">{formatLKR(Number(o.total))}</span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-card px-5 py-4">
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</div>
                        <div className="mt-1 text-ink">{o.customer_name}</div>
                        <div className="flex flex-wrap gap-3 text-accent">
                          <a href={`tel:${o.customer_phone}`} className="hover:underline">
                            {o.customer_phone}
                          </a>
                          {wa && (
                            <a
                              href={waLink(wa, `Hi ${o.customer_name}, this is Amil Auto Hub about your order #${o.order_number}.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                        {o.customer_email && <div className="text-muted">{o.customer_email}</div>}
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {o.fulfilment === "delivery" ? "Shipping address" : "Pickup"}
                        </div>
                        <div className="mt-1 text-ink">
                          {o.fulfilment === "delivery"
                            ? formatAddress(o.shipping_address) || [o.address_line, o.city, o.district].filter(Boolean).join(", ")
                            : "Amil Auto Hub - Kottawa"}
                        </div>
                        {o.delivery_zone && <div className="text-muted">Zone: {o.delivery_zone}</div>}
                      </div>
                    </div>

                    {o.fulfilment === "delivery" && o.billing_address && (
                      <div className="text-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Billing address</div>
                        <div className="mt-1 text-ink">
                          {JSON.stringify(o.billing_address) === JSON.stringify(o.shipping_address) ? "Same as shipping address" : formatAddress(o.billing_address)}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                      <span className="font-mono">Order ID: {o.id}</span>
                      {o.customer_account_id ? (
                        <Link href={`/admin/customers/${o.customer_account_id}`} className="font-mono text-accent hover:underline">
                          Customer ID: {o.customer_account_id}
                        </Link>
                      ) : (
                        <span>Guest checkout</span>
                      )}
                    </div>

                    {o.notes && (
                      <div className="rounded-lg bg-surface p-3 text-sm text-ink">
                        <span className="font-semibold">Customer note: </span>
                        {o.notes}
                      </div>
                    )}

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted">
                          <th className="py-1 font-semibold">Item</th>
                          <th className="py-1 font-semibold">SKU</th>
                          <th className="py-1 text-right font-semibold">Price</th>
                          <th className="py-1 text-right font-semibold">Qty</th>
                          <th className="py-1 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.online_order_items.map((i, idx) => (
                          <tr key={idx} className="border-t border-card">
                            <td className="py-1.5 text-ink">{i.name_snapshot}</td>
                            <td className="py-1.5 text-muted">{i.sku_snapshot ?? "-"}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(i.unit_price))}</td>
                            <td className="py-1.5 text-right tabular-nums">{Number(i.qty)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(i.line_total))}</td>
                          </tr>
                        ))}
                        {Number(o.discount ?? 0) > 0 && (
                          <tr className="border-t border-card">
                            <td colSpan={4} className="py-1.5 text-right text-muted">
                              Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-green-700">- {formatLKR(Number(o.discount))}</td>
                          </tr>
                        )}
                        <tr className="border-t border-card">
                          <td colSpan={4} className="py-1.5 text-right text-muted">
                            Delivery
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(o.delivery_fee))}</td>
                        </tr>
                        {Number(o.tax_amount ?? 0) > 0 && (
                          <tr className="border-t border-card">
                            <td colSpan={4} className="py-1.5 text-right text-muted">
                              Tax
                            </td>
                            <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(o.tax_amount))}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={4} className="py-1.5 text-right font-bold text-ink">
                            Total
                          </td>
                          <td className="py-1.5 text-right font-bold tabular-nums text-ink">{formatLKR(Number(o.total))}</td>
                        </tr>
                        {(Number(o.loyalty_points_earned ?? 0) > 0 || Number(o.loyalty_points_used ?? 0) > 0) && (
                          <tr className="border-t border-card text-xs text-muted">
                            <td colSpan={5} className="py-1.5 text-right">
                              {Number(o.loyalty_points_used ?? 0) > 0 && <span>{o.loyalty_points_used} loyalty points used</span>}
                              {Number(o.loyalty_points_used ?? 0) > 0 && Number(o.loyalty_points_earned ?? 0) > 0 && " · "}
                              {Number(o.loyalty_points_earned ?? 0) > 0 && <span>{o.loyalty_points_earned} loyalty points earned</span>}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {o.online_payments && o.online_payments.length > 0 && (
                      <div className="overflow-x-auto rounded-lg border border-card">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-surface text-left uppercase tracking-wide text-muted">
                              <th className="px-3 py-2 font-semibold">Provider</th>
                              <th className="px-3 py-2 font-semibold">Transaction ID</th>
                              <th className="px-3 py-2 font-semibold">Status</th>
                              <th className="px-3 py-2 text-right font-semibold">Amount</th>
                              <th className="px-3 py-2 font-semibold">Date</th>
                              <th className="px-3 py-2 font-semibold">Refund</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.online_payments.map((p) => (
                              <tr key={p.id} className="border-t border-card">
                                <td className="px-3 py-2 text-ink">{PAYMENT_LABEL[p.payment_provider] ?? p.payment_provider}</td>
                                <td className="px-3 py-2 font-mono text-muted">{p.transaction_id ?? "-"}</td>
                                <td className="px-3 py-2 text-ink">{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {p.currency} {formatLKR(Number(p.amount)).replace("Rs.", "").trim()}
                                </td>
                                <td className="px-3 py-2 text-muted">{p.payment_date ? formatDateTime(p.payment_date) : "-"}</td>
                                <td className="px-3 py-2 text-muted">
                                  {p.refund_status !== "none" ? `${p.refund_status} ${p.refund_amount ? `(${formatLKR(Number(p.refund_amount))})` : ""}` : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-4 rounded-lg bg-surface p-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Fulfillment status</label>
                        <select
                          value={o.fulfillment_status ?? "unfulfilled"}
                          disabled={busyId === o.id}
                          onChange={(e) => setTrackingField(o, "fulfillment_status", e.target.value)}
                          className="mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light"
                        >
                          {FULFILLMENT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {FULFILLMENT_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Shipping status</label>
                        <select
                          value={o.shipping_status ?? "not_shipped"}
                          disabled={busyId === o.id}
                          onChange={(e) => setTrackingField(o, "shipping_status", e.target.value)}
                          className="mt-1 rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light"
                        >
                          {SHIPPING_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {SHIPPING_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {o.fulfilment === "delivery" && "courier" in o && (
                      <ShippingEditor
                        order={o}
                        onError={setError}
                        onSaved={async (trackingChanged) => {
                          if (trackingChanged) await notify(o.id, "tracking");
                          router.refresh();
                        }}
                      />
                    )}

                    {o.status === "cancelled" && <CancellationEditor order={o} onError={setError} onSaved={() => router.refresh()} />}

                    {o.payment_status === "refunded" && (
                      <RefundEditor
                        order={o}
                        onError={setError}
                        onSaved={async () => {
                          await notify(o.id, "refund");
                          router.refresh();
                        }}
                      />
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/orders/${o.id}/invoice`}
                        target="_blank"
                        className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface"
                      >
                        Print invoice
                      </Link>
                      <button
                        disabled={busyId === o.id}
                        onClick={async () => {
                          setBusyId(o.id);
                          await notify(o.id, "invoice");
                          setBusyId(null);
                        }}
                        className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                      >
                        Email invoice to customer
                      </button>
                      {step && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => setStatus(o, step.to)}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
                        >
                          {busyId === o.id ? "Saving…" : step.label}
                        </button>
                      )}
                      {o.status !== "delivered" && o.status !== "cancelled" && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => {
                            if (window.confirm(`Cancel order #${o.order_number}?`)) void setStatus(o, "cancelled");
                          }}
                          className="rounded-lg border border-error/30 px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-light disabled:opacity-60"
                        >
                          Cancel order
                        </button>
                      )}
                      {o.payment_status && o.payment_status !== "paid" && o.status !== "cancelled" && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => setPayment(o, "paid")}
                          className="rounded-lg border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
                        >
                          Mark as paid
                        </button>
                      )}
                      {o.payment_status === "paid" && o.status !== "cancelled" && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => setPayment(o, "unpaid")}
                          className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                        >
                          Mark unpaid
                        </button>
                      )}
                      {o.payment_status === "paid" && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => {
                            if (window.confirm(`Mark order #${o.order_number} as refunded?`)) void setPayment(o, "refunded");
                          }}
                          className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                        >
                          Mark as refunded
                        </button>
                      )}
                      {o.status === "cancelled" && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => setStatus(o, "pending")}
                          className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                        >
                          Reopen as pending
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShippingEditor({
  order,
  onError,
  onSaved,
}: {
  order: OnlineOrder;
  onError: (message: string | null) => void;
  onSaved: (trackingChanged?: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [estimated, setEstimated] = useState(order.estimated_delivery_date ?? "");
  const [actual, setActual] = useState(order.actual_delivery_date ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    courier !== (order.courier ?? "") ||
    tracking !== (order.tracking_number ?? "") ||
    estimated !== (order.estimated_delivery_date ?? "") ||
    actual !== (order.actual_delivery_date ?? "");

  async function save() {
    setSaving(true);
    onError(null);
    const trackingChanged = courier.trim() !== (order.courier ?? "") || tracking.trim() !== (order.tracking_number ?? "");
    const { error } = await supabase
      .from("online_orders")
      .update({
        courier: courier.trim() || null,
        tracking_number: tracking.trim() || null,
        estimated_delivery_date: estimated || null,
        actual_delivery_date: actual || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    setSaving(false);
    if (error) onError(error.message);
    else onSaved(trackingChanged);
  }

  const input =
    "rounded-lg border border-input bg-surface px-3 py-2 text-sm text-ink placeholder:text-placeholder focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light";
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface p-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Courier</label>
        <input list="couriers" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Domex" className={`${input} mt-1 w-40`} />
        <datalist id="couriers">
          <option value="Domex" />
          <option value="Pronto" />
          <option value="Koombiyo" />
          <option value="Sri Lanka Post" />
          <option value="Own delivery" />
        </datalist>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Tracking number</label>
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={`${input} mt-1 w-52`} />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Estimated delivery</label>
        <input type="date" value={estimated} onChange={(e) => setEstimated(e.target.value)} className={`${input} mt-1`} />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Actual delivery</label>
        <input type="date" value={actual} onChange={(e) => setActual(e.target.value)} className={`${input} mt-1`} />
      </div>
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save shipping"}
      </button>
      <span className="pb-2 text-xs text-muted">Customers see this on their order page.</span>
    </div>
  );
}

function CancellationEditor({
  order,
  onError,
  onSaved,
}: {
  order: OnlineOrder;
  onError: (message: string | null) => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reason, setReason] = useState(order.cancellation_reason ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = reason !== (order.cancellation_reason ?? "");

  async function save() {
    setSaving(true);
    onError(null);
    const { error } = await supabase
      .from("online_orders")
      .update({ cancellation_reason: reason.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    setSaving(false);
    if (error) onError(error.message);
    else onSaved();
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-error-light p-3">
      <div className="min-w-[16rem] flex-1">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Cancellation reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Out of stock, customer requested"
          className="mt-1 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink placeholder:text-placeholder focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light"
        />
      </div>
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function RefundEditor({
  order,
  onError,
  onSaved,
}: {
  order: OnlineOrder;
  onError: (message: string | null) => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [amount, setAmount] = useState(order.refund_amount != null ? String(order.refund_amount) : "");
  const [reason, setReason] = useState(order.refund_reason ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = amount !== (order.refund_amount != null ? String(order.refund_amount) : "") || reason !== (order.refund_reason ?? "");

  async function save() {
    const parsed = amount.trim() ? Number(amount) : null;
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) {
      onError("Please enter a valid refund amount.");
      return;
    }
    setSaving(true);
    onError(null);
    const { error } = await supabase.rpc("set_online_order_refund", {
      p_order_id: order.id,
      p_refund_amount: parsed,
      p_refund_reason: reason.trim() || null,
    });
    setSaving(false);
    if (error) onError(error.message);
    else onSaved();
  }

  const input =
    "rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink placeholder:text-placeholder focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light";
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-amber-50 p-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Refund amount</label>
        <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${input} mt-1 w-32`} />
      </div>
      <div className="min-w-[16rem] flex-1">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Refund reason</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${input} mt-1 w-full`} />
      </div>
      {order.refunded_at && <span className="pb-2 text-xs text-muted">Refunded {formatDateTime(order.refunded_at)}</span>}
      <button
        onClick={save}
        disabled={!dirty || saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save refund"}
      </button>
    </div>
  );
}
