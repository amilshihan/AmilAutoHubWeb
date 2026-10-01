"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginCustomer } from "@/app/(shop)/login/actions";
import { GoogleIcon } from "@/components/shop/Icons";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function LoginForm({ googleEnabled, initialError }: { googleEnabled: boolean; initialError?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginCustomer(email, password);
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
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Sign in</h1>
      <p className="mt-1 text-charcoal/65">Access your account and order history.</p>

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

        <div>
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input id="email" required type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Password
          </label>
          <input
            id="password"
            required
            type="password"
            autoComplete="current-password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-center text-sm text-charcoal/65">
          New here?{" "}
          <Link href="/register" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
