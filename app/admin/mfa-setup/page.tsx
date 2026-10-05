"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, cardSurface, fieldLabel, helperText, inputBase } from "@/lib/ui";

type Enrolling = { factorId: string; qr: string; secret: string };

// Lets a staff member turn two-factor sign-in on (scan a QR code with an authenticator app) or off.
export default function AdminMfaSetupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return router.replace("/admin/login");
    const { data } = await supabase.auth.mfa.listFactors();
    setVerifiedFactorId(data?.totp?.[0]?.id ?? null);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.replace("/admin/login");
      const { data } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      setVerifiedFactorId(data?.totp?.[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  async function startEnrol() {
    setError(null);
    setNotice(null);
    setBusy(true);
    // Clear any half-finished earlier attempt first (a name can only be used once).
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString()}` });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Two-factor sign-in couldn't be started.");
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnrol(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setError(null);
    setBusy(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (challenge.error) {
      setBusy(false);
      return setError(challenge.error.message);
    }
    const verified = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: challenge.data.id, code: code.trim() });
    setBusy(false);
    if (verified.error) return setError("That code isn't right. Check the time on your phone and try the current code.");
    setEnrolling(null);
    setCode("");
    setNotice("Two-factor sign-in is now on. You'll be asked for a code each time you sign in.");
    await load();
    router.refresh();
  }

  async function cancelEnrol() {
    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    setEnrolling(null);
    setCode("");
  }

  async function turnOff() {
    if (!verifiedFactorId) return;
    if (!window.confirm("Turn off two-factor sign-in for your account?")) return;
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    setBusy(false);
    if (error) return setError(error.message);
    setNotice("Two-factor sign-in is off.");
    await load();
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-accent hover:underline">
            ← Back to admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-ink">Two-factor sign-in</h1>
          <p className="mt-1 text-sm text-muted">
            Adds a second step to signing in: a 6-digit code from an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy and similar). A stolen
            password alone then isn&apos;t enough to get into the admin.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            {notice}
          </div>
        )}

        <div className={`${cardSurface} space-y-4 p-5`}>
          {loading ? (
            <p className={helperText}>Loading…</p>
          ) : enrolling ? (
            <form onSubmit={confirmEnrol} className="space-y-4">
              <p className="text-sm text-ink">
                <strong>1.</strong> Open your authenticator app and scan this QR code.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolling.qr} alt="QR code for your authenticator app" className="mx-auto h-48 w-48 rounded-lg border border-card bg-white p-2" />
              <p className="text-xs text-muted">
                Can&apos;t scan it? Enter this key in the app instead: <code className="break-all rounded bg-surface px-1.5 py-0.5 text-ink">{enrolling.secret}</code>
              </p>
              <p className="text-sm text-ink">
                <strong>2.</strong> Type the 6-digit code the app shows.
              </p>
              <div>
                <label htmlFor="code" className={fieldLabel}>
                  Code
                </label>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${inputBase} mt-1 text-center text-lg tracking-[0.4em]`}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy || code.length !== 6} className={btnPrimary}>
                  {busy ? "Checking…" : "Turn on"}
                </button>
                <button type="button" onClick={cancelEnrol} disabled={busy} className={btnSecondary}>
                  Cancel
                </button>
              </div>
            </form>
          ) : verifiedFactorId ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-green-700">✓ Two-factor sign-in is on for your account.</p>
              <button type="button" onClick={turnOff} disabled={busy} className={btnSecondary}>
                Turn off
              </button>
              <p className={helperText}>To turn it off you must have signed in with a code this session.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink">Two-factor sign-in is currently <strong>off</strong>.</p>
              <button type="button" onClick={startEnrol} disabled={busy} className={btnPrimary}>
                {busy ? "Starting…" : "Set up two-factor sign-in"}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-muted">
          Keep your phone safe. If you lose access to your authenticator app, another administrator can remove your second factor in Supabase (Authentication → Users → your
          user → remove factor) so you can sign in again and set it up on a new phone.
        </p>
      </div>
    </div>
  );
}
