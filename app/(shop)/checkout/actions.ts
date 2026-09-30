"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { WESTERN_PROVINCE_DISTRICTS, type DeliveryZoneId } from "@/lib/shop/config";
import { availablePaymentMethods, getStoreSettings } from "@/lib/shop/settings";
import type { PaymentMethodId } from "@/lib/shop/settings-types";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";

export type PlaceOrderInput = {
  name: string;
  phone: string;
  email: string;
  fulfilment: "delivery" | "pickup";
  zone: DeliveryZoneId | "";
  address: string;
  city: string;
  district: string;
  notes: string;
  paymentMethod: PaymentMethodId;
  couponCode: string;
  lines: { id: string; qty: number }[];
};

export type PlaceOrderResult =
  | { ok: true; token: string; orderNumber: string }
  | { ok: false; error: string; unavailable?: boolean };

// Postgres exceptions come back as "message" text; show the customer-facing sentence only.
function couponError(message: string) {
  return /coupon|Spend at least/i.test(message) ? message : "We couldn't apply that coupon. Please try again.";
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const h = await headers();
  if (!rateLimit(`order:${clientIp(h)}`, 6, 10 * 60_000)) {
    return { ok: false, error: "Too many orders from this connection. Please try again in a few minutes or order via WhatsApp." };
  }

  const name = clean(input.name, 80);
  const phone = clean(input.phone, 20);
  const email = clean(input.email, 120);
  const fulfilment = input.fulfilment === "pickup" ? "pickup" : "delivery";
  const notes = clean(input.notes, 500);
  const phoneDigits = phone.replace(/\D/g, "");
  const settings = await getStoreSettings();

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (phoneDigits.length < 9 || phoneDigits.length > 12) {
    return { ok: false, error: "Please enter a valid phone number, e.g. 077 123 4567." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address doesn't look right." };

  let zone: (typeof settings.deliveryZones)[number] | undefined;
  let address = "";
  let city = "";
  let district = "";
  if (fulfilment === "delivery") {
    zone = settings.deliveryZones.find((z) => z.enabled && z.id === input.zone);
    address = clean(input.address, 200);
    city = clean(input.city, 80);
    district = clean(input.district, 40);
    if (!zone) return { ok: false, error: "Please choose a delivery option." };
    if (address.length < 4 || city.length < 2) return { ok: false, error: "Please enter your delivery address and city." };
    if (zone.id === "western" && !WESTERN_PROVINCE_DISTRICTS.includes(district)) {
      return { ok: false, error: "Western Province delivery is only for Colombo, Gampaha and Kalutara. Choose Islandwide for other districts." };
    }
  }

  const paymentMethod = input.paymentMethod;
  if (!availablePaymentMethods(settings, fulfilment).includes(paymentMethod)) {
    return { ok: false, error: "That payment method isn't available. Please choose another one." };
  }

  if (paymentMethod === "payhere" && !email) {
    return { ok: false, error: "Please enter your email address so we can send your payment receipt." };
  }

  if (!Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 50) {
    return { ok: false, error: "Your cart is empty." };
  }

  // Merge duplicates and sanity-check quantities.
  const wanted = new Map<string, number>();
  for (const l of input.lines) {
    const qty = Math.floor(Number(l.qty));
    if (typeof l.id !== "string" || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return { ok: false, error: "One of the quantities in your cart is invalid." };
    }
    wanted.set(l.id, Math.min(99, (wanted.get(l.id) ?? 0) + qty));
  }

  const admin = createAdminClient();
  const { data: parts, error: partsError } = await admin.from("parts").select("*").in("id", [...wanted.keys()]);
  if (partsError) return { ok: false, error: "We couldn't check your cart just now. Please try again." };

  const items: { part_id: string; name_snapshot: string; unit_price: number; qty: number; line_total: number }[] = [];
  for (const [id, qty] of wanted) {
    const p = parts?.find((x) => x.id === id);
    const sellable = p && p.is_active && !p.is_service && p.is_online !== false && !p.is_drum && Number(p.sell_price) > 0;
    if (!sellable) return { ok: false, error: "An item in your cart is no longer available. Please review your cart." };
    if (Number(p.qty_on_hand) < qty) {
      const left = Math.max(0, Math.floor(Number(p.qty_on_hand)));
      return {
        ok: false,
        error:
          left > 0
            ? `Only ${left} of "${p.name}" left in stock. Please reduce the quantity.`
            : `"${p.name}" is out of stock. Please remove it from your cart.`,
      };
    }
    const unit = Number(p.sell_price);
    items.push({ part_id: id, name_snapshot: p.name, unit_price: unit, qty, line_total: Math.round(unit * qty * 100) / 100 });
  }

  const subtotal = Math.round(items.reduce((n, i) => n + i.line_total, 0) * 100) / 100;
  const deliveryFee = zone?.fee ?? 0;

  // Coupons are validated and redeemed on the server against the real subtotal.
  const couponCode = clean(input.couponCode, 32).toUpperCase();
  let discount = 0;
  if (couponCode) {
    const { data, error } = await admin.rpc("validate_coupon", { p_code: couponCode, p_subtotal: subtotal, p_redeem: true });
    if (error) return { ok: false, error: couponError(error.message) };
    discount = Number(data ?? 0);
  }

  const { data: order, error: orderError } = await admin
    .from("online_orders")
    .insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      fulfilment,
      delivery_zone: zone?.id ?? null,
      address_line: address || null,
      city: city || null,
      district: district || null,
      notes: notes || null,
      payment_method: paymentMethod,
      // payment_status only exists after migration 0016; new orders default to "unpaid" without it.
      ...(paymentMethod === "payhere" ? { payment_status: "pending" } : {}),
      ...(couponCode ? { coupon_code: couponCode, discount } : {}),
      subtotal,
      delivery_fee: deliveryFee,
      total: Math.round((subtotal - discount + deliveryFee) * 100) / 100,
    })
    .select("id, order_number, public_token")
    .single();

  if (orderError || !order) {
    if (couponCode) await admin.rpc("release_coupon", { p_code: couponCode });
    const missingTable = orderError && /online_orders|schema cache|does not exist/i.test(orderError.message);
    return {
      ok: false,
      unavailable: Boolean(missingTable),
      error: missingTable
        ? "Online checkout isn't switched on yet. Please order via WhatsApp and we'll confirm your order right away."
        : "We couldn't place your order. Please try again or order via WhatsApp.",
    };
  }

  const { error: itemsError } = await admin
    .from("online_order_items")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    await admin.from("online_orders").delete().eq("id", order.id);
    if (couponCode) await admin.rpc("release_coupon", { p_code: couponCode });
    return { ok: false, error: "We couldn't place your order. Please try again or order via WhatsApp." };
  }

  return { ok: true, token: order.public_token as string, orderNumber: order.order_number as string };
}

export type CouponPreview = { ok: true; code: string; discount: number } | { ok: false; error: string };

// Preview only: nothing is redeemed until the order is placed.
export async function previewCoupon(code: string, subtotal: number): Promise<CouponPreview> {
  const h = await headers();
  if (!rateLimit(`coupon:${clientIp(h)}`, 20, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a few minutes." };
  }
  const clean_code = clean(code, 32).toUpperCase();
  if (!clean_code) return { ok: false, error: "Enter a coupon code." };
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "Your cart is empty." };

  const { data, error } = await createAdminClient().rpc("validate_coupon", {
    p_code: clean_code,
    p_subtotal: subtotal,
    p_redeem: false,
  });
  if (error) {
    // Table/function missing until migration 0017 is applied.
    return { ok: false, error: /validate_coupon|schema cache/i.test(error.message) ? "Coupons aren't available yet." : couponError(error.message) };
  }
  return { ok: true, code: clean_code, discount: Number(data ?? 0) };
}
