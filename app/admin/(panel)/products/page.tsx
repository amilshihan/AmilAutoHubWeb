import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { categoryPaths, type CategoryRow } from "@/lib/groups";
import WebsiteProductsClient, { type WebProduct } from "@/components/admin/WebsiteProductsClient";

export default async function WebsiteProductsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const supabase = await createClient();
  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from("parts")
      .select(
        "id, name, sku, barcode, description, category_id, unit, sell_price, retail_price, qty_on_hand, is_active, is_service, is_drum, image_url, is_featured, is_online, product_ref, product_code, brand, subcategory, product_type, short_description, status, is_new, is_bestseller"
      )
      .order("name")
      .limit(5000),
    supabase.from("categories").select("id, name, parent_id").order("name"),
  ]);

  if (productsRes.error) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-ink">Website products</h1>
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Product website fields are not set up yet.</p>
          <p className="mt-1">
            Run <code className="rounded bg-amber-100 px-1">supabase/migrations/0015_storefront.sql</code> and{" "}
            <code className="rounded bg-amber-100 px-1">0035_product_basic_details.sql</code> in the Supabase SQL editor, then reload this page.
          </p>
          <p className="mt-2 text-xs text-amber-800">Details: {productsRes.error.message}</p>
        </div>
      </div>
    );
  }

  const categories = (categoriesRes.data ?? []) as CategoryRow[];
  const products = ((productsRes.data ?? []) as WebProduct[]).filter((p) => p.is_active && !p.is_service);
  const paths = categoryPaths(categories);

  return (
    <WebsiteProductsClient
      products={products}
      categoryOptions={categories.map((c) => paths.get(c.id) ?? c.name).sort((a, b) => a.localeCompare(b))}
      categoryPathById={Object.fromEntries(paths)}
    />
  );
}
