import Link from "next/link";
import type { ShopInfo } from "@/lib/shop/types";
import { COLLECTIONS } from "@/lib/shop/collections";
import { PhoneIcon, PinIcon, SearchIcon, TruckIcon, UserIcon, WhatsAppIcon } from "@/components/shop/Icons";
import { waLink } from "@/lib/shop/whatsapp";
import CartButton from "@/components/shop/CartButton";
import ShopNav from "@/components/shop/ShopNav";
import CurrencySelect from "@/components/shop/CurrencySelect";

export function Logo({ light = false, shop }: { light?: boolean; shop?: Pick<ShopInfo, "name" | "logoUrl"> }) {
  const src = shop?.logoUrl || "/brand/amil-logo.png";
  const name = shop?.name || "Amil Auto Hub";
  return (
    <Link href="/" className="flex items-center" aria-label={`${name} home`}>
      {light ? (
        <span className="inline-flex items-center rounded-lg bg-white px-3 py-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={name} className="h-8 w-auto sm:h-9" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-10 w-auto sm:h-11" />
      )}
    </Link>
  );
}

export default function ShopHeader({ shop }: { shop: ShopInfo }) {
  const navItems = [
    ...COLLECTIONS.filter((c) => c.primary).map((c) => ({ href: `/shop/${c.slug}`, label: c.label })),
    { href: "/brands", label: "Brands" },
    { href: "/offers", label: "Offers", tone: "deal" as const },
    { href: "/services", label: "Services" },
    { href: "/ask-amil", label: "Ask Amil", tone: "amil" as const },
  ];

  return (
    <>
      <div className="bg-charcoal text-[12px] text-white/75">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <span className="flex items-center gap-1.5">
            <TruckIcon width={14} height={14} className="text-amil" />
            <span className="hidden sm:inline">Islandwide delivery · Genuine parts & premium lubricants</span>
            <span className="sm:hidden">Islandwide delivery</span>
          </span>
          <span className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 md:flex">
              <PinIcon width={14} height={14} className="text-amil" />
              {shop.address}
            </span>
            <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
              <PhoneIcon width={14} height={14} className="text-amil" />
              {shop.phone}
            </a>
          </span>
        </div>
      </div>

      <div className="sticky top-0 z-40 shadow-sm">
        <div className="border-b border-charcoal/10 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3">
            <Logo shop={shop} />

            <form action="/shop" method="get" role="search" className="order-last flex min-w-0 basis-full md:order-none md:flex-1 md:basis-auto">
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <input
                id="site-search"
                name="q"
                type="search"
                placeholder="Search oils, filters, parts..."
                className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-charcoal/20 bg-surface px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal/45 focus:border-charcoal focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex w-12 items-center justify-center rounded-r-lg bg-amil text-charcoal transition-colors hover:bg-amil-hover"
              >
                <SearchIcon />
              </button>
            </form>

            <div className="ml-auto flex items-center gap-1.5 md:ml-0">
              <CurrencySelect />
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5"
              >
                <UserIcon />
                <span className="hidden lg:inline">My Account</span>
              </Link>
              <CartButton />
              <a
                href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I need some help.")}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 hidden items-center gap-2 rounded-lg bg-wa px-3.5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-wa-hover sm:flex"
              >
                <WhatsAppIcon width={18} height={18} />
                <span className="hidden xl:inline">WhatsApp / Call</span>
                <span className="xl:hidden">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
        <ShopNav items={navItems} />
      </div>
    </>
  );
}
