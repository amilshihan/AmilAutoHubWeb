"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearCustomerSession, getCurrentCustomer, hashPassword, verifyPassword } from "@/lib/customer/auth";
import { passwordProblem } from "@/lib/customer/passwordPolicy";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type SecurityResult = { ok: true } | { ok: false; error: string };

export async function changePassword(currentPassword: string, newPassword: string): Promise<SecurityResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`password:${clientIp(h)}`, 8, 15 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  if (customer.authProvider !== "password") {
    return { ok: false, error: "Your account signs in with Google, so there's no password to change." };
  }
  const weak = passwordProblem(newPassword, { email: customer.email, firstName: customer.firstName, lastName: customer.lastName, mobile: customer.mobile ?? undefined });
  if (weak) return { ok: false, error: weak };

  const admin = createAdminClient();
  const { data } = await admin.from("customer_accounts").select("password_hash").eq("id", customer.id).maybeSingle();
  if (!data?.password_hash || !(await verifyPassword(currentPassword, data.password_hash))) {
    return { ok: false, error: "Your current password is incorrect." };
  }

  const newHash = await hashPassword(newPassword);
  const { error } = await admin.from("customer_accounts").update({ password_hash: newHash, updated_at: new Date().toISOString() }).eq("id", customer.id);
  if (error) return { ok: false, error: "We couldn't update your password. Please try again." };

  await logCustomerActivity({ customerId: customer.id, eventType: "password_changed", source: clientIp(h) });
  return { ok: true };
}

export async function deleteAccount(password: string): Promise<SecurityResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!(await rateLimit(`delete-account:${clientIp(h)}`, 5, 15 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const admin = createAdminClient();
  if (customer.authProvider === "password") {
    const { data } = await admin.from("customer_accounts").select("password_hash").eq("id", customer.id).maybeSingle();
    if (!data?.password_hash || !(await verifyPassword(password, data.password_hash))) {
      return { ok: false, error: "Your password is incorrect." };
    }
  }

  const { error } = await admin.from("customer_accounts").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", customer.id);
  if (error) return { ok: false, error: "We couldn't delete your account. Please try again." };

  await logCustomerActivity({ customerId: customer.id, eventType: "account_deleted", actorType: "customer", source: clientIp(h) });
  await clearCustomerSession();
  return { ok: true };
}
