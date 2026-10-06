import type { Metadata } from "next";
import { getShopInfo } from "@/lib/shop/data";
import { getSiteSettings } from "@/lib/shop/siteSettings";
import CartProvider from "@/components/shop/CartProvider";
import CurrencyProvider from "@/components/shop/CurrencyProvider";
import WishlistProvider from "@/components/shop/WishlistProvider";
import ShopHeader from "@/components/shop/ShopHeader";
import ShopFooter from "@/components/shop/ShopFooter";
import CartToast from "@/components/shop/CartToast";
import FloatingWhatsApp from "@/components/shop/FloatingWhatsApp";
import ChatWidget from "@/components/shop/ChatWidget";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: {
      default: `${site.siteName} | Genuine Parts, Engine Oils & Auto Services in Sri Lanka`,
      template: `%s | ${site.siteName}`,
    },
    description:
      "Genuine spare parts, premium lubricants and automotive essentials. Find parts for your vehicle, order online with islandwide delivery, or pick up at Kottawa.",
  };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [shop, site] = await Promise.all([getShopInfo(), getSiteSettings()]);

  return (
    <CurrencyProvider>
      <CartProvider shop={shop}>
        <WishlistProvider>
          <div className="flex min-h-screen flex-col bg-white text-charcoal">
            <ShopHeader shop={shop} />
            <main className="flex-1">{children}</main>
            <ShopFooter shop={shop} />
          </div>
          <CartToast />
          <FloatingWhatsApp lifted={site.chatbotEnabled} />
          {site.chatbotEnabled && <ChatWidget />}
        </WishlistProvider>
      </CartProvider>
    </CurrencyProvider>
  );
}
