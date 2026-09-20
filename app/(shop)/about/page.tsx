import type { Metadata } from "next";
import Link from "next/link";
import { getShopInfo } from "@/lib/shop/data";
import { ShieldIcon, SparkIcon, TruckIcon } from "@/components/shop/Icons";

export const metadata: Metadata = {
  title: "About Us",
  description: "Amil Auto Hub is a Sri Lankan automotive parts, lubricants and service centre based in Kottawa.",
};

// Refresh stock, prices and shop details periodically instead of freezing them at build time.
export const revalidate = 300;

export default async function AboutPage() {
  const shop = await getShopInfo();
  const points = [
    { icon: ShieldIcon, title: "Genuine products", text: "We stock quality parts and lubricants from brands our customers trust." },
    { icon: SparkIcon, title: "Honest advice", text: "Not sure what your vehicle needs? Ask Amil online or talk to our team, and we'll point you to the right product." },
    { icon: TruckIcon, title: "Easy to get", text: `Order online for islandwide delivery, or collect from ${shop.pickupLocation}.` },
  ];

  return (
    <div>
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            About <span className="text-amil">Amil Auto Hub</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/75">
            {shop.name} is an automotive parts, lubricants and service centre in Kottawa, serving vehicle owners across Sri
            Lanka.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12">
        <p className="text-lg leading-relaxed text-charcoal/80">
          Our online store and our shop run on the same inventory, so what you see online is what is on our shelves. Pick
          your vehicle, find the parts that fit, and order in a few taps, on the website or on WhatsApp.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {points.map((p) => (
            <div key={p.title} className="rounded-2xl bg-amil-soft p-5">
              <p.icon width={26} height={26} />
              <h2 className="mt-3 text-lg font-extrabold text-charcoal">{p.title}</h2>
              <p className="mt-1 text-sm text-charcoal/70">{p.text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="rounded-lg bg-amil px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover">
            Shop now
          </Link>
          <Link href="/contact" className="rounded-lg border border-charcoal/20 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-charcoal/5">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
