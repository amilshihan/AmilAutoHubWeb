"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PasswordStrengthMeter from "@/components/shop/PasswordStrengthMeter";
import { resetPassword } from "@/app/(shop)/reset-password/actions";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("The two passwords don't match.");
    startTransition(async () => {
      const result = await resetPassword(token, password);
      if (result.ok) {
        router.push("/account");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      {error && (
        <div role="alert" className="rounded-lg border border-deal/30 bg-deal-soft p-3 text-sm text-charcoal">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-bold text-charcoal">
          New password
        </label>
        <input
          id="new-password"
          required
          type="password"
          minLength={10}
          autoComplete="new-password"
          placeholder="At least 10 characters"
          className={field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-bold text-charcoal">
          Confirm new password
        </label>
        <input id="confirm-password" required type="password" autoComplete="new-password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save new password"}
      </button>
    </form>
  );
}
