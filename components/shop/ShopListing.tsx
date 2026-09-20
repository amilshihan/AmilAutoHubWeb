import Link from "next/link";
import { getShopInfo, getVehicleCatalog, queryProducts, type ShopQuery } from "@/lib/shop/data";
import { COLLECTION_BY_SLUG, COLLECTIONS, type CollectionSlug } from "@/lib/shop/collections";
import { buildHref, type RawParams } from "@/lib/shop/params";
import { vehicleLabel } from "@/lib/shop/vehicles";
import { productMessage, waLink } from "@/lib/shop/whatsapp";
import ProductCard from "@/components/shop/ProductCard";
import SortSelect from "@/components/shop/SortSelect";
import VehicleFinder from "@/components/shop/VehicleFinder";
import { ChevronIcon, SparkIcon, WhatsAppIcon } from "@/components/shop/Icons";

const SORT_KEYS = ["relevance", "price-asc", "price-desc", "name", "discount"];

export default async function ShopListing({
  basePath,
  query,
  rawParams,
  collection,
  title,
  intro,
}: {
  basePath: string;
  query: ShopQuery;
  rawParams: RawParams;
  collection?: CollectionSlug;
  title?: string;
  intro?: string;
}) {
  const [result, shop, vehicles] = await Promise.all([queryProducts(query), getShopInfo(), getVehicleCatalog()]);

  const allPath = basePath.startsWith("/shop/") ? "/shop" : basePath;
  const heading =
    title ?? (collection ? COLLECTION_BY_SLUG[collection].label : query.q ? `Results for "${query.q}"` : "All Products");
  const vehicleText = query.make ? vehicleLabel({ make: query.make, model: query.model, year: query.year }) : "";

  const href = (overrides: Record<string, string | undefined>) =>
    buildHref(basePath, rawParams, { page: undefined, ...overrides });
  const hasFilters = Boolean(query.brand || query.min !== undefined || query.max !== undefined || query.inStock);

  const sortHrefs = Object.fromEntries(SORT_KEYS.map((k) => [k, href({ sort: k === "relevance" ? undefined : k })]));

  const hiddenKeep = ["q", "make", "model", "year", "sort", "brand"].filter((k) => rawParams[k]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-charcoal/55">
        <Link href="/" className="hover:text-charcoal">
          Home
        </Link>
        <ChevronIcon width={12} height={12} />
        {collection ? (
          <>
            <Link href="/shop" className="hover:text-charcoal">
              Shop
            </Link>
            <ChevronIcon width={12} height={12} />
            <span className="font-semibold text-charcoal">{COLLECTION_BY_SLUG[collection].label}</span>
          </>
        ) : (
          <span className="font-semibold text-charcoal">{heading}</span>
        )}
      </nav>

      <div className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">{heading}</h1>
        {(intro || (collection && COLLECTION_BY_SLUG[collection].blurb)) && (
          <p className="mt-1 max-w-2xl text-charcoal/65">{intro ?? COLLECTION_BY_SLUG[collection!].blurb}</p>
        )}
      </div>

      {query.make ? (
        <div className="mb-6 rounded-2xl border border-amil bg-amil-soft p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-charcoal/60">Showing products for</div>
              <div className="text-xl font-extrabold text-charcoal">{vehicleText}</div>
              <p className="mt-1 text-sm text-charcoal/70">
                {result.verifiedFitIds.size > 0
                  ? `${result.verifiedFitIds.size} product(s) are confirmed to fit. Others match your vehicle by name, so please confirm with us before ordering.`
                  : "Matches are based on product names. Please confirm fitment with our team before ordering."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/ask-amil?q=${encodeURIComponent(`I have a ${vehicleText}. What do you recommend?`)}`}
                className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft"
              >
                <SparkIcon width={16} height={16} className="text-amil" /> Ask Amil
              </Link>
              <Link
                href={buildHref(allPath, rawParams, { make: undefined, model: undefined, year: undefined, page: undefined })}
                className="inline-flex items-center rounded-lg border border-charcoal/20 bg-white px-4 py-2.5 text-sm font-bold text-charcoal hover:bg-charcoal/5"
              >
                Clear vehicle
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <details className="group mb-6 rounded-2xl border border-charcoal/10 bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-charcoal">
            Find parts for your vehicle
            <ChevronIcon width={16} height={16} className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="p-3 pt-0">
            <VehicleFinder catalog={vehicles} title="Choose your vehicle" />
          </div>
        </details>
      )}

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* Filters */}
        <aside>
          <details className="group rounded-xl border border-charcoal/10 lg:hidden" open={hasFilters}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold">
              Filters {hasFilters && <span className="ml-2 rounded-full bg-amil px-2 py-0.5 text-xs">active</span>}
              <ChevronIcon width={16} height={16} className="transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-charcoal/10 p-4">
              {filterPanel()}
            </div>
          </details>
          <div className="hidden lg:block">
            {filterPanel()}
          </div>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-charcoal/65">
              <span className="font-bold text-charcoal">{result.total}</span> product{result.total === 1 ? "" : "s"}
            </p>
            <SortSelect value={query.sort ?? "relevance"} hrefs={sortHrefs} />
          </div>

          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-charcoal/25 p-10 text-center">
              <h2 className="text-xl font-extrabold text-charcoal">No products found</h2>
              <p className="mx-auto mt-2 max-w-md text-charcoal/65">
                We may still have it. Tell us what you need and our team will check the shelves for you.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <a
                  href={waLink(
                    shop.whatsapp,
                    productMessage({ name: query.q || heading }, vehicleText || undefined)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-wa px-5 py-2.5 text-sm font-bold text-white hover:bg-wa-hover"
                >
                  <WhatsAppIcon width={17} height={17} /> Ask on WhatsApp
                </a>
                <Link
                  href="/ask-amil"
                  className="inline-flex items-center gap-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft"
                >
                  <SparkIcon width={17} height={17} className="text-amil" /> Ask Amil
                </Link>
                {hasFilters && (
                  <Link
                    href={href({ brand: undefined, min: undefined, max: undefined, stock: undefined })}
                    className="inline-flex items-center rounded-lg border border-charcoal/20 px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-charcoal/5"
                  >
                    Clear filters
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} verifiedFit={result.verifiedFitIds.has(p.id)} />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {result.page > 1 && (
                <Link
                  href={buildHref(basePath, rawParams, { page: String(result.page - 1) })}
                  className="rounded-lg border border-charcoal/20 px-4 py-2 text-sm font-bold hover:bg-charcoal/5"
                >
                  Previous
                </Link>
              )}
              <span className="px-3 text-sm text-charcoal/65">
                Page {result.page} of {result.pages}
              </span>
              {result.page < result.pages && (
                <Link
                  href={buildHref(basePath, rawParams, { page: String(result.page + 1) })}
                  className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white hover:bg-charcoal-soft"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );

  function filterPanel() {
    return (
      <div className="space-y-6 text-sm">
        <div>
          <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-charcoal/55">Product type</h2>
          <ul className="space-y-0.5">
            <li>
              <Link
                href={buildHref("/shop", rawParams, { page: undefined })}
                className={`flex justify-between rounded-md px-2 py-1.5 hover:bg-charcoal/5 ${!collection ? "bg-amil-soft font-bold" : ""}`}
              >
                All products
              </Link>
            </li>
            {COLLECTIONS.map((c) => {
              const count = result.collectionFacets.find((f) => f.slug === c.slug)?.count ?? 0;
              const active = collection === c.slug;
              if (count === 0 && !active) return null;
              return (
                <li key={c.slug}>
                  <Link
                    href={buildHref(`/shop/${c.slug}`, rawParams, { page: undefined })}
                    className={`flex justify-between rounded-md px-2 py-1.5 hover:bg-charcoal/5 ${active ? "bg-amil-soft font-bold" : ""}`}
                  >
                    <span>{c.label}</span>
                    <span className="text-charcoal/45">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {result.brandFacets.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-charcoal/55">Brand</h2>
            <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              <li>
                <Link
                  href={href({ brand: undefined })}
                  className={`flex justify-between rounded-md px-2 py-1.5 hover:bg-charcoal/5 ${!query.brand ? "bg-amil-soft font-bold" : ""}`}
                >
                  All brands
                </Link>
              </li>
              {result.brandFacets.map((b) => {
                const active = query.brand?.toLowerCase() === b.name.toLowerCase();
                return (
                  <li key={b.name}>
                    <Link
                      href={href({ brand: b.name })}
                      className={`flex justify-between rounded-md px-2 py-1.5 hover:bg-charcoal/5 ${active ? "bg-amil-soft font-bold" : ""}`}
                    >
                      <span>{b.name}</span>
                      <span className="text-charcoal/45">{b.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <form action={basePath} method="get" className="space-y-4">
          {hiddenKeep.map((k) => {
            const v = rawParams[k];
            const value = Array.isArray(v) ? v[0] : v;
            return value ? <input key={k} type="hidden" name={k} value={value} /> : null;
          })}
          <div>
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-charcoal/55">Price (Rs.)</h2>
            <div className="flex items-center gap-2">
              <input
                name="min"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Min"
                defaultValue={query.min}
                className="w-full rounded-lg border border-charcoal/20 px-3 py-2 focus:border-charcoal focus:outline-none"
              />
              <span className="text-charcoal/40">-</span>
              <input
                name="max"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Max"
                defaultValue={query.max}
                className="w-full rounded-lg border border-charcoal/20 px-3 py-2 focus:border-charcoal focus:outline-none"
              />
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-charcoal/55">Availability</h2>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="stock" value="1" defaultChecked={query.inStock} className="h-4 w-4 accent-charcoal" />
              In stock only
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-charcoal px-4 py-2.5 font-bold text-white hover:bg-charcoal-soft"
          >
            Apply filters
          </button>
          {hasFilters && (
            <Link
              href={href({ brand: undefined, min: undefined, max: undefined, stock: undefined })}
              className="block text-center font-semibold text-charcoal/65 underline hover:text-charcoal"
            >
              Clear filters
            </Link>
          )}
        </form>
      </div>
    );
  }
}
