"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, fieldLabel, inputBase } from "@/lib/ui";
import SignOutButton from "@/components/admin/SignOutButton";

// Second step of admin sign-in: the 6-digit code from the authenticator app.
export default function AdminMfaPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.replace("/admin/login");
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const factor = data?.totp?.[0];
      if (error || !factor) return router.replace("/admin");
      setFactorId(factor.id);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setLoading(false);
      return setError(challenge.error.message);
    }
    const verified = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: code.trim() });
    setLoading(false);
    if (verified.error) {
      setCode("");
      return setError("That code isn't right, or it has expired. Open your authenticator app and try the current code.");
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Two-factor sign-in</h1>
          <p className="text-muted mt-1">Enter the 6-digit code from your authenticator app.</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border border-card p-6 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-error-light text-error text-sm px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="code" className={fieldLabel}>
              Code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              disabled={!ready}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputBase} mt-1 text-center text-lg tracking-[0.4em]`}
            />
          </div>
          <button type="submit" disabled={loading || !ready || code.length !== 6} className={`${btnPrimary} w-full`}>
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <SignOutButton variant="light" />
        </div>
      </div>
    </div>
  );
}
