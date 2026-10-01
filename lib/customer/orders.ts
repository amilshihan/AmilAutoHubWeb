import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/shop/config";

export type CustomerOrderSummary = {
  id: string;
  orderNumber: string;
  publicToken: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: string;
};

const ACTIVE_STATUSES = new Set(["pending", "confirmed", "packed", "dispatched"]);

export async function getCustomerOrders(customerId: string): Promise<{ current: CustomerOrderSummary[]; history: CustomerOrderSummary[] }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("online_orders")
    .select("id, order_number, public_token, status, total, created_at, online_order_items(id)")
    .eq("customer_account_id", customerId)
    .order("created_at", { ascending: false })
    .limit(200);

  const all: CustomerOrderSummary[] = (data ?? []).map((o) => ({
    id: o.id as string,
    orderNumber: o.order_number as string,
    publicToken: o.public_token as string,
    status: o.status as OrderStatus,
    total: Number(o.total),
    itemCount: (o.online_order_items as unknown[] | null)?.length ?? 0,
    createdAt: o.created_at as string,
  }));

  return {
    current: all.filter((o) => ACTIVE_STATUSES.has(o.status)),
    history: all.filter((o) => !ACTIVE_STATUSES.has(o.status)),
  };
}
