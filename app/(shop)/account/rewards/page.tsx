import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerLoyalty, REFERRAL_REFERRER_BONUS, REFERRAL_SIGNUP_BONUS } from "@/lib/customer/loyalty";
import { getFormatters } from "@/lib/shop/siteSettings";
import CopyReferralLink from "@/components/shop/CopyReferralLink";

export const metadata: Metadata = { title: "Rewards", robots: { index: false } };

const TRANSACTION_LABEL: Record<string, string> = {
  earned: "Earned",
  redeemed: "Redeemed",
  expired: "Expired",
  adjusted: "Adjusted",
  referral_bonus: "Referral bonus",
};

export default async function RewardsPage() {
  const customer = await getCurrentCustomer();
  const fmt = await getFormatters();

  if (!customer) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">Amil Auto Hub Rewards</h1>
        <p className="mt-3 text-charcoal/65">Sign in to see your points balance and rewards.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-lg bg-charcoal px-6 py-3 text-sm font-bold text-white hover:bg-charcoal-soft">
          Sign in
        </Link>
      </div>
    );
  }

  const loyalty = await getCustomerLoyalty(customer.id);

  return (
    <div className="space-y-6">
      <p className="text-sm text-charcoal/60">Loyalty account ID: {customer.id}</p>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Amil Auto Hub Rewards</h2>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-charcoal/60">Points balance</p>
            <p className="text-3xl font-extrabold text-charcoal">{loyalty.balance}</p>
          </div>
          <span className="rounded-full bg-amil-soft px-4 py-1.5 text-sm font-extrabold text-charcoal">{loyalty.tier} tier</span>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-charcoal/10 pt-4 text-center text-sm">
          <div>
            <dt className="text-charcoal/55">Earned</dt>
            <dd className="font-bold text-charcoal">{loyalty.earned}</dd>
          </div>
          <div>
            <dt className="text-charcoal/55">Redeemed</dt>
            <dd className="font-bold text-charcoal">{loyalty.redeemed}</dd>
          </div>
          <div>
            <dt className="text-charcoal/55">Expired</dt>
            <dd className="font-bold text-charcoal">{loyalty.expired}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Refer a friend</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          Share your code — your friend gets {REFERRAL_SIGNUP_BONUS} points when they sign up, and you get {REFERRAL_REFERRER_BONUS} points once they place
          their first order.
        </p>
        <CopyReferralLink referralCode={loyalty.referralCode ?? ""} />
        <p className="mt-3 text-sm text-charcoal/60">
          {loyalty.referralCount > 0 ? `${loyalty.referralCount} friend${loyalty.referralCount === 1 ? "" : "s"} joined with your code.` : "No referrals yet."}
        </p>
        {loyalty.referredByName && <p className="mt-1 text-sm text-charcoal/60">You were referred by {loyalty.referredByName}.</p>}
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Transaction history</h2>
        {loyalty.transactions.length === 0 ? (
          <p className="mt-3 text-sm text-charcoal/60">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-charcoal/10">
            {loyalty.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-charcoal">{t.description ?? TRANSACTION_LABEL[t.type]}</p>
                  <p className="text-xs text-charcoal/50">
                    {TRANSACTION_LABEL[t.type]} · {fmt.dateTime(t.createdAt)}
                    {t.orderNumber ? ` · #${t.orderNumber}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 font-bold tabular-nums ${t.points > 0 ? "text-stock" : "text-deal"}`}>
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
