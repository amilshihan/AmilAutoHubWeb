"use client";

import { useCurrency } from "@/components/shop/CurrencyProvider";
import { CURRENCIES, isCurrencyCode } from "@/lib/shop/currency";

export default function CurrencySelect() {
  const { currency, setCurrency } = useCurrency();

  return (
    <label className="flex items-center">
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => {
          if (isCurrencyCode(e.target.value)) setCurrency(e.target.value);
        }}
        aria-label="Display currency"
        title="Display currency"
        className="cursor-pointer rounded-lg border border-charcoal/20 bg-white px-2 py-2 text-sm font-semibold text-charcoal hover:border-charcoal/40 focus:border-charcoal focus:outline-none"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}
