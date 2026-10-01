"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateCustomerProfile } from "@/app/(shop)/account/actions";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

const CUSTOMER_TYPES: { value: string; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "garage", label: "Garage" },
  { value: "workshop", label: "Workshop" },
  { value: "business", label: "Business" },
  { value: "dealer", label: "Dealer" },
  { value: "fleet", label: "Fleet" },
];

export default function ProfileDetailsForm({
  dateOfBirth,
  gender,
  preferredLanguage,
  communicationPreference,
  customerType,
  additionalMobiles,
  additionalEmails,
}: {
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguage: string | null;
  communicationPreference: string | null;
  customerType: string;
  additionalMobiles: string[];
  additionalEmails: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    dateOfBirth: dateOfBirth ?? "",
    gender: gender ?? "",
    preferredLanguage: preferredLanguage ?? "",
    communicationPreference: communicationPreference ?? "",
    customerType,
    additionalMobiles: additionalMobiles.join(", "),
    additionalEmails: additionalEmails.join(", "),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateCustomerProfile(form);
      if (result.ok) {
        setMessage({ kind: "ok", text: "Saved." });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`sm:col-span-2 text-sm font-semibold ${message.kind === "ok" ? "text-stock" : "text-deal"}`}
        >
          {message.text}
        </p>
      )}
      <div>
        <label htmlFor="dob" className={label}>
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          className={field}
          value={form.dateOfBirth}
          onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div>
        <label htmlFor="gender" className={label}>
          Gender
        </label>
        <select id="gender" className={field} value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label htmlFor="language" className={label}>
          Preferred language
        </label>
        <select
          id="language"
          className={field}
          value={form.preferredLanguage}
          onChange={(e) => setForm((f) => ({ ...f, preferredLanguage: e.target.value }))}
        >
          <option value="">Not set</option>
          <option value="English">English</option>
          <option value="Sinhala">Sinhala</option>
        </select>
      </div>
      <div>
        <label htmlFor="comm" className={label}>
          Contact me by
        </label>
        <select
          id="comm"
          className={field}
          value={form.communicationPreference}
          onChange={(e) => setForm((f) => ({ ...f, communicationPreference: e.target.value }))}
        >
          <option value="">Not set</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Call</option>
        </select>
      </div>
      <div>
        <label htmlFor="customerType" className={label}>
          Customer type
        </label>
        <select
          id="customerType"
          className={field}
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
      <div />
      <div>
        <label htmlFor="extraMobiles" className={label}>
          Other mobile numbers <span className="font-normal text-charcoal/50">(comma-separated, optional)</span>
        </label>
        <input
          id="extraMobiles"
          type="text"
          placeholder="e.g. 0771234567, 0112223344"
          className={field}
          value={form.additionalMobiles}
          onChange={(e) => setForm((f) => ({ ...f, additionalMobiles: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="extraEmails" className={label}>
          Other email addresses <span className="font-normal text-charcoal/50">(comma-separated, optional)</span>
        </label>
        <input
          id="extraEmails"
          type="text"
          placeholder="e.g. work@company.com"
          className={field}
          value={form.additionalEmails}
          onChange={(e) => setForm((f) => ({ ...f, additionalEmails: e.target.value }))}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="sm:col-span-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
