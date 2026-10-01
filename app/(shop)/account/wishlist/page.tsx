import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Wishlist</h2>
      <p className="mt-2 text-sm text-charcoal/60">
        Saving products for later is coming soon. In the meantime, use{" "}
        <a href="/account/orders" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
          Buy again
        </a>{" "}
        to quickly reorder something you&apos;ve bought before.
      </p>
    </section>
  );
}
