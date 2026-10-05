import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import ForgotPasswordForm from "@/components/shop/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  if (await getCurrentCustomer()) redirect("/account/security");
  return <ForgotPasswordForm />;
}
