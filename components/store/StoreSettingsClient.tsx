"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, btnSecondary, cardSurface, fieldLabel, helperText, inputBase, sectionTitle } from "@/lib/ui";
import { PAYMENT_LABEL } from "@/lib/shop/config";
import type { PaymentMethodId, StoreSettings } from "@/lib/shop/settings-types";

const TABS = ["General", "Delivery", "Payments"] as const;
type Tab = (typeof TABS)[number];

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className={helperText}>{hint}</span>}
      </span>
    </label>
  );
}

export default function StoreSettingsClient({
  initial,
  gateways,
  siteUrl,
}: {
  initial: StoreSettings;
  gateways: { payhere: boolean };
  siteUrl: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("General");
  const [s, setS] = useState<StoreSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const setMethod = (id: PaymentMethodId, enabled: boolean) =>
    setS((cur) => ({ ...cur, paymentMethods: { ...cur.paymentMethods, [id]: enabled } }));
  const setBank = (key: keyof StoreSettings["bankTransfer"], value: string) =>
    setS((cur) => ({ ...cur, bankTransfer: { ...cur.bankTransfer, [key]: value } }));
  const setZone = (id: string, patch: Partial<StoreSettings["deliveryZones"][number]>) =>
    setS((cur) => ({ ...cur, deliveryZones: cur.deliveryZones.map((z) => (z.id === id ? { ...z, ...patch } : z)) }));

  const bankIncomplete =
    s.paymentMethods.bank_transfer && (!s.bankTransfer.bankName.trim() || !s.bankTransfer.accountNumber.trim());

  async function save() {
    setMessage(null);
    setSaving(true);
    const { error } = await supabase
      .from("store_settings")
      .update({
        whatsapp_number: s.whatsappNumber.trim() || null,
        pickup_location: s.pickupLocation.trim() || null,
        delivery_zones: s.deliveryZones,
        payment_methods: s.paymentMethods,
        bank_transfer: s.bankTransfer,
        payhere_sandbox: s.payhereSandbox,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: error.message });
      return;
    }
    setMessage({ kind: "ok", text: "Saved. The website picks up changes within about 30 seconds." });
    router.refresh();
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Online Store</h1>
          <p className="text-sm text-muted mt-1">
            Website settings for delivery, contact details and payments. Products are managed under{" "}
            <Link href="/admin/products" className="text-accent hover:underline">
              Website products
            </Link>{" "}
            (show/hide, featured, images and discounts).
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/" target="_blank" className={btnSecondary}>
            View website
          </Link>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {message && (
        <div
          role={message.kind === "error" ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${
            message.kind === "ok" ? "border-green-300 bg-green-50 text-green-800" : "border-error/30 bg-error-light text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-card">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && (
        <div className={`${cardSurface} p-5 space-y-5`}>
          <h2 className={sectionTitle}>Contact &amp; pickup</h2>
          <div>
            <label className={fieldLabel} htmlFor="wa">
              WhatsApp number
            </label>
            <input
              id="wa"
              className={`${inputBase} mt-1`}
              placeholder="e.g. 077 370 0001 (leave blank to use the shop phone from Settings)"
              value={s.whatsappNumber}
              onChange={(e) => setS({ ...s, whatsappNumber: e.target.value })}
            />
            <p className={`${helperText} mt-1`}>Used by every &quot;Order via WhatsApp&quot; button on the website.</p>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="pickup">
              Pickup location name
            </label>
            <input
              id="pickup"
              className={`${inputBase} mt-1`}
              value={s.pickupLocation}
              onChange={(e) => setS({ ...s, pickupLocation: e.target.value })}
            />
            <p className={`${helperText} mt-1`}>
              The shop address and phone come from Settings in the POS.
            </p>
          </div>
        </div>
      )}

      {tab === "Delivery" && (
        <div className={`${cardSurface} p-5 space-y-4`}>
          <h2 className={sectionTitle}>Delivery options &amp; charges</h2>
          <p className={helperText}>Customers choose one of the enabled options at checkout. Pickup is always free.</p>
          {s.deliveryZones.map((z) => (
            <div key={z.id} className="grid gap-3 rounded-lg border border-card p-4 sm:grid-cols-[1fr_9rem_10rem]">
              <div className="sm:col-span-3">
                <Toggle checked={z.enabled} onChange={(v) => setZone(z.id, { enabled: v })} label={`Offer "${z.label}"`} />
              </div>
              <div>
                <label className={fieldLabel}>Label shown to customers</label>
                <input className={`${inputBase} mt-1`} value={z.label} onChange={(e) => setZone(z.id, { label: e.target.value })} />
              </div>
              <div>
                <label className={fieldLabel}>Charge (Rs.)</label>
                <input
                  type="number"
                  min={0}
                  className={`${inputBase} mt-1`}
                  value={z.fee}
                  onChange={(e) => setZone(z.id, { fee: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={fieldLabel}>Delivery time</label>
                <input className={`${inputBase} mt-1`} value={z.eta} onChange={(e) => setZone(z.id, { eta: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Payments" && (
        <div className="space-y-4">
          <div className={`${cardSurface} p-5 space-y-4`}>
            <h2 className={sectionTitle}>Pay in person</h2>
            <Toggle checked={s.paymentMethods.cod} onChange={(v) => setMethod("cod", v)} label={PAYMENT_LABEL.cod} hint="For delivery orders. The customer pays the courier in cash." />
            <Toggle checked={s.paymentMethods.pay_at_pickup} onChange={(v) => setMethod("pay_at_pickup", v)} label={PAYMENT_LABEL.pay_at_pickup} hint="For pickup orders. The customer pays at the counter." />
          </div>

          <div className={`${cardSurface} p-5 space-y-4`}>
            <h2 className={sectionTitle}>Bank transfer</h2>
            <Toggle
              checked={s.paymentMethods.bank_transfer}
              onChange={(v) => setMethod("bank_transfer", v)}
              label="Accept bank transfers"
              hint="Customers see your account details after ordering and send the slip on WhatsApp. Mark the order paid once the money arrives."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["bankName", "Bank"],
                  ["accountName", "Account name"],
                  ["accountNumber", "Account number"],
                  ["branch", "Branch"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className={fieldLabel}>{label}</label>
                  <input className={`${inputBase} mt-1`} value={s.bankTransfer[key]} onChange={(e) => setBank(key, e.target.value)} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className={fieldLabel}>Extra instructions (optional)</label>
                <textarea rows={2} className={`${inputBase} mt-1`} value={s.bankTransfer.instructions} onChange={(e) => setBank("instructions", e.target.value)} />
              </div>
            </div>
            {bankIncomplete && (
              <p className="text-sm font-semibold text-amber-700">
                Enter at least the bank and account number, or bank transfer won&apos;t be shown at checkout.
              </p>
            )}
          </div>

          <div className={`${cardSurface} p-5 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={sectionTitle}>PayHere (cards &amp; online banking)</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  gateways.payhere ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {gateways.payhere ? "Credentials found" : "Credentials missing"}
              </span>
            </div>
            <Toggle
              checked={s.paymentMethods.payhere}
              onChange={(v) => setMethod("payhere", v)}
              label="Accept online payments with PayHere"
              hint={gateways.payhere ? undefined : "Won't appear at checkout until the credentials below are set on the server."}
            />
            <Toggle
              checked={s.payhereSandbox}
              onChange={(v) => setS({ ...s, payhereSandbox: v })}
              label="Sandbox (test) mode"
              hint="Keep this on while testing with a PayHere sandbox merchant account. Turn it off to take real payments."
            />
            <div className="rounded-lg bg-surface p-4 text-sm text-ink space-y-2">
              <p className="font-semibold">Setup</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted">
                <li>
                  Create a merchant account at payhere.lk and add this website&apos;s domain under Settings → Domains &amp; Credentials.
                </li>
                <li>
                  Set these server environment variables (Vercel project settings or <code>.env.local</code>), then redeploy:{" "}
                  <code>PAYHERE_MERCHANT_ID</code>, <code>PAYHERE_MERCHANT_SECRET</code> and <code>NEXT_PUBLIC_SITE_URL</code>.
                </li>
                <li>
                  PayHere sends payment confirmations to <code className="break-all">{siteUrl}/api/shop/payhere/notify</code>. This must be a public
                  HTTPS address, so it won&apos;t work from localhost.
                </li>
              </ol>
              <p className={helperText}>The merchant secret is never stored in the database or shown here.</p>
            </div>
          </div>

          <div className={`${cardSurface} p-5`}>
            <h2 className={sectionTitle}>Other gateways</h2>
            <p className="mt-1 text-sm text-muted">
              Stripe, Genie, FriMi, WebXPay and others are not connected yet. Each needs its own merchant account and
              credentials; they plug in the same way as PayHere. Tell me which one you have an account with and I&apos;ll add it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
