"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { isValidEmail, isValidMobile } from "@/lib/customer/validation";
import { ADDRESS_TYPES, SRI_LANKA_DISTRICTS, SRI_LANKA_PROVINCES } from "@/lib/shop/config";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type ProfileInput = {
  dateOfBirth: string;
  gender: string;
  preferredLanguage: string;
  communicationPreference: string;
  customerType: string;
  additionalMobiles: string;
  additionalEmails: string;
};

export type ProfileResult = { ok: true } | { ok: false; error: string };

const GENDERS = ["male", "female", "other", "prefer_not_to_say"];
const LANGUAGES = ["English", "Sinhala"];
const COMMS = ["email", "whatsapp", "phone"];
const CUSTOMER_TYPES = ["individual", "garage", "workshop", "business", "dealer", "fleet"];

// The form sends extra contacts as a single comma/newline-separated string for simplicity;
// split, trim, dedupe and cap here rather than building a dynamic add/remove list UI.
function splitList(raw: string, max: number): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,\n]/)) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
    if (seen.size >= max) break;
  }
  return [...seen];
}

export async function updateCustomerProfile(input: ProfileInput): Promise<ProfileResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`profile:${clientIp(h)}`, 20, 10 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const dateOfBirth = (input.dateOfBirth ?? "").trim() || null;
  if (dateOfBirth) {
    const d = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(d.getTime()) || d > new Date() || d < new Date("1900-01-01")) {
      return { ok: false, error: "Please enter a valid date of birth." };
    }
  }
  const gender = (input.gender ?? "").trim() || null;
  if (gender && !GENDERS.includes(gender)) return { ok: false, error: "Please choose a valid gender option." };
  const preferredLanguage = (input.preferredLanguage ?? "").trim() || null;
  if (preferredLanguage && !LANGUAGES.includes(preferredLanguage)) return { ok: false, error: "Please choose a valid language." };
  const communicationPreference = (input.communicationPreference ?? "").trim() || null;
  if (communicationPreference && !COMMS.includes(communicationPreference)) {
    return { ok: false, error: "Please choose a valid contact preference." };
  }
  const customerType = (input.customerType ?? "individual").trim();
  if (!CUSTOMER_TYPES.includes(customerType)) return { ok: false, error: "Please choose a valid customer type." };

  const additionalMobiles = splitList(input.additionalMobiles ?? "", 5);
  if (additionalMobiles.some((m) => !isValidMobile(m))) return { ok: false, error: "One of the extra mobile numbers doesn't look valid." };
  const additionalEmails = splitList(input.additionalEmails ?? "", 5);
  if (additionalEmails.some((e) => !isValidEmail(e))) return { ok: false, error: "One of the extra email addresses doesn't look valid." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("customer_accounts")
    .update({
      date_of_birth: dateOfBirth,
      gender,
      preferred_language: preferredLanguage,
      communication_preference: communicationPreference,
      customer_type: customerType,
      additional_mobiles: additionalMobiles,
      additional_emails: additionalEmails,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customer.id);

  if (error) return { ok: false, error: "We couldn't save your profile. Please try again." };

  const source = clientIp(h);
  if (JSON.stringify(additionalMobiles) !== JSON.stringify(customer.additionalMobiles)) {
    await logCustomerActivity({ customerId: customer.id, eventType: "mobile_changed", description: "Additional mobile numbers updated", source });
  }
  if (JSON.stringify(additionalEmails) !== JSON.stringify(customer.additionalEmails)) {
    await logCustomerActivity({ customerId: customer.id, eventType: "email_changed", description: "Additional email addresses updated", source });
  }

  return { ok: true };
}

export type PhotoResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadProfilePhoto(formData: FormData): Promise<PhotoResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`avatar:${clientIp(h)}`, 10, 10 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a photo." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Please choose an image file." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Photo must be smaller than 5MB." };

  const admin = createAdminClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `avatars/${customer.id}-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage.from("customer-avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return {
      ok: false,
      error: /bucket not found/i.test(uploadError.message)
        ? "Photo uploads aren't set up yet. Please try again later."
        : "We couldn't upload your photo. Please try again.",
    };
  }

  const { data } = admin.storage.from("customer-avatars").getPublicUrl(path);
  const { error: updateError } = await admin
    .from("customer_accounts")
    .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
    .eq("id", customer.id);
  if (updateError) return { ok: false, error: "We couldn't save your photo. Please try again." };

  return { ok: true, url: data.publicUrl };
}

export type AddressInput = {
  addressType: string;
  recipientName: string;
  companyName: string;
  mobile: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  deliveryInstructions: string;
  defaultBilling: boolean;
  defaultShipping: boolean;
};

export type AddressResult = { ok: true; id: string } | { ok: false; error: string };

const clean = (s: string, max: number) => s.trim().slice(0, max);

function validateAddress(
  input: AddressInput
): { ok: false; error: string } | { ok: true; value: Required<Omit<AddressInput, "defaultBilling" | "defaultShipping">> } {
  const addressType = input.addressType || "home";
  if (!ADDRESS_TYPES.includes(addressType as (typeof ADDRESS_TYPES)[number])) return { ok: false, error: "Please choose a valid address type." };

  const recipientName = clean(input.recipientName ?? "", 100);
  if (recipientName.length < 2) return { ok: false, error: "Please enter the recipient's name." };
  const mobile = clean(input.mobile ?? "", 20);
  if (!isValidMobile(mobile)) return { ok: false, error: "Please enter a valid mobile number." };
  const addressLine1 = clean(input.addressLine1 ?? "", 200);
  if (addressLine1.length < 3) return { ok: false, error: "Please enter the address." };
  const city = clean(input.city ?? "", 100);
  if (!city) return { ok: false, error: "Please enter a city." };
  const district = clean(input.district ?? "", 50);
  if (!SRI_LANKA_DISTRICTS.includes(district)) return { ok: false, error: "Please choose a valid district." };
  const province = clean(input.province ?? "", 50);
  if (province && !SRI_LANKA_PROVINCES.includes(province)) return { ok: false, error: "Please choose a valid province." };

  return {
    ok: true,
    value: {
      addressType,
      recipientName,
      companyName: clean(input.companyName ?? "", 100),
      mobile,
      addressLine1,
      addressLine2: clean(input.addressLine2 ?? "", 200),
      city,
      district,
      province,
      postalCode: clean(input.postalCode ?? "", 12),
      deliveryInstructions: clean(input.deliveryInstructions ?? "", 300),
    },
  };
}

// Only one address can hold each default flag per customer (enforced by a partial unique
// index too, as a backstop) -- clear the existing default before setting a new one.
async function clearDefault(admin: ReturnType<typeof createAdminClient>, customerId: string, column: "is_default_billing" | "is_default_shipping") {
  await admin.from("customer_addresses").update({ [column]: false }).eq("customer_id", customerId).eq(column, true);
}

export async function addAddress(input: AddressInput): Promise<AddressResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`address:${clientIp(h)}`, 20, 10 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const validated = validateAddress(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const admin = createAdminClient();
  const { count } = await admin.from("customer_addresses").select("id", { count: "exact", head: true }).eq("customer_id", customer.id);
  const isFirst = !count;

  const defaultBilling = isFirst || input.defaultBilling;
  const defaultShipping = isFirst || input.defaultShipping;
  if (defaultBilling) await clearDefault(admin, customer.id, "is_default_billing");
  if (defaultShipping) await clearDefault(admin, customer.id, "is_default_shipping");

  const { data, error } = await admin
    .from("customer_addresses")
    .insert({
      customer_id: customer.id,
      address_type: validated.value.addressType,
      recipient_name: validated.value.recipientName,
      company_name: validated.value.companyName || null,
      mobile: validated.value.mobile,
      address_line1: validated.value.addressLine1,
      address_line2: validated.value.addressLine2 || null,
      city: validated.value.city,
      district: validated.value.district,
      province: validated.value.province || null,
      postal_code: validated.value.postalCode || null,
      delivery_instructions: validated.value.deliveryInstructions || null,
      is_default_billing: defaultBilling,
      is_default_shipping: defaultShipping,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "We couldn't save that address. Please try again." };

  await logCustomerActivity({ customerId: customer.id, eventType: "address_added", description: `${validated.value.addressType} address added`, source: clientIp(h) });

  return { ok: true, id: data.id as string };
}

export async function updateAddress(addressId: string, input: AddressInput): Promise<AddressResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`address:${clientIp(h)}`, 20, 10 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const validated = validateAddress(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("customer_addresses").select("id").eq("id", addressId).eq("customer_id", customer.id).maybeSingle();
  if (!existing) return { ok: false, error: "That address couldn't be found." };

  if (input.defaultBilling) await clearDefault(admin, customer.id, "is_default_billing");
  if (input.defaultShipping) await clearDefault(admin, customer.id, "is_default_shipping");

  const { error } = await admin
    .from("customer_addresses")
    .update({
      address_type: validated.value.addressType,
      recipient_name: validated.value.recipientName,
      company_name: validated.value.companyName || null,
      mobile: validated.value.mobile,
      address_line1: validated.value.addressLine1,
      address_line2: validated.value.addressLine2 || null,
      city: validated.value.city,
      district: validated.value.district,
      province: validated.value.province || null,
      postal_code: validated.value.postalCode || null,
      delivery_instructions: validated.value.deliveryInstructions || null,
      is_default_billing: input.defaultBilling,
      is_default_shipping: input.defaultShipping,
      updated_at: new Date().toISOString(),
    })
    .eq("id", addressId);

  if (error) return { ok: false, error: "We couldn't save that address. Please try again." };

  await logCustomerActivity({ customerId: customer.id, eventType: "address_changed", description: `${validated.value.addressType} address updated`, source: clientIp(h) });

  return { ok: true, id: addressId };
}

export async function deleteAddress(addressId: string): Promise<ProfileResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`address:${clientIp(h)}`, 20, 10 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", customer.id);
  if (error) return { ok: false, error: "We couldn't delete that address. Please try again." };
  return { ok: true };
}
