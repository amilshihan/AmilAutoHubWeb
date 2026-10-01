"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerCustomer } from "@/app/(shop)/register/actions";
import { GoogleIcon } from "@/components/shop/Icons";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function RegisterForm({ googleEnabled, initialReferralCode = "" }: { googleEnabled: boolean; initialReferralCode?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "", password: "", referralCode: initialReferralCode });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerCustomer(form);
      if (result.ok) {
        router.push("/account");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Create an account</h1>
      <p className="mt-1 text-charcoal/65">Save your details for faster checkout and order history.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        {error && (
          <div role="alert" className="rounded-lg border border-deal/30 bg-deal-soft p-3 text-sm text-charcoal">
            {error}
          </div>
        )}

        {googleEnabled && (
          <>
            <a
              href="/api/auth/google/start"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-charcoal/20 bg-white px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-surface"
            >
              <GoogleIcon /> Continue with Google
            </a>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              <span className="h-px flex-1 bg-charcoal/10" /> or <span className="h-px flex-1 bg-charcoal/10" />
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={label}>
              First name
            </label>
            <input id="firstName" required autoComplete="given-name" className={field} value={form.firstName} onChange={set("firstName")} />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>
              Last name
            </label>
            <input id="lastName" required autoComplete="family-name" className={field} value={form.lastName} onChange={set("lastName")} />
          </div>
        </div>
        <div>
          <label htmlFor="mobile" className={label}>
            Mobile number
          </label>
          <input id="mobile" required type="tel" autoComplete="tel" placeholder="077 123 4567" className={field} value={form.mobile} onChange={set("mobile")} />
        </div>
        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input id="email" required type="email" autoComplete="email" className={field} value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Password
          </label>
          <input
            id="password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
            className={field}
            value={form.password}
            onChange={set("password")}
          />
        </div>
        <div>
          <label htmlFor="referralCode" className={label}>
            Referral code <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <input
            id="referralCode"
            placeholder="e.g. AAH1A2B3C"
            className={`${field} uppercase`}
            value={form.referralCode}
            onChange={(e) => setForm((f) => ({ ...f, referralCode: e.target.value.toUpperCase() }))}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-sm text-charcoal/65">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
