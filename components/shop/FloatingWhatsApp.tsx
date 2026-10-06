"use client";

import { WhatsAppIcon } from "@/components/shop/Icons";
import { useCart } from "@/components/shop/CartProvider";
import { waLink } from "@/lib/shop/whatsapp";

// "lifted" stacks it above the chat button; without the chat button it sits in the corner.
export default function FloatingWhatsApp({ lifted = true }: { lifted?: boolean }) {
  const { shop } = useCart();
  return (
    <a
      href={waLink(shop.whatsapp, "Hi Amil Auto Hub, I need some help.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed ${lifted ? "bottom-[5.25rem]" : "bottom-4"} right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-wa text-white shadow-lg shadow-charcoal/30 transition-transform hover:scale-105 hover:bg-wa-hover`}
    >
      <WhatsAppIcon width={28} height={28} />
    </a>
  );
}
