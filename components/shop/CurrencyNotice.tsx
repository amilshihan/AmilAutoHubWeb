"use client";

import { useCurrency } from "@/components/shop/CurrencyProvider";

// Prices convert for browsing convenience only; the actual charge is always in LKR
// (that's what PayHere, bank transfer and cash on delivery settle in).
export default function CurrencyNotice({ className = "" }: { className?: string }) {
  const { currency } = useCurrency();
  if (currency === "LKR") return null;
  return (
    <p className={`text-xs text-charcoal/55 ${className}`}>
      Prices shown in {currency} are for reference at today&apos;s exchange rate. You&apos;ll be charged in Sri Lankan Rupees (LKR).
    </p>
  );
}
