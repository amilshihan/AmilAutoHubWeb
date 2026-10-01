import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { getCustomerVehicles } from "@/lib/customer/vehicles";
import { getPurchasedPartIds } from "@/lib/customer/fitmentHistory";
import { getVehicleRecommendations } from "@/lib/shop/recommendations";
import VehicleBook from "@/components/shop/VehicleBook";
import ProductCard from "@/components/shop/ProductCard";
import type { PublicProduct } from "@/lib/shop/types";

export const metadata: Metadata = { title: "My Vehicles", robots: { index: false } };

export default async function VehiclesPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/account");

  const vehicles = await getCustomerVehicles(customer.id);
  const purchasedIds = await getPurchasedPartIds(customer.id);

  const recommended: { vehicleLabel: string; products: PublicProduct[] }[] = [];
  for (const v of vehicles) {
    const products = await getVehicleRecommendations(v.make, v.model, purchasedIds);
    if (products.length > 0) recommended.push({ vehicleLabel: `${v.make} ${v.model}`, products });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-charcoal">My Vehicles</h2>
        <p className="mt-1 text-sm text-charcoal/60">Register your vehicles so we can recommend the right parts and match service history.</p>
        <div className="mt-4">
          <VehicleBook vehicles={vehicles} />
        </div>
      </section>

      {recommended.map((r) => (
        <section key={r.vehicleLabel} className="rounded-2xl border border-charcoal/10 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-charcoal">Recommended for your {r.vehicleLabel}</h2>
          <p className="mt-1 text-sm text-charcoal/60">Based on fitment and what other {r.vehicleLabel} owners bought.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {r.products.map((p) => (
              <ProductCard key={p.id} product={p} verifiedFit />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
