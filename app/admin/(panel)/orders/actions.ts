"use server";

import { getCurrentUserAndProfile } from "@/lib/auth";
import { isActiveStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmail, type OrderEmailOutcome } from "@/lib/email/orderEmail";
import type { OrderEmailKind } from "@/lib/email/templates";

export type OrderEvent = "status" | "payment" | "refund" | "tracking" | "invoice";

const STATUS_EMAILS = new Set(["confirmed", "packed", "dispatched", "delivered", "cancelled"]);

// Called by the admin orders screen after staff change an order. The email to send is decided
// here from the order's current state in the database, never from what the browser says.
export async function notifyOrderEvent(orderId: string, event: OrderEvent): Promise<OrderEmailOutcome> {
  const { profile } = await getCurrentUserAndProfile();
  if (!isActiveStaff(profile)) return { ok: false, message: "Please sign in again." };

  const { data: o } = await createAdminClient()
    .from("online_orders")
    .select("status, payment_status, refunded_at, refund_amount, courier, tracking_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return { ok: false, message: "Order not found." };

  const nothing: OrderEmailOutcome = { ok: true, message: "" };
  switch (event) {
    case "status":
      return STATUS_EMAILS.has(o.status) ? sendOrderEmail(orderId, o.status as OrderEmailKind) : nothing;
    case "payment":
      if (o.payment_status === "paid") return sendOrderEmail(orderId, "paid");
      if (o.payment_status === "refunded") return sendOrderEmail(orderId, "refunded");
      return nothing;
    case "refund":
      return o.refunded_at || o.payment_status === "refunded" || Number(o.refund_amount) > 0 ? sendOrderEmail(orderId, "refunded") : nothing;
    case "tracking":
      return o.status === "dispatched" && (o.courier || o.tracking_number) ? sendOrderEmail(orderId, "tracking") : nothing;
    case "invoice":
      return sendOrderEmail(orderId, "invoice", { force: true });
  }
}
