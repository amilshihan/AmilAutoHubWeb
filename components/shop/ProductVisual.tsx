import type { CollectionSlug } from "@/lib/shop/collections";
import { CollectionGlyph } from "@/components/shop/Icons";

// Shows the product photo when one exists, otherwise a branded placeholder so the grid
// still looks intentional while photos are being added.
export default function ProductVisual({
  imageUrl,
  name,
  brand,
  collection,
  className = "",
}: {
  imageUrl: string | null;
  name: string;
  brand: string | null;
  collection: CollectionSlug;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} loading="lazy" className="h-full w-full object-contain bg-white" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/amil-logo.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 w-[78%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] select-none opacity-[0.22]"
        />
      </div>
    );
  }
  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-charcoal-soft to-charcoal text-amil ${className}`}
      role="img"
      aria-label={name}
    >
      <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_10px)]" />
      <CollectionGlyph slug={collection} width={44} height={44} className="relative" />
      {brand && (
        <span className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-white/70 px-2 text-center">
          {brand}
        </span>
      )}
    </div>
  );
}
