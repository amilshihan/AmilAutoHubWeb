import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Signup bonus for a customer who registers with a valid referral code, and the bonus paid
// to the referrer once that new customer places their first order. Kept as named constants
// here (not a store_settings row) since there's no admin UI for tuning them yet -- change
// these two numbers to retune the program.
export const REFERRAL_SIGNUP_BONUS = 50;
export const REFERRAL_REFERRER_BONUS = 200;

// 1 point = Rs. 1 of checkout discount.
export const POINT_VALUE_LKR = 1;

export type LoyaltyTransaction = {
  id: string;
  type: "earned" | "redeemed" | "expired" | "adjusted" | "referral_bonus";
  points: number;
  orderId: string | null;
  orderNumber: string | null;
  description: string | null;
  createdAt: string;
};

export type CustomerLoyalty = {
  balance: number;
  tier: string;
  earned: number;
  redeemed: number;
  expired: number;
  referralCode: string | null;
  referredByCustomerId: string | null;
  referredByName: string | null;
  referralCount: number;
  transactions: LoyaltyTransaction[];
};

export async function getCustomerLoyalty(customerId: string): Promise<CustomerLoyalty> {
  const admin = createAdminClient();

  const [{ data: account }, { data: txRows }, { count: referredCount }] = await Promise.all([
    admin.from("customer_accounts").select("loyalty_points, tier, referral_code, referred_by_customer_id").eq("id", customerId).maybeSingle(),
    admin
      .from("loyalty_transactions")
      .select("id, type, points, order_id, description, created_at, online_orders(order_number)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("customer_accounts").select("id", { count: "exact", head: true }).eq("referred_by_customer_id", customerId),
  ]);

  // A plain lookup rather than a self-join embed -- PostgREST resolves this particular
  // self-referential relationship as an array (empty when there's no referrer) rather than
  // a nullable single row, which is easy to misread as a truthy-but-empty object.
  let referrer: { first_name: string; last_name: string } | null = null;
  if (account?.referred_by_customer_id) {
    const { data } = await admin.from("customer_accounts").select("first_name, last_name").eq("id", account.referred_by_customer_id).maybeSingle();
    referrer = data;
  }

  const transactions: LoyaltyTransaction[] = (txRows ?? []).map((t) => {
    const order = t.online_orders as unknown as { order_number: string } | null;
    return {
      id: t.id as string,
      type: t.type as LoyaltyTransaction["type"],
      points: Number(t.points),
      orderId: (t.order_id as string | null) ?? null,
      orderNumber: order?.order_number ?? null,
      description: (t.description as string | null) ?? null,
      createdAt: t.created_at as string,
    };
  });

  const sum = (pred: (t: LoyaltyTransaction) => boolean) => transactions.filter(pred).reduce((n, t) => n + Math.abs(t.points), 0);
  return {
    balance: account?.loyalty_points ?? 0,
    tier: account?.tier ?? "Bronze",
    earned: sum((t) => t.type === "earned" || t.type === "referral_bonus"),
    redeemed: sum((t) => t.type === "redeemed"),
    expired: sum((t) => t.type === "expired"),
    referralCode: account?.referral_code ?? null,
    referredByCustomerId: (account?.referred_by_customer_id as string | null) ?? null,
    referredByName: referrer ? `${referrer.first_name} ${referrer.last_name}` : null,
    referralCount: referredCount ?? 0,
    transactions,
  };
}

export async function findCustomerByReferralCode(code: string): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("customer_accounts").select("id").eq("referral_code", code.trim().toUpperCase()).maybeSingle();
  return data ? { id: data.id as string } : null;
}
