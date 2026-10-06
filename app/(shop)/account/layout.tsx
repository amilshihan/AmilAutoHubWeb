import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerTickets } from "@/lib/customer/support";
import AccountNav from "@/components/shop/AccountNav";
import VerifyEmailBanner from "@/components/shop/VerifyEmailBanner";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return <div className="mx-auto max-w-xl px-4 py-14">{children}</div>;
  }

  const tickets = await getCustomerTickets(customer.id);
  const openTicketCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">My Account</h1>
      {customer.authProvider === "password" && !customer.emailVerified && <VerifyEmailBanner email={customer.email} />}
      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-3">
            <AccountNav openTicketCount={openTicketCount} />
          </div>
          <Link
            href="/"
            className="mt-3 block rounded-lg px-3.5 py-2 text-center text-sm font-bold text-charcoal/60 hover:text-charcoal"
          >
            ← Back to shop
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
