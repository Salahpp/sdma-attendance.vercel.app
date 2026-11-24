import { NextRequest, NextResponse } from "next/server";
import { createHash, createCipheriv, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

function encryptToken(token: string) {
  const secret = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("META_TOKEN_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) throw new Error("META_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([encrypted, tag]).toString("base64"), iv: iv.toString("base64") };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=meta_auth_required", request.url));

  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("sdma_meta_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error_description") || request.nextUrl.searchParams.get("error");
  const fail = (reason: string) => {
    const url = new URL("/", request.url);
    url.searchParams.set("meta_error", reason);
    const response = NextResponse.redirect(url);
    response.cookies.delete("sdma_meta_oauth_state");
    return response;
  };
  if (providerError) return fail("Meta authorization was cancelled or denied.");
  if (!state || !expectedState || state !== expectedState) return fail("Meta authorization state check failed. Please try connecting again.");
  if (!code) return fail("Meta did not return an authorization code.");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) return fail("Meta app credentials are not configured in Preview.");

  try {
    const version = process.env.META_GRAPH_VERSION || "v25.0";
    const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
      console.error("[Meta OAuth] Token exchange failed", { status: tokenResponse.status, message: tokenData?.error?.message });
      return fail("Meta token exchange failed. Check the app settings and redirect URI.");
    }

    let accessToken = tokenData.access_token as string;
    let expiresIn = Number(tokenData.expires_in || 0);
    // Exchange short-lived user tokens for long-lived tokens where Meta supports it.
    const longUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", appId);
    longUrl.searchParams.set("client_secret", appSecret);
    longUrl.searchParams.set("fb_exchange_token", accessToken);
    const longResponse = await fetch(longUrl, { cache: "no-store" });
    const longData = await longResponse.json();
    if (longResponse.ok && typeof longData.access_token === "string") {
      accessToken = longData.access_token;
      expiresIn = Number(longData.expires_in || expiresIn);
    }

    const encrypted = encryptToken(accessToken);
    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const { error } = await (supabase as any).from("meta_oauth_user_tokens").upsert({
      user_id: user.id,
      access_token_ciphertext: encrypted.ciphertext,
      token_iv: encrypted.iv,
      token_expires_at: expiresAt,
      granted_scopes: ["ads_read"],
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    if (error) {
      console.error("[Meta OAuth] Secure token save failed", error.message);
      return fail("Meta authorized successfully, but secure token storage failed. Contact the SDMA administrator.");
    }

    const response = NextResponse.redirect(new URL("/?meta_connected=1", request.url));
    response.cookies.delete("sdma_meta_oauth_state");
    return response;
  } catch (error) {
    console.error("[Meta OAuth] Callback error", error instanceof Error ? error.message : "unknown");
    return fail("Meta connection could not be completed. Please try again.");
  }
}
