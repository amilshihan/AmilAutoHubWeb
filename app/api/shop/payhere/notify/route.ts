import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentStatusFromCode, verifyPayhereNotification } from "@/lib/shop/payhere";

// Server-to-server callback from PayHere after a payment attempt. The signature is verified
// before anything is written, and the amount must match the order total.
export async function POST(request: Request) {
  const form = await request.formData();
  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value;

  if (!verifyPayhereNotification(fields)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const status = paymentStatusFromCode(fields.status_code ?? "");
  if (!status) return new NextResponse("OK");

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("online_orders")
    .select("id, total, payment_method, payment_status")
    .eq("order_number", fields.order_id)
    .maybeSingle();

  if (!order || order.payment_method !== "payhere") return NextResponse.json({ error: "Unknown order" }, { status: 404 });

  if (status === "paid") {
    const amountMatches = Math.abs(Number(fields.payhere_amount) - Number(order.total)) < 0.01;
    if (!amountMatches || fields.payhere_currency !== "LKR") {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }
  }

  // A late "failed"/"pending" callback must not undo a payment that already succeeded.
  if (order.payment_status === "paid" && status !== "refunded") return new NextResponse("OK");

  await admin
    .from("online_orders")
    .update({ payment_status: status, payment_reference: fields.payment_id || null, updated_at: new Date().toISOString() })
    .eq("id", order.id);

  await admin
    .from("online_payments")
    .update({
      status,
      transaction_id: fields.payment_id || null,
      payment_date: status === "paid" ? new Date().toISOString() : undefined,
      refund_status: status === "refunded" ? "full" : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);

  return new NextResponse("OK");
}
