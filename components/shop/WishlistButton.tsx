"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/shop/Icons";
import { useWishlist } from "@/components/shop/WishlistProvider";

export default function WishlistButton({
  productId,
  className = "",
  withLabel = false,
}: {
  productId: string;
  className?: string;
  withLabel?: boolean;
}) {
  const { has, toggle } = useWishlist();
  const [error, setError] = useState<string | null>(null);
  const saved = has(productId);
  const label = saved ? "Remove from wishlist" : "Save to wishlist";

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={label}
      title={error ?? label}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setError(await toggle(productId));
      }}
      className={`inline-flex items-center justify-center gap-2 transition-colors ${
        saved ? "text-deal" : "text-charcoal/60 hover:text-deal"
      } ${className}`}
    >
      <HeartIcon width={18} height={18} fill={saved ? "currentColor" : "none"} />
      {withLabel && <span className="text-sm font-semibold">{error ?? (saved ? "Saved" : "Save to wishlist")}</span>}
    </button>
  );
}
