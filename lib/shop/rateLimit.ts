import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Rate limiting shared by every server instance (counts live in the database; see migration
// 0039). If the database function is unavailable (migration not run yet, or a brief outage)
// it falls back to a per-instance in-memory count, so the site keeps working with weaker limits.

const hits = new Map<string, number[]>();

function memoryRecent(key: string, windowMs: number, now: number) {
  return (hits.get(key) ?? []).filter((t) => now - t < windowMs);
}

function memoryHit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = memoryRecent(key, windowMs, now);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

const seconds = (ms: number) => Math.max(1, Math.round(ms / 1000));

// Counts one attempt. Returns true while the caller is within `max` attempts per window.
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: seconds(windowMs) });
    if (!error && typeof data === "boolean") return data;
  } catch {
    // fall through to the in-memory limiter
  }
  return memoryHit(key, max, windowMs);
}

// True when the key has already used its allowance; does not count a new attempt.
export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_peek", { p_key: key, p_max: max, p_window_seconds: seconds(windowMs) });
    if (!error && typeof data === "boolean") return data;
  } catch {
    // fall through
  }
  return memoryRecent(key, windowMs, Date.now()).length >= max;
}

export async function clearRateLimit(key: string): Promise<void> {
  hits.delete(key);
  try {
    await createAdminClient().rpc("rate_limit_clear", { p_key: key });
  } catch {
    // nothing else to do
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
