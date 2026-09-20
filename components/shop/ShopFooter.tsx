import Link from "next/link";
import type { ShopInfo } from "@/lib/shop/types";
import { COLLECTIONS } from "@/lib/shop/collections";
import { Logo } from "@/components/shop/ShopHeader";
import { PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/shop/Icons";
import { waLink } from "@/lib/shop/whatsapp";

export default function ShopFooter({ shop }: { shop: ShopInfo }) {
  const linkClass = "text-white/70 transition-colors hover:text-amil";
  return (
    <footer className="mt-16 bg-charcoal text-sm text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs leading-relaxed">
            Genuine parts, premium lubricants and automotive essentials for every vehicle on Sri Lankan roads.
          </p>
          <a
            href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I need some help.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-wa px-4 py-2.5 font-bold text-white hover:bg-wa-hover"
          >
            <WhatsAppIcon width={18} height={18} /> Chat on WhatsApp
          </a>
        </div>

        <div>
          <h3 className="mb-3 font-bold uppercase tracking-wider text-white">Shop</h3>
          <ul className="space-y-2">
            {COLLECTIONS.filter((c) => c.primary).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className={linkClass}>
                  {c.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/offers" className={linkClass}>
                Offers
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-bold uppercase tracking-wider text-white">Help</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/ask-amil" className={linkClass}>
                Ask Amil
              </Link>
            </li>
            <li>
              <Link href="/services" className={linkClass}>
                Vehicle services
              </Link>
            </li>
            <li>
              <Link href="/account" className={linkClass}>
                Track my order
              </Link>
            </li>
            <li>
              <Link href="/about" className={linkClass}>
                About us
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 font-bold uppercase tracking-wider text-white">Visit us</h3>
          <ul className="space-y-3">
            <li className="flex gap-2.5">
              <PinIcon width={18} height={18} className="mt-0.5 shrink-0 text-amil" />
              <span>
                {shop.name}
                <br />
                {shop.address}
              </span>
            </li>
            <li className="flex gap-2.5">
              <PhoneIcon width={18} height={18} className="shrink-0 text-amil" />
              <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className={linkClass}>
                {shop.phone}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-charcoal-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-white/50">
          <span>
            © {new Date().getFullYear()} {shop.name}. All rights reserved.
          </span>
          <Link href="/admin/login" className="hover:text-white/80">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
