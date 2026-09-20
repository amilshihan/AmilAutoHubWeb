import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/shop/data";

export const metadata: Metadata = {
  title: "Brands",
  description: "Shop trusted oil, filter, brake and car care brands at Amil Auto Hub.",
};

// Refresh stock, prices and shop details periodically instead of freezing them at build time.
export const revalidate = 60;

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Shop by Brand</h1>
      <p className="mt-1 text-charcoal/65">Trusted names for your vehicle.</p>

      {brands.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-charcoal/25 p-8 text-center text-charcoal/60">
          Brands will appear here as our catalogue grows.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {brands.map((b) => (
            <Link
              key={b.name}
              href={`/shop?brand=${encodeURIComponent(b.name)}`}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-charcoal/10 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-amil hover:shadow-lg hover:shadow-charcoal/10"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-charcoal text-2xl font-extrabold text-amil">
                {b.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-extrabold text-charcoal">{b.name}</span>
              <span className="text-xs text-charcoal/55">
                {b.count} product{b.count === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
