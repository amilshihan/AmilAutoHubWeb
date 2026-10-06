import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeAuthToken } from "@/lib/customer/authTokens";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const used = token ? await consumeAuthToken(token, "email_verify") : null;

  if (used) {
    await createAdminClient().from("customer_accounts").update({ email_verified: true, updated_at: new Date().toISOString() }).eq("id", used.customerId);
    await logCustomerActivity({ customerId: used.customerId, eventType: "email_verified" });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 text-center">
      {used ? (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Email confirmed</h1>
          <p className="mt-3 text-charcoal/70">Thank you. Your email address is confirmed.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Link not valid</h1>
          <p className="mt-3 text-charcoal/70">
            This confirmation link has already been used or has expired. If you already confirmed your email, you&apos;re all set. Otherwise, sign in and use
            &quot;Resend the email&quot; on your account page.
          </p>
        </>
      )}
      <Link href="/account" className="mt-6 inline-flex rounded-lg bg-amil px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover">
        Go to my account
      </Link>
    </div>
  );
}
