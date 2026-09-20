import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopListing from "@/components/shop/ShopListing";
import { COLLECTION_BY_SLUG, isCollectionSlug } from "@/lib/shop/collections";
import { parseShopParams, type RawParams } from "@/lib/shop/params";

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }): Promise<Metadata> {
  const { collection } = await params;
  if (!isCollectionSlug(collection)) return {};
  const c = COLLECTION_BY_SLUG[collection];
  return { title: c.label, description: c.blurb };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { collection } = await params;
  if (!isCollectionSlug(collection)) notFound();
  const sp = await searchParams;
  return (
    <ShopListing
      basePath={`/shop/${collection}`}
      query={parseShopParams(sp, collection)}
      rawParams={sp}
      collection={collection}
    />
  );
}
