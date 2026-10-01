"use client";

import { useCurrency } from "@/components/shop/CurrencyProvider";

// Renders an LKR amount in the visitor's selected display currency. Use inline wherever a
// price appears in a Server Component, since currency selection only exists on the client.
export default function Money({ amount, className }: { amount: number; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(amount)}</span>;
}
