import type { Metadata } from "next";
import { getShopInfo } from "@/lib/shop/data";
import { waLink } from "@/lib/shop/whatsapp";
import { PhoneIcon, PinIcon, WhatsAppIcon } from "@/components/shop/Icons";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, WhatsApp or visit Amil Auto Hub in Kottawa.",
};

// Refresh stock, prices and shop details periodically instead of freezing them at build time.
export const revalidate = 300;

export default async function ContactPage() {
  const shop = await getShopInfo();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.address}`)}`;

  const cards = [
    {
      icon: WhatsAppIcon,
      title: "WhatsApp",
      text: "The fastest way to reach us.",
      action: (
        <a
          href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I need some help.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-wa px-5 py-2.5 text-sm font-bold text-white hover:bg-wa-hover"
        >
          Chat on WhatsApp
        </a>
      ),
      tone: "bg-wa text-white",
    },
    {
      icon: PhoneIcon,
      title: "Call us",
      text: shop.phone,
      action: (
        <a
          href={`tel:${shop.phone.replace(/\s/g, "")}`}
          className="inline-flex rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft"
        >
          Call now
        </a>
      ),
      tone: "bg-charcoal text-amil",
    },
    {
      icon: PinIcon,
      title: "Visit the shop",
      text: `${shop.pickupLocation}\n${shop.address}`,
      action: (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-lg bg-amil px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-amil-hover"
        >
          Get directions
        </a>
      ),
      tone: "bg-amil text-charcoal",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl">Contact us</h1>
      <p className="mt-2 text-charcoal/65">Questions about a part, an order or a service? We&apos;re happy to help.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="flex flex-col rounded-2xl border border-charcoal/10 bg-white p-6">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon width={24} height={24} />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-charcoal">{c.title}</h2>
            <p className="mt-1 flex-1 whitespace-pre-line text-sm text-charcoal/65">{c.text}</p>
            <div className="mt-4">{c.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
