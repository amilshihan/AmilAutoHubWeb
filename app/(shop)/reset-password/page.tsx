import type { Metadata } from "next";
import Link from "next/link";
import { peekAuthToken } from "@/lib/customer/authTokens";
import ResetPasswordForm from "@/components/shop/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = token ? await peekAuthToken(token, "password_reset") : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Choose a new password</h1>
      {valid && token ? (
        <>
          <p className="mt-1 text-charcoal/65">Enter a new password for your account.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div role="alert" className="mt-6 rounded-2xl border border-deal/30 bg-deal-soft p-5 text-sm text-charcoal">
          <p className="font-bold">This link is invalid or has expired.</p>
          <p className="mt-1">Reset links work once and expire after 60 minutes. You can ask for a new one.</p>
          <Link href="/forgot-password" className="mt-3 inline-flex rounded-lg bg-charcoal px-4 py-2 font-bold text-white hover:bg-charcoal-soft">
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}
