"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardSurface } from "@/lib/ui";
import { formatDate, formatDateTime } from "@/lib/shop/format";
import { toWhatsAppNumber, waLink } from "@/lib/shop/whatsapp";

export type Booking = {
  id: string;
  booking_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_number: string | null;
  service_name: string;
  preferred_date: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

const STATUSES = ["requested", "confirmed", "completed", "cancelled"] as const;
const LABEL: Record<Booking["status"], string> = { requested: "Requested", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" };
const BADGE: Record<Booking["status"], string> = {
  requested: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-200 text-slate-600",
};
const NEXT: Partial<Record<Booking["status"], { to: Booking["status"]; label: string }>> = {
  requested: { to: "confirmed", label: "Confirm booking" },
  confirmed: { to: "completed", label: "Mark completed" },
};

export default function BookingsClient({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<Booking["status"] | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[b.status] = (c[b.status] ?? 0) + 1;
    return c;
  }, [bookings]);
  const visible = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  async function setStatus(b: Booking, status: Booking["status"]) {
    setBusy(b.id);
    setError(null);
    const { error } = await supabase.from("service_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", b.id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Service bookings</h1>
        <p className="text-sm text-muted mt-1">Requests from the website&apos;s Book a service form. Contact the customer to agree a time, then confirm.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "border-primary bg-primary text-white" : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
            }`}
          >
            {f === "all" ? "All" : LABEL[f]} <span className="opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={`${cardSurface} p-10 text-center text-sm text-muted`}>No bookings here yet.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => {
            const wa = toWhatsAppNumber(b.customer_phone);
            const vehicle = [b.vehicle_make, b.vehicle_model, b.vehicle_year].filter(Boolean).join(" ");
            const step = NEXT[b.status];
            return (
              <div key={b.id} className={`${cardSurface} p-5`}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span className="font-bold text-ink">#{b.booking_number}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[b.status]}`}>{LABEL[b.status]}</span>
                  <span className="font-semibold text-ink">{b.service_name}</span>
                  <span className="ml-auto text-sm text-muted">Requested {formatDateTime(b.created_at)}</span>
                </div>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</div>
                    <div className="mt-1 text-ink">{b.customer_name}</div>
                    <div className="flex flex-wrap gap-3 text-accent">
                      <a href={`tel:${b.customer_phone}`} className="hover:underline">
                        {b.customer_phone}
                      </a>
                      {wa && (
                        <a
                          href={waLink(wa, `Hi ${b.customer_name}, this is Amil Auto Hub about your service booking ${b.booking_number}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                    {b.customer_email && <div className="text-muted">{b.customer_email}</div>}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Vehicle</div>
                    <div className="mt-1 text-ink">{vehicle || "Not given"}</div>
                    {b.vehicle_number && <div className="text-muted">{b.vehicle_number}</div>}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Preferred</div>
                    <div className="mt-1 text-ink">{b.preferred_date ? formatDate(b.preferred_date) : "No date given"}</div>
                    <div className="text-muted">{b.preferred_time ?? "Any time"}</div>
                  </div>
                </div>

                {b.notes && <div className="mt-3 rounded-lg bg-surface p-3 text-sm text-ink">{b.notes}</div>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {step && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => setStatus(b, step.to)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                    >
                      {step.label}
                    </button>
                  )}
                  {b.status !== "completed" && b.status !== "cancelled" && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => {
                        if (window.confirm(`Cancel booking ${b.booking_number}?`)) void setStatus(b, "cancelled");
                      }}
                      className="rounded-lg border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error-light disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  )}
                  {b.status === "cancelled" && (
                    <button
                      disabled={busy === b.id}
                      onClick={() => setStatus(b, "requested")}
                      className="rounded-lg border border-btn-secondary-border px-4 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
