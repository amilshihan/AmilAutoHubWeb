// Where to send a customer after they sign in. Only same-site paths are accepted, so a crafted
// "?next=https://evil.example" link can't turn the login page into an open redirect.
export const DEFAULT_AFTER_LOGIN = "/account";
// Google sign-in leaves the site and comes back, so the destination rides along in this cookie.
export const NEXT_COOKIE = "aah_oauth_next";

export function safeNext(raw: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string") return fallback;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) return fallback;
  // Signing in again from the sign-in or registration pages would just loop.
  if (/^\/(login|register)(\/|\?|$)/.test(path)) return fallback;
  return path;
}

// Keeps the destination when hopping between the sign-in and registration pages.
export function withNext(href: string, next: string): string {
  return next === DEFAULT_AFTER_LOGIN ? href : `${href}?next=${encodeURIComponent(next)}`;
}
