import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthToken } from "@/lib/customer/authTokens";
import { sendAccountEmail } from "@/lib/email/accountEmail";

// Emails an "confirm your email address" link to a customer. Never throws (a failed email must
// not break registration); the account page offers a "resend" button.
export async function issueVerificationEmail(customerId: string, baseUrl: string): Promise<boolean> {
  try {
    const { data } = await createAdminClient()
      .from("customer_accounts")
      .select("email, first_name, email_verified")
      .eq("id", customerId)
      .maybeSingle();
    if (!data || data.email_verified) return false;
    const token = await createAuthToken(customerId, "email_verify", 24 * 60);
    const result = await sendAccountEmail({
      to: data.email as string,
      firstName: data.first_name as string,
      kind: "email_verify",
      url: `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`,
    });
    if (!result.ok) console.error("Confirmation email was not sent:", result.error);
    return result.ok;
  } catch (e) {
    console.error("Confirmation email failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
