import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getWishlistIds } from "@/lib/customer/wishlist";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ signedIn: false, ids: [] });
  return NextResponse.json({ signedIn: true, ids: await getWishlistIds(customer.id) });
}
