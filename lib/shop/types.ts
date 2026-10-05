import type { CollectionSlug } from "@/lib/shop/collections";

// The only product shape that ever leaves the server for the public website.
// It deliberately has no cost, margin or supplier fields.
export type PublicProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  compareAt: number | null;
  discountPct: number | null;
  inStock: boolean;
  lowStock: boolean;
  unit: string;
  packSize: string | null;
  brand: string | null;
  categoryPath: string[];
  collection: CollectionSlug;
  imageUrl: string | null;
  featured: boolean;
  isNew: boolean;
  bestseller: boolean;
  productCode: string | null;
  productType: string | null;
  subcategory: string | null;
  subcategorySlug: string | null;
  shortDescription: string | null;
  compat: string[];
};

export type PublicMedia = {
  id: string;
  mediaType: "image" | "video";
  imageType: "main" | "gallery" | "label" | "technical" | "video";
  url: string;
  alt: string | null;
  isPrimary: boolean;
};

export type CartLine = {
  id: string;
  name: string;
  price: number;
  qty: number;
  brand: string | null;
  packSize: string | null;
  imageUrl: string | null;
  collection: CollectionSlug;
};

export type ShopInfo = {
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  pickupLocation: string;
  logoUrl: string | null;
  phones: { label: string; number: string }[];
  emails: { label: string; address: string }[];
  hours: { days: string; hours: string }[] | null;
  registrationNumber: string | null;
  taxId: string | null;
  legalName: string | null;
};
