"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, cardSurface, fieldLabel, helperText, inputBase } from "@/lib/ui";
import { formatLKR } from "@/lib/shop/format";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

type Form = {
  id: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  min_order: string;
  max_discount: string;
  max_uses: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY: Form = {
  id: "",
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  min_order: "0",
  max_discount: "",
  max_uses: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

// <input type="datetime-local"> works in local time; store as ISO.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function state(c: Coupon): { label: string; tone: string } {
  const now = Date.now();
  if (!c.is_active) return { label: "Disabled", tone: "bg-slate-100 text-slate-600" };
  if (c.ends_at && Date.parse(c.ends_at) < now) return { label: "Expired", tone: "bg-red-100 text-red-700" };
  if (c.starts_at && Date.parse(c.starts_at) > now) return { label: "Scheduled", tone: "bg-blue-100 text-blue-800" };
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: "Used up", tone: "bg-amber-100 text-amber-800" };
  return { label: "Live", tone: "bg-green-100 text-green-800" };
}

export default function CouponsClient({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(c: Coupon) {
    setError(null);
    setForm({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order: String(c.min_order),
      max_discount: c.max_discount === null ? "" : String(c.max_discount),
      max_uses: c.max_uses === null ? "" : String(c.max_uses),
      starts_at: toLocalInput(c.starts_at),
      ends_at: toLocalInput(c.ends_at),
      is_active: c.is_active,
    });
  }

  async function save() {
    if (!form) return;
    setError(null);
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (code.length < 3 || code.length > 32 || !/^[A-Z0-9_-]+$/.test(code)) {
      setError("Code must be 3-32 characters: letters, numbers, - or _.");
      return;
    }
    if (!(value > 0) || (form.discount_type === "percent" && value > 100)) {
      setError(form.discount_type === "percent" ? "Percentage must be between 1 and 100." : "Discount amount must be more than zero.");
      return;
    }
    const starts = fromLocalInput(form.starts_at);
    const ends = fromLocalInput(form.ends_at);
    if (starts && ends && Date.parse(starts) >= Date.parse(ends)) {
      setError("The end date must be after the start date.");
      return;
    }

    const payload = {
      code,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: value,
      min_order: Number(form.min_order || 0),
      max_discount: form.discount_type === "percent" && form.max_discount ? Number(form.max_discount) : null,
      max_uses: form.max_uses ? Math.floor(Number(form.max_uses)) : null,
      starts_at: starts,
      ends_at: ends,
      is_active: form.is_active,
    };

    setSaving(true);
    const { error } = form.id
      ? await supabase.from("coupons").update(payload).eq("id", form.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) {
      setError(error.code === "23505" ? `The code ${code} already exists.` : error.message);
      return;
    }
    setForm(null);
    router.refresh();
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`Delete coupon ${c.code}? Past orders keep their discount.`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Coupons</h1>
          <p className="text-sm text-muted mt-1">Discount codes customers enter at checkout. Validated on the server; usage is counted when an order is placed.</p>
        </div>
        <button
          className={btnPrimary}
          onClick={() => {
            setError(null);
            setForm({ ...EMPTY });
          }}
        >
          New coupon
        </button>
      </div>

      {error && !form && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      {form && (
        <div className={`${cardSurface} p-5 space-y-4`}>
          <h2 className="font-semibold text-ink">{form.id ? "Edit coupon" : "New coupon"}</h2>
          {error && (
            <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={fieldLabel}>Code</label>
              <input className={`${inputBase} mt-1 uppercase`} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOME10" />
            </div>
            <div>
              <label className={fieldLabel}>Type</label>
              <select className={`${inputBase} mt-1`} value={form.discount_type} onChange={(e) => set("discount_type", e.target.value as Form["discount_type"])}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off (Rs.)</option>
              </select>
            </div>
            <div>
              <label className={fieldLabel}>{form.discount_type === "percent" ? "Percent (%)" : "Amount (Rs.)"}</label>
              <input type="number" min={0} className={`${inputBase} mt-1`} value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Minimum order (Rs.)</label>
              <input type="number" min={0} className={`${inputBase} mt-1`} value={form.min_order} onChange={(e) => set("min_order", e.target.value)} />
            </div>
            {form.discount_type === "percent" && (
              <div>
                <label className={fieldLabel}>Maximum discount (Rs.)</label>
                <input type="number" min={0} className={`${inputBase} mt-1`} value={form.max_discount} onChange={(e) => set("max_discount", e.target.value)} placeholder="No cap" />
              </div>
            )}
            <div>
              <label className={fieldLabel}>Total uses allowed</label>
              <input type="number" min={1} className={`${inputBase} mt-1`} value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} placeholder="Unlimited" />
            </div>
            <div>
              <label className={fieldLabel}>Starts</label>
              <input type="datetime-local" className={`${inputBase} mt-1`} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Ends</label>
              <input type="datetime-local" className={`${inputBase} mt-1`} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </div>
            <div className="sm:col-span-3">
              <label className={fieldLabel}>Internal note</label>
              <input className={`${inputBase} mt-1`} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Facebook campaign, October" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
            Active
          </label>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save coupon"}
            </button>
            <button className={btnSecondary} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`${cardSurface} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-3 py-3 font-semibold">Discount</th>
              <th className="px-3 py-3 font-semibold">Conditions</th>
              <th className="px-3 py-3 text-right font-semibold">Used</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const st = state(c);
              return (
                <tr key={c.id} className="border-b border-card last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-mono font-bold text-ink">{c.code}</div>
                    {c.description && <div className={helperText}>{c.description}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">
                    {c.discount_type === "percent" ? `${Number(c.discount_value)}%` : formatLKR(Number(c.discount_value))}
                    {c.max_discount !== null && <span className="ml-1 text-xs font-normal text-muted">(max {formatLKR(Number(c.max_discount))})</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {Number(c.min_order) > 0 ? `Min ${formatLKR(Number(c.min_order))}` : "No minimum"}
                    {c.ends_at ? ` · until ${new Date(c.ends_at).toLocaleDateString("en-GB")}` : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {c.used_count}
                    {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.tone}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3 text-sm font-semibold">
                      <button className="text-accent hover:underline" onClick={() => edit(c)}>
                        Edit
                      </button>
                      <button className="text-muted hover:text-ink" onClick={() => toggle(c)}>
                        {c.is_active ? "Disable" : "Enable"}
                      </button>
                      <button className="text-error hover:underline" onClick={() => remove(c)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No coupons yet. Create one to offer customers a discount at checkout.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
