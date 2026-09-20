import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="text-6xl font-extrabold text-amil">404</div>
      <h1 className="mt-3 text-3xl font-extrabold text-charcoal">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-charcoal/65">The product or page may have moved. Try searching, or head back to the shop.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/shop" className="rounded-lg bg-amil px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover">
          Shop all
        </Link>
        <Link href="/" className="rounded-lg border border-charcoal/20 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-charcoal/5">
          Home
        </Link>
      </div>
    </div>
  );
}
