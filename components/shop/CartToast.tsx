"use client";

import Link from "next/link";
import { CheckIcon } from "@/components/shop/Icons";
import { useCart } from "@/components/shop/CartProvider";

export default function CartToast() {
  const { toast } = useCart();
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 transition-all duration-200 sm:bottom-6 ${
        toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {toast && (
        <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-charcoal px-4 py-3 text-sm text-white shadow-xl">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stock">
            <CheckIcon width={14} height={14} />
          </span>
          <span className="line-clamp-1">{toast}</span>
          <Link href="/cart" className="shrink-0 font-bold text-amil hover:underline">
            View cart
          </Link>
        </div>
      )}
    </div>
  );
}
