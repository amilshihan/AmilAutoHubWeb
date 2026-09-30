import type { Metadata } from "next";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { availablePaymentMethods, getStoreSettings } from "@/lib/shop/settings";

export const metadata: Metadata = { title: "Checkout" };

// Delivery charges and payment methods are edited in the admin; refresh them regularly.
export const revalidate = 30;

export default async function CheckoutPage() {
  const settings = await getStoreSettings();

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
    />
  );
}
