"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, fieldLabel, inputBase } from "@/lib/ui";

const CUSTOMER_TYPES: { value: string; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "garage", label: "Garage" },
  { value: "workshop", label: "Workshop" },
  { value: "business", label: "Business" },
  { value: "dealer", label: "Dealer" },
  { value: "fleet", label: "Fleet" },
];

const TIERS = ["Bronze", "Silver", "Gold", "Business"];

export default function CustomerCrmForm({
  accountId,
  customerType,
  tier,
  loyaltyPoints,
  notes,
}: {
  accountId: string;
  customerType: string;
  tier: string;
  loyaltyPoints: number;
  notes: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    customerType,
    tier,
    loyaltyPoints: String(loyaltyPoints),
    notes: notes ?? "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const points = Number(form.loyaltyPoints);
    if (!Number.isFinite(points) || points < 0) {
      setMessage({ kind: "error", text: "Loyalty points must be a non-negative number." });
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const roundedPoints = Math.round(points);
      const { error } = await supabase
        .from("customer_accounts")
        .update({
          customer_type: form.customerType,
          tier: form.tier,
          loyalty_points: roundedPoints,
          notes: form.notes.trim() || null,
        })
        .eq("id", accountId);
      if (error) {
        setMessage({ kind: "error", text: "Couldn't save. Please try again." });
        return;
      }

      if (roundedPoints !== loyaltyPoints) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const staffName = user ? (await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()).data?.full_name ?? null : null;
        await supabase.from("customer_activity_log").insert({
          customer_id: accountId,
          event_type: "loyalty_points_changed",
          description: `Staff adjusted points from ${loyaltyPoints} to ${roundedPoints}`,
          actor_type: "admin",
          actor_id: user?.id ?? null,
          actor_name: staffName,
          source: "admin_panel",
        });
      }

      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`sm:col-span-2 text-sm font-semibold ${message.kind === "ok" ? "text-green-700" : "text-error"}`}
        >
          {message.text}
        </p>
      )}
      <div>
        <label htmlFor="customerType" className={`${fieldLabel} mb-1 block`}>
          Customer type
        </label>
        <select
          id="customerType"
          className={inputBase}
          value={form.customerType}
          onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}
        >
          {CUSTOMER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="tier" className={`${fieldLabel} mb-1 block`}>
          Customer tier
        </label>
        <select id="tier" className={inputBase} value={form.tier} onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}>
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="loyaltyPoints" className={`${fieldLabel} mb-1 block`}>
          Loyalty points
        </label>
        <input
          id="loyaltyPoints"
          type="number"
          min={0}
          step={1}
          className={inputBase}
          value={form.loyaltyPoints}
          onChange={(e) => setForm((f) => ({ ...f, loyaltyPoints: e.target.value }))}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notes" className={`${fieldLabel} mb-1 block`}>
          Notes <span className="font-normal text-muted">(internal, not visible to the customer)</span>
        </label>
        <textarea
          id="notes"
          rows={4}
          className={inputBase}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="e.g. Preferred delivery window, account history, special pricing notes…"
        />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} sm:col-span-2`}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
