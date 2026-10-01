"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { FUEL_TYPES, TRANSMISSIONS, type FuelType, type Transmission } from "@/lib/shop/config";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type VehicleInput = {
  registrationNumber: string;
  make: string;
  model: string;
  year: string;
  variant: string;
  engineType: string;
  engineCapacity: string;
  fuelType: string;
  transmission: string;
  mileage: string;
  vin: string;
  engineNumber: string;
};

export type VehicleResult = { ok: true; id: string } | { ok: false; error: string };

const clean = (s: string, max: number) => s.trim().slice(0, max);

function validateVehicle(
  input: VehicleInput
):
  | { ok: false; error: string }
  | {
      ok: true;
      value: {
        registrationNumber: string;
        make: string;
        model: string;
        year: number;
        variant: string;
        engineType: string;
        engineCapacity: string;
        fuelType: FuelType;
        transmission: Transmission;
        mileage: number | null;
        vin: string;
        engineNumber: string;
      };
    } {
  const registrationNumber = clean(input.registrationNumber ?? "", 20).toUpperCase();
  if (registrationNumber.length < 3) return { ok: false, error: "Please enter the vehicle's registration number." };
  const make = clean(input.make ?? "", 50);
  if (!make) return { ok: false, error: "Please enter the vehicle make." };
  const model = clean(input.model ?? "", 50);
  if (!model) return { ok: false, error: "Please enter the vehicle model." };
  const year = Number(input.year);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1950 || year > currentYear + 1) return { ok: false, error: "Please enter a valid year." };
  const fuelType = input.fuelType as FuelType;
  if (!FUEL_TYPES.includes(fuelType)) return { ok: false, error: "Please choose a valid fuel type." };
  const transmission = input.transmission as Transmission;
  if (!TRANSMISSIONS.includes(transmission)) return { ok: false, error: "Please choose a valid transmission." };

  let mileage: number | null = null;
  if (clean(input.mileage ?? "", 20)) {
    mileage = Number(input.mileage);
    if (!Number.isFinite(mileage) || mileage < 0) return { ok: false, error: "Please enter a valid mileage." };
  }

  return {
    ok: true,
    value: {
      registrationNumber,
      make,
      model,
      year,
      variant: clean(input.variant ?? "", 50),
      engineType: clean(input.engineType ?? "", 50),
      engineCapacity: clean(input.engineCapacity ?? "", 20),
      fuelType,
      transmission,
      mileage,
      vin: clean(input.vin ?? "", 30).toUpperCase(),
      engineNumber: clean(input.engineNumber ?? "", 30).toUpperCase(),
    },
  };
}

function uniqueRegError(error: { code?: string; message: string }) {
  return error.code === "23505" ? "That registration number is already on another vehicle." : "We couldn't save that vehicle. Please try again.";
}

export async function addVehicle(input: VehicleInput): Promise<VehicleResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!rateLimit(`vehicle:${clientIp(h)}`, 20, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const validated = validateVehicle(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customer_vehicles")
    .insert({
      customer_id: customer.id,
      registration_number: validated.value.registrationNumber,
      make: validated.value.make,
      model: validated.value.model,
      year: validated.value.year,
      variant: validated.value.variant || null,
      engine_type: validated.value.engineType || null,
      engine_capacity: validated.value.engineCapacity || null,
      fuel_type: validated.value.fuelType,
      transmission: validated.value.transmission,
      mileage: validated.value.mileage,
      vin: validated.value.vin || null,
      engine_number: validated.value.engineNumber || null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: uniqueRegError(error ?? { message: "" }) };

  await logCustomerActivity({
    customerId: customer.id,
    eventType: "vehicle_added",
    description: `${validated.value.make} ${validated.value.model} (${validated.value.registrationNumber}) added`,
    source: clientIp(h),
  });

  return { ok: true, id: data.id as string };
}

export async function updateVehicle(vehicleId: string, input: VehicleInput): Promise<VehicleResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!rateLimit(`vehicle:${clientIp(h)}`, 20, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const validated = validateVehicle(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("customer_vehicles").select("id").eq("id", vehicleId).eq("customer_id", customer.id).maybeSingle();
  if (!existing) return { ok: false, error: "That vehicle couldn't be found." };

  const { error } = await admin
    .from("customer_vehicles")
    .update({
      registration_number: validated.value.registrationNumber,
      make: validated.value.make,
      model: validated.value.model,
      year: validated.value.year,
      variant: validated.value.variant || null,
      engine_type: validated.value.engineType || null,
      engine_capacity: validated.value.engineCapacity || null,
      fuel_type: validated.value.fuelType,
      transmission: validated.value.transmission,
      mileage: validated.value.mileage,
      vin: validated.value.vin || null,
      engine_number: validated.value.engineNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error) return { ok: false, error: uniqueRegError(error) };
  return { ok: true, id: vehicleId };
}

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function deleteVehicle(vehicleId: string): Promise<SimpleResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!rateLimit(`vehicle:${clientIp(h)}`, 20, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("customer_vehicles").delete().eq("id", vehicleId).eq("customer_id", customer.id);
  if (error) return { ok: false, error: "We couldn't delete that vehicle. Please try again." };
  return { ok: true };
}

export type VehiclePhotoResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadVehiclePhoto(vehicleId: string, formData: FormData): Promise<VehiclePhotoResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!rateLimit(`vehicle-photo:${clientIp(h)}`, 10, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("customer_vehicles").select("id").eq("id", vehicleId).eq("customer_id", customer.id).maybeSingle();
  if (!existing) return { ok: false, error: "That vehicle couldn't be found." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a photo." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Please choose an image file." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Photo must be smaller than 5MB." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `vehicles/${vehicleId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage.from("vehicle-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return {
      ok: false,
      error: /bucket not found/i.test(uploadError.message) ? "Photo uploads aren't set up yet. Please try again later." : "We couldn't upload your photo. Please try again.",
    };
  }

  const { data } = admin.storage.from("vehicle-photos").getPublicUrl(path);
  const { error: updateError } = await admin
    .from("customer_vehicles")
    .update({ image_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", vehicleId);
  if (updateError) return { ok: false, error: "We couldn't save your photo. Please try again." };

  return { ok: true, url: data.publicUrl };
}
