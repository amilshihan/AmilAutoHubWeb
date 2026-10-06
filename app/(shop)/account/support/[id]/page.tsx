import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerTicket } from "@/lib/customer/support";
import { INQUIRY_TYPE_LABEL, TICKET_STATUS_LABEL } from "@/lib/shop/config";
import { getFormatters } from "@/lib/shop/siteSettings";

export const metadata: Metadata = { title: "Support ticket", robots: { index: false } };

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-600",
};

function isImage(url: string) {
  return /\.(png|jpe?g|webp)$/i.test(url);
}

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account/support");
  const fmt = await getFormatters();

  const { id } = await params;
  const ticket = await getCustomerTicket(id, customer.id);
  if (!ticket) notFound();

  return (
    <div>
      <Link href="/account/support" className="text-sm font-semibold text-charcoal/60 hover:underline">
        ← Support
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-charcoal">{ticket.subject}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[ticket.status]}`}>{TICKET_STATUS_LABEL[ticket.status]}</span>
      </div>
      <p className="mt-1 text-sm text-charcoal/55">
        {ticket.ticketNumber} · {INQUIRY_TYPE_LABEL[ticket.inquiryType]} · Opened {fmt.dateTime(ticket.createdAt)}
      </p>

      <div className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal/50">Message</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal">{ticket.message}</p>

        {(ticket.orderNumber || ticket.vehicleLabel || ticket.productName) && (
          <dl className="mt-4 grid gap-2 border-t border-charcoal/10 pt-4 text-sm sm:grid-cols-3">
            {ticket.orderNumber && (
              <div>
                <dt className="text-xs text-charcoal/50">Order involved</dt>
                <dd className="font-semibold text-charcoal">#{ticket.orderNumber}</dd>
              </div>
            )}
            {ticket.vehicleLabel && (
              <div>
                <dt className="text-xs text-charcoal/50">Vehicle involved</dt>
                <dd className="font-semibold text-charcoal">{ticket.vehicleLabel}</dd>
              </div>
            )}
            {ticket.productName && (
              <div>
                <dt className="text-xs text-charcoal/50">Product involved</dt>
                <dd className="font-semibold text-charcoal">{ticket.productName}</dd>
              </div>
            )}
          </dl>
        )}

        {ticket.attachments.length > 0 && (
          <div className="mt-4 border-t border-charcoal/10 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-charcoal/50">Attachments</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {ticket.attachments.map((url, idx) =>
                isImage(url) ? (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Attachment ${idx + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                  </a>
                ) : (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-20 w-20 items-center justify-center rounded-lg border border-charcoal/15 text-xs font-bold text-charcoal/60 hover:bg-surface"
                  >
                    PDF
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {ticket.resolution && (
        <div className="mt-4 rounded-2xl border border-stock/30 bg-stock-soft p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stock">Resolution</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-charcoal">{ticket.resolution}</p>
          {ticket.closedAt && <p className="mt-2 text-xs text-charcoal/55">Closed {fmt.dateTime(ticket.closedAt)}</p>}
        </div>
      )}
    </div>
  );
}
