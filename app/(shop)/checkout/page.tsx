import type { Metadata } from "next";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { availablePaymentMethods, getStoreSettings } from "@/lib/shop/settings";

export const metadata: Metadata = { title: "Checkout" };

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
