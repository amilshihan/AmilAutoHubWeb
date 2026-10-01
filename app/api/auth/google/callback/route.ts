import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerSession } from "@/lib/customer/auth";
import { exchangeCodeForProfile, googleEnabled } from "@/lib/customer/google";
import { STATE_COOKIE } from "@/app/api/auth/google/start/route";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url));

  if (!googleEnabled()) return fail("google_unavailable");
  if (url.searchParams.get("error")) return fail("google_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) return fail("google_invalid_state");

  let profile;
  try {
    profile = await exchangeCodeForProfile(code);
  } catch (err) {
    console.error("Google sign-in failed:", err instanceof Error ? err.message : err);
    return fail("google_failed");
  }
  if (!profile.email || !profile.emailVerified) return fail("google_no_email");

  const admin = createAdminClient();
  const email = profile.email.toLowerCase();

  const byGoogle = await admin.from("customer_accounts").select("id, status").eq("google_id", profile.sub).maybeSingle();
  let account = byGoogle.data;

  if (!account) {
    // Same email already registered with a password: link the Google identity to it
    // rather than creating a second account.
    const byEmail = await admin.from("customer_accounts").select("id, status").eq("email", email).maybeSingle();
    if (byEmail.data) {
      const { error: linkError } = await admin
        .from("customer_accounts")
        .update({ google_id: profile.sub, avatar_url: profile.picture, email_verified: true })
        .eq("id", byEmail.data.id);
      if (linkError) return fail("google_failed");
      account = byEmail.data;
    }
  }

  let isNewAccount = false;
  if (!account) {
    const { data: created, error: insertError } = await admin
      .from("customer_accounts")
      .insert({
        first_name: profile.givenName || "Customer",
        last_name: profile.familyName || "",
        email,
        password_hash: null,
        auth_provider: "google",
        google_id: profile.sub,
        avatar_url: profile.picture,
        email_verified: true,
        last_login_at: new Date().toISOString(),
      })
      .select("id, status")
      .single();
    if (insertError || !created) {
      console.error("Google sign-in account creation failed:", insertError?.message);
      return fail("google_failed");
    }
    account = created;
    isNewAccount = true;
  } else {
    await admin.from("customer_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", account.id);
  }

  if (account.status !== "active") return fail("google_suspended");

  if (isNewAccount) await logCustomerActivity({ customerId: account.id, eventType: "account_created", source: "google" });
  await logCustomerActivity({ customerId: account.id, eventType: "login", source: "google" });

  await createCustomerSession(account.id);
  return NextResponse.redirect(new URL("/account", url));
}
