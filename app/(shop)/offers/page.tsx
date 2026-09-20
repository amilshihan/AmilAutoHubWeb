import type { Metadata } from "next";
import ShopListing from "@/components/shop/ShopListing";
import { parseShopParams, type RawParams } from "@/lib/shop/params";

export const metadata: Metadata = {
  title: "Offers",
  description: "Today's deals on engine oils, filters, parts and more at Amil Auto Hub.",
};

export default async function OffersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  return (
    <ShopListing
      basePath="/offers"
      query={parseShopParams(sp, undefined, { deals: true, sort: parseShopParams(sp).sort ?? "discount" })}
      rawParams={sp}
      title="Today's Offers"
      intro="Special prices on genuine products while stocks last."
    />
  );
}
