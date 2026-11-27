import {NextRequest,NextResponse} from "next/server";
import {requireProfile} from "@/lib/auth/profile";
export async function GET(req:NextRequest){
 const {profile}=await requireProfile();if(!["ceo","operations_manager","accounts"].includes(profile.role))return NextResponse.redirect(new URL("/access-denied",req.url));
 const code=req.nextUrl.searchParams.get("code"),state=req.nextUrl.searchParams.get("state");
 if(!code||state!==req.cookies.get("zoho_oauth_state")?.value)return NextResponse.json({error:"Invalid OAuth state or missing authorization code"}, {status:400});
 const client=process.env.ZOHO_CLIENT_ID,secret=process.env.ZOHO_CLIENT_SECRET,redirect=process.env.ZOHO_REDIRECT_URI,base=process.env.ZOHO_ACCOUNTS_URL||"https://accounts.zoho.in";
 if(!client||!secret||!redirect)return NextResponse.json({error:"OAuth configuration missing"}, {status:500});
 const tokenRes=await fetch(base+"/oauth/v2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",client_id:client,client_secret:secret,redirect_uri:redirect,code}),cache:"no-store"});
 const token=await tokenRes.json();if(!token.refresh_token)return NextResponse.json({error:token.error||"Zoho did not return a refresh token"}, {status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:"Server storage configuration missing"}, {status:500});
 const saved=await fetch(url+"/rest/v1/zoho_connections",{method:"POST",headers:{apikey:key,authorization:"Bearer "+key,"content-type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"primary",refresh_token:token.refresh_token,api_domain:token.api_domain||process.env.ZOHO_API_URL||"https://www.zohoapis.in",accounts_domain:base,updated_at:new Date().toISOString()}),cache:"no-store"});
 if(!saved.ok)return NextResponse.json({error:"Could not save Zoho connection. Ensure the zoho_connections table migration is applied."},{status:500});
 const response=NextResponse.redirect(new URL("/?accounts=connected",req.url));response.cookies.delete("zoho_oauth_state");return response;
}
