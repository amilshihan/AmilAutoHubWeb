"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { createTicket } from "@/app/(shop)/account/support/actions";
import { INQUIRY_TYPES, INQUIRY_TYPE_LABEL } from "@/lib/shop/config";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function SupportTicketForm({
  orders,
  vehicles,
  products,
}: {
  orders: { id: string; label: string }[];
  vehicles: { id: string; label: string }[];
  products: { id: string; label: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTicket(formData);
      if (result.ok) {
        formRef.current?.reset();
        router.push(`/account/support/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {error && (
        <p role="alert" className="sm:col-span-2 text-sm font-semibold text-deal">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="inquiryType" className={label}>
          What&apos;s this about?
        </label>
        <select id="inquiryType" name="inquiryType" className={field} defaultValue="order_issue" required>
          {INQUIRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {INQUIRY_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="subject" className={label}>
          Subject
        </label>
        <input id="subject" name="subject" className={field} required />
      </div>
      {orders.length > 0 && (
        <div>
          <label htmlFor="orderId" className={label}>
            Order involved <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <select id="orderId" name="orderId" className={field} defaultValue="">
            <option value="">Not related to an order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {vehicles.length > 0 && (
        <div>
          <label htmlFor="vehicleId" className={label}>
            Vehicle involved <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <select id="vehicleId" name="vehicleId" className={field} defaultValue="">
            <option value="">Not related to a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {products.length > 0 && (
        <div className={orders.length > 0 && vehicles.length > 0 ? "sm:col-span-2" : ""}>
          <label htmlFor="partId" className={label}>
            Product involved <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <select id="partId" name="partId" className={field} defaultValue="">
            <option value="">Not related to a specific product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label htmlFor="message" className={label}>
          Message
        </label>
        <textarea id="message" name="message" rows={4} className={field} placeholder="Tell us what happened..." required />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="attachments" className={label}>
          Attachments/photos <span className="font-normal text-charcoal/50">(optional, up to 5)</span>
        </label>
        <input id="attachments" name="attachments" type="file" accept="image/*,application/pdf" multiple className={field} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="sm:col-span-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60"
      >
        {pending ? "Submitting..." : "Submit ticket"}
      </button>
    </form>
  );
}
