"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; tone?: "deal" | "amil" };

export default function ShopNav({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="bg-charcoal">
      <ul className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const tone =
            item.tone === "deal"
              ? "text-red-300 hover:text-white"
              : item.tone === "amil"
                ? "text-amil hover:text-white"
                : "text-white/85 hover:text-white";
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative block px-3 py-3 text-sm font-semibold transition-colors ${tone} ${
                  active ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-amil" : ""
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
