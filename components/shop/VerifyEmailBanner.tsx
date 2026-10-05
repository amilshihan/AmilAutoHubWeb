"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/app/(shop)/account/verification-actions";

export default function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function resend() {
    setMessage(null);
    startTransition(async () => {
      const result = await resendVerificationEmail();
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  return (
    <div role="status" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-bold">Please confirm your email address</p>
      <p className="mt-1">
        We sent a confirmation link to <strong>{email}</strong>. Confirming helps keep your account secure and lets us reach you about your orders.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={resend} disabled={pending} className="rounded-lg bg-charcoal px-3.5 py-1.5 text-xs font-bold text-white hover:bg-charcoal-soft disabled:opacity-60">
          {pending ? "Sending..." : "Resend the email"}
        </button>
        {message && <span className={message.ok ? "font-semibold text-green-800" : "font-semibold text-error"}>{message.text}</span>}
      </div>
    </div>
  );
}
