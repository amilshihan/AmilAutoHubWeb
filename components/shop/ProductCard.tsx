import Link from "next/link";
import type { PublicProduct } from "@/lib/shop/types";
import Money from "@/components/shop/Money";
import ProductVisual from "@/components/shop/ProductVisual";
import AddToCartButton from "@/components/shop/AddToCartButton";
import { ShieldIcon } from "@/components/shop/Icons";

export function StockBadge({ product }: { product: PublicProduct }) {
  if (!product.inStock) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal/55">Out of stock</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${product.lowStock ? "text-amber-700" : "text-stock"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${product.lowStock ? "bg-amber-500" : "bg-stock"}`} />
      {product.lowStock ? "Low stock" : "In Stock"}
    </span>
  );
}

export function PriceBlock({ product, large = false }: { product: PublicProduct; large?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <Money amount={product.price} className={`${large ? "text-3xl" : "text-lg"} font-extrabold text-charcoal tabular-nums`} />
      {product.compareAt && (
        <Money amount={product.compareAt} className={`${large ? "text-base" : "text-sm"} text-charcoal/45 line-through tabular-nums`} />
      )}
    </div>
  );
}

export default function ProductCard({
  product,
  verifiedFit = false,
}: {
  product: PublicProduct;
  verifiedFit?: boolean;
}) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-charcoal/10 bg-white transition-shadow hover:shadow-lg hover:shadow-charcoal/10">
      <Link href={`/product/${product.id}`} className="relative block aspect-[4/3] overflow-hidden">
        <ProductVisual
          imageUrl={product.imageUrl}
          name={product.name}
          brand={product.brand}
          collection={product.collection}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {product.discountPct !== null && (
          <span className="absolute left-2 top-2 rounded-md bg-deal px-2 py-1 text-xs font-extrabold text-white">
            {product.discountPct}% OFF
          </span>
        )}
        {verifiedFit && (
          <span className="absolute right-2 top-2 rounded-md bg-stock px-2 py-1 text-[11px] font-bold text-white">
            Fits your vehicle
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-h-[1rem] text-[11px] font-bold uppercase tracking-wider text-charcoal/50">
          {product.brand ?? " "}
        </div>
        <Link
          href={`/product/${product.id}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-charcoal hover:underline"
        >
          {product.name}
        </Link>
        {product.compat.length > 0 && (
          <p className="line-clamp-1 text-xs text-charcoal/55">Fits: {product.compat.slice(0, 2).join(", ")}</p>
        )}
        <div className="mt-auto pt-1">
          <PriceBlock product={product} />
          <div className="mt-1 flex items-center gap-3">
            <StockBadge product={product} />
            <span className="inline-flex items-center gap-1 text-xs text-charcoal/55">
              <ShieldIcon width={13} height={13} /> Genuine
            </span>
          </div>
        </div>
        <AddToCartButton product={product} />
      </div>
    </article>
  );
}
