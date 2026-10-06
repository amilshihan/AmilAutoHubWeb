import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthTokenKind = "password_reset" | "email_verify";

// Only a SHA-256 hash of each token is stored, so a database leak can't be used to reset
// anyone's password. The raw token exists only in the email link.
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const looksLikeToken = (raw: unknown): raw is string => typeof raw === "string" && /^[A-Za-z0-9_-]{30,80}$/.test(raw);

// Creates a fresh single-use token and cancels any earlier unused ones of the same kind.
export async function createAuthToken(customerId: string, kind: AuthTokenKind, ttlMinutes: number): Promise<string> {
  const admin = createAdminClient();
  const now = new Date();
  await admin.from("customer_auth_tokens").update({ used_at: now.toISOString() }).eq("customer_id", customerId).eq("kind", kind).is("used_at", null);

  const raw = randomBytes(32).toString("base64url");
  const { error } = await admin.from("customer_auth_tokens").insert({
    customer_id: customerId,
    kind,
    token_hash: hash(raw),
    expires_at: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return raw;
}

// Checks a token without using it up (so a page can decide what to show).
export async function peekAuthToken(raw: unknown, kind: AuthTokenKind): Promise<{ customerId: string } | null> {
  if (!looksLikeToken(raw)) return null;
  const { data } = await createAdminClient()
    .from("customer_auth_tokens")
    .select("customer_id, expires_at, used_at")
    .eq("token_hash", hash(raw))
    .eq("kind", kind)
    .maybeSingle();
  if (!data || data.used_at || Date.parse(data.expires_at as string) <= Date.now()) return null;
  return { customerId: data.customer_id as string };
}

// Uses the token up. The update only matches an unused, unexpired token, so two simultaneous
// attempts can't both succeed.
export async function consumeAuthToken(raw: unknown, kind: AuthTokenKind): Promise<{ customerId: string } | null> {
  if (!looksLikeToken(raw)) return null;
  const { data } = await createAdminClient()
    .from("customer_auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hash(raw))
    .eq("kind", kind)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("customer_id")
    .maybeSingle();
  return data ? { customerId: data.customer_id as string } : null;
}
