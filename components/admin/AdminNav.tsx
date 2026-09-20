"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/orders", label: "Orders", admin: false },
  { href: "/admin/products", label: "Website products", admin: true },
  { href: "/admin/store", label: "Online store", admin: true },
];

export default function AdminNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {LINKS.filter((l) => admin || !l.admin).map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
