import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopInfo } from "@/lib/shop/data";
import { getFormatters, getSiteSettings } from "@/lib/shop/siteSettings";
import { POINT_VALUE_LKR } from "@/lib/customer/loyalty";
import { sendEmail } from "@/lib/email/resend";
import { buildOrderEmail, type EmailOrder, type OrderEmailKind } from "@/lib/email/templates";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrderEmailOutcome = { ok: boolean; message: string };

async function loadOrder(ref: string) {
  const admin = createAdminClient();
  const select = "*, online_order_items(name_snapshot, sku_snapshot, qty, unit_price, line_total)";
  const { data } = UUID.test(ref)
    ? await admin.from("online_orders").select(select).eq("id", ref).maybeSingle()
    : await admin.from("online_orders").select(select).eq("order_number", ref).maybeSingle();
  if (!data) return null;
  const { online_order_items, ...rest } = data as Record<string, unknown> & { online_order_items: EmailOrder["items"] };
  return { raw: rest, order: { ...(rest as unknown as Omit<EmailOrder, "items">), items: online_order_items ?? [] } as EmailOrder };
}

async function buildFor(ref: string, kind: OrderEmailKind) {
  const loaded = await loadOrder(ref);
  if (!loaded) return null;
  const [shop, site, fmt] = await Promise.all([getShopInfo(), getSiteSettings(), getFormatters()]);
  const baseUrl = (site.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const email = buildOrderEmail(kind, loaded.order, shop, { baseUrl, fmt, pointValue: POINT_VALUE_LKR });
  const to = typeof loaded.raw.customer_email === "string" ? loaded.raw.customer_email.trim() : "";
  return { id: String(loaded.raw.id), to, email, shop };
}

// HTML for the staff preview page; never sends anything.
export async function previewOrderEmail(ref: string, kind: OrderEmailKind) {
  const built = await buildFor(ref, kind);
  return built ? { subject: built.email.subject, html: built.email.html, to: built.to } : null;
}

async function log(orderId: string, kind: OrderEmailKind, status: "sent" | "failed" | "skipped", to: string, extra: { providerId?: string | null; error?: string } = {}) {
  try {
    await createAdminClient().from("order_email_log").insert({
      order_id: orderId,
      kind,
      to_email: to || null,
      status,
      provider_id: extra.providerId ?? null,
      error: extra.error ?? null,
    });
  } catch {
    // The log table may not exist yet; the email result still stands.
  }
}

// Sends one customer email for an order. Automatic kinds are sent once per order; `force`
// (staff resend) and the invoice/tracking kinds can repeat. Never throws.
export async function sendOrderEmail(ref: string, kind: OrderEmailKind, opts: { force?: boolean } = {}): Promise<OrderEmailOutcome> {
  try {
    const built = await buildFor(ref, kind);
    if (!built) return { ok: false, message: "Order not found." };
    const { id, to, email, shop } = built;

    if (!to) {
      await log(id, kind, "skipped", "", { error: "No email address on the order." });
      return { ok: false, message: "This order has no customer email address, so nothing was sent." };
    }

    if (!opts.force && kind !== "invoice" && kind !== "tracking") {
      const { data: already } = await createAdminClient()
        .from("order_email_log")
        .select("id")
        .eq("order_id", id)
        .eq("kind", kind)
        .eq("status", "sent")
        .limit(1)
        .maybeSingle();
      if (already) return { ok: true, message: "That email was already sent to the customer." };
    }

    const from = process.env.EMAIL_FROM || `${shop.name} <noreply@amilautohub.com>`;
    const replyTo = shop.emails[0]?.address;
    const result = await sendEmail({ to, subject: email.subject, html: email.html, text: email.text, from, replyTo });

    if (result.ok) {
      await log(id, kind, "sent", to, { providerId: result.id });
      return { ok: true, message: `Email sent to ${to}.` };
    }
    await log(id, kind, result.skipped ? "skipped" : "failed", to, { error: result.error });
    return {
      ok: false,
      message: result.skipped ? "Email isn't set up yet. Add RESEND_API_KEY to the server settings." : `The email could not be sent: ${result.error}`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "The email could not be sent." };
  }
}
