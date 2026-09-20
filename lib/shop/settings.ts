import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ttlCache } from "@/lib/shop/cache";
import { normaliseSettings, type PaymentMethodId, type StoreSettings } from "@/lib/shop/settings-types";

// Falls back to the built-in defaults until migration 0016 has been applied.
export const getStoreSettings = ttlCache<StoreSettings>(30_000, async () => {
  const admin = createAdminClient();
  const { data } = await admin.from("store_settings").select("*").maybeSingle();
  return normaliseSettings(data as Record<string, unknown> | null);
});

// Gateway secrets only ever come from server environment variables.
export function payhereCredentials() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  return merchantId && merchantSecret ? { merchantId, merchantSecret } : null;
}

export function gatewayStatus() {
  return { payhere: payhereCredentials() !== null };
}

// Payment methods a customer can actually use for this order type right now.
export function availablePaymentMethods(settings: StoreSettings, fulfilment: "delivery" | "pickup"): PaymentMethodId[] {
  const offline: PaymentMethodId = fulfilment === "delivery" ? "cod" : "pay_at_pickup";
  const candidates: PaymentMethodId[] = [offline, "bank_transfer", "payhere"];
  return candidates.filter((id) => {
    if (!settings.paymentMethods[id]) return false;
    if (id === "bank_transfer") return Boolean(settings.bankTransfer.accountNumber && settings.bankTransfer.bankName);
    if (id === "payhere") return payhereCredentials() !== null;
    return true;
  });
}
