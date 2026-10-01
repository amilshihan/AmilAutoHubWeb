import "server-only";
import { siteUrl } from "@/lib/site";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google sign-in is not configured");
  return { clientId, clientSecret };
}

async function redirectUri(): Promise<string> {
  return `${await siteUrl()}/api/auth/google/callback`;
}

export async function buildGoogleAuthUrl(state: string): Promise<string> {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: await redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
};

// Exchanges an authorization code for the signed-in user's basic profile. Plain fetch/JSON --
// no OAuth library needed for this one-shot server-side flow.
export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const { clientId, clientSecret } = credentials();

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: await redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed (${tokenRes.status})`);
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (typeof accessToken !== "string") throw new Error("Google token response missing access_token");

  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!userRes.ok) throw new Error(`Google userinfo failed (${userRes.status})`);
  const u = await userRes.json();
  if (typeof u.sub !== "string") throw new Error("Google userinfo missing sub");

  return {
    sub: u.sub,
    email: typeof u.email === "string" ? u.email : null,
    emailVerified: u.email_verified === true || u.email_verified === "true",
    givenName: typeof u.given_name === "string" ? u.given_name : null,
    familyName: typeof u.family_name === "string" ? u.family_name : null,
    picture: typeof u.picture === "string" ? u.picture : null,
  };
}
