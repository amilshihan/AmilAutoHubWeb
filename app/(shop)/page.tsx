import Link from "next/link";
import {
  getCollectionCounts,
  getDeals,
  getPopular,
  getShopInfo,
  getVehicleCatalog,
} from "@/lib/shop/data";
import { COLLECTION_BY_SLUG, COLLECTIONS } from "@/lib/shop/collections";
import { waLink } from "@/lib/shop/whatsapp";
import HeroArt from "@/components/shop/HeroArt";
import VehicleFinder from "@/components/shop/VehicleFinder";
import ProductCard from "@/components/shop/ProductCard";
import {
  ChevronIcon,
  CollectionGlyph,
  SendIcon,
  ShieldIcon,
  SparkIcon,
  TruckIcon,
  WrenchIcon,
} from "@/components/shop/Icons";

function SectionHead({ title, href, cta = "View all" }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight text-charcoal sm:text-3xl">{title}</h2>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-bold text-charcoal hover:underline">
          {cta} <ChevronIcon width={16} height={16} />
        </Link>
      )}
    </div>
  );
}

// Refresh stock, prices and shop details periodically instead of freezing them at build time.
export const revalidate = 60;

export default async function HomePage() {
  const [vehicles, deals, popular, counts, shop] = await Promise.all([
    getVehicleCatalog(),
    getDeals(8),
    getPopular(8),
    getCollectionCounts(),
    getShopInfo(),
  ]);

  const featured = ["engine-oils", "filters", "car-parts", "tools"] as const;
  const more = COLLECTIONS.filter((c) => !(featured as readonly string[]).includes(c.slug));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-charcoal text-white">
        <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(135deg,#fff_0,#fff_1px,transparent_1px,transparent_14px)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-28 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pb-32 lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amil">
              <ShieldIcon width={14} height={14} /> Genuine parts guaranteed
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Everything Your <span className="text-amil">Vehicle</span> Needs.
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
              Genuine parts, premium lubricants &amp; automotive essentials, delivered islandwide or ready to pick up in
              Kottawa.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-lg bg-amil px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-charcoal transition-colors hover:bg-amil-hover"
              >
                Shop Now
              </Link>
              <Link
                href="#vehicle-finder"
                className="rounded-lg border border-white/30 px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
              >
                Find My Vehicle
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-xl lg:max-w-none">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* Vehicle finder, overlapping the hero */}
      <section id="vehicle-finder" className="relative z-10 mx-auto -mt-20 max-w-7xl scroll-mt-40 px-4 lg:-mt-24">
        <VehicleFinder
          catalog={vehicles}
          title="Find parts for your vehicle"
          subtitle="Select your vehicle and we'll show what fits."
        />
      </section>

      {/* Shop by category */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <SectionHead title="Shop by Category" href="/shop" cta="All products" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {featured.map((slug) => {
            const c = COLLECTION_BY_SLUG[slug];
            const n = counts.get(slug) ?? 0;
            return (
              <Link
                key={slug}
                href={`/shop/${slug}`}
                className="group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl bg-charcoal p-5 text-white transition-transform hover:-translate-y-0.5 sm:min-h-52"
              >
                <div className="absolute -right-6 -top-6 text-amil/10 transition-transform duration-300 group-hover:scale-110">
                  <CollectionGlyph slug={slug} width={150} height={150} strokeWidth={1} />
                </div>
                <CollectionGlyph slug={slug} width={34} height={34} className="relative text-amil" />
                <div className="relative">
                  <div className="text-lg font-extrabold sm:text-xl">{c.label}</div>
                  <div className="mt-0.5 text-xs text-white/60">{n > 0 ? `${n} in stock` : "Coming soon"}</div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
          {more.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="flex items-center gap-2.5 rounded-xl border border-charcoal/12 bg-white px-3.5 py-3 text-sm font-bold text-charcoal transition-colors hover:border-amil hover:bg-amil-soft"
            >
              <CollectionGlyph slug={c.slug} width={20} height={20} className="shrink-0 text-charcoal/70" />
              <span className="leading-tight">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Hot deals */}
      {deals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14">
          <SectionHead title="Today's Hot Deals" href="/offers" cta="All offers" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {deals.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <SectionHead title="Popular Products" href="/shop" />
        {popular.length === 0 ? (
          <p className="rounded-xl border border-dashed border-charcoal/20 p-8 text-center text-charcoal/60">
            Our catalogue is being updated. Message us on WhatsApp and we&apos;ll help you find the right part.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Ask Amil */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="relative overflow-hidden rounded-3xl bg-charcoal p-6 text-white sm:p-10">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-amil/15 blur-2xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amil px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-charcoal">
                <SparkIcon width={14} height={14} /> Ask Amil AI
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Not sure what your vehicle needs? <span className="text-amil">Ask Amil.</span>
              </h2>
              <p className="mt-3 max-w-lg text-white/70">
                Tell us your vehicle or describe the problem and get compatible products you can add to your cart in
                one tap.
              </p>
              <form action="/ask-amil" method="get" className="mt-6 flex max-w-lg gap-2">
                <label htmlFor="ask-home" className="sr-only">
                  Ask Amil
                </label>
                <input
                  id="ask-home"
                  name="q"
                  required
                  placeholder="Tell us your vehicle or problem..."
                  className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-amil focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-amil px-5 py-3 text-sm font-extrabold text-charcoal hover:bg-amil-hover"
                >
                  Ask Amil <SendIcon width={16} height={16} />
                </button>
              </form>
            </div>
            <div className="space-y-3 text-sm">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-amil px-4 py-3 font-medium text-charcoal">
                I have a Toyota Prius 2015. Which engine oil should I use?
              </div>
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/10 px-4 py-3 text-white/90">
                Based on your vehicle, here are the compatible options from our stock. I&apos;ve picked the best matches
                below, ready to add to your cart.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <SectionHead title="Our Services" href="/services" cta="All services" />
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { icon: SparkIcon, title: "Oil & Lubrication", text: "Oil service, oil recommendations and filter replacement." },
            { icon: WrenchIcon, title: "Vehicle Service", text: "General service, inspection, diagnostics, brakes and suspension." },
            { icon: TruckIcon, title: "Parts Installation", text: "Battery, wipers, filters, bulbs and other compatible parts fitted for you." },
          ].map((s) => (
            <Link
              key={s.title}
              href="/services"
              className="group rounded-2xl border border-charcoal/10 bg-white p-5 transition-shadow hover:shadow-lg hover:shadow-charcoal/10"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amil text-charcoal">
                <s.icon width={22} height={22} />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-charcoal">{s.title}</h3>
              <p className="mt-1 text-sm text-charcoal/65">{s.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-charcoal group-hover:underline">
                Learn more <ChevronIcon width={15} height={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Amil Auto Hub */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <SectionHead title="Why Amil Auto Hub" />
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { icon: ShieldIcon, title: "Genuine Products", text: "Quality parts and lubricants from trusted brands, so your vehicle gets what it deserves." },
            { icon: SparkIcon, title: "Expert Advice", text: "Ask Amil online, chat on WhatsApp or talk to our team in store." },
            { icon: TruckIcon, title: "Delivery & Pickup", text: "Islandwide delivery, or collect from Amil Auto Hub in Kottawa." },
          ].map((w) => (
            <div key={w.title} className="rounded-2xl bg-amil-soft p-5">
              <w.icon width={26} height={26} className="text-charcoal" />
              <h3 className="mt-3 text-lg font-extrabold text-charcoal">{w.title}</h3>
              <p className="mt-1 text-sm text-charcoal/70">{w.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <a
            href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I need some help.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-4"
          >
            Can&apos;t find what you need? Message us on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
