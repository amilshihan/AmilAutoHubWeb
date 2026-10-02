// Storefront "collections" (the customer-facing categories). Every product is assigned to
// exactly one collection by the rules in lib/shop/data.ts, so renaming or re-nesting the
// POS product groups never breaks the website.

export type CollectionSlug =
  | "engine-oils"
  | "filters"
  | "car-parts"
  | "batteries"
  | "car-care"
  | "tools"
  | "accessories"
  | "coolants-fluids"
  | "wiper-blades"
  | "spark-plugs"
  | "motorcycle";

export type Subcategory = {
  slug: string;
  label: string;
  // Used only when a product has no explicit subcategory set in the admin.
  keywords: RegExp;
  // Weaker guess, tried only after every keyword rule in the collection has failed.
  inferred?: RegExp;
};

export type Collection = {
  slug: CollectionSlug;
  label: string;
  blurb: string;
  primary: boolean; // shown in the main navigation
  subcategories?: Subcategory[];
};

// Category hierarchy from the product data spec (Category > Subcategory). A product's
// subcategory is its explicit "Subcategory" value from the admin when that matches one of
// these; otherwise it is inferred from the product name, and left unassigned if unclear.
const SUBCATEGORIES: Partial<Record<CollectionSlug, Subcategory[]>> = {
  "engine-oils": [
    { slug: "fully-synthetic", label: "Fully Synthetic", keywords: /fully[\s-]*synth|100\s*%\s*synth/i, inferred: /\b[05]w[\s-]*\d{2}\b/i },
    { slug: "semi-synthetic", label: "Semi Synthetic", keywords: /semi[\s-]*synth/i, inferred: /\b10w[\s-]*(30|40|50)\b/i },
    { slug: "mineral", label: "Mineral", keywords: /\bmineral\b/i, inferred: /\b(15|20)w[\s-]*\d{2}\b/i },
    { slug: "motorcycle-oil", label: "Motorcycle Oil", keywords: /\b(4t|2t)\b|scooter|motorcycle oil/i },
    { slug: "heavy-duty-diesel", label: "Heavy Duty Diesel", keywords: /heavy[\s-]*duty|\bdiesel\b|\bhdd\b|\bc[fhik]-?4\b|\bds\b|\bds-\d|fleet|\bdelo\b/i },
  ],
  filters: [
    { slug: "oil-filters", label: "Oil Filters", keywords: /oil\s*filter/i, inferred: /\b(c|eo|o)[\s-]*\d{3,}/i },
    { slug: "air-filters", label: "Air Filters", keywords: /air\s*filter/i, inferred: /\ba[\s-]*\d{3,}|\bair\b/i },
    { slug: "cabin-filters", label: "Cabin Filters", keywords: /cabin|pollen|\ba\/?c\s*filter/i, inferred: /\b(ac|ca|cav)[\s-]*\d{3,}/i },
    { slug: "fuel-filters", label: "Fuel Filters", keywords: /(fuel|petrol|diesel)\s*filter/i, inferred: /\bfc?[\s-]*\d{3,}/i },
    { slug: "transmission-filters", label: "Transmission Filters", keywords: /transmission|\batf\b|gearbox|\bcvt\b/i },
  ],
  "car-parts": [
    { slug: "brake-pads", label: "Brake Pads", keywords: /brake\s*pad/i, inferred: /\bbp[\s-]*\d{4,}|\bj?d[\s-]?\d{4}m?[\s-]?01\b|\bmk-(in|ja)\b/i },
    { slug: "brake-discs", label: "Brake Discs", keywords: /brake\s*(disc|disk|rotor)|\brotor\b/i },
    { slug: "suspension", label: "Suspension", keywords: /suspension|shock|absorber|strut|stabili[sz]er|control\s*arm|ball\s*joint|\bbush/i },
    { slug: "steering", label: "Steering", keywords: /steering|tie\s*rod|rack\s*end/i },
    { slug: "engine-parts", label: "Engine Parts", keywords: /engine\s*mount|timing|gasket|piston|\bvalve|water\s*pump|oil\s*pump|fan\s*belt/i },
    { slug: "electrical", label: "Electrical", keywords: /alternator|starter|ignition|sensor|relay|\bswitch|bulb|\bfuse|\bcoil\b/i },
  ],
};

const BASE_COLLECTIONS: Collection[] = [
  { slug: "engine-oils", label: "Engine Oils", blurb: "Genuine lubricants for petrol, diesel and hybrid engines.", primary: true },
  { slug: "filters", label: "Filters", blurb: "Oil, air, fuel and cabin filters.", primary: true },
  { slug: "car-parts", label: "Car Parts", blurb: "Brake pads, CV joints and everyday replacement parts.", primary: true },
  { slug: "batteries", label: "Batteries", blurb: "Reliable batteries for cars, vans and bikes.", primary: true },
  { slug: "car-care", label: "Car Care", blurb: "Cleaning, polishing and protection products.", primary: true },
  { slug: "tools", label: "Tools", blurb: "Workshop and roadside tools.", primary: true },
  { slug: "accessories", label: "Accessories", blurb: "Everything else your vehicle needs.", primary: true },
  { slug: "coolants-fluids", label: "Coolants & Fluids", blurb: "Coolant, brake fluid and gear oil.", primary: false },
  { slug: "wiper-blades", label: "Wiper Blades", blurb: "Clear vision in any weather.", primary: false },
  { slug: "spark-plugs", label: "Spark Plugs", blurb: "Spark plugs for smooth starts.", primary: false },
  { slug: "motorcycle", label: "Motorcycle Products", blurb: "Lubricants and parts for two-wheelers.", primary: false },
];

export const COLLECTIONS: Collection[] = BASE_COLLECTIONS.map((c) => ({ ...c, subcategories: SUBCATEGORIES[c.slug] }));

export const COLLECTION_BY_SLUG = Object.fromEntries(COLLECTIONS.map((c) => [c.slug, c])) as Record<
  CollectionSlug,
  Collection
>;

export function isCollectionSlug(value: string): value is CollectionSlug {
  return value in COLLECTION_BY_SLUG;
}

// Engine-oil guesses by viscosity grade must not catch other products in the oil group.
const NOT_ENGINE_OIL = /atf|gear|cvt|additive|flush|grease|coolant|brake|break|fluid|spray|spary|hydraulic|booster|cleaner|stabili|lube|fork|lsd|dex|t\/m|injector|stop[ -]*(smoke|leak)|helmet/i;

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// The product's subcategory within its collection: an explicit value wins, then keywords in
// the product name; null when it cannot be told (the product still shows in the collection).
export function resolveSubcategory(
  collection: CollectionSlug,
  name: string,
  explicit: string | null
): Subcategory | null {
  const list = COLLECTION_BY_SLUG[collection].subcategories;
  if (!list) return null;
  if (explicit) {
    const wanted = normalise(explicit);
    const hit = list.find((s) => normalise(s.label) === wanted || normalise(s.slug) === wanted);
    if (hit) return hit;
  }
  const byKeyword = list.find((s) => s.keywords.test(name));
  if (byKeyword) return byKeyword;
  if (collection === "engine-oils" && NOT_ENGINE_OIL.test(name)) return null;
  return list.find((s) => s.inferred?.test(name)) ?? null;
}
