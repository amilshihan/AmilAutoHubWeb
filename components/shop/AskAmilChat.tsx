"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicProduct } from "@/lib/shop/types";
import { waLink } from "@/lib/shop/whatsapp";
import { useCart } from "@/components/shop/CartProvider";
import { useCurrency } from "@/components/shop/CurrencyProvider";
import ProductVisual from "@/components/shop/ProductVisual";
import { CartIcon, SendIcon, SparkIcon, WhatsAppIcon } from "@/components/shop/Icons";

type Message = { role: "user" | "assistant"; text: string; products?: PublicProduct[] };

const STARTERS = [
  "I have a Toyota Prius 2015. Which engine oil should I use?",
  "I need brake pads for a Suzuki Alto",
  "Which oil filter fits a Honda Vezel?",
  "Wiper blades for my Nissan Sunny",
];

export default function AskAmilChat({ initialQuestion }: { initialQuestion?: string }) {
  const { add, shop } = useCart();
  const { format } = useCurrency();
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setError(null);
    setInput("");
    setSuggestions([]);
    const next: Message[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/shop/ask-amil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages([...next, { role: "assistant", text: data.reply, products: data.products }]);
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuestion && !autoSent.current) {
      autoSent.current = true;
      void send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.text ?? "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-amil px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-charcoal">
          <SparkIcon width={14} height={14} /> Ask Amil AI
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">
          Not sure what your vehicle needs? <span className="underline decoration-amil decoration-4 underline-offset-4">Ask Amil.</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-charcoal/65">
          Tell us your vehicle or describe the problem. We&apos;ll suggest products from our stock that you can add to your cart.
        </p>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-charcoal/10 bg-surface">
        <div className="max-h-[60vh] min-h-72 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-charcoal/55">
              Try one of the questions below, or type your own.
            </p>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={m.role === "user" ? "max-w-[85%]" : "w-full max-w-[95%]"}>
                <div
                  className={`whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-amil font-medium text-charcoal"
                      : "rounded-bl-sm border border-charcoal/10 bg-white text-charcoal"
                  }`}
                >
                  {m.text}
                </div>
                {m.products && m.products.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-charcoal/55">Recommended products</div>
                    {m.products.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white p-2.5">
                        <Link href={`/product/${p.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                          <ProductVisual imageUrl={p.imageUrl} name={p.name} brand={p.brand} collection={p.collection} />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/product/${p.id}`} className="line-clamp-2 text-sm font-semibold text-charcoal hover:underline">
                            {p.name}
                          </Link>
                          <div className="text-sm">
                            <span className="font-extrabold tabular-nums">{format(p.price)}</span>
                            <span className={`ml-2 text-xs font-semibold ${p.inStock ? "text-stock" : "text-charcoal/50"}`}>
                              {p.inStock ? "In Stock" : "Out of stock"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!p.inStock}
                          onClick={() => add(p)}
                          aria-label={`Add ${p.name} to cart`}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amil px-3 py-2 text-xs font-bold text-charcoal hover:bg-amil-hover disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CartIcon width={15} height={15} /> Add
                        </button>
                      </div>
                    ))}
                    {m.products.filter((p) => p.inStock).length > 1 && (
                      <button
                        type="button"
                        onClick={() => m.products!.filter((p) => p.inStock).forEach((p) => add(p))}
                        className="w-full rounded-lg bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft"
                      >
                        Add recommended products to cart
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start" role="status" aria-label="Amil is typing">
              <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-charcoal/10 bg-white px-4 py-3.5">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-charcoal/40" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-deal/30 bg-deal-soft p-3 text-sm font-semibold text-charcoal">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {suggestions.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2 border-t border-charcoal/10 bg-white px-4 py-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-charcoal/20 px-3.5 py-1.5 text-left text-xs font-semibold text-charcoal hover:border-amil hover:bg-amil-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-charcoal/10 bg-white p-3"
        >
          <label htmlFor="ask-input" className="sr-only">
            Ask Amil
          </label>
          <input
            id="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Tell us your vehicle or problem..."
            className="min-w-0 flex-1 rounded-lg border border-charcoal/20 bg-surface px-4 py-2.5 text-sm focus:border-charcoal focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 rounded-lg bg-amil px-5 py-2.5 text-sm font-extrabold text-charcoal hover:bg-amil-hover disabled:opacity-50"
          >
            Ask <SendIcon width={16} height={16} />
          </button>
        </form>
      </div>

      {lastAssistant && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-charcoal/65">
          <span>Want to talk to a person?</span>
          <a
            href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I was using Ask Amil: "${lastQuestion.slice(0, 200)}". Can you help me?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-wa px-3.5 py-2 font-bold text-white hover:bg-wa-hover"
          >
            <WhatsAppIcon width={16} height={16} /> Continue on WhatsApp
          </a>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-charcoal/50">
        Ask Amil gives general guidance. Always confirm fitment with your owner&apos;s manual or our team before ordering.
      </p>
    </div>
  );
}
