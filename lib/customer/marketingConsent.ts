import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_TYPES, type ConsentType } from "@/lib/shop/config";

export type ConsentRecord = {
  consentType: ConsentType;
  status: "granted" | "withdrawn";
  consentSource: string | null;
  consentedAt: string | null;
  withdrawnAt: string | null;
};

// Every channel always has a row in the result, even if the customer has never touched it
// -- "no record" and "withdrawn, never consented" are the same thing to the caller.
export async function getCustomerConsents(customerId: string): Promise<ConsentRecord[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_marketing_consents")
    .select("consent_type, status, consent_source, consented_at, withdrawn_at")
    .eq("customer_id", customerId);

  const byType = new Map((data ?? []).map((r) => [r.consent_type as ConsentType, r]));
  return CONSENT_TYPES.map((type) => {
    const row = byType.get(type);
    return {
      consentType: type,
      status: (row?.status as "granted" | "withdrawn") ?? "withdrawn",
      consentSource: (row?.consent_source as string | null) ?? null,
      consentedAt: (row?.consented_at as string | null) ?? null,
      withdrawnAt: (row?.withdrawn_at as string | null) ?? null,
    };
  });
}
