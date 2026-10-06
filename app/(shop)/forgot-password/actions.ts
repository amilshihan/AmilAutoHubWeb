"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthToken } from "@/lib/customer/authTokens";
import { logCustomerActivity } from "@/lib/customer/activityLog";
import { isValidEmail, normalizeEmail } from "@/lib/customer/validation";
import { sendAccountEmail } from "@/lib/email/accountEmail";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { siteUrl } from "@/lib/site";

export type ForgotResult = { ok: true } | { ok: false; error: string };

// Always answers the same way whether or not an account exists for the email, so this can't be
// used to find out who has an account. The lookup and the email happen after the response.
export async function requestPasswordReset(email: string): Promise<ForgotResult> {
  const h = await headers();
  const ip = clientIp(h);
  if (!(await rateLimit(`forgot-ip:${ip}`, 5, 15 * 60_000))) {
    return { ok: false, error: "Too many requests. Please try again in a few minutes." };
  }

  const normalized = normalizeEmail(typeof email === "string" ? email : "");
  if (!isValidEmail(normalized)) return { ok: false, error: "Please enter a valid email address." };

  // At most three reset emails per address per hour; beyond that, quietly send nothing.
  if (!(await rateLimit(`forgot-email:${normalized}`, 3, 60 * 60_000))) return { ok: true };

  const base = await siteUrl();
  after(async () => {
    try {
      const { data: account } = await createAdminClient()
        .from("customer_accounts")
        .select("id, first_name, status, auth_provider")
        .eq("email", normalized)
        .maybeSingle();
      if (!account || account.status !== "active" || account.auth_provider !== "password") return;

      const token = await createAuthToken(account.id as string, "password_reset", 60);
      await sendAccountEmail({
        to: normalized,
        firstName: account.first_name as string,
        kind: "password_reset",
        url: `${base}/reset-password?token=${encodeURIComponent(token)}`,
      });
      await logCustomerActivity({ customerId: account.id as string, eventType: "password_reset_requested", source: ip });
    } catch (e) {
      console.error("Password reset email failed:", e instanceof Error ? e.message : e);
    }
  });

  return { ok: true };
}
