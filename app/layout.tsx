import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/shop/siteSettings";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: site.siteUrl ? new URL(site.siteUrl) : undefined,
    title: site.siteName,
    description: "Genuine parts, premium lubricants and automotive essentials.",
    icons: site.faviconUrl ? { icon: site.faviconUrl, shortcut: site.faviconUrl, apple: site.faviconUrl } : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await getSiteSettings();
  return (
    <html lang={site.defaultLanguage} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
