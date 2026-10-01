import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InquiryType, TicketStatus } from "@/lib/shop/config";

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  customerId: string;
  inquiryType: InquiryType;
  subject: string;
  message: string;
  partId: string | null;
  productName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  attachments: string[];
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  status: TicketStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

const COLUMNS = `
  id, ticket_number, customer_id, inquiry_type, subject, message, attachments, status, resolution, created_at, updated_at, closed_at,
  part_id, parts(name),
  order_id, online_orders(order_number),
  vehicle_id, customer_vehicles(make, model),
  assigned_staff_id, profiles(full_name)
`;

function toTicket(row: Record<string, unknown>): SupportTicket {
  const part = row.parts as { name: string } | null;
  const order = row.online_orders as { order_number: string } | null;
  const vehicle = row.customer_vehicles as { make: string; model: string } | null;
  const staff = row.profiles as { full_name: string | null } | null;
  return {
    id: row.id as string,
    ticketNumber: row.ticket_number as string,
    customerId: row.customer_id as string,
    inquiryType: row.inquiry_type as InquiryType,
    subject: row.subject as string,
    message: row.message as string,
    partId: (row.part_id as string | null) ?? null,
    productName: part?.name ?? null,
    orderId: (row.order_id as string | null) ?? null,
    orderNumber: order?.order_number ?? null,
    vehicleId: (row.vehicle_id as string | null) ?? null,
    vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
    attachments: (row.attachments as string[] | null) ?? [],
    assignedStaffId: (row.assigned_staff_id as string | null) ?? null,
    assignedStaffName: staff?.full_name ?? null,
    status: row.status as TicketStatus,
    resolution: (row.resolution as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    closedAt: (row.closed_at as string | null) ?? null,
  };
}

export async function getCustomerTickets(customerId: string): Promise<SupportTicket[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("support_tickets")
    .select(COLUMNS)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => toTicket(row as unknown as Record<string, unknown>));
}

// Ownership-checked: a customer can only ever see their own ticket, by id.
export async function getCustomerTicket(ticketId: string, customerId: string): Promise<SupportTicket | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("support_tickets").select(COLUMNS).eq("id", ticketId).eq("customer_id", customerId).maybeSingle();
  return data ? toTicket(data as unknown as Record<string, unknown>) : null;
}

export async function getCustomerOrderOptions(customerId: string): Promise<{ id: string; label: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("online_orders")
    .select("id, order_number, created_at")
    .eq("customer_account_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((o) => ({ id: o.id as string, label: `#${o.order_number}` }));
}
