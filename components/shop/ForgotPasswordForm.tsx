"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/(shop)/forgot-password/actions";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";

export default function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Forgot your password?</h1>
      <p className="mt-1 text-charcoal/65">Enter your email and we&apos;ll send you a link to choose a new one.</p>

      {sent ? (
        <div role="status" className="mt-6 rounded-2xl border border-stock/30 bg-stock-soft p-5 text-sm text-charcoal">
          <p className="font-bold">Check your email</p>
          <p className="mt-1">
            If there&apos;s an account for <strong>{email}</strong>, we&apos;ve sent a link to reset the password. It works for 60 minutes. Check your spam
            folder if you don&apos;t see it.
          </p>
          <p className="mt-2 text-charcoal/65">If you signed up with Google, there&apos;s no password to reset. Use &quot;Continue with Google&quot; on the sign-in page.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          {error && (
            <div role="alert" className="rounded-lg border border-deal/30 bg-deal-soft p-3 text-sm text-charcoal">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-bold text-charcoal">
              Email
            </label>
            <input id="email" required type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60"
          >
            {pending ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-charcoal/65">
        <Link href="/login" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
