import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, googleEnabled } from "@/lib/customer/google";

export const STATE_COOKIE = "aah_oauth_state";

export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(await buildGoogleAuthUrl(state));
}
