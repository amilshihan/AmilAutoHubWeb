// Manual formatting keeps server and client output identical (no Intl/ICU differences).
export function formatLKR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const [whole, decimals] = rounded.toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs. ${withCommas}${decimals === "00" ? "" : "." + decimals}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(iso)}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}
