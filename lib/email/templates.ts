// Customer order emails: subject, HTML and plain-text bodies. Pure (no I/O) so it is easy to preview.

import { formatLKR } from "@/lib/shop/format";
import { PAYMENT_LABEL } from "@/lib/shop/config";
import type { Formatters } from "@/lib/shop/datetime";

export type OrderEmailKind = "placed" | "invoice" | "confirmed" | "packed" | "dispatched" | "delivered" | "cancelled" | "paid" | "refunded" | "tracking";

export type EmailOrder = {
  order_number: string;
  public_token: string;
  customer_name: string;
  fulfilment: string;
  address_line: string | null;
  city: string | null;
  district: string | null;
  payment_method: string;
  payment_status: string | null;
  status: string;
  subtotal: number | string;
  delivery_fee: number | string | null;
  discount: number | string | null;
  tax_amount: number | string | null;
  total: number | string;
  coupon_code: string | null;
  loyalty_points_used: number | null;
  courier: string | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  cancellation_reason: string | null;
  refund_amount: number | string | null;
  refund_reason: string | null;
  created_at: string;
  items: { name_snapshot: string; sku_snapshot: string | null; qty: number | string; unit_price: number | string; line_total: number | string }[];
};

export type EmailShop = {
  name: string;
  legalName: string | null;
  address: string;
  phone: string;
  emails: { label: string; address: string }[];
  logoUrl: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  pickupLocation: string;
};

export type EmailContext = { baseUrl: string; fmt: Formatters; pointValue: number };

const n = (v: unknown) => Number(v ?? 0);
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

type Copy = { subject: string; pill: string; headline: string; intro: string; tone: "info" | "good" | "bad" };

function copyFor(kind: OrderEmailKind, o: EmailOrder, shop: EmailShop): Copy {
  const first = o.customer_name.trim().split(/\s+/)[0] || "there";
  const pickup = o.fulfilment !== "delivery";
  const num = o.order_number;
  switch (kind) {
    case "placed":
      return {
        subject: `We received your order #${num}`,
        pill: "Order received",
        headline: "Thank you for your order!",
        intro: `Hi ${first}, we've received your order and will confirm it shortly. Your invoice is below.`,
        tone: "info",
      };
    case "invoice":
      return { subject: `Invoice for your order #${num}`, pill: "Invoice", headline: "Your invoice", intro: `Hi ${first}, here is the invoice for your order.`, tone: "info" };
    case "confirmed":
      return {
        subject: `Your order #${num} is confirmed`,
        pill: "Confirmed",
        headline: "Your order is confirmed",
        intro: `Hi ${first}, good news: we've confirmed your order and are getting it ready.`,
        tone: "good",
      };
    case "packed":
      return pickup
        ? { subject: `Your order #${num} is ready for pickup`, pill: "Ready for pickup", headline: "Ready for pickup", intro: `Hi ${first}, your order is packed and ready to collect from ${shop.pickupLocation}. Please bring your order number.`, tone: "good" }
        : { subject: `Your order #${num} is packed`, pill: "Packed", headline: "Your order is packed", intro: `Hi ${first}, your order is packed and will be handed to the courier soon.`, tone: "good" };
    case "dispatched":
      return pickup
        ? { subject: `Your order #${num} is ready for pickup`, pill: "Ready for pickup", headline: "Ready for pickup", intro: `Hi ${first}, your order is ready to collect from ${shop.pickupLocation}. Please bring your order number.`, tone: "good" }
        : { subject: `Your order #${num} is on its way`, pill: "Dispatched", headline: "Your order is on its way", intro: `Hi ${first}, your order has been dispatched and is heading to you.`, tone: "good" };
    case "delivered":
      return pickup
        ? { subject: `Your order #${num} has been collected`, pill: "Collected", headline: "Order collected", intro: `Hi ${first}, thank you for collecting your order. We hope you're happy with it!`, tone: "good" }
        : { subject: `Your order #${num} was delivered`, pill: "Delivered", headline: "Your order was delivered", intro: `Hi ${first}, your order has been delivered. We hope you're happy with it!`, tone: "good" };
    case "cancelled":
      return {
        subject: `Your order #${num} was cancelled`,
        pill: "Cancelled",
        headline: "Your order was cancelled",
        intro: `Hi ${first}, your order has been cancelled.${o.cancellation_reason ? ` Reason: ${o.cancellation_reason}.` : ""}${
          o.payment_status === "paid" ? " Any payment you made will be refunded as described in our Return & Refund Policy." : ""
        } If this is a surprise, please contact us.`,
        tone: "bad",
      };
    case "paid":
      return {
        subject: `Payment received for order #${num}`,
        pill: "Paid",
        headline: "Payment received",
        intro: `Hi ${first}, thank you. We've received your payment of ${formatLKR(n(o.total))}. This email is your receipt.`,
        tone: "good",
      };
    case "refunded": {
      const amount = n(o.refund_amount) > 0 ? n(o.refund_amount) : n(o.total);
      return {
        subject: `Refund issued for order #${num}`,
        pill: "Refunded",
        headline: "Your refund has been issued",
        intro: `Hi ${first}, we've refunded ${formatLKR(amount)} for this order${o.refund_reason ? ` (${o.refund_reason})` : ""}. Depending on how you paid, it can take a few days to show in your account.`,
        tone: "info",
      };
    }
    case "tracking":
      return {
        subject: `Tracking details for your order #${num}`,
        pill: "Tracking",
        headline: "Tracking details",
        intro: `Hi ${first}, here are the delivery details for your order.`,
        tone: "info",
      };
  }
}

const TONE: Record<Copy["tone"], { bg: string; fg: string }> = {
  info: { bg: "#e8eefc", fg: "#1d3f9e" },
  good: { bg: "#e3f6e8", fg: "#166534" },
  bad: { bg: "#fde8e8", fg: "#b42318" },
};

export function buildOrderEmail(kind: OrderEmailKind, o: EmailOrder, shop: EmailShop, ctx: EmailContext): { subject: string; html: string; text: string } {
  const copy = copyFor(kind, o, shop);
  const pickup = o.fulfilment !== "delivery";
  const orderUrl = ctx.baseUrl ? `${ctx.baseUrl}/order/${o.public_token}` : null;
  const logo = shop.logoUrl ?? (ctx.baseUrl ? `${ctx.baseUrl}/brand/amil-logo.png` : null);
  const tone = TONE[copy.tone];

  const pointsValue = n(o.loyalty_points_used) * ctx.pointValue;
  const totals: [string, string][] = [["Subtotal", formatLKR(n(o.subtotal))]];
  if (n(o.discount) > 0) totals.push([o.coupon_code ? `Discount (${o.coupon_code})` : "Discount", `-${formatLKR(n(o.discount))}`]);
  if (pointsValue > 0) totals.push([`Loyalty points (${n(o.loyalty_points_used)})`, `-${formatLKR(pointsValue)}`]);
  if (n(o.delivery_fee) > 0) totals.push(["Delivery", formatLKR(n(o.delivery_fee))]);
  if (n(o.tax_amount) > 0) totals.push(["Tax", formatLKR(n(o.tax_amount))]);

  const address = [o.address_line, o.city, o.district].filter(Boolean).join(", ");
  const where = pickup ? `Pickup: ${shop.pickupLocation}` : address ? `Delivery to: ${address}` : "Delivery";
  const paymentLine = `${PAYMENT_LABEL[o.payment_method] ?? o.payment_method} · ${PAYMENT_STATUS_LABEL[o.payment_status ?? "unpaid"] ?? o.payment_status}`;

  const showTracking = (kind === "dispatched" || kind === "tracking") && !pickup && (o.courier || o.tracking_number || o.estimated_delivery_date);
  const showInvoice = kind !== "tracking";
  const trackingRows: [string, string][] = [];
  if (o.courier) trackingRows.push(["Courier", o.courier]);
  if (o.tracking_number) trackingRows.push(["Tracking number", o.tracking_number]);
  if (o.estimated_delivery_date) trackingRows.push(["Estimated delivery", ctx.fmt.date(o.estimated_delivery_date)]);

  const itemRows = o.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eceef2;font-size:14px;color:#1a1d23;">${esc(i.name_snapshot)}${i.sku_snapshot ? `<div style="font-size:12px;color:#6b7280;">SKU ${esc(i.sku_snapshot)}</div>` : ""}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eceef2;font-size:14px;color:#1a1d23;text-align:center;">${n(i.qty)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eceef2;font-size:14px;color:#1a1d23;text-align:right;white-space:nowrap;">${esc(formatLKR(n(i.line_total)))}</td>
      </tr>`
    )
    .join("");

  const totalRows = totals
    .map(([k, v]) => `<tr><td style="padding:4px 0;font-size:14px;color:#4b5563;">${esc(k)}</td><td style="padding:4px 0;font-size:14px;color:#1a1d23;text-align:right;">${esc(v)}</td></tr>`)
    .join("");

  const legal = [shop.legalName ?? shop.name, shop.registrationNumber ? `Reg. No. ${shop.registrationNumber}` : null, shop.taxId ? `Tax/VAT No. ${shop.taxId}` : null].filter(Boolean).join(" · ");
  const contactLine = [shop.phone, ...shop.emails.map((e) => e.address)].filter(Boolean).join(" · ");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#ffffff;padding:20px 28px;border-bottom:4px solid #ffc60b;">${
    logo ? `<img src="${esc(logo)}" alt="${esc(shop.name)}" height="40" style="display:block;height:40px;width:auto;border:0;">` : `<strong style="font-size:20px;color:#1a1d23;">${esc(shop.name)}</strong>`
  }</td></tr>
  <tr><td style="padding:28px;">
    <span style="display:inline-block;background:${tone.bg};color:${tone.fg};font-size:12px;font-weight:bold;padding:4px 10px;border-radius:999px;">${esc(copy.pill)}</span>
    <h1 style="margin:14px 0 8px;font-size:24px;line-height:1.25;color:#1a1d23;">${esc(copy.headline)}</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#374151;">${esc(copy.intro)}</p>
    <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Order #${esc(o.order_number)}</strong> · placed ${esc(ctx.fmt.dateTime(o.created_at))}</p>
    ${
      showTracking
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><tr><td style="padding:14px 16px;">${trackingRows
            .map(([k, v]) => `<div style="font-size:14px;color:#374151;padding:2px 0;"><span style="color:#6b7280;">${esc(k)}:</span> <strong>${esc(v)}</strong></div>`)
            .join("")}</td></tr></table>`
        : ""
    }
    ${
      showInvoice
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
      <tr><th align="left" style="padding:8px 0;border-bottom:2px solid #1a1d23;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">Item</th><th style="padding:8px;border-bottom:2px solid #1a1d23;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">Qty</th><th align="right" style="padding:8px 0;border-bottom:2px solid #1a1d23;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;">Amount</th></tr>
      ${itemRows}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      ${totalRows}
      <tr><td style="padding:10px 0 0;font-size:17px;font-weight:bold;color:#1a1d23;border-top:2px solid #1a1d23;">Total</td><td style="padding:10px 0 0;font-size:17px;font-weight:bold;color:#1a1d23;text-align:right;border-top:2px solid #1a1d23;">${esc(formatLKR(n(o.total)))}</td></tr>
    </table>
    <p style="margin:18px 0 4px;font-size:14px;color:#374151;"><strong>Payment:</strong> ${esc(paymentLine)}</p>
    <p style="margin:0;font-size:14px;color:#374151;"><strong>${esc(where)}</strong></p>`
        : ""
    }
    ${
      orderUrl
        ? `<p style="margin:26px 0 0;"><a href="${esc(orderUrl)}" style="display:inline-block;background:#ffc60b;color:#1a1d23;font-weight:bold;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px;">View your order</a></p>`
        : ""
    }
  </td></tr>
  <tr><td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
    Questions? ${esc(contactLine)}<br>${esc(shop.address)}<br>${esc(legal)}
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const lines = [copy.headline, "", copy.intro, "", `Order #${o.order_number} (placed ${ctx.fmt.dateTime(o.created_at)})`];
  if (showTracking) lines.push("", ...trackingRows.map(([k, v]) => `${k}: ${v}`));
  if (showInvoice) {
    lines.push("", "ITEMS", ...o.items.map((i) => `- ${i.name_snapshot} x${n(i.qty)}  ${formatLKR(n(i.line_total))}`), "");
    for (const [k, v] of totals) lines.push(`${k}: ${v}`);
    lines.push(`TOTAL: ${formatLKR(n(o.total))}`, "", `Payment: ${paymentLine}`, where);
  }
  if (orderUrl) lines.push("", `View your order: ${orderUrl}`);
  lines.push("", "--", shop.name, shop.address, contactLine, legal);

  return { subject: copy.subject, html, text: lines.join("\n") };
}
