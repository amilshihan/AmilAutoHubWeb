"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeAuthToken, peekAuthToken } from "@/lib/customer/authTokens";
import { createCustomerSession, hashPassword } from "@/lib/customer/auth";
import { logCustomerActivity } from "@/lib/customer/activityLog";
import { passwordProblem } from "@/lib/customer/passwordPolicy";
import { clearRateLimit, clientIp, rateLimit } from "@/lib/shop/rateLimit";

export type ResetResult = { ok: true } | { ok: false; error: string };

const INVALID = "This link is invalid or has expired. Please request a new one.";

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const h = await headers();
  if (!(await rateLimit(`reset-ip:${clientIp(h)}`, 10, 15 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  // Check the link and the new password first, so a weak password doesn't use up the link.
  const peeked = await peekAuthToken(token, "password_reset");
  if (!peeked) return { ok: false, error: INVALID };

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("customer_accounts")
    .select("id, email, first_name, last_name, mobile, status, auth_provider")
    .eq("id", peeked.customerId)
    .maybeSingle();
  if (!account || account.status !== "active" || account.auth_provider !== "password") return { ok: false, error: INVALID };

  const weak = passwordProblem(newPassword, {
    email: account.email as string,
    firstName: account.first_name as string,
    lastName: account.last_name as string,
    mobile: (account.mobile as string | null) ?? undefined,
  });
  if (weak) return { ok: false, error: weak };

  const used = await consumeAuthToken(token, "password_reset");
  if (!used) return { ok: false, error: INVALID };

  const passwordHash = await hashPassword(newPassword);
  const { error } = await admin
    .from("customer_accounts")
    // Following the emailed link also proves the customer controls this address.
    .update({ password_hash: passwordHash, email_verified: true, updated_at: new Date().toISOString() })
    .eq("id", account.id);
  if (error) return { ok: false, error: "We couldn't update your password. Please request a new link and try again." };

  await clearRateLimit(`login-fail:${account.email as string}`);
  await logCustomerActivity({ customerId: account.id as string, eventType: "password_changed", description: "Password reset by email link", source: clientIp(h) });
  await createCustomerSession(account.id as string);
  return { ok: true };
}
