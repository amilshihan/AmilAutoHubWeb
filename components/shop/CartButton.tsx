"use client";

import Link from "next/link";
import { CartIcon } from "@/components/shop/Icons";
import { useCart } from "@/components/shop/CartProvider";

export default function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${ready ? count : 0} items`}
      className="relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
    >
      <CartIcon />
      <span className="hidden lg:inline">Cart</span>
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-deal px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
