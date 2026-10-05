"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerSession, hashPassword, verifyPassword } from "@/lib/customer/auth";
import { normalizeEmail } from "@/lib/customer/validation";
import { clearRateLimit, clientIp, isRateLimited, rateLimit } from "@/lib/shop/rateLimit";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type LoginResult = { ok: true } | { ok: false; error: string };

const LOCK_MAX_FAILURES = 5;
const LOCK_WINDOW_MS = 15 * 60_000;

// Verified against when the email doesn't exist, so a wrong email and a wrong password take the
// same time and can't be told apart by how long the response takes.
let dummyHash: Promise<string> | null = null;

export async function loginCustomer(email: string, password: string): Promise<LoginResult> {
  const h = await headers();
  if (!(await rateLimit(`login:${clientIp(h)}`, 10, 15 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const normalized = normalizeEmail(typeof email === "string" ? email : "");
  if (!normalized || typeof password !== "string" || !password) {
    return { ok: false, error: "Please enter your email and password." };
  }

  // Account lockout: too many wrong passwords for this email locks sign-in for the rest of the window.
  // The counter is keyed by the email text itself, so it behaves the same for emails that don't exist.
  const failKey = `login-fail:${normalized}`;
  if (await isRateLimited(failKey, LOCK_MAX_FAILURES, LOCK_WINDOW_MS)) {
    return { ok: false, error: "Too many failed attempts for this account. Please wait 15 minutes, or reset your password." };
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
  const storedHash = (account?.password_hash as string | null | undefined) ?? null;
  dummyHash ??= hashPassword("not-a-real-password-used-for-timing");
  const passwordOk = await verifyPassword(password, storedHash ?? (await dummyHash));
  if (!account || !storedHash || !passwordOk) {
    await rateLimit(failKey, LOCK_MAX_FAILURES, LOCK_WINDOW_MS);
    return generic;
  }
  if (account.status !== "active") {
    return { ok: false, error: "This account is no longer active. Please contact us for help." };
  }

  await clearRateLimit(failKey);
  await admin.from("customer_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);
  await logCustomerActivity({ customerId: account.id as string, eventType: "login", source: clientIp(h) });
  await createCustomerSession(account.id as string);
  return { ok: true };
}
