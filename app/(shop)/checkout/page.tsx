import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CheckoutForm, { type CheckoutPrefill } from "@/components/shop/CheckoutForm";
import { availablePaymentMethods, getStoreSettings } from "@/lib/shop/settings";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerAddresses } from "@/lib/customer/addresses";
import { getCustomerVehicles } from "@/lib/customer/vehicles";
import { getCustomerLoyalty } from "@/lib/customer/loyalty";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [settings, customer] = await Promise.all([getStoreSettings(), getCurrentCustomer()]);
  // Checkout needs an account; the cart is kept in the browser, so it is still there after signing in.
  if (!customer) redirect("/login?next=%2Fcheckout");

  const [addresses, vehicles, loyalty] = await Promise.all([
    getCustomerAddresses(customer.id),
    getCustomerVehicles(customer.id),
    getCustomerLoyalty(customer.id),
  ]);
  const defaultAddress = addresses.find((a) => a.isDefaultShipping) ?? addresses[0];

  const prefill: CheckoutPrefill = {
    name: `${customer.firstName} ${customer.lastName}`.trim(),
    phone: customer.mobile ?? "",
    email: customer.email,
    companyName: defaultAddress?.companyName ?? "",
    address: defaultAddress?.addressLine1 ?? "",
    addressLine2: defaultAddress?.addressLine2 ?? "",
    city: defaultAddress?.city ?? "",
    district: defaultAddress?.district ?? "",
    province: defaultAddress?.province ?? "",
    postalCode: defaultAddress?.postalCode ?? "",
  };

  return (
    <CheckoutForm
      options={{
        zones: settings.deliveryZones.filter((z) => z.enabled),
        methods: {
          delivery: availablePaymentMethods(settings, "delivery"),
          pickup: availablePaymentMethods(settings, "pickup"),
        },
        bank: settings.bankTransfer,
      }}
      prefill={prefill}
      vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.make} ${v.model} (${v.year}) — ${v.registrationNumber}` }))}
      pointsBalance={loyalty?.balance ?? 0}
    />
  );
}
