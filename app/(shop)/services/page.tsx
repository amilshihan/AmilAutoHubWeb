import type { Metadata } from "next";
import { getShopInfo } from "@/lib/shop/data";
import { SERVICE_GROUPS } from "@/lib/shop/services";
import { waLink } from "@/lib/shop/whatsapp";
import { CheckIcon, PhoneIcon, PinIcon, SparkIcon, TruckIcon, WhatsAppIcon, WrenchIcon } from "@/components/shop/Icons";

export const metadata: Metadata = {
  title: "Services",
  description: "Oil service, general service, diagnostics, brake service and parts installation at Amil Auto Hub, Kottawa.",
};

const ICONS = [SparkIcon, WrenchIcon, TruckIcon];

// Refresh stock, prices and shop details periodically instead of freezing them at build time.
export const revalidate = 300;

export default async function ServicesPage() {
  const shop = await getShopInfo();

  return (
    <div>
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Automotive <span className="text-amil">Services</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/75">
            More than a parts store. Book your service with our team and we&apos;ll take care of the rest.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I'd like to book a service.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-wa px-6 py-3 text-sm font-extrabold text-white hover:bg-wa-hover"
            >
              <WhatsAppIcon width={18} height={18} /> Book on WhatsApp
            </a>
            <a
              href={`tel:${shop.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-extrabold text-white hover:bg-white/10"
            >
              <PhoneIcon width={18} height={18} /> Call {shop.phone}
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-3">
        {SERVICE_GROUPS.map((group, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <section key={group.title} className="flex flex-col rounded-2xl border border-charcoal/10 bg-white p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amil text-charcoal">
                <Icon width={24} height={24} />
              </span>
              <h2 className="mt-4 text-xl font-extrabold text-charcoal">{group.title}</h2>
              <p className="mt-1 text-sm text-charcoal/65">{group.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {group.items.map((item) => (
                  <li key={item.name} className={`flex items-center justify-between gap-3 text-sm ${item.enabled ? "" : "opacity-45"}`}>
                    <span className="flex items-center gap-2 font-semibold text-charcoal">
                      <CheckIcon width={16} height={16} className={item.enabled ? "text-stock" : "text-charcoal/40"} />
                      {item.name}
                    </span>
                    {item.enabled ? (
                      <a
                        href={waLink(shop.whatsapp, `Hi Amil Auto Hub, I'd like to book: ${item.name}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-md bg-charcoal px-3 py-1.5 text-xs font-bold text-white hover:bg-charcoal-soft"
                      >
                        Book
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs font-semibold">Coming soon</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amil-soft p-5 text-sm text-charcoal">
          <PinIcon width={20} height={20} className="shrink-0" />
          <span>
            <span className="font-extrabold">Visit us:</span> {shop.address}. Walk-ins welcome, or book ahead on WhatsApp.
          </span>
        </div>
      </div>
    </div>
  );
}
