"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveOrCreateGroupPath, type CategoryRow } from "@/lib/groups";
import { btnPrimary, btnSecondary, fieldLabel, helperText, inputBase } from "@/lib/ui";
import type { WebProduct } from "@/components/admin/WebsiteProductsClient";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

const PRODUCT_TYPES = ["Lubricant", "Filter", "Spare part", "Battery", "Coolant / fluid", "Accessory", "Tool", "Car care"];

type Status = "active" | "draft" | "disabled";

type Form = {
  name: string;
  product_code: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  subcategory: string;
  product_type: string;
  unit: string;
  short_description: string;
  description: string;
  sell_price: string;
  retail_price: string;
  qty_on_hand: string;
  image_url: string;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  status: Status;
};

const emptyForm: Form = {
  name: "",
  product_code: "",
  sku: "",
  barcode: "",
  brand: "",
  category: "",
  subcategory: "",
  product_type: "",
  unit: "pcs",
  short_description: "",
  description: "",
  sell_price: "",
  retail_price: "",
  qty_on_hand: "0",
  image_url: "",
  is_featured: false,
  is_new: false,
  is_bestseller: false,
  status: "active",
};

function toForm(p: WebProduct, categoryPath: string): Form {
  return {
    name: p.name,
    product_code: p.product_code ?? "",
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    brand: p.brand ?? "",
    category: categoryPath,
    subcategory: p.subcategory ?? "",
    product_type: p.product_type ?? "",
    unit: p.unit || "pcs",
    short_description: p.short_description ?? "",
    description: p.description ?? "",
    sell_price: String(p.sell_price ?? ""),
    retail_price: p.retail_price ? String(p.retail_price) : "",
    qty_on_hand: String(p.qty_on_hand ?? 0),
    image_url: p.image_url ?? "",
    is_featured: p.is_featured,
    is_new: p.is_new,
    is_bestseller: p.is_bestseller,
    status: p.status,
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
      product_code: form.product_code.trim() || null,
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim() || null,
      brand: form.brand.trim() || null,
      category_id: categoryId,
      subcategory: form.subcategory.trim() || null,
      product_type: form.product_type.trim() || null,
      unit: form.unit.trim() || "pcs",
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      sell_price: sellPrice,
      retail_price: retailPrice,
      image_url: form.image_url.trim() || null,
      is_featured: form.is_featured,
      is_new: form.is_new,
      is_bestseller: form.is_bestseller,
      status: form.status,
      is_online: form.status === "active",
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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-ink">{product ? "Edit product" : "New product"}</h2>
          <span className="rounded bg-surface px-2 py-1 font-mono text-xs text-muted">
            {product ? product.product_ref : "Product ID is assigned automatically"}
          </span>
        </div>

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
            <label className={fieldLabel}>Product code</label>
            <input className={`${inputBase} mt-1`} placeholder="SH-0W20-4L" value={form.product_code} onChange={(e) => set("product_code", e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel}>Brand</label>
            <input className={`${inputBase} mt-1`} placeholder="Shell" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            <p className={`${helperText} mt-1`}>Leave blank to use the brand from the category group.</p>
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
            <label className={fieldLabel}>Subcategory</label>
            <input className={`${inputBase} mt-1`} placeholder="Fully Synthetic" value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} />
          </div>
          <div>
            <label className={fieldLabel}>Product type</label>
            <input list="product-type-options" className={`${inputBase} mt-1`} placeholder="Lubricant" value={form.product_type} onChange={(e) => set("product_type", e.target.value)} />
            <datalist id="product-type-options">
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
            <label className={fieldLabel}>Short description</label>
            <input
              className={`${inputBase} mt-1`}
              maxLength={160}
              placeholder="Fully synthetic engine oil"
              value={form.short_description}
              onChange={(e) => set("short_description", e.target.value)}
            />
            <p className={`${helperText} mt-1`}>One line shown under the product name. {form.short_description.length}/160</p>
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Full description</label>
            <textarea rows={4} className={`${inputBase} mt-1`} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Product photo</label>
            <div className="mt-1">
              <ProductImageUploader value={form.image_url} onChange={(url) => set("image_url", url)} />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Status</label>
            <select className={`${inputBase} mt-1`} value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
              <option value="active">Active (shown on website)</option>
              <option value="draft">Draft (hidden, not ready)</option>
              <option value="disabled">Disabled (hidden)</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="h-4 w-4 accent-primary" />
              Featured on homepage
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.is_new} onChange={(e) => set("is_new", e.target.checked)} className="h-4 w-4 accent-primary" />
              New product
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.is_bestseller} onChange={(e) => set("is_bestseller", e.target.checked)} className="h-4 w-4 accent-primary" />
              Bestseller
            </label>
          </div>
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
