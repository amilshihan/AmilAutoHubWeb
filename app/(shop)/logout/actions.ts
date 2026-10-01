"use server";

import { redirect } from "next/navigation";
import { clearCustomerSession, getCurrentCustomer } from "@/lib/customer/auth";
import { logCustomerActivity } from "@/lib/customer/activityLog";

export async function logoutCustomer(): Promise<void> {
  const customer = await getCurrentCustomer();
  if (customer) await logCustomerActivity({ customerId: customer.id, eventType: "logout" });
  await clearCustomerSession();
  redirect("/");
}
