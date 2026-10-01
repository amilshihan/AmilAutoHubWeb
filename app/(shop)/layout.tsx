import type { Metadata } from "next";
import { getShopInfo } from "@/lib/shop/data";
import CartProvider from "@/components/shop/CartProvider";
import CurrencyProvider from "@/components/shop/CurrencyProvider";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFooter from "@/components/shop/ShopFooter";
import CartToast from "@/components/shop/CartToast";
import FloatingWhatsApp from "@/components/shop/FloatingWhatsApp";

export const metadata: Metadata = {
  title: {
    default: "Amil Auto Hub | Genuine Parts, Engine Oils & Auto Services in Sri Lanka",
    template: "%s | Amil Auto Hub",
  },
  description:
    "Genuine spare parts, premium lubricants and automotive essentials. Find parts for your vehicle, order online with islandwide delivery, or pick up at Kottawa.",
};

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const shop = await getShopInfo();

  return (
    <CurrencyProvider>
      <CartProvider shop={shop}>
        <div className="flex min-h-screen flex-col bg-white text-charcoal">
          <ShopHeader shop={shop} />
          <main className="flex-1">{children}</main>
          <ShopFooter shop={shop} />
        </div>
        <CartToast />
        <FloatingWhatsApp />
      </CartProvider>
    </CurrencyProvider>
  );
}
