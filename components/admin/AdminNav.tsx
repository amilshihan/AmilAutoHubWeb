"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; admin?: boolean };
const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
  { title: "Sales", items: [{ href: "/admin/orders", label: "Orders" }] },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Website products", admin: true },
      { href: "/admin/fitment", label: "Vehicle fitment", admin: true },
      { href: "/admin/inventory", label: "Inventory", admin: true },
    ],
  },
  {
    title: "Customers",
    items: [
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/support", label: "Support tickets" },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/coupons", label: "Coupons", admin: true },
      { href: "/admin/banners", label: "Homepage banners", admin: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/bookings", label: "Service bookings" },
      { href: "/admin/store", label: "Store settings", admin: true },
    ],
  },
];

export default function AdminNav({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => admin || !i.admin);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.title}</div>
            <div className="space-y-0.5">
              {items.map((l) => {
                const active = l.href === "/admin" ? pathname === "/admin" : pathname === l.href || pathname.startsWith(l.href + "/");
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
            </div>
          </div>
        );
      })}
    </nav>
  );
}
