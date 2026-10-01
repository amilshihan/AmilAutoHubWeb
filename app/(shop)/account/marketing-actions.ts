"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { CONSENT_TYPES, type ConsentType } from "@/lib/shop/config";

export type ConsentResult = { ok: true } | { ok: false; error: string };

// Always captured here, in the dedicated Marketing Preferences section -- never bundled
// into the registration form, per the data capture plan.
const CONSENT_SOURCE = "account_settings";

export async function setMarketingConsent(consentType: string, granted: boolean): Promise<ConsentResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  if (!CONSENT_TYPES.includes(consentType as ConsentType)) return { ok: false, error: "Unknown preference." };

  const h = await headers();
  if (!rateLimit(`consent:${clientIp(h)}`, 30, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("customer_marketing_consents").upsert(
    {
      customer_id: customer.id,
      consent_type: consentType,
      status: granted ? "granted" : "withdrawn",
      consent_source: CONSENT_SOURCE,
      consented_at: granted ? now : undefined,
      withdrawn_at: granted ? null : now,
      updated_at: now,
    },
    { onConflict: "customer_id,consent_type" }
  );

  if (error) return { ok: false, error: "We couldn't save that preference. Please try again." };
  return { ok: true };
}
