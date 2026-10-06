import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer/auth";
import { googleEnabled } from "@/lib/customer/google";
import { safeNext } from "@/lib/customer/redirect";
import LoginForm from "@/components/shop/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up yet. Please sign in with your email and password.",
  google_denied: "Google sign-in was cancelled.",
  google_invalid_state: "That sign-in link expired. Please try again.",
  google_no_email: "Your Google account doesn't have a verified email address we can use.",
  google_suspended: "This account is no longer active. Please contact us for help.",
  google_failed: "We couldn't sign you in with Google. Please try again or use your email and password.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const [customer, { error, next }] = await Promise.all([getCurrentCustomer(), searchParams]);
  const destination = safeNext(next);
  if (customer) redirect(destination);
  return (
    <LoginForm
      googleEnabled={googleEnabled()}
      initialError={error ? (ERROR_MESSAGES[error] ?? undefined) : undefined}
      next={destination}
    />
  );
}
