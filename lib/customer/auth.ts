import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Signed, stateless session token: base64url(customerId.expiryMs).base64url(HMAC).
// Kept dependency-free (no JWT library) since the payload is just an id and an expiry.
const COOKIE_NAME = "aah_customer_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.CUSTOMER_SESSION_SECRET;
  if (!s) throw new Error("CUSTOMER_SESSION_SECRET is not set");
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function makeToken(customerId: string): string {
  const payload = `${customerId}.${Date.now() + SESSION_DAYS * 86400_000}`;
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function readToken(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expectedSig = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = Buffer.from(encoded, "base64url").toString("utf8");
  const [customerId, expiryStr] = payload.split(".");
  if (!customerId || !expiryStr || Date.now() > Number(expiryStr)) return null;
  return customerId;
}

export async function createCustomerSession(customerId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, makeToken(customerId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearCustomerSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type CustomerAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  status: "active" | "suspended" | "deleted";
  emailVerified: boolean;
  mobileVerified: boolean;
  authProvider: "password" | "google";
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguage: string | null;
  communicationPreference: string | null;
  customerType: string;
  additionalMobiles: string[];
  additionalEmails: string[];
  lastLoginAt: string | null;
  createdAt: string;
};

function toAccount(row: Record<string, unknown>): CustomerAccount {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    mobile: (row.mobile as string | null) ?? null,
    status: row.status as CustomerAccount["status"],
    emailVerified: row.email_verified as boolean,
    mobileVerified: row.mobile_verified as boolean,
    authProvider: row.auth_provider as CustomerAccount["authProvider"],
    avatarUrl: (row.avatar_url as string | null) ?? null,
    dateOfBirth: (row.date_of_birth as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    preferredLanguage: (row.preferred_language as string | null) ?? null,
    communicationPreference: (row.communication_preference as string | null) ?? null,
    customerType: row.customer_type as string,
    additionalMobiles: (row.additional_mobiles as string[] | null) ?? [],
    additionalEmails: (row.additional_emails as string[] | null) ?? [],
    lastLoginAt: (row.last_login_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function getCurrentCustomer(): Promise<CustomerAccount | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const customerId = readToken(token);
  if (!customerId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("customer_accounts")
    .select(
      "id, first_name, last_name, email, mobile, status, email_verified, mobile_verified, auth_provider, avatar_url, date_of_birth, gender, preferred_language, communication_preference, customer_type, additional_mobiles, additional_emails, last_login_at, created_at"
    )
    .eq("id", customerId)
    .maybeSingle();
  if (!data || data.status !== "active") return null;
  return toAccount(data);
}
