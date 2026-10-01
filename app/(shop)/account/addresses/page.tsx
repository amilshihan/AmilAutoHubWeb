import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerAddresses } from "@/lib/customer/addresses";
import AddressBook from "@/components/shop/AddressBook";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const addresses = await getCustomerAddresses(customer.id);

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Addresses</h2>
      <p className="mt-1 text-sm text-charcoal/60">Save home, work or other addresses for faster checkout.</p>
      <div className="mt-4">
        <AddressBook addresses={addresses} />
      </div>
    </section>
  );
}
