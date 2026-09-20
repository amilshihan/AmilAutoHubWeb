import type { CollectionSlug } from "@/lib/shop/collections";
import type { ShopQuery, SortKey } from "@/lib/shop/data";

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

const positive = (v: string | undefined) => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n >= 0 ? n : undefined;
};

const SORTS: SortKey[] = ["relevance", "price-asc", "price-desc", "name", "discount"];

export function parseShopParams(sp: RawParams, collection?: CollectionSlug, extra: Partial<ShopQuery> = {}): ShopQuery {
  const sort = first(sp.sort) as SortKey | undefined;
  const year = positive(first(sp.year));
  return {
    q: first(sp.q),
    collection,
    brand: first(sp.brand),
    inStock: first(sp.stock) === "1",
    min: positive(first(sp.min)),
    max: positive(first(sp.max)),
    make: first(sp.make),
    model: first(sp.model),
    year: year ? Math.round(year) : undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: Math.max(1, Math.round(positive(first(sp.page)) ?? 1)),
    ...extra,
  };
}

// Builds a URL from the current filters, applying overrides (undefined/"" removes a key).
export function buildHref(basePath: string, sp: RawParams, overrides: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  const keys = new Set([...Object.keys(sp), ...Object.keys(overrides)]);
  for (const key of keys) {
    const value = key in overrides ? overrides[key] : first(sp[key]);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
