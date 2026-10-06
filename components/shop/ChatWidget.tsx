"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicProduct } from "@/lib/shop/types";
import type { ChatOrder } from "@/lib/shop/chatbot";
import { useCart } from "@/components/shop/CartProvider";
import { useCurrency } from "@/components/shop/CurrencyProvider";
import ProductVisual from "@/components/shop/ProductVisual";
import { CartIcon, ChatIcon, SendIcon, TrashIcon, WhatsAppIcon } from "@/components/shop/Icons";

type Message = {
  role: "user" | "assistant";
  text: string;
  products?: PublicProduct[];
  order?: ChatOrder | null;
  whatsappUrl?: string | null;
};

const STORAGE_KEY = "aah-chat-v1";
const STARTERS = ["Find the right engine oil for my car", "Track my order", "Delivery and payment options", "What is your return policy?"];

function load(): Message[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export default function ChatWidget() {
  const { add, shop } = useCart();
  const { format } = useCurrency();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore this tab's conversation after mount (never during server render).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setMessages(load());
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // private mode: the chat still works, it just isn't remembered
    }
  }, [messages, restored]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const question = text.trim().slice(0, 500);
    if (!question || loading) return;
    setError(null);
    setInput("");
    const next: Message[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/shop/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages([...next, { role: "assistant", text: data.reply, products: data.products, order: data.order, whatsappUrl: data.handoff?.whatsappUrl ?? null }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const whatsapp = shop.whatsapp ? `https://wa.me/${shop.whatsapp}?text=${encodeURIComponent(`Hi ${shop.name}, I need some help.`)}` : null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the chat assistant"
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-charcoal text-amil shadow-lg shadow-charcoal/30 transition-transform hover:scale-105"
        >
          <ChatIcon width={26} height={26} />
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Chat assistant"
          className="fixed inset-x-2 bottom-2 z-50 flex h-[75vh] max-h-[36rem] flex-col overflow-hidden rounded-2xl border border-charcoal/15 bg-white shadow-2xl shadow-charcoal/40 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[24rem]"
        >
          <header className="flex items-center justify-between gap-2 bg-charcoal px-4 py-3 text-white">
            <div>
              <div className="text-sm font-extrabold">{shop.name} assistant</div>
              <div className="text-xs text-white/60">AI assistant · parts, orders, delivery</div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setError(null);
                  }}
                  aria-label="Start a new chat"
                  title="New chat"
                  className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <TrashIcon width={16} height={16} />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg px-2.5 py-1.5 text-lg leading-none text-white/70 hover:bg-white/10 hover:text-white">
                ×
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-surface px-3 py-3 text-sm">
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-charcoal shadow-sm">
              Hi! I can help you find the right parts for your vehicle, check an order, or answer questions about delivery, payment and returns. What do you need?
            </div>

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal hover:border-charcoal"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "space-y-2"}>
                {m.role === "user" ? (
                  <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-amil px-3.5 py-2.5 font-medium text-charcoal">{m.text}</div>
                ) : (
                  <>
                    <div className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-charcoal shadow-sm">{m.text}</div>

                    {m.order && (
                      <div className="max-w-[92%] rounded-xl border border-charcoal/10 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-charcoal">#{m.order.orderNumber}</span>
                          <span className="rounded-full bg-amil-soft px-2.5 py-0.5 text-xs font-bold text-charcoal">{m.order.status}</span>
                        </div>
                        <ul className="mt-1.5 space-y-0.5 text-xs text-charcoal/70">
                          {m.order.items.slice(0, 5).map((it) => (
                            <li key={it.name}>
                              {it.qty} × {it.name}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-1.5 text-xs text-charcoal/70">
                          {m.order.fulfilment} · {m.order.paymentMethod} ({m.order.paymentStatus}) · {format(m.order.total)}
                        </div>
                        {(m.order.courier || m.order.trackingNumber) && (
                          <div className="mt-1 text-xs text-charcoal/70">
                            {m.order.courier} {m.order.trackingNumber && `· Tracking ${m.order.trackingNumber}`}
                          </div>
                        )}
                        {m.order.estimatedDelivery && <div className="mt-1 text-xs text-charcoal/70">Estimated delivery: {m.order.estimatedDelivery}</div>}
                        <Link href={m.order.url} className="mt-2 inline-block text-xs font-bold text-charcoal underline">
                          View full order
                        </Link>
                      </div>
                    )}

                    {m.products && m.products.length > 0 && (
                      <ul className="max-w-[92%] space-y-2">
                        {m.products.map((p) => (
                          <li key={p.id} className="flex gap-2.5 rounded-xl border border-charcoal/10 bg-white p-2 shadow-sm">
                            <Link href={`/product/${p.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                              <ProductVisual imageUrl={p.imageUrl} name={p.name} brand={p.brand} collection={p.collection} />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <Link href={`/product/${p.id}`} className="line-clamp-2 text-xs font-semibold leading-snug text-charcoal hover:underline">
                                {p.name}
                              </Link>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <span className="text-sm font-extrabold tabular-nums text-charcoal">{format(p.price)}</span>
                                {p.inStock ? (
                                  <button
                                    type="button"
                                    onClick={() => add(p)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-amil px-2.5 py-1 text-xs font-bold text-charcoal hover:bg-amil-hover"
                                  >
                                    <CartIcon width={13} height={13} /> Add
                                  </button>
                                ) : (
                                  <span className="text-xs font-semibold text-charcoal/50">Out of stock</span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {m.whatsappUrl && (
                      <a
                        href={m.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-wa px-3.5 py-2 text-xs font-bold text-white hover:bg-wa-hover"
                      >
                        <WhatsAppIcon width={15} height={15} /> Chat with our team on WhatsApp
                      </a>
                    )}
                  </>
                )}
              </div>
            ))}

            {loading && (
              <div className="inline-flex gap-1 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm" aria-label="The assistant is typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-charcoal/40" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-xl border border-deal/30 bg-deal-soft p-3 text-xs text-charcoal">
                {error}
                {whatsapp && (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="ml-1 font-bold underline">
                    Message us on WhatsApp
                  </a>
                )}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="border-t border-charcoal/10 bg-white p-2.5"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                placeholder="Type your question…"
                aria-label="Your message"
                className="min-w-0 flex-1 rounded-lg border border-charcoal/20 bg-surface px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal text-amil disabled:opacity-40"
              >
                <SendIcon width={18} height={18} />
              </button>
            </div>
            <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-charcoal/50">
              AI can make mistakes. Please confirm part fitment with our team before ordering. Don&apos;t share passwords or card details.
            </p>
          </form>
        </section>
      )}
    </>
  );
}
