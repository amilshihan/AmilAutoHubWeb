"use client";

import { useState } from "react";

export default function CopyReferralLink({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${referralCode}` : `/register?ref=${referralCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable; the code is still visible to copy by hand
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <span className="rounded-lg border border-charcoal/15 bg-surface px-3 py-2 font-mono text-sm font-bold tracking-wide text-charcoal">{referralCode}</span>
      <button type="button" onClick={copy} className="rounded-lg border border-charcoal/20 bg-white px-3.5 py-2 text-sm font-bold text-charcoal hover:bg-surface">
        {copied ? "Copied!" : "Copy referral link"}
      </button>
    </div>
  );
}
