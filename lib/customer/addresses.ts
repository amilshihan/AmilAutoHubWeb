import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AddressType } from "@/lib/shop/config";

export type CustomerAddress = {
  id: string;
  customerId: string;
  addressType: AddressType;
  recipientName: string;
  companyName: string | null;
  mobile: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  province: string | null;
  postalCode: string | null;
  deliveryInstructions: string | null;
  isDefaultBilling: boolean;
  isDefaultShipping: boolean;
  createdAt: string;
};

const COLUMNS =
  "id, customer_id, address_type, recipient_name, company_name, mobile, address_line1, address_line2, city, district, province, postal_code, delivery_instructions, is_default_billing, is_default_shipping, created_at";

function toAddress(row: Record<string, unknown>): CustomerAddress {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    addressType: row.address_type as AddressType,
    recipientName: row.recipient_name as string,
    companyName: (row.company_name as string | null) ?? null,
    mobile: row.mobile as string,
    addressLine1: row.address_line1 as string,
    addressLine2: (row.address_line2 as string | null) ?? null,
    city: row.city as string,
    district: row.district as string,
    province: (row.province as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    deliveryInstructions: (row.delivery_instructions as string | null) ?? null,
    isDefaultBilling: row.is_default_billing as boolean,
    isDefaultShipping: row.is_default_shipping as boolean,
    createdAt: row.created_at as string,
  };
}

export async function getCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_addresses")
    .select(COLUMNS)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: true });
  return (data ?? []).map(toAddress);
}
