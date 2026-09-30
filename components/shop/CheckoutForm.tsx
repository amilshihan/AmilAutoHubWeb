"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { placeOrder, previewCoupon, type PlaceOrderResult } from "@/app/(shop)/checkout/actions";
import { PAYMENT_LABEL, SRI_LANKA_DISTRICTS, type DeliveryZoneId } from "@/lib/shop/config";
import type { BankTransferConfig, DeliveryZoneConfig, PaymentMethodId } from "@/lib/shop/settings-types";
import { formatLKR } from "@/lib/shop/format";
import { cartMessage, waLink } from "@/lib/shop/whatsapp";
import { PinIcon, TruckIcon, WhatsAppIcon } from "@/components/shop/Icons";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export type CheckoutOptions = {
  zones: DeliveryZoneConfig[];
  methods: { delivery: PaymentMethodId[]; pickup: PaymentMethodId[] };
  bank: BankTransferConfig;
};

const METHOD_HINT: Record<PaymentMethodId, string> = {
  cod: "Pay in cash when your order arrives.",
  pay_at_pickup: "Pay when you collect your order at our store.",
  bank_transfer: "Transfer to our bank account and send us the slip. We confirm your order once payment arrives.",
  payhere: "Pay securely online with your card or bank app on the next step.",
};

export default function CheckoutForm({ options }: { options: CheckoutOptions }) {
  const router = useRouter();
  const { lines, ready, subtotal, clear, shop } = useCart();
  const zones = options.zones;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; unavailable?: boolean } | null>(null);

  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [zoneChoice, setZone] = useState<DeliveryZoneId | "">("");
  const [methodChoice, setMethod] = useState<PaymentMethodId | "">("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    district: "Colombo",
    notes: "",
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const zone = zones.some((z) => z.id === zoneChoice) ? (zoneChoice as DeliveryZoneId) : (zones[0]?.id ?? "");
  const selectedZone = zones.find((z) => z.id === zone);
  const deliveryFee = fulfilment === "delivery" ? (selectedZone?.fee ?? 0) : 0;
  const methods = options.methods[fulfilment];
  const paymentMethod = methods.includes(methodChoice as PaymentMethodId) ? (methodChoice as PaymentMethodId) : methods[0];
  const canOrder = paymentMethod !== undefined && (fulfilment === "pickup" || selectedZone !== undefined);
  const discount = Math.min(coupon?.discount ?? 0, subtotal);
  const total = subtotal - discount + deliveryFee;

  async function applyCoupon() {
    setCouponMsg(null);
    setCouponBusy(true);
    const res = await previewCoupon(couponInput, subtotal);
    setCouponBusy(false);
    if (res.ok) {
      setCoupon({ code: res.code, discount: res.discount });
      setCouponInput("");
    } else {
      setCoupon(null);
      setCouponMsg(res.error);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-charcoal/50">Loading checkout...</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-charcoal">Your cart is empty</h1>
        <p className="mt-2 text-charcoal/65">Add something to your cart before checking out.</p>
        <Link href="/shop" className="mt-6 inline-flex rounded-lg bg-amil px-7 py-3 text-sm font-extrabold uppercase text-charcoal hover:bg-amil-hover">
          Start shopping
        </Link>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      let result: PlaceOrderResult;
      try {
        result = await placeOrder({
          ...form,
          fulfilment,
          zone: fulfilment === "delivery" ? zone : "",
          paymentMethod,
          couponCode: coupon?.code ?? "",
          lines: lines.map((l) => ({ id: l.id, qty: l.qty })),
        });
      } catch {
        result = { ok: false, error: "Something went wrong. Please try again or order via WhatsApp." };
      }
      if (result.ok) {
        clear();
        router.push(`/order/${result.token}`);
      } else {
        setError({ message: result.error, unavailable: result.unavailable });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-charcoal">Checkout</h1>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-deal/30 bg-deal-soft p-4 text-sm text-charcoal">
          <p className="font-semibold">{error.message}</p>
          {error.unavailable && (
            <a
              href={waLink(shop.whatsapp, cartMessage(lines, subtotal))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-wa px-4 py-2 font-bold text-white hover:bg-wa-hover"
            >
              <WhatsAppIcon width={17} height={17} /> Order via WhatsApp
            </a>
          )}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-extrabold text-charcoal">1. Delivery or pickup</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: "delivery", title: "Delivery", text: "We bring it to your door", icon: TruckIcon },
                  { id: "pickup", title: "Pickup", text: shop.pickupLocation, icon: PinIcon },
                ] as const
              ).map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${
                    fulfilment === o.id ? "border-charcoal bg-amil-soft" : "border-charcoal/15 hover:border-charcoal/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    value={o.id}
                    checked={fulfilment === o.id}
                    onChange={() => setFulfilment(o.id)}
                    className="mt-1 accent-charcoal"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-bold text-charcoal">
                      <o.icon width={18} height={18} /> {o.title}
                    </span>
                    <span className="text-sm text-charcoal/65">{o.text}</span>
                  </span>
                </label>
              ))}
            </div>

            {fulfilment === "delivery" && (
              <fieldset className="mt-3 space-y-2">
                <legend className="sr-only">Delivery option</legend>
                {zones.map((z) => (
                  <label
                    key={z.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-sm ${
                      zone === z.id ? "border-charcoal bg-surface" : "border-charcoal/15"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="zone"
                        value={z.id}
                        checked={zone === z.id}
                        onChange={() => setZone(z.id)}
                        className="accent-charcoal"
                      />
                      <span>
                        <span className="block font-semibold text-charcoal">{z.label}</span>
                        <span className="text-charcoal/55">{z.eta}</span>
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{formatLKR(z.fee)}</span>
                  </label>
                ))}
              </fieldset>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold text-charcoal">2. Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className={label}>
                  Full name
                </label>
                <input id="name" required autoComplete="name" className={field} value={form.name} onChange={set("name")} />
              </div>
              <div>
                <label htmlFor="phone" className={label}>
                  Phone number
                </label>
                <input
                  id="phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="077 123 4567"
                  className={field}
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className={label}>
                  Email <span className="font-normal text-charcoal/50">(optional)</span>
                </label>
                <input id="email" type="email" autoComplete="email" className={field} value={form.email} onChange={set("email")} />
              </div>

              {fulfilment === "delivery" && (
                <>
                  <div className="sm:col-span-2">
                    <label htmlFor="address" className={label}>
                      Delivery address
                    </label>
                    <input
                      id="address"
                      required
                      autoComplete="street-address"
                      placeholder="House no, street, area"
                      className={field}
                      value={form.address}
                      onChange={set("address")}
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className={label}>
                      City
                    </label>
                    <input id="city" required autoComplete="address-level2" className={field} value={form.city} onChange={set("city")} />
                  </div>
                  <div>
                    <label htmlFor="district" className={label}>
                      District
                    </label>
                    <select id="district" className={field} value={form.district} onChange={set("district")}>
                      {SRI_LANKA_DISTRICTS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <label htmlFor="notes" className={label}>
                  Order notes <span className="font-normal text-charcoal/50">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Vehicle details, preferred delivery time, landmarks..."
                  className={field}
                  value={form.notes}
                  onChange={set("notes")}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold text-charcoal">3. Payment</h2>
            {methods.length === 0 ? (
              <p className="rounded-xl border border-deal/30 bg-deal-soft p-4 text-sm text-charcoal">
                Online payment isn&apos;t set up for this option yet. Please order via WhatsApp and we&apos;ll confirm your order right away.
              </p>
            ) : (
              <fieldset className="space-y-2">
                <legend className="sr-only">Payment method</legend>
                {methods.map((m) => (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 text-sm ${
                      paymentMethod === m ? "border-charcoal bg-amil-soft" : "border-charcoal/15 hover:border-charcoal/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m}
                      checked={paymentMethod === m}
                      onChange={() => setMethod(m)}
                      className="mt-1 accent-charcoal"
                    />
                    <span>
                      <span className="block font-bold text-charcoal">{PAYMENT_LABEL[m]}</span>
                      <span className="text-charcoal/65">{METHOD_HINT[m]}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            {paymentMethod === "bank_transfer" && (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-surface p-4 text-sm">
                <dt className="text-charcoal/60">Bank</dt>
                <dd className="font-semibold">{options.bank.bankName}</dd>
                <dt className="text-charcoal/60">Account name</dt>
                <dd className="font-semibold">{options.bank.accountName}</dd>
                <dt className="text-charcoal/60">Account no.</dt>
                <dd className="font-semibold tabular-nums">{options.bank.accountNumber}</dd>
                {options.bank.branch && (
                  <>
                    <dt className="text-charcoal/60">Branch</dt>
                    <dd className="font-semibold">{options.bank.branch}</dd>
                  </>
                )}
              </dl>
            )}
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-charcoal/10 bg-surface p-5 lg:sticky lg:top-40">
          <h2 className="text-lg font-extrabold text-charcoal">Order summary</h2>
          <ul className="max-h-64 space-y-3 overflow-y-auto pr-1 text-sm">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-charcoal/80">
                  {l.qty} × {l.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatLKR(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-charcoal/10 pt-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-stock-soft px-3 py-2 text-sm">
                <span className="font-semibold text-stock">
                  {coupon.code} applied
                </span>
                <button
                  type="button"
                  onClick={() => setCoupon(null)}
                  className="text-xs font-semibold text-charcoal/60 underline hover:text-charcoal"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="coupon" className="mb-1 block text-xs font-bold uppercase tracking-wide text-charcoal/60">
                  Coupon code
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (couponInput.trim()) void applyCoupon();
                      }
                    }}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 rounded-lg border border-charcoal/20 bg-white px-3 py-2 text-sm uppercase focus:border-charcoal focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={couponBusy || !couponInput.trim()}
                    onClick={() => void applyCoupon()}
                    className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-50"
                  >
                    {couponBusy ? "..." : "Apply"}
                  </button>
                </div>
                {couponMsg && (
                  <p role="alert" className="mt-1.5 text-xs font-semibold text-deal">
                    {couponMsg}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-charcoal/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal/65">Subtotal</span>
              <span className="font-semibold tabular-nums">{formatLKR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-stock">
                <span>Discount</span>
                <span className="font-semibold tabular-nums">- {formatLKR(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-charcoal/65">{fulfilment === "delivery" ? "Delivery" : "Pickup"}</span>
              <span className="font-semibold tabular-nums">{deliveryFee ? formatLKR(deliveryFee) : "Free"}</span>
            </div>
            <div className="flex justify-between border-t border-charcoal/10 pt-3 text-base">
              <span className="font-extrabold">Total</span>
              <span className="font-extrabold tabular-nums">{formatLKR(total)}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || !canOrder}
            className="w-full rounded-lg bg-amil px-5 py-3.5 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover disabled:opacity-60"
          >
            {pending ? "Placing order..." : "Place order"}
          </button>
          <p className="text-center text-xs text-charcoal/55">
            Prices and availability are confirmed when you place your order.
          </p>
        </aside>
      </form>
    </div>
  );
}
