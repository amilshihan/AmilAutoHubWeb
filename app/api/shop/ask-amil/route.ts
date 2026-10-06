import { NextResponse } from "next/server";
import { askAmil, type ChatTurn } from "@/lib/shop/ask";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";

export async function POST(request: Request) {
  if (!(await rateLimit(`ask:${clientIp(request.headers)}`, 12, 60_000))) {
    return NextResponse.json({ error: "You're asking a lot of questions. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const conversation: ChatTurn[] = raw
    .filter(
      (m): m is { role: "user" | "assistant"; text: string } =>
        typeof m === "object" && m !== null && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"
    )
    .map((m) => ({ role: m.role, text: m.text.trim().slice(0, 1000) }))
    .filter((m) => m.text)
    .slice(-8);

  if (conversation.length === 0 || conversation[conversation.length - 1].role !== "user") {
    return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  }

  try {
    return NextResponse.json(await askAmil(conversation));
  } catch (error) {
    console.error("Ask Amil failed:", error);
    return NextResponse.json({ error: "Ask Amil is unavailable right now. Please message us on WhatsApp." }, { status: 500 });
  }
}
