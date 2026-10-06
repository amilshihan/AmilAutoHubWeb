import { NextResponse } from "next/server";
import { runChat, type ChatTurn } from "@/lib/shop/chatbot";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { getSiteSettings } from "@/lib/shop/siteSettings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const tooMany = (error: string, status = 429) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  // Admins can switch the assistant off in Website settings; that also stops any AI usage.
  if (!(await getSiteSettings()).chatbotEnabled) return tooMany("The chat assistant is turned off right now. Please message us on WhatsApp.", 503);

  const ip = clientIp(request.headers);

  // Per-visitor limits, plus an overall daily ceiling so a flood can't run up the AI bill.
  if (!(await rateLimit(`chat:${ip}`, 20, 10 * 60_000)) || !(await rateLimit(`chat-day:${ip}`, 150, 24 * 3600_000))) {
    return tooMany("You're sending a lot of messages. Please wait a few minutes, or message us on WhatsApp.");
  }
  if (!(await rateLimit("chat-global", 4000, 24 * 3600_000))) {
    return tooMany("The assistant is very busy right now. Please message us on WhatsApp.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return tooMany("Invalid request.", 400);
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length > 60) return tooMany("Invalid request.", 400);
  const messages: ChatTurn[] = raw.filter(
    (m): m is ChatTurn => typeof m === "object" && m !== null && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"
  );

  try {
    return NextResponse.json(await runChat(messages, ip));
  } catch (error) {
    console.error("Chat assistant failed:", error instanceof Error ? error.message : error);
    return tooMany("The assistant isn't available right now. Please message us on WhatsApp.", 500);
  }
}
