"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerSession, hashPassword } from "@/lib/customer/auth";
import { isValidEmail, isValidMobile, normalizeEmail } from "@/lib/customer/validation";
import { passwordProblem } from "@/lib/customer/passwordPolicy";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { findCustomerByReferralCode, REFERRAL_SIGNUP_BONUS } from "@/lib/customer/loyalty";
import { logCustomerActivity } from "@/lib/customer/activityLog";
import { issueVerificationEmail } from "@/lib/customer/verification";
import { siteUrl } from "@/lib/site";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  referralCode: string;
};

export type RegisterResult = { ok: true } | { ok: false; error: string };

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export async function registerCustomer(input: RegisterInput): Promise<RegisterResult> {
  const h = await headers();
  if (!(await rateLimit(`register:${clientIp(h)}`, 8, 15 * 60_000))) {
    return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
  }

  const firstName = clean(input.firstName, 80);
  const lastName = clean(input.lastName, 80);
  const email = normalizeEmail(clean(input.email, 254));
  const mobile = clean(input.mobile, 20);
  const password = typeof input.password === "string" ? input.password : "";

  if (firstName.length < 1) return { ok: false, error: "Please enter your first name." };
  if (lastName.length < 1) return { ok: false, error: "Please enter your last name." };
  if (!isValidEmail(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!isValidMobile(mobile)) return { ok: false, error: "Please enter a valid mobile number, e.g. 077 123 4567." };
  const weak = passwordProblem(password, { email, firstName, lastName, mobile });
  if (weak) return { ok: false, error: weak };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("customer_accounts").select("id").eq("email", email).maybeSingle();
  if (existing) return { ok: false, error: "An account with that email already exists. Try signing in instead." };

  const referralCode = clean(input.referralCode, 20);
  let referredBy: string | null = null;
  if (referralCode) {
    const referrer = await findCustomerByReferralCode(referralCode);
    if (!referrer) return { ok: false, error: "That referral code doesn't look right. Please check and try again." };
    referredBy = referrer.id;
  }

  const passwordHash = await hashPassword(password);
  const { data: created, error } = await admin
    .from("customer_accounts")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email,
      mobile,
      password_hash: passwordHash,
      referred_by_customer_id: referredBy,
      last_login_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      ok: false,
      error: error?.code === "23505" ? "An account with that email already exists. Try signing in instead." : "We couldn't create your account. Please try again.",
    };
  }

  if (referredBy) {
    await admin.rpc("grant_referral_bonus", {
      p_customer_id: created.id,
      p_points: REFERRAL_SIGNUP_BONUS,
      p_description: "Welcome bonus for using a referral code",
    });
  }

  const source = clientIp(h);
  await logCustomerActivity({ customerId: created.id as string, eventType: "account_created", source });
  await logCustomerActivity({ customerId: created.id as string, eventType: "login", description: "First login after registration", source });

  const base = await siteUrl();
  after(() => issueVerificationEmail(created.id as string, base));

  await createCustomerSession(created.id as string);
  return { ok: true };
}
