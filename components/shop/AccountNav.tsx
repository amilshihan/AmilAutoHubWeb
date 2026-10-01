"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; badge?: number };
type NavGroup = { title: string; items: NavItem[] };

export default function AccountNav({ openTicketCount = 0 }: { openTicketCount?: number }) {
  const pathname = usePathname();

  const groups: NavGroup[] = [
    { title: "Profile", items: [{ href: "/account", label: "Personal information" }] },
    { title: "Addresses", items: [{ href: "/account/addresses", label: "Manage addresses" }] },
    { title: "My Vehicles", items: [{ href: "/account/vehicles", label: "Manage vehicles" }] },
    { title: "My Orders", items: [{ href: "/account/orders", label: "Orders & tracking" }] },
    { title: "Wishlist", items: [{ href: "/account/wishlist", label: "Saved products" }] },
    { title: "Saved Carts", items: [{ href: "/account/saved-carts", label: "Saved carts" }] },
    { title: "Rewards", items: [{ href: "/account/rewards", label: "Points & transactions" }] },
    { title: "Coupons", items: [{ href: "/account/coupons", label: "Your offers" }] },
    { title: "Support", items: [{ href: "/account/support", label: "My tickets", badge: openTicketCount }] },
    { title: "Notifications", items: [{ href: "/account/notifications", label: "Notifications" }] },
    { title: "Preferences", items: [{ href: "/account/preferences", label: "Language & marketing" }] },
    { title: "Security", items: [{ href: "/account/security", label: "Password & account" }] },
  ];

  return (
    <nav className="space-y-1">
      {groups.map((group) => {
        const active = group.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
        return (
          <Link
            key={group.title}
            href={group.items[0].href}
            className={`flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm font-bold transition-colors ${
              active ? "bg-amil text-charcoal" : "text-charcoal/70 hover:bg-surface hover:text-charcoal"
            }`}
          >
            {group.title}
            {!!group.items[0].badge && (
              <span className="rounded-full bg-deal px-2 py-0.5 text-xs font-extrabold text-white">{group.items[0].badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
