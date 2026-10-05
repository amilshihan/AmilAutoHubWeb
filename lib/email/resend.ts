import "server-only";

export type SendResult = { ok: true; id: string | null } | { ok: false; skipped?: boolean; error: string };

// Sends one email through the Resend API. Never throws: a failed email must not break an order.
// Without RESEND_API_KEY it does nothing (so the site still works before email is set up).
export async function sendEmail(input: { to: string; subject: string; html: string; text: string; from: string; replyTo?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "Email is not configured (RESEND_API_KEY is not set)." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: body.message ?? `Resend responded ${res.status}` };
    return { ok: true, id: body.id ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach the email service." };
  }
}
