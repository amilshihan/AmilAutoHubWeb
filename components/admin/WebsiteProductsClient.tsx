"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cardSurface, helperText, inputBase } from "@/lib/ui";
import { formatLKR } from "@/lib/shop/format";

export type WebProduct = {
  id: string;
  name: string;
  sku: string | null;
  sell_price: number;
  retail_price: number;
  qty_on_hand: number;
  is_active: boolean;
  is_service: boolean;
  is_drum: boolean;
  image_url: string | null;
  is_featured: boolean;
  is_online: boolean;
};

type Filter = "all" | "online" | "hidden" | "featured" | "no-image" | "discounted";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "On website" },
  { id: "hidden", label: "Hidden" },
  { id: "featured", label: "Featured" },
  { id: "no-image", label: "No image" },
  { id: "discounted", label: "Discounted" },
];

const PAGE = 40;

export default function WebsiteProductsClient({ products }: { products: WebProduct[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((p) => {
      if (q && !`${p.name} ${p.sku ?? ""}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case "online":
          return p.is_online;
        case "hidden":
          return !p.is_online;
        case "featured":
          return p.is_featured;
        case "no-image":
          return !p.image_url;
        case "discounted":
          return Number(p.retail_price) > Number(p.sell_price);
        default:
          return true;
      }
    });
  }, [rows, query, filter]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages);
  const shown = visible.slice((current - 1) * PAGE, current * PAGE);

  async function patch(id: string, fields: Partial<Pick<WebProduct, "is_online" | "is_featured" | "image_url" | "retail_price">>) {
    setError(null);
    setSavingId(id);
    const previous = rows;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    const { error } = await supabase.from("parts").update(fields).eq("id", id);
    setSavingId(null);
    if (error) {
      setRows(previous);
      setError(error.message);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Website products</h1>
        <p className="text-sm text-muted mt-1">
          Control what the website shows. Prices and stock come from the POS; create or edit those there. Set a{" "}
          <strong>Compare-at price</strong> above the selling price to show a discount badge.
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
                filter === f.id
                  ? "border-primary bg-primary text-white"
                  : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className={helperText}>{visible.length} products</span>
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
              <th className="px-3 py-3 font-semibold text-right">Price</th>
              <th className="px-3 py-3 font-semibold">Compare-at (Rs.)</th>
              <th className="px-3 py-3 font-semibold text-right">Stock</th>
              <th className="px-3 py-3 font-semibold text-center">On website</th>
              <th className="px-3 py-3 font-semibold text-center">Featured</th>
              <th className="px-3 py-3 font-semibold">Image URL</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={`border-b border-card last:border-0 ${savingId === p.id ? "opacity-60" : ""}`}>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-ink">{p.name}</div>
                  <div className="text-xs text-muted">
                    {p.sku ? `SKU ${p.sku}` : "No SKU"}
                    {p.is_drum ? " · Drum (never shown online)" : ""}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatLKR(Number(p.sell_price))}</td>
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    min={0}
                    defaultValue={Number(p.retail_price) || ""}
                    placeholder="—"
                    onBlur={(e) => {
                      const value = Number(e.target.value || 0);
                      if (value !== Number(p.retail_price)) void patch(p.id, { retail_price: value });
                    }}
                    className={`${inputBase} w-28 py-1.5`}
                  />
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${Number(p.qty_on_hand) > 0 ? "" : "text-error"}`}>
                  {Number(p.qty_on_hand)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Show ${p.name} on website`}
                    checked={p.is_online}
                    onChange={(e) => void patch(p.id, { is_online: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Feature ${p.name}`}
                    checked={p.is_featured}
                    onChange={(e) => void patch(p.id, { is_featured: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    defaultValue={p.image_url ?? ""}
                    placeholder="https://…"
                    onBlur={(e) => {
                      const value = e.target.value.trim() || null;
                      if (value !== (p.image_url ?? null)) void patch(p.id, { image_url: value });
                    }}
                    className={`${inputBase} w-56 py-1.5`}
                  />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No products match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            className="rounded-lg border border-btn-secondary-border px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {current} of {pages}
          </span>
          <button
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
            className="rounded-lg border border-btn-secondary-border px-3 py-1.5 font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
