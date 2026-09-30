"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, cardSurface, fieldLabel, helperText, inputBase } from "@/lib/ui";
import { VEHICLE_TYPES, type VehicleCatalog } from "@/lib/shop/vehicles";

export type FitmentPart = { id: string; name: string; sku: string | null; fitments: number };

type Row = { id: string; part_id: string; make: string; model: string | null; year_from: number | null; year_to: number | null };

const label = (r: Pick<Row, "make" | "model" | "year_from" | "year_to">) => {
  const years = r.year_from && r.year_to ? ` ${r.year_from}-${r.year_to}` : r.year_from ? ` ${r.year_from}+` : r.year_to ? ` up to ${r.year_to}` : "";
  return `${r.make}${r.model ? " " + r.model : " (all models)"}${years}`;
};

const PAGE = 60;

export default function FitmentClient({ parts, catalog }: { parts: FitmentPart[]; catalog: VehicleCatalog }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const makes = useMemo(() => {
    const all = new Set<string>();
    for (const t of VEHICLE_TYPES) Object.keys(catalog[t]).forEach((m) => all.add(m));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [catalog]);
  const models = useMemo(() => {
    if (!make) return [];
    const all = new Set<string>();
    for (const t of VEHICLE_TYPES) (catalog[t][make] ?? []).forEach((m) => all.add(m));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [catalog, make]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => (!q || `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(q)) && (!onlyMissing || p.fitments === 0));
  }, [parts, query, onlyMissing]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const current = Math.min(page, pages);
  const shown = visible.slice((current - 1) * PAGE, current * PAGE);

  const focusPart = parts.find((p) => p.id === focus) ?? null;
  const targets = selected.size > 0 ? [...selected] : focus ? [focus] : [];

  async function loadRows(partId: string) {
    setLoadingRows(true);
    const { data, error } = await supabase.from("part_vehicle_compat").select("*").eq("part_id", partId).order("make").order("model");
    setLoadingRows(false);
    if (error) setMessage({ kind: "error", text: error.message });
    else setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    if (!focus) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRows(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function add() {
    setMessage(null);
    if (!make) return setMessage({ kind: "error", text: "Choose a vehicle make." });
    if (targets.length === 0) return setMessage({ kind: "error", text: "Select at least one product first." });
    const from = yearFrom ? Number(yearFrom) : null;
    const to = yearTo ? Number(yearTo) : null;
    if ((from !== null && (from < 1950 || from > 2100)) || (to !== null && (to < 1950 || to > 2100))) {
      return setMessage({ kind: "error", text: "Years must be between 1950 and 2100." });
    }
    if (from !== null && to !== null && from > to) return setMessage({ kind: "error", text: "'From year' must not be after 'To year'." });

    setSaving(true);
    const { data: existing, error: readError } = await supabase.from("part_vehicle_compat").select("part_id, make, model, year_from, year_to").in("part_id", targets);
    if (readError) {
      setSaving(false);
      return setMessage({ kind: "error", text: readError.message });
    }
    const same = (r: { part_id: string; make: string; model: string | null; year_from: number | null; year_to: number | null }, partId: string) =>
      r.part_id === partId &&
      r.make.toLowerCase() === make.toLowerCase() &&
      (r.model ?? "").toLowerCase() === model.toLowerCase() &&
      (r.year_from ?? null) === from &&
      (r.year_to ?? null) === to;

    const fresh = targets.filter((id) => !(existing ?? []).some((r) => same(r as never, id)));
    if (fresh.length > 0) {
      const { error } = await supabase
        .from("part_vehicle_compat")
        .insert(fresh.map((part_id) => ({ part_id, make, model: model || null, year_from: from, year_to: to })));
      if (error) {
        setSaving(false);
        return setMessage({ kind: "error", text: error.message });
      }
    }
    setSaving(false);
    setMessage({
      kind: "ok",
      text: `Added ${label({ make, model: model || null, year_from: from, year_to: to })} to ${fresh.length} product${fresh.length === 1 ? "" : "s"}${
        fresh.length < targets.length ? ` (${targets.length - fresh.length} already had it)` : ""
      }.`,
    });
    if (focus) void loadRows(focus);
    router.refresh();
  }

  async function remove(row: Row) {
    const { error } = await supabase.from("part_vehicle_compat").delete().eq("id", row.id);
    if (error) return setMessage({ kind: "error", text: error.message });
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Vehicle fitment</h1>
        <p className="text-sm text-muted mt-1">
          Say which vehicles each product fits. Confirmed fits get a &quot;Fits your vehicle&quot; badge on the website and rank first in the Find Parts finder.
          Tick several products to give them the same fitment in one go.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search products…"
              className={`${inputBase} max-w-xs`}
            />
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => {
                  setOnlyMissing(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 accent-primary"
              />
              No fitment yet
            </label>
            {selected.size > 0 && (
              <button className="text-sm font-semibold text-accent hover:underline" onClick={() => setSelected(new Set())}>
                Clear {selected.size} selected
              </button>
            )}
          </div>

          <div className={`${cardSurface} overflow-hidden`}>
            <ul className="divide-y divide-card">
              {shown.map((p) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-2 ${focus === p.id ? "bg-accent-light" : ""}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <button className="min-w-0 flex-1 text-left" onClick={() => setFocus(p.id)}>
                    <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                    <div className="text-xs text-muted">{p.sku ? `SKU ${p.sku}` : "No SKU"}</div>
                  </button>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${p.fitments > 0 ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
                    {p.fitments > 0 ? `${p.fitments} vehicle${p.fitments === 1 ? "" : "s"}` : "None"}
                  </span>
                </li>
              ))}
              {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">No products match.</li>}
            </ul>
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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className={`${cardSurface} p-5 space-y-3`}>
            <h2 className="font-semibold text-ink">Add fitment</h2>
            <p className={helperText}>
              {targets.length === 0
                ? "Tick products on the left, or click one, to choose where this applies."
                : `Applies to ${targets.length} product${targets.length === 1 ? "" : "s"}${selected.size === 0 && focusPart ? `: ${focusPart.name}` : ""}.`}
            </p>
            <div>
              <label className={fieldLabel}>Make</label>
              <select
                className={`${inputBase} mt-1`}
                value={make}
                onChange={(e) => {
                  setMake(e.target.value);
                  setModel("");
                }}
              >
                <option value="">Select make</option>
                {makes.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Model</label>
              <select className={`${inputBase} mt-1`} value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
                <option value="">All models</option>
                {models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={fieldLabel}>From year</label>
                <input className={`${inputBase} mt-1`} inputMode="numeric" maxLength={4} placeholder="2012" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel}>To year</label>
                <input className={`${inputBase} mt-1`} inputMode="numeric" maxLength={4} placeholder="2018" value={yearTo} onChange={(e) => setYearTo(e.target.value)} />
              </div>
            </div>
            <button className={`${btnPrimary} w-full`} onClick={add} disabled={saving}>
              {saving ? "Adding…" : "Add fitment"}
            </button>
            {message && (
              <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm font-semibold ${message.kind === "ok" ? "text-green-700" : "text-error"}`}>
                {message.text}
              </p>
            )}
          </div>

          {focusPart && (
            <div className={`${cardSurface} p-5`}>
              <h2 className="font-semibold text-ink">{focusPart.name}</h2>
              <p className={`${helperText} mb-2`}>Fits these vehicles</p>
              {loadingRows ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted">No fitment recorded yet.</p>
              ) : (
                <ul className="divide-y divide-card">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="text-ink">{label(r)}</span>
                      <button className="text-xs font-semibold text-error hover:underline" onClick={() => remove(r)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
