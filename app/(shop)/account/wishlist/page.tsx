import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getWishlistIds } from "@/lib/customer/wishlist";
import { getProducts } from "@/lib/shop/data";
import ProductCard from "@/components/shop/ProductCard";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const products = await getProducts(await getWishlistIds(customer.id));

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Wishlist</h2>
      {products.length === 0 ? (
        <p className="mt-2 text-sm text-charcoal/60">
          Nothing saved yet. Tap the heart on any product to keep it here.{" "}
          <Link href="/shop" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Browse the shop
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-charcoal/60">Products you saved for later. Tap the heart to remove one.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
