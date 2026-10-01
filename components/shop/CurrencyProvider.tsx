"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DEFAULT_CURRENCY, formatMoney, isCurrencyCode, type CurrencyCode, type RateMap } from "@/lib/shop/currency";

const STORAGE_KEY = "aah-currency-v1";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: RateMap | null;
  ratesUpdatedAt: string | null;
  loading: boolean;
  format: (amountLKR: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}

// Module-level so every tab/instance shares one value and "storage" events (fired in
// OTHER tabs) plus this same-tab pub/sub (for the tab that made the change) both work.
const listeners = new Set<() => void>();
let memoryCurrency: CurrencyCode = DEFAULT_CURRENCY;

function readCurrency(): CurrencyCode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && isCurrencyCode(saved) ? saved : memoryCurrency;
  } catch {
    return memoryCurrency;
  }
}

function writeCurrency(next: CurrencyCode) {
  memoryCurrency = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // per-viewer convenience only; fine if it doesn't persist
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export default function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Server (and the very first client render) always sees "LKR" so there's no hydration
  // mismatch; the real stored choice, if any, applies right after mount.
  const currency = useSyncExternalStore(subscribe, readCurrency, () => DEFAULT_CURRENCY);
  const [rates, setRates] = useState<RateMap | null>(null);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch once per page load; rates move slowly (the API updates daily) so no need to poll.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/exchange-rates")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.rates) setRates(data.rates);
        if (data.updatedAt) setRatesUpdatedAt(data.updatedAt);
      })
      .catch(() => {
        // keep showing LKR if the rate service is unreachable
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => writeCurrency(c), []);
  const format = useCallback((amountLKR: number) => formatMoney(amountLKR, currency, rates), [currency, rates]);

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, rates, ratesUpdatedAt, loading, format }),
    [currency, setCurrency, rates, ratesUpdatedAt, loading, format]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
