import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerTickets, getCustomerOrderOptions } from "@/lib/customer/support";
import { getCustomerVehicles } from "@/lib/customer/vehicles";
import { getPurchasedPartIds } from "@/lib/customer/fitmentHistory";
import { getProducts } from "@/lib/shop/data";
import { INQUIRY_TYPE_LABEL, TICKET_STATUS_LABEL } from "@/lib/shop/config";
import { getFormatters } from "@/lib/shop/siteSettings";
import SupportTicketForm from "@/components/shop/SupportTicketForm";

export const metadata: Metadata = { title: "Support", robots: { index: false } };

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-600",
};

export default async function SupportPage() {
  const customer = await getCurrentCustomer();
  const fmt = await getFormatters();

  if (!customer) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Support</h1>
        <p className="mt-3 text-charcoal/65">Sign in to raise a support ticket and track its progress.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-lg bg-charcoal px-6 py-3 text-sm font-bold text-white hover:bg-charcoal-soft">
          Sign in
        </Link>
      </div>
    );
  }

  const [tickets, orderOptions, vehicles, purchasedIds] = await Promise.all([
    getCustomerTickets(customer.id),
    getCustomerOrderOptions(customer.id),
    getCustomerVehicles(customer.id),
    getPurchasedPartIds(customer.id),
  ]);
  const products = await getProducts(purchasedIds);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">New ticket</h2>
        <p className="mt-1 text-sm text-charcoal/60">Raise a ticket and we&apos;ll get back to you.</p>
        <div className="mt-4">
          <SupportTicketForm
            orders={orderOptions.map((o) => ({ id: o.id, label: o.label }))}
            vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.make} ${v.model} (${v.registrationNumber})` }))}
            products={products.map((p) => ({ id: p.id, label: p.name }))}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-extrabold text-charcoal">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal/60">No tickets yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/account/support/${t.id}`}
                  className="block rounded-xl border border-charcoal/10 bg-white p-4 hover:border-charcoal/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-charcoal/50">{t.ticketNumber}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[t.status]}`}>{TICKET_STATUS_LABEL[t.status]}</span>
                  </div>
                  <p className="mt-1 font-bold text-charcoal">{t.subject}</p>
                  <p className="text-xs text-charcoal/55">
                    {INQUIRY_TYPE_LABEL[t.inquiryType]} · {fmt.dateTime(t.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
