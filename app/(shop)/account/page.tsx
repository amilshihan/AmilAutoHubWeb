import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerAddresses } from "@/lib/customer/addresses";
import { getCustomerVehicles } from "@/lib/customer/vehicles";
import { logoutCustomer } from "@/app/(shop)/logout/actions";
import { getFormatters } from "@/lib/shop/siteSettings";
import ProfilePhotoUploader from "@/components/shop/ProfilePhotoUploader";
import ProfileDetailsForm from "@/components/shop/ProfileDetailsForm";
import ProfileCompletion, { type CompletionItem } from "@/components/shop/ProfileCompletion";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = { active: "Active", suspended: "Suspended", deleted: "Deleted" };
const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other", prefer_not_to_say: "Prefer not to say" };
const COMM_LABEL: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", phone: "Call" };
const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  garage: "Garage",
  workshop: "Workshop",
  business: "Business",
  dealer: "Dealer",
  fleet: "Fleet",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-charcoal/60">{label}</dt>
      <dd className="text-right font-semibold text-charcoal">{value}</dd>
    </div>
  );
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  const fmt = await getFormatters();

  if (!customer) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-charcoal">My Account</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amil-soft p-5">
          <p className="text-sm font-semibold text-charcoal">Have an account? Sign in for faster checkout next time.</p>
          <div className="flex gap-2">
            <Link href="/login" className="rounded-lg bg-charcoal px-4 py-2 text-sm font-bold text-white hover:bg-charcoal-soft">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg border border-charcoal/20 bg-white px-4 py-2 text-sm font-bold text-charcoal hover:bg-surface">
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [addresses, vehicles] = await Promise.all([getCustomerAddresses(customer.id), getCustomerVehicles(customer.id)]);

  const completionItems: CompletionItem[] = [
    { label: "Add a profile photo", done: !!customer.avatarUrl, href: "#complete-profile" },
    { label: "Add your date of birth", done: !!customer.dateOfBirth, href: "#complete-profile" },
    { label: "Set your gender", done: !!customer.gender, href: "#complete-profile" },
    { label: "Set your preferred language", done: !!customer.preferredLanguage, href: "#complete-profile" },
    { label: "Set how you'd like to be contacted", done: !!customer.communicationPreference, href: "#complete-profile" },
    { label: "Save an address", done: addresses.length > 0, href: "/account/addresses" },
    { label: "Register a vehicle", done: vehicles.length > 0, href: "/account/vehicles" },
  ];

  return (
    <div className="space-y-6">
      <ProfileCompletion items={completionItems} />

      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Welcome back, {customer.firstName}</h2>

        <div className="mt-4">
          <ProfilePhotoUploader initialUrl={customer.avatarUrl} initials={`${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase()} />
        </div>

        <dl className="mt-5 divide-y divide-charcoal/10 text-sm">
          <Row label="Customer ID" value={<span className="font-mono text-xs">{customer.id}</span>} />
          <Row label="First name" value={customer.firstName} />
          <Row label="Last name" value={customer.lastName} />
          <Row label="Mobile numbers" value={[customer.mobile, ...customer.additionalMobiles].filter(Boolean).join(", ") || "Not provided"} />
          <Row label="Email addresses" value={[customer.email, ...customer.additionalEmails].filter(Boolean).join(", ")} />
          <Row label="Customer type" value={CUSTOMER_TYPE_LABEL[customer.customerType] ?? customer.customerType} />
          <Row label="Sign-in method" value={customer.authProvider === "google" ? "Google" : "Password"} />
          <Row label="Account created" value={fmt.date(customer.createdAt)} />
          <Row label="Account status" value={STATUS_LABEL[customer.status] ?? customer.status} />
          <Row
            label="Email verification"
            value={<span className={customer.emailVerified ? "text-stock" : "text-charcoal/60"}>{customer.emailVerified ? "Verified" : "Not verified"}</span>}
          />
          <Row
            label="Mobile verification"
            value={<span className={customer.mobileVerified ? "text-stock" : "text-charcoal/60"}>{customer.mobileVerified ? "Verified" : "Not verified"}</span>}
          />
          <Row label="Last login" value={customer.lastLoginAt ? fmt.dateTime(customer.lastLoginAt) : "-"} />
        </dl>

        <form action={logoutCustomer} className="mt-5">
          <button type="submit" className="rounded-lg border border-charcoal/20 px-5 py-2.5 text-sm font-bold text-charcoal hover:bg-surface">
            Sign out
          </button>
        </form>
      </section>

      <section id="complete-profile" className="scroll-mt-20 rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">Personal information</h2>
        <p className="mt-1 text-sm text-charcoal/60">Optional — helps us recommend the right products and contact you the way you prefer.</p>
        <div className="mt-4">
          <ProfileDetailsForm
            dateOfBirth={customer.dateOfBirth}
            gender={customer.gender}
            preferredLanguage={customer.preferredLanguage}
            communicationPreference={customer.communicationPreference}
            customerType={customer.customerType}
            additionalMobiles={customer.additionalMobiles}
            additionalEmails={customer.additionalEmails}
          />
        </div>
        {(customer.gender || customer.communicationPreference) && (
          <p className="mt-3 text-xs text-charcoal/50">
            Currently: {customer.gender ? GENDER_LABEL[customer.gender] ?? customer.gender : "gender not set"}
            {customer.communicationPreference ? `, contact by ${COMM_LABEL[customer.communicationPreference] ?? customer.communicationPreference}` : ""}.
          </p>
        )}
      </section>

      <p className="text-sm text-charcoal/60">
        Need to change your password or delete your account? Head to{" "}
        <Link href="/account/security" className="font-bold text-charcoal underline decoration-amil decoration-2 underline-offset-2">
          Security
        </Link>
        .
      </p>
    </div>
  );
}
