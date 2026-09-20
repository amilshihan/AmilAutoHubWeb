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

export type Collection = {
  slug: CollectionSlug;
  label: string;
  blurb: string;
  primary: boolean; // shown in the main navigation
};

export const COLLECTIONS: Collection[] = [
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

export const COLLECTION_BY_SLUG = Object.fromEntries(COLLECTIONS.map((c) => [c.slug, c])) as Record<
  CollectionSlug,
  Collection
>;

export function isCollectionSlug(value: string): value is CollectionSlug {
  return value in COLLECTION_BY_SLUG;
}
