"use client";

import { useRouter } from "next/navigation";

const OPTIONS = [
  { value: "relevance", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A-Z" },
  { value: "discount", label: "Biggest discount" },
];

export default function SortSelect({ value, hrefs }: { value: string; hrefs: Record<string, string> }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden font-semibold text-charcoal/60 sm:inline">Sort by</span>
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value])}
        className="rounded-lg border border-charcoal/20 bg-white px-3 py-2 text-sm font-semibold text-charcoal focus:border-charcoal focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
