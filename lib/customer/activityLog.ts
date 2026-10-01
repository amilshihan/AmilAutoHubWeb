import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityEventType =
  | "account_created"
  | "login"
  | "logout"
  | "password_changed"
  | "email_changed"
  | "mobile_changed"
  | "address_added"
  | "address_changed"
  | "vehicle_added"
  | "order_placed"
  | "order_cancelled"
  | "refund_requested"
  | "support_ticket_created"
  | "loyalty_points_changed"
  | "account_deleted";

export type ActivityLogEntry = {
  id: string;
  eventType: ActivityEventType;
  description: string | null;
  actorType: "customer" | "admin" | "system";
  actorName: string | null;
  source: string | null;
  createdAt: string;
};

// Fire-and-forget: a logging failure should never block the action that triggered it, so
// errors are swallowed here rather than surfaced to the caller.
export async function logCustomerActivity(params: {
  customerId: string;
  eventType: ActivityEventType;
  description?: string;
  actorType?: "customer" | "admin" | "system";
  source?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("customer_activity_log").insert({
    customer_id: params.customerId,
    event_type: params.eventType,
    description: params.description ?? null,
    actor_type: params.actorType ?? "customer",
    source: params.source ?? null,
  });
}

export async function getCustomerActivityLog(customerId: string, limit = 100): Promise<ActivityLogEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_activity_log")
    .select("id, event_type, description, actor_type, actor_name, source, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    eventType: row.event_type as ActivityEventType,
    description: (row.description as string | null) ?? null,
    actorType: row.actor_type as ActivityLogEntry["actorType"],
    actorName: (row.actor_name as string | null) ?? null,
    source: (row.source as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
