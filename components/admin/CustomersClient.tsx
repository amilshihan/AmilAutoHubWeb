"use client";

import { Fragment, useMemo, useState } from "react";
import { cardSurface, helperText, inputBase } from "@/lib/ui";
import { formatDate, formatLKR } from "@/lib/shop/format";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/shop/config";
import { ACTIVE_DAYS, VIP_ORDERS, VIP_SPEND, type CustomerSummary, type Segment } from "@/lib/admin/analytics";
import { toWhatsAppNumber, waLink } from "@/lib/shop/whatsapp";

const SEGMENTS: (Segment | "All")[] = ["All", "VIP", "Repeat", "New", "Lead"];
const BADGE: Record<Segment, string> = {
  VIP: "bg-amber-100 text-amber-800",
  Repeat: "bg-blue-100 text-blue-800",
  New: "bg-green-100 text-green-800",
  Lead: "bg-slate-100 text-slate-600",
};

export default function CustomersClient({ customers }: { customers: CustomerSummary[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Segment | "All">("All");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: customers.length };
    for (const x of customers) c[x.segment] = (c[x.segment] ?? 0) + 1;
    return c;
  }, [customers]);

  const visible = customers.filter((c) => {
    if (segment !== "All" && c.segment !== segment) return false;
    const q = query.trim().toLowerCase();
    return !q || `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q);
  });

  const totalSpent = customers.reduce((s, c) => s + c.spent, 0);
  const repeatRate = customers.length ? (customers.filter((c) => c.orders >= 2).length / customers.length) * 100 : 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Customers</h1>
        <p className="text-sm text-muted mt-1">
          Built from website orders; customers are matched by phone number. POS customers are managed in the POS.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Customers</div>
          <div className="mt-1 text-2xl font-bold text-ink">{customers.length}</div>
        </div>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Lifetime revenue</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatLKR(totalSpent)}</div>
        </div>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Repeat customers</div>
          <div className="mt-1 text-2xl font-bold text-ink">{repeatRate.toFixed(0)}%</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or email…" className={`${inputBase} max-w-xs`} />
        <div className="flex flex-wrap gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                segment === s ? "border-primary bg-primary text-white" : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
              }`}
            >
              {s} <span className="opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
      <p className={helperText}>
        VIP: Rs. {VIP_SPEND.toLocaleString("en-US")}+ spent or {VIP_ORDERS}+ orders · Repeat: 2+ orders · New: 1 order · Lead: only cancelled orders ·
        Active: ordered in the last {ACTIVE_DAYS} days.
      </p>

      <div className={`${cardSurface} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Segment</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 text-right font-semibold">Orders</th>
              <th className="px-3 py-3 text-right font-semibold">Lifetime value</th>
              <th className="px-3 py-3 text-right font-semibold">Avg order</th>
              <th className="px-4 py-3 font-semibold">Last order</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const isOpen = open === c.key;
              const wa = toWhatsAppNumber(c.phone);
              return (
                <Fragment key={c.key}>
                  <tr onClick={() => setOpen(isOpen ? null : c.key)} className="cursor-pointer border-b border-card hover:bg-surface">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-muted">{c.phone}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[c.segment]}`}>{c.segment}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={c.active ? "font-semibold text-green-700" : "text-muted"}>{c.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.orders}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatLKR(c.spent)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatLKR(c.aov)}</td>
                    <td className="px-4 py-2.5 text-muted">{formatDate(c.lastOrder)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-card bg-surface">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
                          <a href={`tel:${c.phone}`} className="text-accent hover:underline">
                            Call {c.phone}
                          </a>
                          {wa && (
                            <a href={waLink(wa, `Hi ${c.name}, this is Amil Auto Hub.`)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              WhatsApp
                            </a>
                          )}
                          {c.email && <span className="text-muted">{c.email}</span>}
                          <span className="text-muted">Customer since {formatDate(c.firstOrder)}</span>
                        </div>
                        <ul className="divide-y divide-card rounded-lg border border-card bg-white">
                          {c.history.map((h) => (
                            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                              <span className="font-semibold text-ink">#{h.orderNumber}</span>
                              <span className="text-muted">{formatDate(h.createdAt)}</span>
                              <span className="text-muted">{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</span>
                              <span className="font-semibold tabular-nums">{formatLKR(h.total)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {customers.length === 0 ? "No customers yet. They appear here after the first website order." : "No customers match."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
