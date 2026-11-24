import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptMetaToken } from "@/lib/meta-crypto";
export const runtime="nodejs";
export const maxDuration=30;
export async function GET(request:NextRequest){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login?error=meta_auth_required",request.url));
 const state=request.nextUrl.searchParams.get("state"),expected=request.cookies.get("sdma_meta_oauth_state")?.value,code=request.nextUrl.searchParams.get("code"),clientId=request.cookies.get("sdma_meta_client_id")?.value;
 const fail=(reason:string)=>{const target=new URL("/",request.url);target.searchParams.set("meta_error",reason);const response=NextResponse.redirect(target);response.cookies.delete("sdma_meta_oauth_state");response.cookies.delete("sdma_meta_client_id");return response};
 if(request.nextUrl.searchParams.get("error"))return fail("Meta authorization was cancelled or denied.");
 if(!state||!expected||state!==expected||!clientId)return fail("Meta authorization state check failed. Please reconnect.");
 if(!code)return fail("Meta did not return an authorization code.");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager"].includes(profile.role||""))return fail("Agency administrator access is required.");
 const appId=process.env.META_APP_ID,appSecret=process.env.META_APP_SECRET,redirectUri=process.env.META_REDIRECT_URI,version=process.env.META_GRAPH_API_VERSION||process.env.META_GRAPH_VERSION||"v27.0";
 if(!appId||!appSecret||!redirectUri)return fail("Meta App Secret is missing from Vercel Preview environment variables.");
 try{
  const tokenUrl=new URL("https://graph.facebook.com/"+version+"/oauth/access_token");tokenUrl.searchParams.set("client_id",appId);tokenUrl.searchParams.set("client_secret",appSecret);tokenUrl.searchParams.set("redirect_uri",redirectUri);tokenUrl.searchParams.set("code",code);
  const tokenResponse=await fetch(tokenUrl,{cache:"no-store"});const tokenData=await tokenResponse.json();if(!tokenResponse.ok||typeof tokenData.access_token!=="string")throw new Error(tokenData.error?.message||"Meta token exchange failed.");
  let accessToken=String(tokenData.access_token),expiresIn=Number(tokenData.expires_in||3600);
  const longUrl=new URL("https://graph.facebook.com/"+version+"/oauth/access_token");longUrl.searchParams.set("grant_type","fb_exchange_token");longUrl.searchParams.set("client_id",appId);longUrl.searchParams.set("client_secret",appSecret);longUrl.searchParams.set("fb_exchange_token",accessToken);
  const longResponse=await fetch(longUrl,{cache:"no-store"});const longData=await longResponse.json();if(longResponse.ok&&longData.access_token){accessToken=String(longData.access_token);expiresIn=Number(longData.expires_in||expiresIn)}
  const encrypted=encryptMetaToken(accessToken);const {error}=await (supabase as any).from("meta_oauth_tokens").upsert({user_id:user.id,client_id:clientId,...encrypted,token_expires_at:new Date(Date.now()+expiresIn*1000).toISOString()},{onConflict:"user_id,client_id"});if(error)throw new Error(error.message);
  const target=new URL("/",request.url);target.searchParams.set("meta_connected","1");const response=NextResponse.redirect(target);response.cookies.delete("sdma_meta_oauth_state");response.cookies.delete("sdma_meta_client_id");return response;
 }catch(error){console.error("[Meta OAuth]",error instanceof Error?error.message:"unknown");return fail("Meta connection failed. Check App settings, permissions and redirect URI.");}
}
