import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopListing from "@/components/shop/ShopListing";
import { COLLECTION_BY_SLUG, isCollectionSlug } from "@/lib/shop/collections";
import { parseShopParams, type RawParams } from "@/lib/shop/params";

type Params = Promise<{ collection: string; subcategory: string }>;

function find(collection: string, subcategory: string) {
  if (!isCollectionSlug(collection)) return null;
  const c = COLLECTION_BY_SLUG[collection];
  const sub = c.subcategories?.find((s) => s.slug === subcategory);
  return sub ? { c, sub } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { collection, subcategory } = await params;
  const found = find(collection, subcategory);
  if (!found) return {};
  return {
    title: `${found.sub.label} | ${found.c.label}`,
    description: `Shop ${found.sub.label.toLowerCase()} in ${found.c.label.toLowerCase()} at Amil Auto Hub. Genuine products, islandwide delivery or pickup in Kottawa.`,
    alternates: { canonical: `/shop/${found.c.slug}/${found.sub.slug}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<RawParams> }) {
  const { collection, subcategory } = await params;
  const found = find(collection, subcategory);
  if (!found) notFound();
  const sp = await searchParams;
  return (
    <ShopListing
      basePath={`/shop/${found.c.slug}/${found.sub.slug}`}
      query={parseShopParams(sp, found.c.slug, { subcategory: found.sub.slug })}
      rawParams={sp}
      collection={found.c.slug}
      subcategory={found.sub.slug}
    />
  );
}
