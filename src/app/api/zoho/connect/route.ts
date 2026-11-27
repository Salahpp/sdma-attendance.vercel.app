import {requireProfile} from "@/lib/auth/profile";
import {NextResponse} from "next/server";
export async function GET(){
 const {profile}=await requireProfile(); if(!["ceo","operations_manager","accounts"].includes(profile.role))return NextResponse.redirect(new URL("/access-denied",process.env.NEXT_PUBLIC_SITE_URL||"https://office.shahdigitalmarketing.com"));
 const client=process.env.ZOHO_CLIENT_ID, redirect=process.env.ZOHO_REDIRECT_URI;
 if(!client||!redirect)return NextResponse.json({error:"Zoho OAuth environment configuration is missing"}, {status:500});
 const state=crypto.randomUUID(), base=process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";
 const url=new URL(base+"/oauth/v2/auth");url.searchParams.set("client_id",client);url.searchParams.set("response_type","code");url.searchParams.set("redirect_uri",redirect);url.searchParams.set("scope","ZohoBooks.fullaccess.all");url.searchParams.set("access_type","offline");url.searchParams.set("prompt","consent");url.searchParams.set("state",state);
 const res=NextResponse.redirect(url);res.cookies.set("zoho_oauth_state",state,{httpOnly:true,secure:true,sameSite:"lax",maxAge:600,path:"/"});return res;
}
