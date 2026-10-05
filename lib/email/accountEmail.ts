import "server-only";
import { getShopInfo } from "@/lib/shop/data";
import { getSiteSettings } from "@/lib/shop/siteSettings";
import { sendEmail, type SendResult } from "@/lib/email/resend";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type AccountEmailKind = "password_reset" | "email_verify";

const COPY: Record<AccountEmailKind, { subject: string; headline: string; intro: string; button: string; note: string }> = {
  password_reset: {
    subject: "Reset your password",
    headline: "Reset your password",
    intro: "We received a request to reset the password on your account. Click the button below to choose a new one.",
    button: "Choose a new password",
    note: "This link works once and expires in 60 minutes. If you didn't ask for it, you can safely ignore this email; your password won't change.",
  },
  email_verify: {
    subject: "Confirm your email address",
    headline: "Confirm your email address",
    intro: "Thanks for creating an account. Please confirm that this is your email address.",
    button: "Confirm my email",
    note: "This link works once and expires in 24 hours. If you didn't create an account, you can ignore this email.",
  },
};

// Sends a "click this button" email (password reset or email confirmation). Never throws.
export async function sendAccountEmail(input: { to: string; firstName: string; kind: AccountEmailKind; url: string }): Promise<SendResult> {
  const [shop, site] = await Promise.all([getShopInfo(), getSiteSettings()]);
  const c = COPY[input.kind];
  const baseUrl = (site.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const logo = shop.logoUrl ?? (baseUrl ? `${baseUrl}/brand/amil-logo.png` : null);
  const contact = [shop.phone, ...shop.emails.map((e) => e.address)].filter(Boolean).join(" · ");
  const name = input.firstName.trim() || "there";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 28px;border-bottom:4px solid #ffc60b;">${
    logo ? `<img src="${esc(logo)}" alt="${esc(shop.name)}" height="40" style="display:block;height:40px;width:auto;border:0;">` : `<strong style="font-size:20px;color:#1a1d23;">${esc(shop.name)}</strong>`
  }</td></tr>
  <tr><td style="padding:28px;">
    <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#1a1d23;">${esc(c.headline)}</h1>
    <p style="margin:0 0 6px;font-size:15px;line-height:1.55;color:#374151;">Hi ${esc(name)},</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#374151;">${esc(c.intro)}</p>
    <p style="margin:0 0 22px;"><a href="${esc(input.url)}" style="display:inline-block;background:#ffc60b;color:#1a1d23;font-weight:bold;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px;">${esc(c.button)}</a></p>
    <p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:#6b7280;">${esc(c.note)}</p>
    <p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:#6b7280;word-break:break-all;">If the button doesn't work, copy this link into your browser:<br>${esc(input.url)}</p>
  </td></tr>
  <tr><td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">Questions? ${esc(contact)}<br>${esc(shop.address)}</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [c.headline, "", `Hi ${name},`, "", c.intro, "", `${c.button}: ${input.url}`, "", c.note, "", "--", shop.name, shop.address, contact].join("\n");
  const from = process.env.EMAIL_FROM || `${shop.name} <noreply@amilautohub.com>`;
  return sendEmail({ to: input.to, subject: `${c.subject} | ${shop.name}`, html, text, from, replyTo: shop.emails[0]?.address });
}
