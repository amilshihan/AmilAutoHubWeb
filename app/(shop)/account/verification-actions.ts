"use server";

import { headers } from "next/headers";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { issueVerificationEmail } from "@/lib/customer/verification";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { siteUrl } from "@/lib/site";

export type ResendResult = { ok: true; message: string } | { ok: false; error: string };

export async function resendVerificationEmail(): Promise<ResendResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };
  if (customer.emailVerified) return { ok: true, message: "Your email address is already confirmed." };

  const h = await headers();
  if (!(await rateLimit(`verify-resend:${customer.id}`, 3, 60 * 60_000)) || !(await rateLimit(`verify-resend-ip:${clientIp(h)}`, 10, 60 * 60_000))) {
    return { ok: false, error: "You've asked for a few emails already. Please check your inbox (and spam folder), or try again in an hour." };
  }

  const sent = await issueVerificationEmail(customer.id, await siteUrl());
  return sent ? { ok: true, message: `We've sent a new link to ${customer.email}.` } : { ok: false, error: "We couldn't send the email just now. Please try again later." };
}
