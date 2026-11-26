import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime="nodejs";
export async function GET(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["ceo","operations_manager","accounts"].includes(profile.role))return NextResponse.json({error:"Finance access required."},{status:403});
 const id=process.env.ZOHO_CLIENT_ID,redirect=process.env.ZOHO_REDIRECT_URI;if(!id||!redirect)return NextResponse.json({error:"Zoho OAuth setup is incomplete. Add ZOHO_CLIENT_ID and ZOHO_REDIRECT_URI."},{status:503});
 const state=crypto.randomUUID();const accounts=process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";
 const url=new URL(accounts+"/oauth/v2/auth");url.searchParams.set("client_id",id);url.searchParams.set("response_type","code");url.searchParams.set("scope","ZohoBooks.invoices.READ,ZohoBooks.expenses.READ,ZohoBooks.contacts.READ,ZohoBooks.settings.READ");url.searchParams.set("redirect_uri",redirect);url.searchParams.set("access_type","offline");url.searchParams.set("prompt","consent");url.searchParams.set("state",state);
 const res=NextResponse.redirect(url);res.cookies.set("zoho_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});return res;
}
