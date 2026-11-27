import {requireProfile} from "@/lib/auth/profile";
import {NextResponse} from "next/server";
export async function GET(req:Request){
 const {profile}=await requireProfile();if(!["ceo","operations_manager","accounts"].includes(profile.role))return NextResponse.redirect(new URL("/access-denied",process.env.NEXT_PUBLIC_SITE_URL||"https://office.shahdigitalmarketing.com"));
 const client=process.env.ZOHO_CLIENT_ID,redirect=process.env.ZOHO_REDIRECT_URI,secret=process.env.ZOHO_CLIENT_SECRET,url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!client||!redirect||!secret||!url||!key)return NextResponse.json({error:"Zoho/Supabase OAuth server configuration missing."},{status:500});
 const state=crypto.randomUUID(),base=process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";
 const stored=await fetch(url+"/rest/v1/zoho_oauth_states",{method:"POST",headers:{apikey:key,authorization:"Bearer "+key,"content-type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({state,expires_at:new Date(Date.now()+10*60*1000).toISOString()}),cache:"no-store"});
 if(!stored.ok)return NextResponse.json({error:"Could not initialize secure OAuth state. Check the Supabase table."},{status:500});
 const auth=new URL(base+"/oauth/v2/auth");auth.searchParams.set("client_id",client);auth.searchParams.set("response_type","code");auth.searchParams.set("redirect_uri",redirect);auth.searchParams.set("scope","ZohoBooks.fullaccess.all");auth.searchParams.set("access_type","offline");auth.searchParams.set("prompt","consent");auth.searchParams.set("state",state);
 return NextResponse.redirect(auth);
}