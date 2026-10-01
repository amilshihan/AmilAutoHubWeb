import { formatLKR } from "@/lib/shop/format";

export type CurrencyCode = "LKR" | "USD" | "EUR" | "GBP" | "AUD" | "INR";

export const DEFAULT_CURRENCY: CurrencyCode = "LKR";

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "LKR", label: "Sri Lankan Rupee (LKR)", locale: "en-LK" },
  { code: "USD", label: "US Dollar (USD)", locale: "en-US" },
  { code: "EUR", label: "Euro (EUR)", locale: "en-IE" },
  { code: "GBP", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "AUD", label: "Australian Dollar (AUD)", locale: "en-AU" },
  { code: "INR", label: "Indian Rupee (INR)", locale: "en-IN" },
];

export type RateMap = Partial<Record<CurrencyCode, number>>;

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value);
}

// Converts an LKR amount (the real, charged amount) into the selected display currency
// and formats it. Falls back to LKR whenever the rate isn't available yet.
export function formatMoney(amountLKR: number, currency: CurrencyCode, rates: RateMap | null): string {
  if (currency === "LKR") return formatLKR(amountLKR);

  const rate = rates?.[currency];
  if (!rate) return formatLKR(amountLKR);

  const converted = amountLKR * rate;
  const meta = CURRENCIES.find((c) => c.code === currency)!;
  try {
    return new Intl.NumberFormat(meta.locale, { style: "currency", currency }).format(converted);
  } catch {
    return formatLKR(amountLKR);
  }
}
