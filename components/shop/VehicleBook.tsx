"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVehicle } from "@/app/(shop)/account/vehicle-actions";
import type { CustomerVehicle } from "@/lib/customer/vehicles";
import { FUEL_TYPE_LABEL, TRANSMISSION_LABEL } from "@/lib/shop/config";
import { formatDate } from "@/lib/shop/format";
import VehicleForm from "@/components/shop/VehicleForm";
import VehiclePhotoUploader from "@/components/shop/VehiclePhotoUploader";

function VehicleCard({ vehicle, onEdit }: { vehicle: CustomerVehicle; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm("Delete this vehicle?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteVehicle(vehicle.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="rounded-xl border border-charcoal/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-base font-extrabold text-charcoal">
          {vehicle.make} {vehicle.model} {vehicle.variant ? `(${vehicle.variant})` : ""} · {vehicle.year}
        </p>
        <div className="flex gap-3 text-sm font-bold">
          <button type="button" onClick={onEdit} className="text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Edit
          </button>
          <button type="button" onClick={remove} disabled={pending} className="text-deal underline decoration-2 underline-offset-2 disabled:opacity-60">
            {pending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <VehiclePhotoUploader vehicleId={vehicle.id} initialUrl={vehicle.imageUrl} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-charcoal sm:grid-cols-3">
        <div>
          <dt className="text-charcoal/50">Registration</dt>
          <dd className="font-semibold">{vehicle.registrationNumber}</dd>
        </div>
        <div>
          <dt className="text-charcoal/50">Fuel type</dt>
          <dd className="font-semibold">{FUEL_TYPE_LABEL[vehicle.fuelType]}</dd>
        </div>
        <div>
          <dt className="text-charcoal/50">Transmission</dt>
          <dd className="font-semibold">{TRANSMISSION_LABEL[vehicle.transmission]}</dd>
        </div>
        {vehicle.engineType && (
          <div>
            <dt className="text-charcoal/50">Engine type</dt>
            <dd className="font-semibold">{vehicle.engineType}</dd>
          </div>
        )}
        {vehicle.engineCapacity && (
          <div>
            <dt className="text-charcoal/50">Engine capacity</dt>
            <dd className="font-semibold">{vehicle.engineCapacity}</dd>
          </div>
        )}
        {vehicle.mileage != null && (
          <div>
            <dt className="text-charcoal/50">Mileage</dt>
            <dd className="font-semibold">{vehicle.mileage.toLocaleString()} km</dd>
          </div>
        )}
        {vehicle.vin && (
          <div>
            <dt className="text-charcoal/50">VIN / chassis</dt>
            <dd className="font-semibold">{vehicle.vin}</dd>
          </div>
        )}
        {vehicle.engineNumber && (
          <div>
            <dt className="text-charcoal/50">Engine number</dt>
            <dd className="font-semibold">{vehicle.engineNumber}</dd>
          </div>
        )}
        <div>
          <dt className="text-charcoal/50">Date added</dt>
          <dd className="font-semibold">{formatDate(vehicle.createdAt)}</dd>
        </div>
      </dl>
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-deal">
          {error}
        </p>
      )}
    </div>
  );
}

export default function VehicleBook({ vehicles }: { vehicles: CustomerVehicle[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {vehicles.map((v) =>
        editingId === v.id ? (
          <VehicleForm key={v.id} existing={v} onDone={() => setEditingId(null)} />
        ) : (
          <VehicleCard key={v.id} vehicle={v} onEdit={() => setEditingId(v.id)} />
        )
      )}

      {vehicles.length === 0 && !adding && <p className="text-sm text-charcoal/60">No vehicles registered yet.</p>}

      {adding ? (
        <VehicleForm onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg border border-charcoal/20 bg-white px-4 py-2.5 text-sm font-bold text-charcoal hover:bg-surface"
        >
          + Add a vehicle
        </button>
      )}
    </div>
  );
}
