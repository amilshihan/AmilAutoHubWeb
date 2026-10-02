"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_TYPES, type VehicleCatalog, type VehicleType } from "@/lib/shop/vehicles";
import { BikeIcon, CarIcon, SearchIcon, TruckIcon, VanIcon } from "@/components/shop/Icons";

const TYPE_META: Record<VehicleType, { label: string; Icon: typeof CarIcon }> = {
  Car: { label: "Cars", Icon: CarIcon },
  Van: { label: "Vans", Icon: VanIcon },
  Bike: { label: "Bikes", Icon: BikeIcon },
  "Heavy Vehicle": { label: "Heavy vehicles", Icon: TruckIcon },
};

const selectClass =
  "w-full rounded-lg border border-charcoal/15 bg-white px-3 py-3 text-sm font-semibold text-charcoal focus:border-charcoal focus:outline-none disabled:bg-charcoal/5 disabled:text-charcoal/40";

export default function HeroVehicleFinder({ catalog }: { catalog: VehicleCatalog }) {
  const router = useRouter();
  const [type, setType] = useState<VehicleType>("Car");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

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
    <div id="vehicle-finder" className="scroll-mt-40">
      <form
        onSubmit={submit}
        aria-label="Vehicle finder"
        className="grid items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl shadow-black/30 sm:grid-cols-3 sm:p-5 lg:grid-cols-[1.3fr_1fr_1fr_0.7fr_auto] lg:gap-4"
      >
        <div className="flex items-center gap-3 sm:col-span-3 lg:col-span-1">
          <CarIcon width={34} height={34} className="shrink-0 text-charcoal" />
          <div>
            <h2 className="text-base font-extrabold leading-tight text-charcoal sm:text-lg">Find parts for your vehicle</h2>
            <p className="text-xs text-charcoal/60 sm:text-sm">Select your vehicle and we&apos;ll show what fits.</p>
          </div>
        </div>

        <select
          aria-label="Make"
          className={selectClass}
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
        <select aria-label="Model" className={selectClass} value={model} onChange={(e) => setModel(e.target.value)} disabled={!make}>
          <option value="">{make ? "All models" : "Select make first"}</option>
          {models.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select aria-label="Year" className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">Any year</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!make}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-deal px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-deal/90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-3 lg:col-span-1"
        >
          <SearchIcon width={17} height={17} /> Find Products
        </button>
      </form>

      <div role="radiogroup" aria-label="Vehicle type" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VEHICLE_TYPES.map((t) => {
          const { label, Icon } = TYPE_META[t];
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setType(t);
                setMake("");
                setModel("");
              }}
              className={`flex items-center justify-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                active ? "bg-white/15 text-amil ring-1 ring-amil/60" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon width={26} height={26} className="text-amil" /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
