import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  return (
    <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-extrabold text-charcoal">Notifications</h2>
      <p className="mt-2 text-sm text-charcoal/60">
        An in-app notification inbox is coming soon. To control what we contact you about right now, see{" "}
        <a href="/account/preferences" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
          Preferences
        </a>
        .
      </p>
    </section>
  );
}
