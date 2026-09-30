"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardSurface } from "@/lib/ui";
import { formatDateTime, formatLKR } from "@/lib/shop/format";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus } from "@/lib/shop/config";
import { toWhatsAppNumber, waLink } from "@/lib/shop/whatsapp";

export type OnlineOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
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
  total: number;
  status: OrderStatus;
  created_at: string;
  online_order_items: { name_snapshot: string; qty: number; unit_price: number; line_total: number }[];
};

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  async function setPayment(order: OnlineOrder, status: string) {
    setBusyId(order.id);
    setError(null);
    const { error } = await supabase.rpc("set_online_order_payment", { p_order_id: order.id, p_status: status });
    setBusyId(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  async function setStatus(order: OnlineOrder, status: OrderStatus) {
    setBusyId(order.id);
    setError(null);
    const { error } = await supabase.rpc("set_online_order_status", { p_order_id: order.id, p_status: status });
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
                          {o.fulfilment === "delivery" ? "Deliver to" : "Pickup"}
                        </div>
                        <div className="mt-1 text-ink">
                          {o.fulfilment === "delivery"
                            ? [o.address_line, o.city, o.district].filter(Boolean).join(", ")
                            : "Amil Auto Hub - Kottawa"}
                        </div>
                        {o.delivery_zone && <div className="text-muted">Zone: {o.delivery_zone}</div>}
                      </div>
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
                          <th className="py-1 text-right font-semibold">Price</th>
                          <th className="py-1 text-right font-semibold">Qty</th>
                          <th className="py-1 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.online_order_items.map((i, idx) => (
                          <tr key={idx} className="border-t border-card">
                            <td className="py-1.5 text-ink">{i.name_snapshot}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(i.unit_price))}</td>
                            <td className="py-1.5 text-right tabular-nums">{Number(i.qty)}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(i.line_total))}</td>
                          </tr>
                        ))}
                        {Number(o.discount ?? 0) > 0 && (
                          <tr className="border-t border-card">
                            <td colSpan={3} className="py-1.5 text-right text-muted">
                              Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-green-700">- {formatLKR(Number(o.discount))}</td>
                          </tr>
                        )}
                        <tr className="border-t border-card">
                          <td colSpan={3} className="py-1.5 text-right text-muted">
                            Delivery
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{formatLKR(Number(o.delivery_fee))}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="py-1.5 text-right font-bold text-ink">
                            Total
                          </td>
                          <td className="py-1.5 text-right font-bold tabular-nums text-ink">{formatLKR(Number(o.total))}</td>
                        </tr>
                      </tbody>
                    </table>

                    {o.fulfilment === "delivery" && "courier" in o && (
                      <ShippingEditor order={o} onError={setError} onSaved={() => router.refresh()} />
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/orders/${o.id}/invoice`}
                        target="_blank"
                        className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface"
                      >
                        Print invoice
                      </Link>
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
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = courier !== (order.courier ?? "") || tracking !== (order.tracking_number ?? "");

  async function save() {
    setSaving(true);
    onError(null);
    const { error } = await supabase
      .from("online_orders")
      .update({ courier: courier.trim() || null, tracking_number: tracking.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    setSaving(false);
    if (error) onError(error.message);
    else onSaved();
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
