import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ttlCache } from "@/lib/shop/cache";
import { getStoreSettings } from "@/lib/shop/settings";
import { getSiteSettings } from "@/lib/shop/siteSettings";
import { hoursSummary } from "@/lib/shop/site-settings-types";
import { COLLECTIONS, resolveSubcategory, type CollectionSlug } from "@/lib/shop/collections";
import { SHOP_FALLBACK } from "@/lib/shop/config";
import { mergeVehicleCatalog, type VehicleCatalog } from "@/lib/shop/vehicles";
import { toWhatsAppNumber } from "@/lib/shop/whatsapp";
import type { PublicMedia, PublicProduct, ShopInfo } from "@/lib/shop/types";

// All public reads go through the service-role client on the server and are mapped through
// toPublicProduct(), which whitelists fields. Cost prices, margins and suppliers never leave here.

type Row = Record<string, unknown>;
type CompatRow = { make: string; model: string | null; yearFrom: number | null; yearTo: number | null };

async function fetchAll(
  build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>
): Promise<Row[]> {
  const size = 1000;
  const out: Row[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => Number(v ?? 0);

// ─── Collection + brand rules ────────────────────────────────

function assignCollection(name: string, path: string[]): CollectionSlug {
  const root = (path[0] ?? "").toLowerCase();
  const second = (path[1] ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (/spark\s*plug/.test(n)) return "spark-plugs";
  if (/batter(y|ies)/.test(n)) return "batteries";
  if (root === "wiper blades" || /wiper/.test(n)) return "wiper-blades";
  if (/\b(motorcycle|motorbike|bike)\b/.test(n)) return "motorcycle";
  if (root === "oil" && second !== "gear oil") return "engine-oils";
  if (root.startsWith("coolant") || second === "gear oil" || /coolant|brake fluid|break oil/.test(n)) {
    return "coolants-fluids";
  }
  if (root === "filters" || /filter/.test(n)) return "filters";
  if (root.startsWith("car care")) return "car-care";
  if (/\b(tool|spanner|wrench|socket|jack|plier)/.test(n)) return "tools";
  if (root === "others") return "accessories";
  return "car-parts";
}

function deriveBrand(path: string[]): string | null {
  if (path.length < 2) return null;
  const root = path[0].toLowerCase();
  if (root === "others" || path[1].toLowerCase() === "gear oil") return null;
  return path[1];
}

function compatLabel(c: CompatRow): string {
  const years =
    c.yearFrom && c.yearTo ? ` ${c.yearFrom}-${c.yearTo}` : c.yearFrom ? ` ${c.yearFrom}+` : c.yearTo ? ` up to ${c.yearTo}` : "";
  return `${c.make}${c.model ? " " + c.model : " (all models)"}${years}`;
}

// Banner links may only point inside the site or to http(s) addresses.
function safeLink(v: unknown): string | null {
  const s = str(v);
  return s && /^(\/(?!\/)|https?:\/\/)/i.test(s) ? s : null;
}

function safeImageUrl(v: unknown): string | null {
  const s = str(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
}

// ─── Catalog ─────────────────────────────────────────────────

export type Catalog = {
  products: PublicProduct[];
  byId: Map<string, PublicProduct>;
  compat: Map<string, CompatRow[]>;
};

function toPublicProduct(
  p: Row,
  categoryPath: (id: string | null) => string[],
  compat: Map<string, CompatRow[]>
): PublicProduct | null {
  const name = str(p.name);
  const price = num(p.sell_price);
  if (!name || price <= 0 || p.is_online === false || p.is_drum === true || p.is_active === false) return null;

  const path = categoryPath((p.category_id as string | null) ?? null);
  const qty = num(p.qty_on_hand);
  const retail = num(p.retail_price);
  const hasDiscount = retail > price;
  const id = String(p.id);
  const collection = assignCollection(name, path);
  const subcategory = resolveSubcategory(collection, name, str(p.subcategory));

  return {
    id,
    name,
    sku: str(p.sku),
    description: str(p.description),
    price,
    compareAt: hasDiscount ? retail : null,
    discountPct: hasDiscount ? Math.round((1 - price / retail) * 100) : null,
    inStock: qty > 0,
    lowStock: qty > 0 && p.low_stock_warning_enabled !== false && qty <= num(p.low_stock_threshold),
    unit: str(p.unit) ?? "pcs",
    packSize: str(p.pack_size),
    brand: str(p.brand) ?? deriveBrand(path),
    categoryPath: path,
    collection,
    imageUrl: safeImageUrl(p.image_url),
    featured: p.is_featured === true,
    isNew: p.is_new === true,
    bestseller: p.is_bestseller === true,
    productCode: str(p.product_code),
    productType: str(p.product_type),
    subcategory: subcategory?.label ?? str(p.subcategory),
    subcategorySlug: subcategory?.slug ?? null,
    shortDescription: str(p.short_description),
    compat: (compat.get(id) ?? []).map(compatLabel),
  };
}

async function loadCategoryPaths() {
  const admin = createAdminClient();
  const { data } = await admin.from("categories").select("id, name, parent_id");
  const byId = new Map<string, { name: string; parent_id: string | null }>(
    (data ?? []).map((c) => [c.id as string, { name: c.name as string, parent_id: (c.parent_id as string | null) ?? null }])
  );
  return (id: string | null): string[] => {
    const path: string[] = [];
    let cur = id;
    let guard = 0;
    while (cur && byId.has(cur) && guard++ < 8) {
      const node = byId.get(cur)!;
      path.unshift(node.name);
      cur = node.parent_id;
    }
    return path;
  };
}

async function loadCompat(): Promise<Map<string, CompatRow[]>> {
  const admin = createAdminClient();
  const map = new Map<string, CompatRow[]>();
  const { data, error } = await admin
    .from("part_vehicle_compat")
    .select("part_id, make, model, year_from, year_to")
    .limit(20000);
  if (error) return map; // table not created yet (migration 0015 pending)
  for (const r of data ?? []) {
    const list = map.get(r.part_id as string) ?? [];
    list.push({
      make: r.make as string,
      model: (r.model as string | null) ?? null,
      yearFrom: (r.year_from as number | null) ?? null,
      yearTo: (r.year_to as number | null) ?? null,
    });
    map.set(r.part_id as string, list);
  }
  return map;
}

export const getCatalog = ttlCache<Catalog>(30_000, async () => {
  const admin = createAdminClient();
  const [rows, categoryPath, compat] = await Promise.all([
    fetchAll((from, to) =>
      admin.from("parts").select("*").eq("is_active", true).eq("is_service", false).order("id").range(from, to)
    ),
    loadCategoryPaths(),
    loadCompat(),
  ]);
  const products = rows
    .map((r) => toPublicProduct(r, categoryPath, compat))
    .filter((p): p is PublicProduct => p !== null);
  return { products, byId: new Map(products.map((p) => [p.id, p])), compat };
});

// ─── Querying ────────────────────────────────────────────────

export type SortKey = "relevance" | "price-asc" | "price-desc" | "name" | "discount";

export type ShopQuery = {
  q?: string;
  collection?: CollectionSlug;
  subcategory?: string;
  brand?: string;
  inStock?: boolean;
  min?: number;
  max?: number;
  make?: string;
  model?: string;
  year?: number;
  deals?: boolean;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export type QueryResult = {
  items: PublicProduct[];
  total: number;
  page: number;
  pages: number;
  brandFacets: { name: string; count: number }[];
  collectionFacets: { slug: CollectionSlug; count: number }[];
  subcategoryFacets: { slug: string; count: number }[];
  verifiedFitIds: Set<string>;
};

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function haystack(p: PublicProduct) {
  const text = [p.name, p.brand, p.sku, p.productCode, p.productType, p.subcategory, p.shortDescription, p.description, p.categoryPath.join(" "), p.compat.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return { text, packed: compact(text) };
}

export function matchesText(p: PublicProduct, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const { text, packed } = haystack(p);
  return tokens.every((t) => text.includes(t) || (compact(t) && packed.includes(compact(t))));
}

function fitsVehicle(rows: CompatRow[] | undefined, make: string, model?: string, year?: number): boolean {
  if (!rows) return false;
  return rows.some((r) => {
    if (r.make.toLowerCase() !== make.toLowerCase()) return false;
    if (model && r.model && r.model.toLowerCase() !== model.toLowerCase()) return false;
    if (year && r.yearFrom && year < r.yearFrom) return false;
    if (year && r.yearTo && year > r.yearTo) return false;
    return true;
  });
}

export async function queryProducts(query: ShopQuery): Promise<QueryResult> {
  const { products, compat } = await getCatalog();
  const verifiedFitIds = new Set<string>();

  let list = products;

  if (query.make) {
    const make = query.make;
    const model = query.model;
    list = list.filter((p) => {
      if (fitsVehicle(compat.get(p.id), make, model, query.year)) {
        verifiedFitIds.add(p.id);
        return true;
      }
      // No fitment data for this product: fall back to the vehicle appearing in its name/description.
      return matchesText(p, model ?? make);
    });
  }
  if (query.q) list = list.filter((p) => matchesText(p, query.q!));
  if (query.deals) list = list.filter((p) => p.discountPct !== null);
  if (query.inStock) list = list.filter((p) => p.inStock);
  if (query.min !== undefined) list = list.filter((p) => p.price >= query.min!);
  if (query.max !== undefined) list = list.filter((p) => p.price <= query.max!);

  const collectionCounts = new Map<CollectionSlug, number>();
  for (const p of list) collectionCounts.set(p.collection, (collectionCounts.get(p.collection) ?? 0) + 1);

  if (query.collection) list = list.filter((p) => p.collection === query.collection);

  const subcategoryCounts = new Map<string, number>();
  for (const p of list) if (p.subcategorySlug) subcategoryCounts.set(p.subcategorySlug, (subcategoryCounts.get(p.subcategorySlug) ?? 0) + 1);
  if (query.subcategory) list = list.filter((p) => p.subcategorySlug === query.subcategory);

  const brandCounts = new Map<string, number>();
  for (const p of list) if (p.brand) brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);

  if (query.brand) list = list.filter((p) => p.brand?.toLowerCase() === query.brand!.toLowerCase());

  const sort = query.sort ?? "relevance";
  const sorted = [...list];
  sorted.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "discount") return (b.discountPct ?? 0) - (a.discountPct ?? 0) || a.name.localeCompare(b.name);
    if (sort === "name") return a.name.localeCompare(b.name);
    const stock = Number(b.inStock) - Number(a.inStock);
    if (stock) return stock;
    const verified = Number(verifiedFitIds.has(b.id)) - Number(verifiedFitIds.has(a.id));
    if (verified) return verified;
    const featured = Number(b.featured) - Number(a.featured);
    return featured || a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  const perPage = query.perPage ?? 24;
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);

  return {
    items: sorted.slice((page - 1) * perPage, page * perPage),
    total: sorted.length,
    page,
    pages,
    brandFacets: [...brandCounts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
    collectionFacets: COLLECTIONS.map((c) => ({ slug: c.slug, count: collectionCounts.get(c.slug) ?? 0 })),
    subcategoryFacets: [...subcategoryCounts].map(([slug, count]) => ({ slug, count })),
    verifiedFitIds,
  };
}

// ─── Home page sections ──────────────────────────────────────

const getBestSellerIds = ttlCache<string[]>(10 * 60_000, async () => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("sale_items").select("part_id, qty").limit(5000);
  if (error) return [];
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(r.part_id as string, (totals.get(r.part_id as string) ?? 0) + num(r.qty));
  return [...totals].sort((a, b) => b[1] - a[1]).map(([id]) => id);
});

export async function getDeals(limit = 8): Promise<PublicProduct[]> {
  const { products } = await getCatalog();
  return products
    .filter((p) => p.discountPct !== null && p.inStock)
    .sort((a, b) => (b.discountPct ?? 0) - (a.discountPct ?? 0))
    .slice(0, limit);
}

export async function getPopular(limit = 8): Promise<PublicProduct[]> {
  const { products, byId } = await getCatalog();
  const picked: PublicProduct[] = [];
  const seen = new Set<string>();
  const add = (p: PublicProduct | undefined) => {
    if (p && p.inStock && !seen.has(p.id) && picked.length < limit) {
      seen.add(p.id);
      picked.push(p);
    }
  };
  products.filter((p) => p.featured).forEach(add);
  (await getBestSellerIds()).forEach((id) => add(byId.get(id)));
  products.forEach(add);
  return picked;
}

export async function getRelated(product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  const { products } = await getCatalog();
  return products
    .filter((p) => p.id !== product.id && p.inStock && p.collection === product.collection)
    .sort((a, b) => Number(b.brand === product.brand) - Number(a.brand === product.brand))
    .slice(0, limit);
}

export async function getCollectionCounts(): Promise<Map<CollectionSlug, number>> {
  const { products } = await getCatalog();
  const counts = new Map<CollectionSlug, number>();
  for (const p of products) if (p.inStock) counts.set(p.collection, (counts.get(p.collection) ?? 0) + 1);
  return counts;
}

export async function getBrands(): Promise<{ name: string; count: number }[]> {
  const { products } = await getCatalog();
  const counts = new Map<string, number>();
  for (const p of products) if (p.brand) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStats() {
  const { products } = await getCatalog();
  return { products: products.length, inStock: products.filter((p) => p.inStock).length };
}

// ─── Single product (always fresh: stock must be accurate) ───

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProduct(id: string): Promise<PublicProduct | null> {
  if (!UUID.test(id)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("parts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [categoryPath, compat] = await Promise.all([loadCategoryPaths(), loadCompat()]);
  return toPublicProduct(data as Row, categoryPath, compat);
}

// Batch form of getProduct, for "buy again" / recommendation lists -- always fresh (stock
// and price must be current), order of the input ids is preserved, missing/unsellable ids
// are dropped silently.
export async function getProducts(ids: string[]): Promise<PublicProduct[]> {
  const unique = [...new Set(ids)].filter((id) => UUID.test(id));
  if (unique.length === 0) return [];
  const admin = createAdminClient();
  const [{ data }, categoryPath, compat] = await Promise.all([
    admin.from("parts").select("*").in("id", unique),
    loadCategoryPaths(),
    loadCompat(),
  ]);
  const byId = new Map((data ?? []).map((row) => [String((row as Row).id), row as Row]));
  const out: PublicProduct[] = [];
  for (const id of unique) {
    const row = byId.get(id);
    const product = row ? toPublicProduct(row, categoryPath, compat) : null;
    if (product) out.push(product);
  }
  return out;
}

// Images (primary first, then in the admin's order) followed by the video, if any.
export async function getProductMedia(partId: string): Promise<PublicMedia[]> {
  if (!UUID.test(partId)) return [];
  const admin = createAdminClient();
  const { data } = await admin.from("product_media").select("*").eq("part_id", partId).order("sort_order").order("created_at");
  const rows = (data ?? [])
    .map((r): PublicMedia | null => {
      const url = safeImageUrl(r.url);
      if (!url) return null;
      return {
        id: String(r.id),
        mediaType: r.media_type === "video" ? "video" : "image",
        imageType: r.image_type as PublicMedia["imageType"],
        url,
        alt: str(r.alt_text),
        isPrimary: r.is_primary === true,
      };
    })
    .filter((m): m is PublicMedia => m !== null);
  const images = rows.filter((m) => m.mediaType === "image").sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return [...images, ...rows.filter((m) => m.mediaType === "video")];
}

// ─── Shop info, vehicles, services ───────────────────────────

export const getShopInfo = ttlCache<ShopInfo>(30_000, async () => {
  const admin = createAdminClient();
  const { data } = await admin.from("shop_settings").select("shop_name, address, phone").maybeSingle();
  const [settings, site] = await Promise.all([getStoreSettings(), getSiteSettings()]);
  const phone = site.phones[0]?.number ?? str(data?.phone) ?? SHOP_FALLBACK.phone;
  return {
    name: site.siteName,
    address: site.address || (str(data?.address) ?? SHOP_FALLBACK.address),
    phone,
    logoUrl: site.logoUrl || null,
    phones: site.phones,
    emails: site.emails,
    hours: site.showHours ? hoursSummary(site.hours) : null,
    registrationNumber: site.registrationNumber || null,
    taxId: site.taxId || null,
    legalName: site.legalName || null,
    whatsapp: toWhatsAppNumber(settings.whatsappNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || phone),
    pickupLocation: settings.pickupLocation,
  };
});

export const getVehicleCatalog = ttlCache<VehicleCatalog>(5 * 60_000, async () => {
  const admin = createAdminClient();
  const [brands, models] = await Promise.all([
    admin.from("vehicle_brands").select("id, name").eq("is_active", true),
    admin.from("vehicle_models").select("brand_id, name").eq("is_active", true),
  ]);
  return mergeVehicleCatalog(
    (brands.data ?? []) as { id: string; name: string }[],
    (models.data ?? []) as { brand_id: string; name: string }[]
  );
});

export type ServiceType = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  estimatedMins: number | null;
};

export const getServiceTypes = ttlCache<ServiceType[]>(5 * 60_000, async () => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("service_types")
    .select("id, name, category, description, estimated_time_mins")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    category: (s.category as string | null) ?? null,
    description: str(s.description),
    estimatedMins: (s.estimated_time_mins as number | null) ?? null,
  }));
});

// ─── Orders ──────────────────────────────────────────────────

export type PublicOrder = {
  id: string;
  orderNumber: string;
  token: string;
  status: string;
  fulfilment: "delivery" | "pickup";
  deliveryZone: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  city: string;
  address: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  courier: string | null;
  trackingNumber: string | null;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  loyaltyPointsEarned: number;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  createdAt: string;
  items: { name: string; sku: string | null; qty: number; unitPrice: number; lineTotal: number }[];
};

async function hydrateOrder(row: Row): Promise<PublicOrder> {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("online_order_items")
    .select("name_snapshot, sku_snapshot, qty, unit_price, line_total")
    .eq("order_id", row.id as string);
  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    token: row.public_token as string,
    status: row.status as string,
    fulfilment: row.fulfilment as "delivery" | "pickup",
    deliveryZone: str(row.delivery_zone),
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    customerEmail: str(row.customer_email) ?? "",
    city: str(row.city) ?? "",
    address: [str(row.address_line), str(row.city), str(row.district)].filter(Boolean).join(", ") || null,
    paymentMethod: row.payment_method as string,
    paymentStatus: str(row.payment_status) ?? "unpaid",
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    couponCode: str(row.coupon_code),
    courier: str(row.courier),
    trackingNumber: str(row.tracking_number),
    deliveryFee: num(row.delivery_fee),
    taxAmount: num(row.tax_amount),
    total: num(row.total),
    loyaltyPointsEarned: Number(row.loyalty_points_earned ?? 0),
    estimatedDeliveryDate: str(row.estimated_delivery_date),
    actualDeliveryDate: str(row.actual_delivery_date),
    createdAt: row.created_at as string,
    items: (items ?? []).map((i) => ({
      name: i.name_snapshot as string,
      sku: (i.sku_snapshot as string | null) ?? null,
      qty: num(i.qty),
      unitPrice: num(i.unit_price),
      lineTotal: num(i.line_total),
    })),
  };
}

export async function getOrderByToken(token: string): Promise<PublicOrder | null> {
  if (!UUID.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("online_orders").select("*").eq("public_token", token).maybeSingle();
  return data ? hydrateOrder(data as Row) : null;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

export async function findOrder(orderNumber: string, phone: string): Promise<PublicOrder | null> {
  const number = orderNumber.trim().toUpperCase().replace(/^#/, "");
  if (!/^AH\d{3,}$/.test(number) || digitsOnly(phone).length < 7) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("online_orders").select("*").eq("order_number", number).maybeSingle();
  if (!data) return null;
  // The last 9 digits identify a Sri Lankan number regardless of 0 / +94 prefix.
  const tail = (s: string) => digitsOnly(s).slice(-9);
  return tail(data.customer_phone as string) === tail(phone) ? hydrateOrder(data as Row) : null;
}

// ─── Homepage banners ────────────────────────────────────────

export type PublicBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  buttonLabel: string | null;
};

export const getBanners = ttlCache<PublicBanner[]>(60_000, async () => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_banners")
    .select("id, title, subtitle, image_url, link_url, button_label, starts_at, ends_at")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) return []; // table not created yet (migration 0017 pending)
  const now = Date.now();
  return (data ?? [])
    .filter((b) => (!b.starts_at || Date.parse(b.starts_at as string) <= now) && (!b.ends_at || Date.parse(b.ends_at as string) >= now))
    .slice(0, 3)
    .map((b) => ({
      id: b.id as string,
      title: b.title as string,
      subtitle: str(b.subtitle),
      imageUrl: safeImageUrl(b.image_url),
      linkUrl: safeLink(b.link_url),
      buttonLabel: str(b.button_label),
    }));
});
