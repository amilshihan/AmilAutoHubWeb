"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CartLine, PublicProduct, ShopInfo } from "@/lib/shop/types";

const STORAGE_KEY = "aah-cart-v1";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  shop: ShopInfo;
  toast: string | null;
  add: (product: PublicProduct, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  replaceAll: (lines: CartLine[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

// The cart lives in localStorage and is read through useSyncExternalStore, so it is
// empty during server render/hydration and fills in on the client without effects.
const listeners = new Set<() => void>();
let memoryCart = "[]"; // used when localStorage is unavailable (private mode)

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryCart;
  } catch {
    return memoryCart;
  }
}

function writeCart(lines: CartLine[]) {
  memoryCart = JSON.stringify(lines);
  try {
    window.localStorage.setItem(STORAGE_KEY, memoryCart);
  } catch {
    // keep the in-memory copy
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

function parseLines(raw: string): CartLine[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const noopSubscribe = () => () => {};

export default function CartProvider({ shop, children }: { shop: ShopInfo; children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const lines = useMemo(() => parseLines(raw), [raw]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((product: PublicProduct, qty = 1) => {
    const current = parseLines(readRaw());
    const existing = current.find((l) => l.id === product.id);
    writeCart(
      existing
        ? current.map((l) => (l.id === product.id ? { ...l, qty: Math.min(99, l.qty + qty) } : l))
        : [
            ...current,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              qty,
              brand: product.brand,
              packSize: product.packSize,
              imageUrl: product.imageUrl,
              collection: product.collection,
            },
          ]
    );
    setToast(`Added to cart: ${product.name}`);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const current = parseLines(readRaw());
    writeCart(
      qty <= 0 ? current.filter((l) => l.id !== id) : current.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l))
    );
  }, []);

  const remove = useCallback((id: string) => {
    writeCart(parseLines(readRaw()).filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => writeCart([]), []);
  const replaceAll = useCallback((next: CartLine[]) => writeCart(next), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.price, 0),
      shop,
      toast,
      add,
      setQty,
      remove,
      clear,
      replaceAll,
    }),
    [lines, ready, shop, toast, add, setQty, remove, clear, replaceAll]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
