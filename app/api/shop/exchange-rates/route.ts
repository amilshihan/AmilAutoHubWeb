import { NextResponse } from "next/server";
import { ttlCache } from "@/lib/shop/cache";
import { CURRENCIES, type CurrencyCode, type RateMap } from "@/lib/shop/currency";

const WANTED = CURRENCIES.map((c) => c.code).filter((c): c is Exclude<CurrencyCode, "LKR"> => c !== "LKR");

// Free, no API key required. Base is LKR so rates convert an LKR amount directly
// (amountLKR * rate[code] = amount in that currency).
const SOURCE = "https://open.er-api.com/v6/latest/LKR";

const getRates = ttlCache<{ rates: RateMap; updatedAt: string | null }>(6 * 60 * 60_000, async () => {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`rate provider responded ${res.status}`);
  const json = await res.json();
  if (json.result !== "success" || typeof json.rates !== "object") throw new Error("rate provider error");

  const rates: RateMap = {};
  for (const code of WANTED) {
    const value = json.rates[code];
    if (typeof value === "number" && value > 0) rates[code] = value;
  }
  return { rates, updatedAt: typeof json.time_last_update_utc === "string" ? json.time_last_update_utc : null };
});

export async function GET() {
  try {
    const { rates, updatedAt } = await getRates();
    return NextResponse.json({ ok: true, base: "LKR", rates, updatedAt });
  } catch {
    return NextResponse.json({ ok: false, base: "LKR", rates: {}, updatedAt: null }, { status: 502 });
  }
}
