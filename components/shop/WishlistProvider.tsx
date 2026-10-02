"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setWishlisted } from "@/app/(shop)/account/wishlist/actions";

type WishlistContextValue = {
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (id: string) => Promise<string | null>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

// Loaded client-side so shop pages stay statically cacheable (no cookie read in the layout).
export default function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shop/wishlist", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { signedIn: boolean; ids: string[] }) => {
        if (cancelled) return;
        setSignedIn(j.signedIn);
        setIds(new Set(j.ids));
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  // Returns an error message to show, or null on success.
  const toggle = useCallback(
    async (id: string) => {
      if (ready && !signedIn) {
        router.push("/login");
        return null;
      }
      const wasSaved = ids.has(id);
      const apply = (saved: boolean) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(id);
          else next.delete(id);
          return next;
        });
      apply(!wasSaved);
      const result = await setWishlisted(id, !wasSaved);
      if (result.ok) return null;
      apply(wasSaved);
      if (result.signedOut) {
        setSignedIn(false);
        router.push("/login");
        return null;
      }
      return result.error;
    },
    [ids, ready, signedIn, router]
  );

  const value = useMemo(() => ({ ready, has, toggle }), [ready, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
