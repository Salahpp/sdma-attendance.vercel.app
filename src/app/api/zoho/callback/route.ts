import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { zohoAdmin,zohoAccountsUrl,zohoApiUrl } from "@/lib/zoho/admin";
export const runtime="nodejs";
export async function GET(request:Request){
 const u=new URL(request.url);const code=u.searchParams.get("code"),state=u.searchParams.get("state"),cookieState=(await import("next/headers")).cookies;
 const store=await cookieState();const expected=store.get("zoho_oauth_state")?.value;
 const redirectTo=new URL("/",u.origin);
 if(!code||!state||!expected||state!==expected){redirectTo.searchParams.set("zoho","state_error");return NextResponse.redirect(redirectTo);}
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){redirectTo.pathname="/login";return NextResponse.redirect(redirectTo);}
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();if(!profile?.is_active||!["ceo","operations_manager","accounts"].includes(profile.role)){redirectTo.searchParams.set("zoho","denied");return NextResponse.redirect(redirectTo);}
 const clientId=process.env.ZOHO_CLIENT_ID,secret=process.env.ZOHO_CLIENT_SECRET,redirectUri=process.env.ZOHO_REDIRECT_URI;if(!clientId||!secret||!redirectUri){redirectTo.searchParams.set("zoho","config_error");return NextResponse.redirect(redirectTo);}
 const tokenRes=await fetch(zohoAccountsUrl()+"/oauth/v2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:clientId,client_secret:secret,redirect_uri:redirectUri,code})});const tokens=await tokenRes.json();if(!tokenRes.ok||!tokens.refresh_token){redirectTo.searchParams.set("zoho","token_error");return NextResponse.redirect(redirectTo);}
 const orgRes=await fetch(zohoApiUrl()+"/organizations",{headers:{Authorization:"Zoho-oauthtoken "+tokens.access_token}});const orgData=await orgRes.json();const org=orgData.organizations?.[0];if(!org){redirectTo.searchParams.set("zoho","organization_error");return NextResponse.redirect(redirectTo);}
 const admin=zohoAdmin();const {error}=await admin.from("zoho_books_oauth_tokens").upsert({id:"00000000-0000-0000-0000-000000000001",connected_by:user.id,organization_id:String(org.organization_id),organization_name:org.name,region:"in",access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:new Date(Date.now()+Number(tokens.expires_in||3600)*1000).toISOString(),updated_at:new Date().toISOString()});
 if(error){redirectTo.searchParams.set("zoho","storage_error");return NextResponse.redirect(redirectTo);}redirectTo.searchParams.set("zoho","connected");const response=NextResponse.redirect(redirectTo);response.cookies.delete("zoho_oauth_state");return response;
}
