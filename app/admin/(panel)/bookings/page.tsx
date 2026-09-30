import { createClient } from "@/lib/supabase/server";
import BookingsClient, { type Booking } from "@/components/admin/BookingsClient";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("service_bookings").select("*").order("created_at", { ascending: false }).limit(500);

  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Service bookings</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Service bookings are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0017_admin_features.sql</code> in the Supabase SQL editor, then reload.
          </p>
        </div>
      </div>
    );
  }

  return <BookingsClient bookings={(data ?? []) as Booking[]} />;
}
