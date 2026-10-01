import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Saved Carts", robots: { index: false } };

export default async function SavedCartsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Saved carts</h2>
      <p className="mt-2 text-sm text-charcoal/60">Naming and saving multiple carts for later is coming soon. Your current cart is always kept until you clear it.</p>
    </section>
  );
}
