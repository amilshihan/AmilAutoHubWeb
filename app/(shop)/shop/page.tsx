import type { Metadata } from "next";
import ShopListing from "@/components/shop/ShopListing";
import { parseShopParams, type RawParams } from "@/lib/shop/params";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse engine oils, filters, car parts, batteries, car care products and more.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  return <ShopListing basePath="/shop" query={parseShopParams(sp)} rawParams={sp} />;
}
