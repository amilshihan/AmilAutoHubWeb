import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getSavedCarts, MAX_SAVED_CARTS } from "@/lib/customer/savedCarts";
import { formatDate } from "@/lib/shop/format";
import SavedCartList from "@/components/shop/SavedCartList";

export const metadata: Metadata = { title: "Saved Carts", robots: { index: false } };

export default async function SavedCartsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const carts = await getSavedCarts(customer.id);

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Saved carts</h2>
      {carts.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal/60">
          No saved carts yet. Fill your{" "}
          <Link href="/cart" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            cart
          </Link>{" "}
          and choose &ldquo;Save cart for later&rdquo; to keep it here, for example a service kit you reorder.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-charcoal/60">
            Up to {MAX_SAVED_CARTS} carts. Using one replaces what is in your cart now, with today&apos;s prices.
          </p>
          <div className="mt-4">
            <SavedCartList
              carts={carts.map((c) => ({
                id: c.id,
                name: c.name,
                itemCount: c.items.reduce((n, i) => n + i.qty, 0),
                createdLabel: formatDate(c.createdAt),
              }))}
            />
          </div>
        </>
      )}
    </section>
  );
}
