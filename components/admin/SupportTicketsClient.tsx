"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cardSurface } from "@/lib/ui";
import { formatDateTime } from "@/lib/shop/format";
import { INQUIRY_TYPE_LABEL, TICKET_STATUSES, TICKET_STATUS_LABEL, type InquiryType, type TicketStatus } from "@/lib/shop/config";
import { toWhatsAppNumber, waLink } from "@/lib/shop/whatsapp";

export type AdminTicket = {
  id: string;
  ticket_number: string;
  customer_id: string;
  inquiry_type: InquiryType;
  subject: string;
  message: string;
  attachments: string[];
  status: TicketStatus;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  assigned_staff_id: string | null;
  customer_accounts: { first_name: string; last_name: string; email: string; mobile: string | null } | null;
  parts: { name: string } | null;
  online_orders: { order_number: string } | null;
  customer_vehicles: { make: string; model: string } | null;
  profiles: { full_name: string | null } | null;
};

const FILTERS: (TicketStatus | "all")[] = ["all", ...TICKET_STATUSES];

const BADGE: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-600",
};

function isImage(url: string) {
  return /\.(png|jpe?g|webp)$/i.test(url);
}

export default function SupportTicketsClient({ tickets, staff }: { tickets: AdminTicket[]; staff: { id: string; full_name: string | null }[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    for (const t of tickets) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [tickets]);

  const visible = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  async function update(ticketId: string, patch: Record<string, unknown>) {
    setError(null);
    const { error } = await supabase
      .from("support_tickets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Support tickets</h1>
        <p className="text-sm text-muted mt-1">Customer inquiries raised from their account.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "border-primary bg-primary text-white" : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
            }`}
          >
            {f === "all" ? "All" : TICKET_STATUS_LABEL[f]} <span className="opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-error/30 bg-error-light p-3 text-sm text-error">{error}</div>}

      {visible.length === 0 ? (
        <div className={`${cardSurface} p-10 text-center text-sm text-muted`}>No tickets here yet.</div>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => {
            const open = openId === t.id;
            const customer = t.customer_accounts;
            const wa = customer ? toWhatsAppNumber(customer.mobile ?? "") : null;
            return (
              <div key={t.id} className={`${cardSurface} overflow-hidden`}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-left hover:bg-surface"
                >
                  <span className="font-mono text-xs text-muted">{t.ticket_number}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[t.status]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
                  <span className="font-bold text-ink">{t.subject}</span>
                  <span className="text-sm text-muted">
                    {customer ? `${customer.first_name} ${customer.last_name}` : "Unknown customer"} · {INQUIRY_TYPE_LABEL[t.inquiry_type]}
                  </span>
                  {t.profiles?.full_name && <span className="text-xs text-accent">→ {t.profiles.full_name}</span>}
                  <span className="ml-auto text-sm text-muted">{formatDateTime(t.created_at)}</span>
                </button>

                {open && (
                  <div className="space-y-4 border-t border-card px-5 py-4">
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</div>
                        {customer ? (
                          <>
                            <div className="mt-1 text-ink">
                              {customer.first_name} {customer.last_name}
                            </div>
                            <div className="flex flex-wrap gap-3 text-accent">
                              {customer.mobile && (
                                <a href={`tel:${customer.mobile}`} className="hover:underline">
                                  {customer.mobile}
                                </a>
                              )}
                              {wa && (
                                <a href={waLink(wa, `Hi ${customer.first_name}, this is Amil Auto Hub about ticket ${t.ticket_number}.`)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  WhatsApp
                                </a>
                              )}
                            </div>
                            <div className="text-muted">{customer.email}</div>
                          </>
                        ) : (
                          <div className="mt-1 text-muted">Deleted account</div>
                        )}
                      </div>
                      <div>
                        {t.online_orders && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Order involved: </span>
                            <span className="text-ink">#{t.online_orders.order_number}</span>
                          </div>
                        )}
                        {t.customer_vehicles && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Vehicle involved: </span>
                            <span className="text-ink">
                              {t.customer_vehicles.make} {t.customer_vehicles.model}
                            </span>
                          </div>
                        )}
                        {t.parts && (
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Product involved: </span>
                            <span className="text-ink">{t.parts.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg bg-surface p-3 text-sm text-ink">
                      <span className="font-semibold">Message: </span>
                      <span className="whitespace-pre-wrap">{t.message}</span>
                    </div>

                    {t.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {t.attachments.map((url, idx) =>
                          isImage(url) ? (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Attachment ${idx + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                            </a>
                          ) : (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-16 w-16 items-center justify-center rounded-lg border border-card text-xs font-bold text-muted hover:bg-surface"
                            >
                              PDF
                            </a>
                          )
                        )}
                      </div>
                    )}

                    <TicketEditor ticket={t} staff={staff} onSave={(patch) => update(t.id, patch)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketEditor({
  ticket,
  staff,
  onSave,
}: {
  ticket: AdminTicket;
  staff: { id: string; full_name: string | null }[];
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedStaffId, setAssignedStaffId] = useState(ticket.assigned_staff_id ?? "");
  const [resolution, setResolution] = useState(ticket.resolution ?? "");
  const dirty = status !== ticket.status || assignedStaffId !== (ticket.assigned_staff_id ?? "") || resolution !== (ticket.resolution ?? "");

  const input =
    "rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-light";

  function save() {
    const closed = status === "resolved" || status === "closed";
    onSave({
      status,
      assigned_staff_id: assignedStaffId || null,
      resolution: resolution.trim() || null,
      closed_at: closed ? ticket.closed_at ?? new Date().toISOString() : null,
    });
  }

  return (
    <div className="space-y-3 rounded-lg bg-surface p-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)} className={`${input} mt-1`}>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Assigned to</label>
          <select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)} className={`${input} mt-1 min-w-[10rem]`}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name ?? "Unnamed staff"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Resolution</label>
        <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} className={`${input} mt-1 w-full`} placeholder="What was done to resolve this..." />
      </div>
      {ticket.closed_at && <p className="text-xs text-muted">Closed {formatDateTime(ticket.closed_at)}</p>}
      <button
        onClick={save}
        disabled={!dirty}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}
