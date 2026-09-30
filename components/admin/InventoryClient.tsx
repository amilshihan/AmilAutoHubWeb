"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, cardSurface, helperText, inputBase } from "@/lib/ui";
import { formatDateTime } from "@/lib/shop/format";

export type StockPart = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  qty_on_hand: number;
  low_stock_threshold: number;
  sell_price: number;
  is_drum: boolean;
};

export type Movement = {
  id: string;
  created_at: string;
  change_qty: number;
  reason: "sale" | "purchase" | "adjustment";
  note?: string | null;
  parts: { name: string } | { name: string }[] | null;
};

type Filter = "all" | "low" | "out" | "in";
const PAGE = 40;

const partName = (m: Movement) => (Array.isArray(m.parts) ? m.parts[0]?.name : m.parts?.name) ?? "Unknown product";

export default function InventoryClient({ parts, movements }: { parts: StockPart[]; movements: Movement[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: parts.length,
      low: parts.filter((p) => Number(p.qty_on_hand) > 0 && Number(p.qty_on_hand) <= Number(p.low_stock_threshold)).length,
      out: parts.filter((p) => Number(p.qty_on_hand) <= 0).length,
      in: parts.filter((p) => Number(p.qty_on_hand) > 0).length,
    }),
    [parts]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      const qty = Number(p.qty_on_hand);
      if (q && !`${p.name} ${p.sku ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "low") return qty > 0 && qty <= Number(p.low_stock_threshold);
      if (filter === "out") return qty <= 0;
      if (filter === "in") return qty > 0;
      return true;
    });
  }, [parts, query, filter]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages);
  const shown = visible.slice((current - 1) * PAGE, current * PAGE);

  async function apply(part: StockPart) {
    setError(null);
    const change = Number(delta);
    if (!Number.isFinite(change) || change === 0) {
      setError("Enter a quantity to add (for example 10) or remove (for example -3).");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("adjust_part_stock", { p_part_id: part.id, p_delta: change, p_note: note.trim() || null });
    setSaving(false);
    if (error) {
      setError(/adjust_part_stock|schema cache/i.test(error.message) ? "Stock adjustment needs migration 0017_admin_features.sql." : error.message);
      return;
    }
    setAdjusting(null);
    setDelta("");
    setNote("");
    router.refresh();
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "low", label: "Low stock" },
    { id: "out", label: "Out of stock" },
    { id: "in", label: "In stock" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Inventory</h1>
        <p className="text-sm text-muted mt-1">
          Stock is shared with the POS. Adjustments are logged below. Purchases and sales update stock automatically.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or SKU…"
          className={`${inputBase} max-w-xs`}
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.id ? "border-primary bg-primary text-white" : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
              }`}
            >
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className={`${cardSurface} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 text-right font-semibold">In stock</th>
              <th className="px-3 py-3 text-right font-semibold">Minimum</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const qty = Number(p.qty_on_hand);
              const out = qty <= 0;
              const low = !out && qty <= Number(p.low_stock_threshold);
              const open = adjusting === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-card">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-ink">{p.name}</div>
                      <div className="text-xs text-muted">
                        {p.sku ? `SKU ${p.sku}` : "No SKU"}
                        {p.is_drum ? " · Drum" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {qty} <span className="text-xs font-normal text-muted">{p.unit}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted">{Number(p.low_stock_threshold)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          out ? "bg-red-100 text-red-700" : low ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                        }`}
                      >
                        {out ? "Out of stock" : low ? "Low" : "In stock"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className="text-sm font-semibold text-accent hover:underline"
                        onClick={() => {
                          setError(null);
                          setAdjusting(open ? null : p.id);
                          setDelta("");
                          setNote("");
                        }}
                      >
                        {open ? "Close" : "Adjust"}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-card bg-surface">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Change</label>
                            <input
                              type="number"
                              value={delta}
                              onChange={(e) => setDelta(e.target.value)}
                              placeholder="+10 or -3"
                              className={`${inputBase} mt-1 w-32`}
                              autoFocus
                            />
                          </div>
                          <div className="min-w-56 flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Reason (optional)</label>
                            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Stock take, damaged, found…" className={`${inputBase} mt-1`} />
                          </div>
                          <button onClick={() => apply(p)} disabled={saving} className={btnPrimary}>
                            {saving ? "Saving…" : "Apply"}
                          </button>
                          <button onClick={() => setAdjusting(null)} className={btnSecondary}>
                            Cancel
                          </button>
                        </div>
                        <p className={`${helperText} mt-2`}>
                          New stock will be {Number.isFinite(Number(delta)) && delta !== "" ? qty + Number(delta) : qty} {p.unit}.
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded-lg border border-btn-secondary-border px-3 py-1.5 font-semibold disabled:opacity-40">
            Previous
          </button>
          <span className="text-muted">
            Page {current} of {pages}
          </span>
          <button disabled={current >= pages} onClick={() => setPage(current + 1)} className="rounded-lg border border-btn-secondary-border px-3 py-1.5 font-semibold disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      <div className={`${cardSurface} overflow-hidden`}>
        <div className="border-b border-card px-5 py-3 font-semibold text-ink">Recent stock movements</div>
        <table className="w-full text-sm">
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-card last:border-0">
                <td className="px-5 py-2 text-muted">{formatDateTime(m.created_at)}</td>
                <td className="px-3 py-2 text-ink">{partName(m)}</td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${Number(m.change_qty) >= 0 ? "text-green-700" : "text-error"}`}>
                  {Number(m.change_qty) > 0 ? "+" : ""}
                  {Number(m.change_qty)}
                </td>
                <td className="px-3 py-2 capitalize text-muted">{m.reason}</td>
                <td className="px-5 py-2 text-muted">{m.note ?? ""}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-muted">No stock movements yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
