import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerConsents } from "@/lib/customer/marketingConsent";
import MarketingPreferences from "@/components/shop/MarketingPreferences";

export const metadata: Metadata = { title: "Preferences", robots: { index: false } };

export default async function PreferencesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const consents = await getCustomerConsents(customer.id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Language</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          Your preferred language is set from{" "}
          <a href="/account" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
            Personal information
          </a>
          .
        </p>
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Marketing &amp; notification settings</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          Choose what we contact you about. This is separate from your account — turning everything off won&apos;t affect order updates.
        </p>
        <div className="mt-4">
          <MarketingPreferences consents={consents} />
        </div>
      </section>
    </div>
  );
}
