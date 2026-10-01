"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addVehicle, updateVehicle, type VehicleInput } from "@/app/(shop)/account/vehicle-actions";
import type { CustomerVehicle } from "@/lib/customer/vehicles";
import { FUEL_TYPES, FUEL_TYPE_LABEL, TRANSMISSIONS, TRANSMISSION_LABEL } from "@/lib/shop/config";
import { knownMakesAndModels } from "@/lib/shop/vehicles";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

const { makes: KNOWN_MAKES } = knownMakesAndModels();

const emptyForm: VehicleInput = {
  registrationNumber: "",
  make: "",
  model: "",
  year: "",
  variant: "",
  engineType: "",
  engineCapacity: "",
  fuelType: "petrol",
  transmission: "manual",
  mileage: "",
  vin: "",
  engineNumber: "",
};

function fromVehicle(v: CustomerVehicle): VehicleInput {
  return {
    registrationNumber: v.registrationNumber,
    make: v.make,
    model: v.model,
    year: String(v.year),
    variant: v.variant ?? "",
    engineType: v.engineType ?? "",
    engineCapacity: v.engineCapacity ?? "",
    fuelType: v.fuelType,
    transmission: v.transmission,
    mileage: v.mileage != null ? String(v.mileage) : "",
    vin: v.vin ?? "",
    engineNumber: v.engineNumber ?? "",
  };
}

export default function VehicleForm({ existing, onDone }: { existing?: CustomerVehicle; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleInput>(existing ? fromVehicle(existing) : emptyForm);

  function set<K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = existing ? await updateVehicle(existing.id, form) : await addVehicle(form);
      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-charcoal/10 bg-surface p-4 sm:grid-cols-2">
      {error && (
        <p role="alert" className="sm:col-span-2 text-sm font-semibold text-deal">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="registrationNumber" className={label}>
          Registration number
        </label>
        <input
          id="registrationNumber"
          className={field}
          placeholder="e.g. CAR-1234"
          value={form.registrationNumber}
          onChange={(e) => set("registrationNumber", e.target.value)}
          required
        />
      </div>
      <div />
      <div>
        <label htmlFor="make" className={label}>
          Make
        </label>
        <input id="make" list="vehicle-makes" className={field} value={form.make} onChange={(e) => set("make", e.target.value)} required />
        <datalist id="vehicle-makes">
          {KNOWN_MAKES.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <div>
        <label htmlFor="model" className={label}>
          Model
        </label>
        <input id="model" className={field} value={form.model} onChange={(e) => set("model", e.target.value)} required />
      </div>
      <div>
        <label htmlFor="year" className={label}>
          Year
        </label>
        <input
          id="year"
          type="number"
          min={1950}
          max={new Date().getFullYear() + 1}
          className={field}
          value={form.year}
          onChange={(e) => set("year", e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="variant" className={label}>
          Variant <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="variant" className={field} placeholder="e.g. GLX, Hybrid" value={form.variant} onChange={(e) => set("variant", e.target.value)} />
      </div>
      <div>
        <label htmlFor="fuelType" className={label}>
          Fuel type
        </label>
        <select id="fuelType" className={field} value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
          {FUEL_TYPES.map((f) => (
            <option key={f} value={f}>
              {FUEL_TYPE_LABEL[f]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="transmission" className={label}>
          Transmission
        </label>
        <select id="transmission" className={field} value={form.transmission} onChange={(e) => set("transmission", e.target.value)}>
          {TRANSMISSIONS.map((t) => (
            <option key={t} value={t}>
              {TRANSMISSION_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="engineType" className={label}>
          Engine type <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="engineType" className={field} placeholder="e.g. Inline-4" value={form.engineType} onChange={(e) => set("engineType", e.target.value)} />
      </div>
      <div>
        <label htmlFor="engineCapacity" className={label}>
          Engine capacity <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input
          id="engineCapacity"
          className={field}
          placeholder="e.g. 1500cc"
          value={form.engineCapacity}
          onChange={(e) => set("engineCapacity", e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="mileage" className={label}>
          Mileage (km) <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="mileage" type="number" min={0} className={field} value={form.mileage} onChange={(e) => set("mileage", e.target.value)} />
      </div>
      <div>
        <label htmlFor="vin" className={label}>
          VIN / chassis number <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="vin" className={field} value={form.vin} onChange={(e) => set("vin", e.target.value)} />
      </div>
      <div>
        <label htmlFor="engineNumber" className={label}>
          Engine number <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="engineNumber" className={field} value={form.engineNumber} onChange={(e) => set("engineNumber", e.target.value)} />
      </div>
      <div className="sm:col-span-2 flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60">
          {pending ? "Saving..." : existing ? "Save changes" : "Add vehicle"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-charcoal/20 px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}
