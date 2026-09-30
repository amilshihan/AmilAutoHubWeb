"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, cardSurface, helperText, inputBase } from "@/lib/ui";
import { formatLKR } from "@/lib/shop/format";
import ProductFormModal from "@/components/admin/ProductFormModal";

export type WebProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category_id: string | null;
  unit: string;
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

function friendlyDeleteError(name: string, error: { code?: string; message: string }): string {
  if (error.code === "23503") {
    return `Can't delete "${name}" — it has order, sale or stock history. Hide it from the website instead.`;
  }
  return `${name}: ${error.message}`;
}

export default function WebsiteProductsClient({
  products,
  categoryOptions,
  categoryPathById,
}: {
  products: WebProduct[];
  categoryOptions: string[];
  categoryPathById: Record<string, string>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<WebProduct | "new" | null>(null);
  const [deleting, setDeleting] = useState<WebProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  function handleSaved(saved: WebProduct) {
    setRows((rs) => {
      const exists = rs.some((r) => r.id === saved.id);
      return exists ? rs.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...rs];
    });
    setEditing(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    const { error } = await supabase.from("parts").delete().eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) {
      setDeleteError(friendlyDeleteError(deleting.name, error));
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== deleting.id));
    setDeleting(null);
    router.refresh();
  }

  async function hideInstead() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.from("parts").update({ is_online: false }).eq("id", deleting.id);
    setDeleteBusy(false);
    if (error) return setDeleteError(error.message);
    setRows((rs) => rs.map((r) => (r.id === deleting.id ? { ...r, is_online: false } : r)));
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Website products</h1>
          <p className="text-sm text-muted mt-1">
            Add, edit or remove products. Set a <strong>Compare-at price</strong> above the selling price to show a discount badge.
          </p>
        </div>
        <button className={btnPrimary} onClick={() => setEditing("new")}>
          New product
        </button>
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
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={`border-b border-card last:border-0 ${savingId === p.id ? "opacity-60" : ""}`}>
                <td className="px-4 py-2.5">
                  <button className="text-left font-semibold text-ink hover:underline" onClick={() => setEditing(p)}>
                    {p.name}
                  </button>
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
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-3 text-sm font-semibold">
                    <button className="text-accent hover:underline" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button
                      className="text-error hover:underline"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(p);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
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

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : { ...editing, categoryPath: editing.category_id ? (categoryPathById[editing.category_id] ?? "") : "" }}
          categoryOptions={categoryOptions}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleteBusy && setDeleting(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-ink">Delete &quot;{deleting.name}&quot;?</h2>
            <p className="mt-2 text-sm text-muted">This can&apos;t be undone.</p>
            {deleteError && (
              <div role="alert" className="mt-3 rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error-hover disabled:opacity-60"
                onClick={confirmDelete}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Working…" : "Delete"}
              </button>
              {deleteError && (
                <button
                  className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                  onClick={hideInstead}
                  disabled={deleteBusy}
                >
                  Hide from website instead
                </button>
              )}
              <button
                className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
