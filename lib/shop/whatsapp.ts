import type { CartLine } from "@/lib/shop/types";
import { formatLKR } from "@/lib/shop/format";

// Converts a local Sri Lankan number (077 370 0001) or an international one into the digits
// wa.me expects (94773700001).
export function toWhatsAppNumber(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("94")) return digits;
  if (digits.startsWith("0")) return "94" + digits.slice(1);
  if (digits.length === 9) return "94" + digits;
  return digits;
}

export function waLink(number: string, message: string): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function productMessage(product: { name: string; packSize?: string | null }, vehicle?: string): string {
  const item = product.packSize ? `${product.name} (${product.packSize})` : product.name;
  return vehicle
    ? `Hi Amil Auto Hub, I need ${item} for ${vehicle}.`
    : `Hi Amil Auto Hub, I'd like to order ${item}.`;
}

export function cartMessage(lines: CartLine[], total: number): string {
  const rows = lines.map((l) => `- ${l.qty} x ${l.name} (${formatLKR(l.price)})`).join("\n");
  return `Hi Amil Auto Hub, I'd like to order:\n${rows}\nTotal: ${formatLKR(total)}`;
}
