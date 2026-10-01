import { createClient } from "@/lib/supabase/server";
import SupportTicketsClient, { type AdminTicket } from "@/components/admin/SupportTicketsClient";

export default async function SupportTicketsPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: staff }] = await Promise.all([
    supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, customer_id, inquiry_type, subject, message, attachments, status, resolution, created_at, updated_at, closed_at, assigned_staff_id, customer_accounts(first_name, last_name, email, mobile), parts(name), online_orders(order_number), customer_vehicles(make, model), profiles(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Support tickets</h1>
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          Support tickets are not set up yet. Run <code className="rounded bg-amber-100 px-1">0028_support_tickets.sql</code> in Supabase first.
        </p>
      </div>
    );
  }

  return <SupportTicketsClient tickets={(data ?? []) as unknown as AdminTicket[]} staff={staff ?? []} />;
}
