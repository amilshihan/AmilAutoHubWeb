"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/CartProvider";
import { useCurrency } from "@/components/shop/CurrencyProvider";
import CurrencyNotice from "@/components/shop/CurrencyNotice";
import ProductVisual from "@/components/shop/ProductVisual";
import SaveCartButton from "@/components/shop/SaveCartButton";
import { cartMessage, waLink } from "@/lib/shop/whatsapp";
import { CartIcon, MinusIcon, PlusIcon, TrashIcon, WhatsAppIcon } from "@/components/shop/Icons";

export default function CartView({ signedIn }: { signedIn: boolean }) {
  const { lines, ready, subtotal, setQty, remove, shop } = useCart();
  const { format } = useCurrency();

  if (!ready) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-charcoal/50">Loading your cart...</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amil-soft text-charcoal">
          <CartIcon width={30} height={30} />
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-charcoal">Your cart is empty</h1>
        <p className="mt-2 text-charcoal/65">Add oils, filters or parts and they&apos;ll show up here.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex rounded-lg bg-amil px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-charcoal">Your Cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10">
          {lines.map((l) => (
            <li key={l.id} className="flex gap-4 p-4">
              <Link href={`/product/${l.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-charcoal/10">
                <ProductVisual imageUrl={l.imageUrl} name={l.name} brand={l.brand} collection={l.collection} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {l.brand && (
                      <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal/50">{l.brand}</div>
                    )}
                    <Link href={`/product/${l.id}`} className="line-clamp-2 font-semibold text-charcoal hover:underline">
                      {l.name}
                    </Link>
                    <div className="text-sm text-charcoal/60">{format(l.price)} each</div>
                  </div>
                  <div className="shrink-0 text-right font-extrabold tabular-nums text-charcoal">
                    {format(l.price * l.qty)}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-charcoal/20">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => setQty(l.id, l.qty - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-l-lg hover:bg-charcoal/5"
                    >
                      <MinusIcon width={15} height={15} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => setQty(l.id, l.qty + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-r-lg hover:bg-charcoal/5"
                    >
                      <PlusIcon width={15} height={15} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(l.id)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-charcoal/55 hover:text-deal"
                  >
                    <TrashIcon width={16} height={16} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit space-y-4 rounded-2xl border border-charcoal/10 bg-surface p-5">
          <h2 className="text-lg font-extrabold text-charcoal">Order summary</h2>
          <div className="flex justify-between text-sm">
            <span className="text-charcoal/65">Subtotal</span>
            <span className="font-bold tabular-nums">{format(subtotal)}</span>
          </div>
          <CurrencyNotice />
          <p className="text-xs text-charcoal/55">Delivery charges are added at checkout. Pickup from Kottawa is free.</p>
          <Link
            href={signedIn ? "/checkout" : "/login?next=%2Fcheckout"}
            className="block rounded-lg bg-amil px-5 py-3.5 text-center text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover"
          >
            {signedIn ? "Checkout" : "Sign in to checkout"}
          </Link>
          {!signedIn && <p className="-mt-2 text-center text-xs text-charcoal/55">You need an account to place an order. Your cart stays saved.</p>}
          <a
            href={waLink(shop.whatsapp, cartMessage(lines, subtotal))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-wa px-5 py-3 text-sm font-bold text-white hover:bg-wa-hover"
          >
            <WhatsAppIcon width={18} height={18} /> Order via WhatsApp
          </a>
          <SaveCartButton />
          <Link href="/shop" className="block text-center text-sm font-semibold text-charcoal/65 underline hover:text-charcoal">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
