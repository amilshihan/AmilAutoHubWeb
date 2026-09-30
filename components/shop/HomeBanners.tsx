import Link from "next/link";
import type { PublicBanner } from "@/lib/shop/data";

// Promotional banners managed under Admin > Homepage banners.
export default function HomeBanners({ banners }: { banners: PublicBanner[] }) {
  if (banners.length === 0) return null;

  return (
    <section aria-label="Promotions" className="mx-auto max-w-7xl px-4 pt-8">
      <div className={`grid gap-3 sm:gap-4 ${banners.length === 1 ? "" : banners.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {banners.map((b) => {
          const inner = (
            <div
              className="relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl bg-charcoal p-5 text-white sm:min-h-48"
              style={b.imageUrl ? { backgroundImage: `url("${b.imageUrl.replace(/"/g, "%22")}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/50 to-charcoal/10" />
              {!b.imageUrl && (
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amil/25 blur-2xl" aria-hidden />
              )}
              <div className="relative">
                <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">{b.title}</h2>
                {b.subtitle && <p className="mt-1 text-sm text-white/80">{b.subtitle}</p>}
                {b.linkUrl && (
                  <span className="mt-3 inline-flex rounded-lg bg-amil px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-charcoal">
                    {b.buttonLabel ?? "Shop now"}
                  </span>
                )}
              </div>
            </div>
          );
          if (!b.linkUrl) return <div key={b.id}>{inner}</div>;
          const external = /^https?:\/\//i.test(b.linkUrl);
          return external ? (
            <a key={b.id} href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block transition-transform hover:-translate-y-0.5">
              {inner}
            </a>
          ) : (
            <Link key={b.id} href={b.linkUrl} className="block transition-transform hover:-translate-y-0.5">
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
