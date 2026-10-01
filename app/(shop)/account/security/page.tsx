import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { formatDateTime } from "@/lib/shop/format";
import ChangePasswordForm from "@/components/shop/ChangePasswordForm";
import DeleteAccountForm from "@/components/shop/DeleteAccountForm";

export const metadata: Metadata = { title: "Security", robots: { index: false } };

export default async function SecurityPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Password</h2>
        {customer.authProvider === "password" ? (
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        ) : (
          <p className="mt-2 text-sm text-charcoal/60">Your account signs in with Google, so there&apos;s no password to manage here.</p>
        )}
      </section>

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Login sessions</h2>
        <p className="mt-1 text-sm text-charcoal/60">Viewing and signing out of other devices is coming soon. Here&apos;s your most recent sign-in:</p>
        <p className="mt-2 text-sm font-semibold text-charcoal">{customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : "No record yet"}</p>
      </section>

      <section className="rounded-2xl border border-deal/30 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Delete account</h2>
        <p className="mt-1 text-sm text-charcoal/60">
          This deactivates your account immediately and signs you out. This can&apos;t be undone from your account — contact us if you change your mind.
        </p>
        <div className="mt-4">
          <DeleteAccountForm requiresPassword={customer.authProvider === "password"} />
        </div>
      </section>
    </div>
  );
}
