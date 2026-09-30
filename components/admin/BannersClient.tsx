"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, cardSurface, fieldLabel, helperText, inputBase } from "@/lib/ui";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  button_label: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type Form = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_label: string;
  sort_order: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const EMPTY: Form = { id: "", title: "", subtitle: "", image_url: "", link_url: "/offers", button_label: "Shop now", sort_order: "0", is_active: true, starts_at: "", ends_at: "" };

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function BannersClient({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(b: Banner) {
    setError(null);
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_url: b.image_url ?? "",
      link_url: b.link_url ?? "",
      button_label: b.button_label ?? "",
      sort_order: String(b.sort_order),
      is_active: b.is_active,
      starts_at: toLocalInput(b.starts_at),
      ends_at: toLocalInput(b.ends_at),
    });
  }

  async function save() {
    if (!form) return;
    setError(null);
    if (!form.title.trim()) return setError("A banner needs a title.");
    if (form.image_url.trim() && !/^https?:\/\//i.test(form.image_url.trim())) return setError("The image URL must start with http:// or https://.");
    if (form.link_url.trim() && !/^(\/(?!\/)|https?:\/\/)/i.test(form.link_url.trim())) {
      return setError("The link must be a page on this site (like /offers) or a full https:// address.");
    }
    const starts = fromLocalInput(form.starts_at);
    const ends = fromLocalInput(form.ends_at);
    if (starts && ends && Date.parse(starts) >= Date.parse(ends)) return setError("The end date must be after the start date.");

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      button_label: form.button_label.trim() || null,
      sort_order: Math.floor(Number(form.sort_order || 0)),
      is_active: form.is_active,
      starts_at: starts,
      ends_at: ends,
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from("site_banners").update(payload).eq("id", form.id)
      : await supabase.from("site_banners").insert(payload);
    setSaving(false);
    if (error) return setError(error.message);
    setForm(null);
    router.refresh();
  }

  async function toggle(b: Banner) {
    const { error } = await supabase.from("site_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function remove(b: Banner) {
    if (!window.confirm(`Delete banner "${b.title}"?`)) return;
    const { error } = await supabase.from("site_banners").delete().eq("id", b.id);
    if (error) setError(error.message);
    else router.refresh();
  }

  const status = (b: Banner) => {
    if (!b.is_active) return { label: "Hidden", tone: "bg-slate-100 text-slate-600" };
    if (b.ends_at && Date.parse(b.ends_at) < now) return { label: "Ended", tone: "bg-red-100 text-red-700" };
    if (b.starts_at && Date.parse(b.starts_at) > now) return { label: "Scheduled", tone: "bg-blue-100 text-blue-800" };
    return { label: "Showing", tone: "bg-green-100 text-green-800" };
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Homepage banners</h1>
          <p className="text-sm text-muted mt-1">Up to three active banners appear under the hero on the home page, in the order set below.</p>
        </div>
        <button
          className={btnPrimary}
          onClick={() => {
            setError(null);
            setForm({ ...EMPTY });
          }}
        >
          New banner
        </button>
      </div>

      {error && !form && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      {form && (
        <div className={`${cardSurface} p-5 space-y-4`}>
          <h2 className="font-semibold text-ink">{form.id ? "Edit banner" : "New banner"}</h2>
          {error && (
            <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Title</label>
              <input className={`${inputBase} mt-1`} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="20% off Totachi oils" />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Subtitle</label>
              <input className={`${inputBase} mt-1`} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="This week only, while stocks last" />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Image URL (optional)</label>
              <input className={`${inputBase} mt-1`} value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
              <p className={`${helperText} mt-1`}>Wide images (about 1200 × 500) work best. Without one, the banner uses a charcoal background.</p>
            </div>
            <div>
              <label className={fieldLabel}>Link</label>
              <input className={`${inputBase} mt-1`} value={form.link_url} onChange={(e) => set("link_url", e.target.value)} placeholder="/offers" />
            </div>
            <div>
              <label className={fieldLabel}>Button text</label>
              <input className={`${inputBase} mt-1`} value={form.button_label} onChange={(e) => set("button_label", e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Show from</label>
              <input type="datetime-local" className={`${inputBase} mt-1`} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Show until</label>
              <input type="datetime-local" className={`${inputBase} mt-1`} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </div>
            <div>
              <label className={fieldLabel}>Order (lower shows first)</label>
              <input type="number" className={`${inputBase} mt-1`} value={form.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-primary" />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save banner"}
            </button>
            <button className={btnSecondary} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {banners.map((b) => {
          const st = status(b);
          return (
            <div key={b.id} className={`${cardSurface} overflow-hidden`}>
              <div
                className="relative flex min-h-32 flex-col justify-end bg-charcoal p-4 text-white"
                style={b.image_url ? { backgroundImage: `url("${b.image_url.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 to-charcoal/10" />
                <div className="relative">
                  <div className="font-extrabold leading-tight">{b.title}</div>
                  {b.subtitle && <div className="text-sm text-white/80">{b.subtitle}</div>}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.tone}`}>{st.label}</span>
                  <span className="text-muted">Order {b.sort_order}</span>
                  {b.link_url && <span className="text-muted">→ {b.link_url}</span>}
                </div>
                <div className="flex gap-3 font-semibold">
                  <button className="text-accent hover:underline" onClick={() => edit(b)}>
                    Edit
                  </button>
                  <button className="text-muted hover:text-ink" onClick={() => toggle(b)}>
                    {b.is_active ? "Hide" : "Show"}
                  </button>
                  <button className="text-error hover:underline" onClick={() => remove(b)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {banners.length === 0 && (
          <div className={`${cardSurface} col-span-full p-10 text-center text-sm text-muted`}>No banners yet. Add one to promote an offer on the home page.</div>
        )}
      </div>
    </div>
  );
}
