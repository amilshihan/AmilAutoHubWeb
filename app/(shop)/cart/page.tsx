import type { Metadata } from "next";
import CartView from "@/components/shop/CartView";
import { getCurrentCustomer } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  return <CartView signedIn={Boolean(await getCurrentCustomer())} />;
}
