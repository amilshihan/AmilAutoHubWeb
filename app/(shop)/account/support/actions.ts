"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { INQUIRY_TYPES, type InquiryType } from "@/lib/shop/config";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export type CreateTicketResult = { ok: true; id: string; ticketNumber: string } | { ok: false; error: string };

const clean = (s: FormDataEntryValue | null, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export async function createTicket(formData: FormData): Promise<CreateTicketResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please sign in again." };

  const h = await headers();
  if (!rateLimit(`ticket:${clientIp(h)}`, 10, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }

  const inquiryType = formData.get("inquiryType") as InquiryType;
  if (!INQUIRY_TYPES.includes(inquiryType)) return { ok: false, error: "Please choose what this is about." };
  const subject = clean(formData.get("subject"), 150);
  if (subject.length < 3) return { ok: false, error: "Please enter a subject." };
  const message = clean(formData.get("message"), 3000);
  if (message.length < 10) return { ok: false, error: "Please describe the issue in a bit more detail." };

  const admin = createAdminClient();

  // Optional references -- only trust them once ownership is verified.
  let orderId: string | null = null;
  const requestedOrderId = clean(formData.get("orderId"), 100);
  if (requestedOrderId) {
    const { data } = await admin.from("online_orders").select("id").eq("id", requestedOrderId).eq("customer_account_id", customer.id).maybeSingle();
    orderId = data?.id ?? null;
  }
  let vehicleId: string | null = null;
  const requestedVehicleId = clean(formData.get("vehicleId"), 100);
  if (requestedVehicleId) {
    const { data } = await admin.from("customer_vehicles").select("id").eq("id", requestedVehicleId).eq("customer_id", customer.id).maybeSingle();
    vehicleId = data?.id ?? null;
  }
  const partId = clean(formData.get("partId"), 100) || null;

  const { data: ticket, error } = await admin
    .from("support_tickets")
    .insert({
      customer_id: customer.id,
      inquiry_type: inquiryType,
      subject,
      message,
      order_id: orderId,
      vehicle_id: vehicleId,
      part_id: partId,
    })
    .select("id, ticket_number")
    .single();

  if (error || !ticket) return { ok: false, error: "We couldn't submit your ticket. Please try again." };

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  const urls: string[] = [];
  for (const file of files.slice(0, 5)) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") continue;
    if (file.size > 8 * 1024 * 1024) continue;
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `tickets/${ticket.id}/${Date.now()}-${urls.length}.${ext}`;
    const { error: uploadError } = await admin.storage.from("support-attachments").upload(path, file, { contentType: file.type, upsert: false });
    if (!uploadError) {
      const { data } = admin.storage.from("support-attachments").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }

  if (urls.length > 0) {
    await admin.from("support_tickets").update({ attachments: urls }).eq("id", ticket.id);
  }

  await logCustomerActivity({
    customerId: customer.id,
    eventType: "support_ticket_created",
    description: `Ticket ${ticket.ticket_number}: ${subject}`,
    source: clientIp(h),
  });

  return { ok: true, id: ticket.id as string, ticketNumber: ticket.ticket_number as string };
}
