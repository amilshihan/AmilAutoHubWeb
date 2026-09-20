import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { findOrder } from "@/lib/shop/data";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";
import { PhoneIcon, SearchIcon } from "@/components/shop/Icons";

export const metadata: Metadata = { title: "My Account · Track Your Order", robots: { index: false } };

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; phone?: string }>;
}) {
  const { order, phone } = await searchParams;
  let error: string | null = null;

  if (order && phone) {
    const h = await headers();
    if (!rateLimit(`track:${clientIp(h)}`, 10, 10 * 60_000)) {
      error = "Too many attempts. Please wait a few minutes and try again.";
    } else {
      const found = await findOrder(order, phone);
      if (found) redirect(`/order/${found.token}`);
      error = "We couldn't find an order matching those details. Check the order number and the phone number you used at checkout.";
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Track your order</h1>
      <p className="mt-2 text-charcoal/65">
        Enter your order number and the phone number you ordered with. No account or password needed.
      </p>

      {error && (
        <div role="alert" className="mt-5 rounded-xl border border-deal/30 bg-deal-soft p-4 text-sm font-semibold text-charcoal">
          {error}
        </div>
      )}

      <form method="get" className="mt-6 space-y-4 rounded-2xl border border-charcoal/10 bg-surface p-5">
        <div>
          <label htmlFor="order" className="mb-1 block text-sm font-bold text-charcoal">
            Order number
          </label>
          <input id="order" name="order" required placeholder="AH10245" defaultValue={order} className={field} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-bold text-charcoal">
            Phone number
          </label>
          <input id="phone" name="phone" type="tel" required placeholder="077 123 4567" defaultValue={phone} className={field} />
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amil px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-charcoal hover:bg-amil-hover"
        >
          <SearchIcon width={17} height={17} /> Track order
        </button>
      </form>

      <p className="mt-6 flex items-start gap-2 text-sm text-charcoal/60">
        <PhoneIcon width={16} height={16} className="mt-0.5 shrink-0" />
        <span>
          Need help? <Link href="/contact" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">Contact us</Link> and quote your order number.
        </span>
      </p>
    </div>
  );
}
