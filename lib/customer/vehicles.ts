import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FuelType, Transmission } from "@/lib/shop/config";

export type CustomerVehicle = {
  id: string;
  customerId: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  variant: string | null;
  engineType: string | null;
  engineCapacity: string | null;
  fuelType: FuelType;
  transmission: Transmission;
  mileage: number | null;
  vin: string | null;
  engineNumber: string | null;
  imageUrl: string | null;
  createdAt: string;
};

const COLUMNS =
  "id, customer_id, registration_number, make, model, year, variant, engine_type, engine_capacity, fuel_type, transmission, mileage, vin, engine_number, image_url, created_at";

function toVehicle(row: Record<string, unknown>): CustomerVehicle {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    registrationNumber: row.registration_number as string,
    make: row.make as string,
    model: row.model as string,
    year: row.year as number,
    variant: (row.variant as string | null) ?? null,
    engineType: (row.engine_type as string | null) ?? null,
    engineCapacity: (row.engine_capacity as string | null) ?? null,
    fuelType: row.fuel_type as FuelType,
    transmission: row.transmission as Transmission,
    mileage: (row.mileage as number | null) ?? null,
    vin: (row.vin as string | null) ?? null,
    engineNumber: (row.engine_number as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getCustomerVehicles(customerId: string): Promise<CustomerVehicle[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("customer_vehicles").select(COLUMNS).eq("customer_id", customerId).order("created_at", { ascending: true });
  return (data ?? []).map(toVehicle);
}
