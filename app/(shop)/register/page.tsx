import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { googleEnabled } from "@/lib/customer/google";
import { safeNext } from "@/lib/customer/redirect";
import RegisterForm from "@/components/shop/RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string }> }) {
  const [customer, { ref, next }] = await Promise.all([getCurrentCustomer(), searchParams]);
  const destination = safeNext(next);
  if (customer) redirect(destination);
  return <RegisterForm googleEnabled={googleEnabled()} initialReferralCode={ref ?? ""} next={destination} />;
}
