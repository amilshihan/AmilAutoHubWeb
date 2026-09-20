import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { payhereCredentials } from "@/lib/shop/settings";

// PayHere hosted checkout (https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout).
// Merchant ID and secret come from PAYHERE_MERCHANT_ID / PAYHERE_MERCHANT_SECRET, never the database.

const md5Upper = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

export function payhereEndpoint(sandbox: boolean) {
  return sandbox ? "https://sandbox.payhere.lk/pay/checkout" : "https://www.payhere.lk/pay/checkout";
}

export type PayhereOrder = {
  orderNumber: string;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  itemsSummary: string;
  token: string;
};

export function buildPayhereCheckout(order: PayhereOrder, siteUrl: string, sandbox: boolean) {
  const creds = payhereCredentials();
  if (!creds) return null;

  const amount = order.total.toFixed(2);
  const currency = "LKR";
  const hash = md5Upper(creds.merchantId + order.orderNumber + amount + currency + md5Upper(creds.merchantSecret));
  const [firstName, ...rest] = order.customerName.trim().split(/\s+/);

  return {
    action: payhereEndpoint(sandbox),
    fields: {
      merchant_id: creds.merchantId,
      return_url: `${siteUrl}/order/${order.token}?payment=return`,
      cancel_url: `${siteUrl}/order/${order.token}?payment=cancelled`,
      notify_url: `${siteUrl}/api/shop/payhere/notify`,
      order_id: order.orderNumber,
      items: order.itemsSummary.slice(0, 250),
      currency,
      amount,
      first_name: firstName || "Customer",
      last_name: rest.join(" ") || "-",
      email: order.customerEmail,
      phone: order.customerPhone,
      address: order.address || "Pickup",
      city: order.city || "Kottawa",
      country: "Sri Lanka",
      hash,
    } as Record<string, string>,
  };
}

// Verifies the md5sig on PayHere's server-to-server payment notification.
export function verifyPayhereNotification(fields: Record<string, string>): boolean {
  const creds = payhereCredentials();
  if (!creds || fields.merchant_id !== creds.merchantId) return false;
  const expected = md5Upper(
    creds.merchantId +
      (fields.order_id ?? "") +
      (fields.payhere_amount ?? "") +
      (fields.payhere_currency ?? "") +
      (fields.status_code ?? "") +
      md5Upper(creds.merchantSecret)
  );
  const given = (fields.md5sig ?? "").toUpperCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// PayHere status codes: 2 success, 0 pending, -1 cancelled, -2 failed, -3 charged back.
export function paymentStatusFromCode(code: string): "paid" | "pending" | "failed" | "refunded" | null {
  switch (code) {
    case "2":
      return "paid";
    case "0":
      return "pending";
    case "-1":
    case "-2":
      return "failed";
    case "-3":
      return "refunded";
    default:
      return null;
  }
}
