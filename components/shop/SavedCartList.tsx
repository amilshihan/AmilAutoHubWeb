"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/CartProvider";
import { deleteSavedCart, getSavedCartLines } from "@/app/(shop)/account/saved-carts/actions";

export type SavedCartRow = { id: string; name: string; itemCount: number; createdLabel: string };

export default function SavedCartList({ carts }: { carts: SavedCartRow[] }) {
  const router = useRouter();
  const { replaceAll } = useCart();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  function restore(id: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await getSavedCartLines(id);
      setPendingId(null);
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      if (result.lines.length === 0) {
        return setMessage({ tone: "error", text: "None of the items in that cart are available right now." });
      }
      replaceAll(result.lines);
      router.push("/cart");
    });
  }

  function remove(id: string) {
    setMessage(null);
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteSavedCart(id);
      setPendingId(null);
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      router.refresh();
    });
  }

  return (
    <div>
      {message && (
        <p className={`mb-3 text-sm font-semibold ${message.tone === "error" ? "text-deal" : "text-stock"}`}>{message.text}</p>
      )}
      <ul className="space-y-3">
        {carts.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-charcoal/10 p-4">
            <div>
              <p className="font-bold text-charcoal">{c.name}</p>
              <p className="text-xs text-charcoal/55">
                {c.itemCount} item{c.itemCount === 1 ? "" : "s"} · saved {c.createdLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pendingId === c.id}
                onClick={() => restore(c.id)}
                className="rounded-lg bg-amil px-4 py-2 text-sm font-bold text-charcoal hover:bg-amil-hover disabled:opacity-60"
              >
                Use this cart
              </button>
              <button
                type="button"
                disabled={pendingId === c.id}
                onClick={() => remove(c.id)}
                className="rounded-lg border border-charcoal/15 px-4 py-2 text-sm font-semibold text-charcoal/70 hover:text-deal disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
