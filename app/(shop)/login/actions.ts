"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerSession, verifyPassword } from "@/lib/customer/auth";
import { normalizeEmail } from "@/lib/customer/validation";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginCustomer(email: string, password: string): Promise<LoginResult> {
  const h = await headers();
  if (!rateLimit(`login:${clientIp(h)}`, 10, 15 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const normalized = normalizeEmail(typeof email === "string" ? email : "");
  if (!normalized || typeof password !== "string" || !password) {
    return { ok: false, error: "Please enter your email and password." };
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("customer_accounts")
    .select("id, password_hash, status")
    .eq("email", normalized)
    .maybeSingle();

  // Same message whether the email doesn't exist or the password is wrong, so we don't
  // reveal which registered emails exist.
  const generic = { ok: false as const, error: "Incorrect email or password." };
  if (!account) return generic;
  if (!(await verifyPassword(password, account.password_hash as string))) return generic;
  if (account.status !== "active") {
    return { ok: false, error: "This account is no longer active. Please contact us for help." };
  }

  await admin.from("customer_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);
  await logCustomerActivity({ customerId: account.id as string, eventType: "login", source: clientIp(h) });
  await createCustomerSession(account.id as string);
  return { ok: true };
}
