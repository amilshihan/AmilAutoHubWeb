"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveOrCreateGroupPath, type CategoryRow } from "@/lib/groups";
import { btnPrimary, btnSecondary, fieldLabel, helperText, inputBase } from "@/lib/ui";
import type { WebProduct } from "@/components/admin/WebsiteProductsClient";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

type Form = {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  description: string;
  sell_price: string;
  retail_price: string;
  qty_on_hand: string;
  image_url: string;
  is_featured: boolean;
  is_online: boolean;
};

const emptyForm: Form = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  unit: "pcs",
  description: "",
  sell_price: "",
  retail_price: "",
  qty_on_hand: "0",
  image_url: "",
  is_featured: false,
  is_online: true,
};

function toForm(p: WebProduct, categoryPath: string): Form {
  return {
    name: p.name,
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    category: categoryPath,
    unit: p.unit || "pcs",
    description: p.description ?? "",
    sell_price: String(p.sell_price ?? ""),
    retail_price: p.retail_price ? String(p.retail_price) : "",
    qty_on_hand: String(p.qty_on_hand ?? 0),
    image_url: p.image_url ?? "",
    is_featured: p.is_featured,
    is_online: p.is_online,
  };
}

export default function ProductFormModal({
  product,
  categoryOptions,
  onClose,
  onSaved,
}: {
  product: (WebProduct & { categoryPath: string }) | null;
  categoryOptions: string[];
  onClose: () => void;
  onSaved: (product: WebProduct) => void;
}) {
  const [form, setForm] = useState<Form>(product ? toForm(product, product.categoryPath) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setError(null);
    const name = form.name.trim();
    const sellPrice = Number(form.sell_price);
    const retailPrice = form.retail_price.trim() ? Number(form.retail_price) : 0;
    const qty = Number(form.qty_on_hand || 0);

    if (!name) return setError("Product name is required.");
    if (!Number.isFinite(sellPrice) || sellPrice <= 0) return setError("Enter a selling price greater than zero.");
    if (form.retail_price.trim() && (!Number.isFinite(retailPrice) || retailPrice < 0)) return setError("Compare-at price must be a positive number.");
    if (!product && (!Number.isFinite(qty) || qty < 0)) return setError("Starting stock must be zero or more.");

    setSaving(true);
    const supabase = createClient();

    let categoryId: string | null = null;
    if (form.category.trim()) {
      const { data: existing } = await supabase.from("categories").select("id, name, parent_id");
      const working = (existing ?? []) as CategoryRow[];
      const res = await resolveOrCreateGroupPath(supabase, working, form.category.trim());
      if (res.error) {
        setSaving(false);
        return setError(res.error);
      }
      categoryId = res.id;
    }

    const payload = {
      name,
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      category_id: categoryId,
      unit: form.unit.trim() || "pcs",
      description: form.description.trim() || null,
      sell_price: sellPrice,
      retail_price: retailPrice,
      image_url: form.image_url.trim() || null,
      is_featured: form.is_featured,
      is_online: form.is_online,
    };

    const result = product
      ? await supabase.from("parts").update(payload).eq("id", product.id).select().single()
      : await supabase
          .from("parts")
          .insert({ ...payload, qty_on_hand: qty, is_active: true, is_service: false })
          .select()
          .single();

    setSaving(false);
    if (result.error) {
      if (result.error.code === "23505") {
        return setError(
          result.error.message.includes("barcode") ? "That barcode is already used by another product." : "That SKU is already used by another product."
        );
      }
      return setError(result.error.message);
    }
    onSaved(result.data as WebProduct);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-ink">{product ? "Edit product" : "New product"}</h2>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Name *</label>
            <input className={`${inputBase} mt-1`} value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </div>

          <div>
            <label className={fieldLabel}>SKU</label>
            <input className={`${inputBase} mt-1`} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel}>Barcode</label>
            <input className={`${inputBase} mt-1`} value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className={fieldLabel}>Category / group</label>
            <input
              list="category-options"
              className={`${inputBase} mt-1`}
              placeholder="e.g. Oil/Castrol"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
            <datalist id="category-options">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className={`${helperText} mt-1`}>Use &quot;Parent/Child&quot; to nest, e.g. Oil/Castrol. Leave blank for ungrouped.</p>
          </div>

          <div>
            <label className={fieldLabel}>Selling price (Rs.) *</label>
            <input type="number" min={0} className={`${inputBase} mt-1`} value={form.sell_price} onChange={(e) => set("sell_price", e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel}>Compare-at price (Rs.)</label>
            <input type="number" min={0} className={`${inputBase} mt-1`} placeholder="Optional" value={form.retail_price} onChange={(e) => set("retail_price", e.target.value)} />
            <p className={`${helperText} mt-1`}>Set above the selling price to show a discount badge.</p>
          </div>

          <div>
            <label className={fieldLabel}>Unit</label>
            <input className={`${inputBase} mt-1`} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel}>{product ? "Stock" : "Starting stock"}</label>
            {product ? (
              <>
                <input className={`${inputBase} mt-1 bg-surface`} value={`${form.qty_on_hand} ${form.unit}`} disabled />
                <p className={`${helperText} mt-1`}>Adjust stock on the Inventory page so it stays logged.</p>
              </>
            ) : (
              <input type="number" min={0} className={`${inputBase} mt-1`} value={form.qty_on_hand} onChange={(e) => set("qty_on_hand", e.target.value)} />
            )}
          </div>

          <div className="sm:col-span-2">
            <label className={fieldLabel}>Description</label>
            <textarea rows={3} className={`${inputBase} mt-1`} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Product photo</label>
            <div className="mt-1">
              <ProductImageUploader value={form.image_url} onChange={(url) => set("image_url", url)} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_online} onChange={(e) => set("is_online", e.target.checked)} className="h-4 w-4 accent-primary" />
            Show on website
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="h-4 w-4 accent-primary" />
            Featured on homepage
          </label>
        </div>

        <div className="mt-6 flex gap-2">
          <button className={btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Saving…" : product ? "Save changes" : "Create product"}
          </button>
          <button className={btnSecondary} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
