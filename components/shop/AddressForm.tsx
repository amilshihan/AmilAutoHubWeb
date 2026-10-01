"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAddress, updateAddress, type AddressInput } from "@/app/(shop)/account/actions";
import { ADDRESS_TYPES, ADDRESS_TYPE_LABEL, SRI_LANKA_DISTRICTS, SRI_LANKA_PROVINCES } from "@/lib/shop/config";
import type { CustomerAddress } from "@/lib/customer/addresses";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

const emptyForm: AddressInput = {
  addressType: "home",
  recipientName: "",
  companyName: "",
  mobile: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
  deliveryInstructions: "",
  defaultBilling: false,
  defaultShipping: false,
};

function fromAddress(a: CustomerAddress): AddressInput {
  return {
    addressType: a.addressType,
    recipientName: a.recipientName,
    companyName: a.companyName ?? "",
    mobile: a.mobile,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 ?? "",
    city: a.city,
    district: a.district,
    province: a.province ?? "",
    postalCode: a.postalCode ?? "",
    deliveryInstructions: a.deliveryInstructions ?? "",
    defaultBilling: a.isDefaultBilling,
    defaultShipping: a.isDefaultShipping,
  };
}

export default function AddressForm({ existing, onDone }: { existing?: CustomerAddress; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(existing ? fromAddress(existing) : emptyForm);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = existing ? await updateAddress(existing.id, form) : await addAddress(form);
      if (result.ok) {
        router.refresh();
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-charcoal/10 bg-surface p-4 sm:grid-cols-2">
      {error && (
        <p role="alert" className="sm:col-span-2 text-sm font-semibold text-deal">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="addressType" className={label}>
          Address type
        </label>
        <select id="addressType" className={field} value={form.addressType} onChange={(e) => set("addressType", e.target.value)}>
          {ADDRESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {ADDRESS_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="recipientName" className={label}>
          Recipient name
        </label>
        <input id="recipientName" className={field} value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} required />
      </div>
      <div>
        <label htmlFor="companyName" className={label}>
          Company name <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="companyName" className={field} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
      </div>
      <div>
        <label htmlFor="addrMobile" className={label}>
          Mobile number
        </label>
        <input id="addrMobile" type="tel" className={field} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="addressLine1" className={label}>
          Address line 1
        </label>
        <input id="addressLine1" className={field} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="addressLine2" className={label}>
          Address line 2 <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="addressLine2" className={field} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
      </div>
      <div>
        <label htmlFor="city" className={label}>
          City
        </label>
        <input id="city" className={field} value={form.city} onChange={(e) => set("city", e.target.value)} required />
      </div>
      <div>
        <label htmlFor="district" className={label}>
          District
        </label>
        <select id="district" className={field} value={form.district} onChange={(e) => set("district", e.target.value)} required>
          <option value="">Select district</option>
          {SRI_LANKA_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="province" className={label}>
          Province <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <select id="province" className={field} value={form.province} onChange={(e) => set("province", e.target.value)}>
          <option value="">Not set</option>
          {SRI_LANKA_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="postalCode" className={label}>
          Postal code <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <input id="postalCode" className={field} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="deliveryInstructions" className={label}>
          Delivery instructions <span className="font-normal text-charcoal/50">(optional)</span>
        </label>
        <textarea
          id="deliveryInstructions"
          rows={2}
          className={field}
          value={form.deliveryInstructions}
          onChange={(e) => set("deliveryInstructions", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <input type="checkbox" checked={form.defaultBilling} onChange={(e) => set("defaultBilling", e.target.checked)} />
          Default billing address
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <input type="checkbox" checked={form.defaultShipping} onChange={(e) => set("defaultShipping", e.target.checked)} />
          Default shipping address
        </label>
      </div>
      <div className="sm:col-span-2 flex gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60">
          {pending ? "Saving..." : existing ? "Save changes" : "Add address"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-charcoal/20 px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}
