import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getRelated, getShopInfo } from "@/lib/shop/data";
import { COLLECTION_BY_SLUG } from "@/lib/shop/collections";
import { formatLKR } from "@/lib/shop/format";
import ProductVisual from "@/components/shop/ProductVisual";
import Money from "@/components/shop/Money";
import ProductCard, { PriceBlock, StockBadge } from "@/components/shop/ProductCard";
import AddToCartButton from "@/components/shop/AddToCartButton";
import WishlistButton from "@/components/shop/WishlistButton";
import { ChevronIcon, PinIcon, ShieldIcon, TruckIcon } from "@/components/shop/Icons";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: `Buy ${product.name} for ${formatLKR(product.price)} at Amil Auto Hub. Islandwide delivery or pickup in Kottawa.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const [related, shop] = await Promise.all([getRelated(product), getShopInfo()]);
  const collection = COLLECTION_BY_SLUG[product.collection];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.imageUrl ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "LKR",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-charcoal/55">
        <Link href="/" className="hover:text-charcoal">
          Home
        </Link>
        <ChevronIcon width={12} height={12} />
        <Link href="/shop" className="hover:text-charcoal">
          Shop
        </Link>
        <ChevronIcon width={12} height={12} />
        <Link href={`/shop/${product.collection}`} className="hover:text-charcoal">
          {collection.label}
        </Link>
        <ChevronIcon width={12} height={12} />
        <span className="line-clamp-1 font-semibold text-charcoal">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-charcoal/10">
          <ProductVisual
            imageUrl={product.imageUrl}
            name={product.name}
            brand={product.brand}
            collection={product.collection}
          />
          <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">
            {product.discountPct !== null && (
              <span className="rounded-lg bg-deal px-3 py-1.5 text-sm font-extrabold text-white">{product.discountPct}% OFF</span>
            )}
            {product.isNew && <span className="rounded-lg bg-charcoal px-3 py-1.5 text-xs font-extrabold uppercase text-amil">New</span>}
            {product.bestseller && (
              <span className="rounded-lg bg-amil px-3 py-1.5 text-xs font-extrabold uppercase text-charcoal">Bestseller</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            {product.brand && (
              <Link
                href={`/shop?brand=${encodeURIComponent(product.brand)}`}
                className="text-xs font-extrabold uppercase tracking-widest text-charcoal/55 hover:text-charcoal"
              >
                {product.brand}
              </Link>
            )}
            <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight text-charcoal">{product.name}</h1>
            {product.shortDescription && <p className="mt-2 text-base text-charcoal/70">{product.shortDescription}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-charcoal/60">
              {product.productType && <span>{product.productType}</span>}
              {product.subcategory && <span>{product.subcategory}</span>}
              {product.productCode && <span>Code: {product.productCode}</span>}
              {product.sku && <span>SKU: {product.sku}</span>}
              {product.packSize && <span>Pack size: {product.packSize}</span>}
              <StockBadge product={product} />
            </div>
          </div>

          <PriceBlock product={product} large />
          {product.compareAt && (
            <p className="-mt-3 text-sm font-semibold text-deal">
              You save <Money amount={product.compareAt - product.price} />
            </p>
          )}

          <AddToCartButton product={product} withQuantity />
          <WishlistButton
            productId={product.id}
            withLabel
            className="self-start rounded-lg border border-charcoal/15 px-4 py-2.5 hover:border-deal/40"
          />

          {product.description && <p className="leading-relaxed text-charcoal/75">{product.description}</p>}

          {product.compat.length > 0 ? (
            <div className="rounded-xl bg-surface p-4">
              <h2 className="mb-2 text-sm font-extrabold text-charcoal">Vehicle compatibility</h2>
              <ul className="space-y-1 text-sm text-charcoal/75">
                {product.compat.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stock" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl bg-surface p-4 text-sm text-charcoal/70">
              Not sure this fits your vehicle?{" "}
              <Link href="/ask-amil" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
                Ask Amil
              </Link>{" "}
              or message us on WhatsApp before you order.
            </p>
          )}

          <ul className="grid gap-3 border-t border-charcoal/10 pt-5 text-sm text-charcoal/75 sm:grid-cols-3">
            <li className="flex gap-2.5">
              <ShieldIcon width={20} height={20} className="shrink-0 text-stock" />
              Genuine product
            </li>
            <li className="flex gap-2.5">
              <TruckIcon width={20} height={20} className="shrink-0 text-stock" />
              Islandwide delivery
            </li>
            <li className="flex gap-2.5">
              <PinIcon width={20} height={20} className="shrink-0 text-stock" />
              Pickup: {shop.pickupLocation}
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-14">
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-charcoal">You may also need</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
