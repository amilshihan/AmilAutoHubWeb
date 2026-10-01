"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setMarketingConsent } from "@/app/(shop)/account/marketing-actions";
import { CONSENT_TYPES, CONSENT_TYPE_HELP, CONSENT_TYPE_LABEL } from "@/lib/shop/config";
import { formatDate } from "@/lib/shop/format";
import type { ConsentRecord } from "@/lib/customer/marketingConsent";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-60 ${
        checked ? "border-blue-500 bg-blue-500" : "border-charcoal/15 bg-gray-100"
      }`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function MarketingPreferences({ consents }: { consents: ConsentRecord[] }) {
  const router = useRouter();
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // No local copy of `consents` is kept -- that invites exactly the bug this replaced:
  // a client-side optimistic copy that, once created, never heard about later server
  // state (a save from another tab, a slow/out-of-order response, anything). Rendering
  // straight from the prop and refreshing on success keeps this one source of truth.
  function toggle(consentType: string, currentlyGranted: boolean) {
    setError(null);
    setPendingType(consentType);
    startTransition(async () => {
      const result = await setMarketingConsent(consentType, !currentlyGranted);
      setPendingType(null);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-sm font-semibold text-deal">
          {error}
        </p>
      )}
      <ul className="divide-y divide-charcoal/10">
        {CONSENT_TYPES.map((type) => {
          const record = consents.find((r) => r.consentType === type)!;
          const granted = record.status === "granted";
          return (
            <li key={type} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-bold text-charcoal">{CONSENT_TYPE_LABEL[type]}</p>
                <p className="text-xs text-charcoal/55">{CONSENT_TYPE_HELP[type]}</p>
                {granted && record.consentedAt && <p className="mt-0.5 text-xs text-charcoal/40">Agreed {formatDate(record.consentedAt)}</p>}
                {!granted && record.withdrawnAt && <p className="mt-0.5 text-xs text-charcoal/40">Withdrawn {formatDate(record.withdrawnAt)}</p>}
              </div>
              <Toggle checked={granted} disabled={pendingType === type} onChange={() => toggle(type, granted)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
