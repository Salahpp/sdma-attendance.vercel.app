import { NextRequest,NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
export async function GET(request:NextRequest){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login",request.url));
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["ceo","operations_manager"].includes(profile.role||""))return NextResponse.json({error:"Only agency administrators can connect Meta accounts."},{status:403});
 const clientId=request.nextUrl.searchParams.get("client_id");if(!clientId)return NextResponse.json({error:"Select a client before connecting Meta."},{status:400});
 const {data:client}=await supabase.from("clients").select("id").eq("id",clientId).maybeSingle();if(!client)return NextResponse.json({error:"Client not found."},{status:404});
 const appId=process.env.META_APP_ID,configId=process.env.META_LOGIN_CONFIG_ID||process.env.META_CONFIG_ID,redirectUri=process.env.META_REDIRECT_URI,version=process.env.META_GRAPH_API_VERSION||process.env.META_GRAPH_VERSION||"v27.0";
 if(!appId||!configId||!redirectUri)return NextResponse.json({error:"Meta app settings are incomplete. Configure App ID, Login Configuration ID and Redirect URI."},{status:503});
 const state=randomBytes(32).toString("hex");const url=new URL("https://www.facebook.com/"+version+"/dialog/oauth");url.searchParams.set("client_id",appId);url.searchParams.set("redirect_uri",redirectUri);url.searchParams.set("state",state);url.searchParams.set("config_id",configId);url.searchParams.set("response_type","code");url.searchParams.set("override_default_response_type","true");
 const response=NextResponse.redirect(url);const cookieOptions={httpOnly:true,secure:true,sameSite:"lax" as const,path:"/api/meta",maxAge:600};response.cookies.set("sdma_meta_oauth_state",state,cookieOptions);response.cookies.set("sdma_meta_client_id",clientId,cookieOptions);return response;
}
