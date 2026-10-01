import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { googleEnabled } from "@/lib/customer/google";
import RegisterForm from "@/components/shop/RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const [customer, { ref }] = await Promise.all([getCurrentCustomer(), searchParams]);
  if (customer) redirect("/account");
  return <RegisterForm googleEnabled={googleEnabled()} initialReferralCode={ref ?? ""} />;
}
