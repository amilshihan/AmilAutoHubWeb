"use client";

import { useState } from "react";
import type { PublicProduct } from "@/lib/shop/types";
import { useCart } from "@/components/shop/CartProvider";
import { CartIcon, MinusIcon, PlusIcon, WhatsAppIcon } from "@/components/shop/Icons";
import { productMessage, waLink } from "@/lib/shop/whatsapp";

export default function AddToCartButton({
  product,
  withQuantity = false,
  vehicle,
}: {
  product: PublicProduct;
  withQuantity?: boolean;
  vehicle?: string;
}) {
  const { add, shop } = useCart();
  const [qty, setQty] = useState(1);

  if (!product.inStock) {
    return (
      <a
        href={waLink(shop.whatsapp, `Hi Amil Auto Hub, is ${product.name} available soon?`)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-charcoal/15 bg-white px-4 py-2.5 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
      >
        <WhatsAppIcon width={16} height={16} className="text-wa" /> Ask when back in stock
      </a>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex gap-2">
        {withQuantity && (
          <div className="flex items-center rounded-lg border border-charcoal/20 bg-white">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-11 w-10 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-l-lg"
            >
              <MinusIcon width={16} height={16} />
            </button>
            <span className="w-8 text-center text-sm font-semibold tabular-nums">{qty}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="h-11 w-10 flex items-center justify-center text-charcoal hover:bg-charcoal/5 rounded-r-lg"
            >
              <PlusIcon width={16} height={16} />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => add(product, qty)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amil px-4 py-2.5 text-sm font-bold text-charcoal transition-colors hover:bg-amil-hover active:scale-[0.99]"
        >
          <CartIcon width={17} height={17} /> Add to Cart
        </button>
      </div>
      {withQuantity && (
        <a
          href={waLink(shop.whatsapp, productMessage(product, vehicle))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-wa px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-wa-hover"
        >
          <WhatsAppIcon width={17} height={17} /> Order via WhatsApp
        </a>
      )}
    </div>
  );
}
