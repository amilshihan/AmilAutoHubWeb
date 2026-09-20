"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_TYPES, type VehicleCatalog, type VehicleType } from "@/lib/shop/vehicles";
import { SearchIcon } from "@/components/shop/Icons";

const selectClass =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3 py-2.5 text-sm font-medium text-charcoal focus:border-charcoal focus:outline-none disabled:bg-charcoal/5 disabled:text-charcoal/40";

export default function VehicleFinder({
  catalog,
  initial,
  title = "Find parts for your vehicle",
  subtitle,
}: {
  catalog: VehicleCatalog;
  initial?: { make?: string; model?: string; year?: string };
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();

  const initialType =
    (VEHICLE_TYPES.find((t) => initial?.make && Object.keys(catalog[t]).includes(initial.make)) as VehicleType) ?? "Car";
  const [type, setType] = useState<VehicleType>(initialType);
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [year, setYear] = useState(initial?.year ?? "");

  const makes = useMemo(() => Object.keys(catalog[type]).sort((a, b) => a.localeCompare(b)), [catalog, type]);
  const models = useMemo(() => (make ? [...(catalog[type][make] ?? [])].sort((a, b) => a.localeCompare(b)) : []), [catalog, type, make]);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now + 1 - 1985 + 1 }, (_, i) => String(now + 1 - i));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!make) return;
    const params = new URLSearchParams({ make });
    if (model) params.set("model", model);
    if (year) params.set("year", year);
    router.push(`/shop?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-charcoal/10 bg-white p-5 shadow-xl shadow-charcoal/10 sm:p-6"
      aria-label="Vehicle finder"
    >
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-charcoal sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-charcoal/60">{subtitle}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.7fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">Vehicle type</span>
          <select
            className={selectClass}
            value={type}
            onChange={(e) => {
              setType(e.target.value as VehicleType);
              setMake("");
              setModel("");
            }}
          >
            {VEHICLE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">Make</span>
          <select
            className={selectClass}
            value={make}
            onChange={(e) => {
              setMake(e.target.value);
              setModel("");
            }}
            required
          >
            <option value="">Select make</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">Model</span>
          <select className={selectClass} value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
            <option value="">{make ? "All models" : "Select make first"}</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">Year</span>
          <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Any year</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!make}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-charcoal px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-charcoal-soft disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1"
        >
          <SearchIcon width={17} height={17} /> Find Products
        </button>
      </div>
    </form>
  );
}
