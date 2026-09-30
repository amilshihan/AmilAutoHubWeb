"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { bookService, type BookingResult } from "@/app/(shop)/services/actions";
import { useCart } from "@/components/shop/CartProvider";
import { CheckIcon, WhatsAppIcon } from "@/components/shop/Icons";
import { waLink } from "@/lib/shop/whatsapp";
import { VEHICLE_TYPES, type VehicleCatalog } from "@/lib/shop/vehicles";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function ServiceBookingForm({ services, catalog }: { services: string[]; catalog: VehicleCatalog }) {
  const { shop } = useCart();
  const params = useSearchParams();
  const preselected = params.get("service");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BookingResult | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    make: "",
    model: "",
    year: "",
    vehicleNumber: "",
    service: "",
    date: "",
    time: "Any time",
    notes: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const service = form.service || (preselected && services.includes(preselected) ? preselected : "");

  const makes = useMemo(() => {
    const all = new Set<string>();
    for (const t of VEHICLE_TYPES) Object.keys(catalog[t]).forEach((m) => all.add(m));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [catalog]);
  const models = useMemo(() => {
    if (!form.make) return [];
    const all = new Set<string>();
    for (const t of VEHICLE_TYPES) (catalog[t][form.make] ?? []).forEach((m) => all.add(m));
    return [...all].sort((a, b) => a.localeCompare(b));
  }, [catalog, form.make]);

  const today = new Date().toISOString().slice(0, 10);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      let res: BookingResult;
      try {
        res = await bookService({ ...form, service });
      } catch {
        res = { ok: false, error: "Something went wrong. Please try again or book on WhatsApp." };
      }
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border-2 border-stock bg-stock-soft p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stock text-white">
          <CheckIcon width={24} height={24} />
        </span>
        <h3 className="mt-3 text-xl font-extrabold text-charcoal">Booking request received</h3>
        <p className="mt-1 text-charcoal/75">
          Your reference is <span className="font-extrabold">{result.bookingNumber}</span>. Our team will contact you to confirm the time.
        </p>
        <a
          href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I just requested a service booking (${result.bookingNumber}).`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-wa px-5 py-2.5 text-sm font-bold text-white hover:bg-wa-hover"
        >
          <WhatsAppIcon width={17} height={17} /> Message us about this booking
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      {result && !result.ok && (
        <div role="alert" className="mb-4 rounded-xl border border-deal/30 bg-deal-soft p-3 text-sm text-charcoal">
          <p className="font-semibold">{result.error}</p>
          {result.unavailable && (
            <a
              href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I'd like to book: ${service || "a service"}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-wa px-4 py-2 font-bold text-white hover:bg-wa-hover"
            >
              <WhatsAppIcon width={16} height={16} /> Book on WhatsApp
            </a>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="bk-service" className={label}>
            Service
          </label>
          <select id="bk-service" required value={service} onChange={set("service")} className={field}>
            <option value="">Choose a service</option>
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bk-name" className={label}>
            Your name
          </label>
          <input id="bk-name" required autoComplete="name" value={form.name} onChange={set("name")} className={field} />
        </div>
        <div>
          <label htmlFor="bk-phone" className={label}>
            Phone number
          </label>
          <input id="bk-phone" required type="tel" autoComplete="tel" placeholder="077 123 4567" value={form.phone} onChange={set("phone")} className={field} />
        </div>

        <div>
          <label htmlFor="bk-make" className={label}>
            Vehicle make
          </label>
          <select
            id="bk-make"
            value={form.make}
            onChange={(e) => setForm((f) => ({ ...f, make: e.target.value, model: "" }))}
            className={field}
          >
            <option value="">Select make</option>
            {makes.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-model" className={label}>
            Model
          </label>
          <select id="bk-model" value={form.model} onChange={set("model")} disabled={!form.make} className={`${field} disabled:bg-charcoal/5`}>
            <option value="">{form.make ? "Select model" : "Select make first"}</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-year" className={label}>
            Year <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <input id="bk-year" inputMode="numeric" maxLength={4} placeholder="2015" value={form.year} onChange={set("year")} className={field} />
        </div>
        <div>
          <label htmlFor="bk-num" className={label}>
            Vehicle number <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <input id="bk-num" placeholder="CAB-1234" value={form.vehicleNumber} onChange={set("vehicleNumber")} className={field} />
        </div>

        <div>
          <label htmlFor="bk-date" className={label}>
            Preferred date <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <input id="bk-date" type="date" min={today} value={form.date} onChange={set("date")} className={field} />
        </div>
        <div>
          <label htmlFor="bk-time" className={label}>
            Preferred time
          </label>
          <select id="bk-time" value={form.time} onChange={set("time")} className={field}>
            <option>Any time</option>
            <option>Morning</option>
            <option>Afternoon</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bk-email" className={label}>
            Email <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <input id="bk-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="bk-notes" className={label}>
            Anything we should know? <span className="font-normal text-charcoal/50">(optional)</span>
          </label>
          <textarea id="bk-notes" rows={3} value={form.notes} onChange={set("notes")} className={field} />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-lg bg-amil px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending..." : "Request booking"}
      </button>
    </form>
  );
}
