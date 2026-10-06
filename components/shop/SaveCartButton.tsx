"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/CartProvider";
import { saveCart } from "@/app/(shop)/account/saved-carts/actions";

export default function SaveCartButton() {
  const { lines } = useCart();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "saved" } | { kind: "error"; text: string; signIn?: boolean }>({
    kind: "idle",
  });
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveCart(
        name,
        lines.map((l) => ({ partId: l.id, qty: l.qty }))
      );
      if (result.ok) {
        setState({ kind: "saved" });
        setOpen(false);
        setName("");
      } else {
        setState({ kind: "error", text: result.error, signIn: result.signedOut });
      }
    });
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setState({ kind: "idle" });
            setOpen(true);
          }}
          className="w-full rounded-lg border border-charcoal/20 bg-white px-5 py-3 text-sm font-bold text-charcoal hover:bg-charcoal/5"
        >
          Save cart for later
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            autoFocus
            placeholder="Name this cart, e.g. Oil change kit"
            className="w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-charcoal/15 px-4 py-2.5 text-sm font-semibold text-charcoal/70"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {state.kind === "saved" && (
        <p className="text-sm font-semibold text-stock">
          Cart saved.{" "}
          <Link href="/account/saved-carts" className="underline">
            View saved carts
          </Link>
        </p>
      )}
      {state.kind === "error" && (
        <p className="text-sm font-semibold text-deal">
          {state.text}{" "}
          {state.signIn && (
            <Link href="/login" className="underline">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
